// Run with Node.js 18+: node --test tests/offline.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function setup(scope = '/japan/') {
  const events = {}, storage = new Map(), calls = [];
  let connected = true, failAsset = null;
  const base = 'https://example.com' + scope;
  const network = async request => {
    const url = typeof request === 'string' ? request : request.url;
    calls.push(url);
    if (!connected || url.endsWith(failAsset || 'NEVER_MATCH')) throw new Error('Network unavailable');
    const name = new URL(url).pathname.slice(new URL(base).pathname.length);
    return new Response(fs.readFileSync(path.join(root, name)), {status: 200});
  };
  const caches = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const data = storage.get(name);
      return {
        async addAll(requests) {
          const responses = await Promise.all(requests.map(network));
          requests.forEach((request, i) => data.set(request.url, responses[i]));
        },
        async match(request) { return data.get(typeof request === 'string' ? request : request.url)?.clone(); }
      };
    },
    async keys() { return [...storage.keys()]; },
    async delete(name) { return storage.delete(name); }
  };
  const context = vm.createContext({URL, Request, Promise, caches, fetch: network,
    self: {location: new URL(base + 'sw.js'), addEventListener: (type, handler) => events[type] = handler,
      skipWaiting: async () => {}, clients: {claim: async () => {}, matchAll: async () => []}}});
  vm.runInContext(source, context);
  async function lifecycle(type) {
    let promise;
    events[type]({waitUntil: p => promise = p});
    await promise;
  }
  async function request(relative, mode = 'navigate', options = {}) {
    let response;
    events.fetch({request: {url: new URL(relative, base).href, method: 'GET', mode, ...options},
      respondWith: p => response = p});
    return response;
  }
  async function status() {
    let result, promise;
    events.message({data: {type: 'CHECK_OFFLINE'}, ports: [{postMessage: value => result = value}],
      waitUntil: p => promise = p});
    await promise;
    return result.ready;
  }
  return {base, storage, calls, lifecycle, request, status, context,
    disconnect: () => connected = false, fail: name => failAsset = name};
}

test('all app content is local; manifest and icons resolve', () => {
  assert.equal((html.match(/<(?:link|script)[^>]+(?:href|src)="https?:/g) || []).length, 0);
  assert.ok(!html.includes('fonts.googleapis.com'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root, icon.src)));
  assert.ok(fs.existsSync(path.join(root, manifest.start_url)));
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script); // Full UI script syntax, including offline setup.
  const itinerary = script.slice(script.indexOf('const item='), script.indexOf('const packItems='));
  const days = vm.runInNewContext(itinerary + '; days;');
  assert.equal(days.length, 10);
  assert.equal(days[5].region, 'both');
  assert.ok(days.every(day => day.items.length > 0));
});

test('saved app opens immediately offline at root, index, and query URL', async () => {
  for (const scope of ['/', '/japan/', '/my-repo/japan-winter-trip/']) {
    const app = setup(scope);
    await app.lifecycle('install');
    assert.equal(await app.status(), true);
    app.disconnect();
    app.calls.length = 0;
    for (const url of ['./', './index.html', './?from=homescreen', './index.html?day=6']) {
      const response = await app.request(url);
      assert.equal(await response.text(), html);
    }
    for (const file of ['icon.svg', 'manifest.webmanifest']) assert.ok(await app.request(file, 'cors'));
    assert.equal(app.calls.length, 0, 'cached content must not wait on a network request');
  }
});

test('failed precache never reports offline-ready', async () => {
  const app = setup();
  app.fail('icon.svg');
  await assert.rejects(app.lifecycle('install'), /Network unavailable/);
  assert.equal(await app.status(), false);
});

test('missing cached content falls back to network', async () => {
  const app = setup();
  const response = await app.request('./index.html');
  assert.equal(await response.text(), html);
  assert.equal(app.calls.length, 1);
});

test('external maps, unknown routes, and mutations are not intercepted', async () => {
  const app = setup();
  assert.equal(await app.request('https://www.google.com/maps/search/?query=Tokyo'), undefined);
  assert.equal(await app.request('./unknown'), undefined);
  assert.equal(await app.request('./index.html', 'navigate', {method: 'POST'}), undefined);
});

test('a new version replaces app cache and preserves other caches', async () => {
  const app = setup();
  await app.lifecycle('install');
  const oldKey = [...app.storage.keys()][0];
  app.storage.set('another-app-v1', new Map());
  const updated = source.replace(/(CACHE_PREFIX \+ ')v(\d+)(')/, (_, before, version, after) => before + 'v' + (Number(version) + 1) + after);
  assert.notEqual(updated, source);
  const context = vm.createContext({...app.context});
  vm.runInContext(updated, context);
  await app.lifecycle('install');
  await app.lifecycle('activate');
  assert.equal(app.storage.has(oldKey), false);
  assert.equal(app.storage.has('another-app-v1'), true);
  assert.equal(await app.status(), true);
});
