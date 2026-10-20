const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = html.split('// MAP MODEL START')[1].split('// MAP MODEL END')[0];
function model() {
  return vm.runInNewContext(source + '; ({MAP_CONFIG,japanClock,currentTripDay,itineraryMapRegion,effectiveMapRegion,regionSpots,filteredSpots,spotCategory,regionPlaces,filteredPlaces});', {Intl, Date, URL});
}

test('regions follow selected itinerary dates', () => {
  const m = model();
  for (let i = 1; i <= 5; i++) assert.equal(m.itineraryMapRegion(i), 'hokkaido');
  for (let i = 7; i <= 10; i++) assert.equal(m.itineraryMapRegion(i), 'tokyo');
});

test('Dec 6 switches at 18:00 Japan time, independent of device timezone', () => {
  const m = model();
  assert.equal(m.itineraryMapRegion(6, new Date('2026-12-06T08:59:59Z')), 'hokkaido');
  assert.equal(m.itineraryMapRegion(6, new Date('2026-12-06T09:00:00Z')), 'tokyo');
  assert.equal(m.itineraryMapRegion(6, new Date('2026-12-06T14:59:59Z')), 'tokyo');
  // Previewing the transfer day outside the trip defaults to Hokkaido.
  assert.equal(m.itineraryMapRegion(6, new Date('2026-10-19T12:00:00Z')), 'hokkaido');
});

test('opening during the trip selects the current Japan date', () => {
  const m = model();
  assert.equal(m.currentTripDay(new Date('2026-11-30T15:00:00Z')), 1);
  assert.equal(m.currentTripDay(new Date('2026-12-06T15:00:00Z')), 7);
  assert.equal(m.currentTripDay(new Date('2026-12-10T14:59:59Z')), 10);
  assert.equal(m.currentTripDay(new Date('2026-10-19T12:00:00Z')), 1);
});

test('manual map region overrides the itinerary region', () => {
  const m = model();
  assert.equal(m.effectiveMapRegion(1, 'tokyo'), 'tokyo');
  assert.equal(m.effectiveMapRegion(9, 'hokkaido'), 'hokkaido');
  assert.equal(m.effectiveMapRegion(9, 'auto'), 'tokyo');
});

test('pins are isolated by region and invalid coordinates are excluded', () => {
  const m = model();
  m.MAP_CONFIG.regions.hokkaido.spots=[];m.MAP_CONFIG.regions.tokyo.spots=[];
  assert.equal(m.regionSpots('hokkaido').length, 0);
  assert.equal(m.regionSpots('tokyo').length, 0);
  m.MAP_CONFIG.regions.hokkaido.spots.push({name:'Test Hokkaido',lat:43,lng:142});
  m.MAP_CONFIG.regions.tokyo.spots.push({name:'Test Tokyo',lat:35.6,lng:139.7});
  m.MAP_CONFIG.regions.tokyo.spots.push({name:'Invalid',lat:NaN,lng:139.7});
  assert.equal(m.regionSpots('hokkaido')[0].name, 'Test Hokkaido');
  assert.equal(m.regionSpots('tokyo')[0].name, 'Test Tokyo');
  assert.equal(m.regionSpots('tokyo').length, 1);
});

test('category filters include only points in the active region and category', () => {
  const m = model();m.MAP_CONFIG.regions.hokkaido.spots=[];m.MAP_CONFIG.regions.tokyo.spots=[];
  m.MAP_CONFIG.regions.hokkaido.spots.push(
    {name:'Canal',lat:43,lng:142,category:'attraction'},
    {name:'Restaurant',lat:43.1,lng:142.1,category:'food'},
    {name:'Hotel',lat:43.2,lng:142.2,category:'hotel'},
    {name:'Station',lat:43.3,lng:142.3,category:'transit'});
  m.MAP_CONFIG.regions.tokyo.spots.push({name:'Tokyo Hotel',lat:35.6,lng:139.7,category:'hotel'});
  assert.equal(m.filteredSpots('hokkaido').length, 4);
  for (const category of ['attraction','food','hotel','transit']) {
    const points = m.filteredSpots('hokkaido', category);
    assert.equal(points.length, 1);
    assert.equal(m.spotCategory(points[0]), category);
  }
  assert.equal(m.filteredSpots('tokyo', 'hotel')[0].name, 'Tokyo Hotel');
  assert.equal(m.spotCategory({}), 'attraction');
});

test('Google Maps draws custom markers without an iframe or Leaflet dependency', () => {
  assert.ok(html.includes('maps.googleapis.com/maps/api/js'));
  assert.ok(html.includes('google.maps.marker.AdvancedMarkerElement'));
  assert.ok(html.includes('renderGooglePins(id,places)'));
  assert.ok(!html.includes("createElement('iframe')"));
  assert.ok(!html.includes('vendor/leaflet'));
  assert.ok(!html.includes('World_Light_Gray_Base'));
  assert.ok(!html.includes('data-map-theme'));
});

test('plain labels replace prior branding and promotional headlines', () => {
  for (const text of ['YUKI','把日子，過成一場','第一片雪','兩座風景，一段旅程','你的冬日路線']) assert.ok(!html.includes(text));
  assert.ok(html.includes('北海道與東京行程'));
  assert.ok(html.includes('旅程概要'));
  assert.ok(html.includes('每日行程'));
});

test('provided places, hotels and food candidates are separated by region', () => {
  const m=model();
  for (const id of ['yuen','hanamomiji','grids','futami','onsen-street','tanaka','otaru-no1','sumiyoshi','nikka','sankaku','takara','masazushi','kitaichi','letao','naruto','tengu','new-chitose']) assert.ok(m.regionPlaces('hokkaido').some(place=>place.id===id),id);
  assert.equal(m.regionPlaces('tokyo').length,1);
  assert.equal(m.regionPlaces('tokyo')[0].id,'keio');
  assert.equal(m.filteredPlaces('hokkaido','hotel').length,3);
  assert.equal(m.filteredPlaces('tokyo','hotel').length,1);
  assert.ok(m.filteredPlaces('hokkaido','food').some(place=>place.id==='takara'));
});

test('unresolved coordinates stay in the list without fabricating markers', () => {
  const m=model();
  const missing=m.regionPlaces('hokkaido').filter(place=>!Number.isFinite(place.lat)||!Number.isFinite(place.lng));
  assert.ok(missing.length>0);
  for(const place of missing){assert.ok(place.query);assert.ok(!m.regionSpots('hokkaido').includes(place));}
  assert.ok(html.includes('座標待確認'));
});

test('key is read from the supplied local file only when loading the map', () => {
  assert.ok(html.includes("keyFile:'./goog-map-api-key'"));
  assert.ok(html.includes("fetch(GOOGLE_MAP_OPTIONS.keyFile,{cache:'no-store',signal:abort.signal})"));
  assert.ok(html.includes('await loadGoogleMaps()'));
  assert.ok(html.includes("mapId:'DEMO_MAP_ID'"));
  const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  assert.ok(!sw.includes('goog-map-api-key'));
  assert.ok(fs.readFileSync(path.join(__dirname,'../.gitignore'),'utf8').split('\n').includes('goog-map-api-key'));
});

test('authorization and network errors keep the trip and place list usable', () => {
  assert.ok(html.includes('window.gm_authFailure'));
  assert.ok(html.includes("mapFailure('auth')"));
  assert.ok(html.includes('地點清單仍可查看'));
  assert.ok(html.includes("if(!navigator.onLine){clearGoogleMap()"));
  assert.ok(html.includes("new URLSearchParams(location.search).get('view')"));
});
