const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const startup=html.match(/<script data-theme-init>([\s\S]*?)<\/script>/)[1];
function initialTheme(saved,blocked=false){
 const root={dataset:{},style:{}},meta={content:''};
 vm.runInNewContext(startup,{document:{documentElement:root,querySelector:()=>meta},localStorage:{getItem(){if(blocked)throw Error('blocked');return saved}}});
 return {theme:root.dataset.theme,scheme:root.style.colorScheme,color:meta.content};
}
test('saved dark theme is applied before page rendering',()=>{
 assert.deepEqual(initialTheme('dark'),{theme:'dark',scheme:'dark',color:'#111418'});
 assert.deepEqual(initialTheme('light'),{theme:'light',scheme:'light',color:'#eaf5ff'});
});
test('missing, invalid or inaccessible theme storage keeps the app usable',()=>{
 for(const saved of [null,'invalid','"dark"'])assert.equal(initialTheme(saved).theme,'light');
 assert.equal(initialTheme('dark',true).theme,'light');
});
