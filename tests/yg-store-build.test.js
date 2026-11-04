'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const acorn=require('../i18n/node_modules/acorn');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const real=read('dist-yg/index.html'),preview=read('dist-yg-preview/index.html'),source=read('index.html');
const start=real.indexOf("'use strict';"),end=real.lastIndexOf('</script>'),js=real.slice(start,end);
const ast=acorn.parse(js,{ecmaVersion:'latest'});
const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return js.slice(n.start,n.end)};
test('store belongs only to the Yandex build; simulator belongs only to the preview',()=>{
  assert.equal(source.includes('LegendaYgStore'),false);assert.equal(source.includes('ygStoreAdsBlocked'),false);
  assert.ok(real.includes('LegendaYgStore'));assert.ok(real.includes('ygStoreInit(sdk)'));assert.ok(real.includes('src="/sdk.js"'));
  assert.equal(real.includes('window.__YG_SHOP_PREVIEW=true'),false);assert.equal(real.includes('src="yg-store-preview-sdk.js"'),false);
  assert.equal(fs.existsSync(path.join(root,'dist-yg/yg-store-preview-sdk.js')),false);
  assert.ok(preview.includes('window.__YG_SHOP_PREVIEW=true'));assert.ok(preview.includes('src="yg-store-preview-sdk.js"'));assert.ok(fs.existsSync(path.join(root,'dist-yg-preview/yg-store-preview-sdk.js')));
  assert.equal(preview.includes("return 'https://legenda-polya.88-218-121-40.sslip.io/api'"),false);
});
test('built ad code blocks forced and regular fullscreen ads for owners, including loading/failure',()=>{
  const calls={full:0,reward:0},ctx={YG:true,Date,ADS:{lastFull:0},blocked:true,ygStoreAdsBlocked:()=>ctx.blocked,sndHold(){},ygPlay(){},adsRewOk:()=>true,YGS:{sdk:{adv:{showFullscreenAdv(){calls.full++},showRewardedVideo({callbacks:c}){calls.reward++;c.onRewarded();c.onClose()}}}}};
  vm.createContext(ctx);vm.runInContext(fn('adsFull')+'\n'+fn('adsRewarded'),ctx);
  ctx.adsFull(true);ctx.adsFull(false);assert.equal(calls.full,0);
  ctx.blocked=false;ctx.adsFull(true);assert.equal(calls.full,1);
  ctx.blocked=true;ctx.adsFull(true);assert.equal(calls.full,1);
  let granted=0;ctx.adsRewarded(()=>granted++);assert.equal(calls.reward,1);assert.equal(granted,1);
});
test('visiting the shop pauses match playback and preserves time left for a deadline decision',()=>{
  const ui=read('platforms/yg-store-ui.js'),tree=acorn.parse(ui,{ecmaVersion:'latest'});
  const part=name=>{const n=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return ui.slice(n.start,n.end)};
  let now=5000,cleared=0,rendered=0;
  const focus={isConnected:true,focus(){}},ctx={YG_STORE:{open:false},UI:{dlFor:{id:'deadline'},dlT:1000,liveT:1,dlTimer:2},Date:{now:()=>now},ygStore:{state:{busy:false}},document:{activeElement:focus,getElementById:()=>focus,querySelector:()=>focus},clearTimeout(){cleared++},clearInterval(){cleared++},sndHold(){},ygPlay(){},ygStoreDraw(){},render(){rendered++}};
  vm.createContext(ctx);vm.runInContext(part('ygStoreOpen')+'\n'+part('ygStoreClose'),ctx);
  ctx.ygStoreOpen();assert.equal(ctx.YG_STORE.open,true);assert.equal(cleared,2);assert.equal(ctx.UI.dlTimer,null);
  now=15000;ctx.ygStoreClose();assert.equal(ctx.YG_STORE.open,false);assert.equal(ctx.UI.dlT,11000);assert.equal(rendered,1);
});
