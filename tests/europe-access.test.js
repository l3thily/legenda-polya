// usage: node bdo.js <index.html> N [pos] [strategy: top|stay]
const fs=require('fs'),vm=require('vm');
const file=require('path').join(__dirname,'../index.html');
let src=fs.readFileSync(file,'utf8');const a=src.indexOf('<script>',src.indexOf('<script>')>-1?0:0);
const s0=src.lastIndexOf('<script>',src.indexOf('/* ================= boot'));let js=src.slice(s0+8,src.lastIndexOf('</script>'));
js=js.replace(/try\{window\.claude&&window\.claude\.hot&&window\.claude\.hot\.snapshot[\s\S]*$/,'');
const noop=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='length'?0:noop,apply:()=>noop,construct:()=>noop});
const store={};const LS={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const seededMath=Object.create(Math);let seed=1;seededMath.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const ctx={process,console,Math:seededMath,JSON,Date,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:LS,sessionStorage:LS,document:noop,navigator:{userAgent:'node',language:'ru'},location:{search:'',pathname:'/',hostname:'localhost',href:'http://localhost/'},history:noop,fetch:()=>new Promise(()=>{}),URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Float64Array,Array,Object,Set,Map,Promise,MutationObserver:function(){return {observe(){}}},requestAnimationFrame:()=>0,addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),performance:{now:()=>Date.now()},Intl,AudioContext:undefined,XMLHttpRequest:function(){return noop}};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.self=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(js+`;render=function(){};save=function(){};flushSave=function(){};statPing=function(){};mpProgress=function(){};adsFull=function(){};confetti=function(){};sfx=function(){};greatRecord=function(){};`,ctx,{filename:'game.js'});
const run=code=>vm.runInContext(code,ctx);

const assert=require('node:assert/strict');
const {test}=require('node:test');
const plain=code=>JSON.parse(run('JSON.stringify('+code+')'));

test('all admitted associations retain a route into the 36-team European cups',()=>{
 for(let i=0;i<20;i++){
  run(`G=buildWorld('on');G.code='ACCESS-${i}';G.euro=euroEntrants()`);
  const cups=plain('G.euro'),ids=Object.values(cups).flat();
  for(const cup of Object.values(cups))assert.equal(cup.length,36);
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(plain('[...new Set(Object.values(G.euro).flat().map(id=>C(id).cc))].sort()'),plain('coefRank().map(x=>x.cc).sort()'));
 }
});
test('suspension excludes Russia and title holders keep their Champions League place',()=>{
 run(`G=buildWorld('off');G.euro=euroEntrants()`);
 assert.equal(run(`Object.values(G.euro).flat().some(id=>C(id).cc==='RUS')`),false);
 run(`G=buildWorld('on');G.won.ucl=topLeague('RUS').last[5];G.won.uel=topLeague('BLR').last[5];G.euro=euroEntrants()`);
 assert.equal(run('G.euro.ucl.includes(G.won.ucl)&&G.euro.ucl.includes(G.won.uel)'),true);
 assert.deepEqual(plain('euroEntrants()'),plain('G.euro'));
});
test('Russian breakthrough starts with participating Russian clubs and repairs existing saves',()=>{
 run(`startChallenge('scen','rus')`);
 assert.equal(run('G.set.russia'),true);
 assert.equal(run(`Object.values(G.euro).flat().some(id=>C(id).cc==='RUS')`),true);
 run(`delete G.euroAccessVersion;for(const k of Object.keys(G.euro))G.euro[k]=G.euro[k].filter(id=>C(id).cc!=='RUS');globalThis.oldSave=JSON.parse(JSON.stringify(G));G=null;G=migrate(oldSave)`);
 assert.equal(run(`Object.values(G.euro).flat().some(id=>C(id).cc==='RUS')`),true);
 assert.equal(run(`G.chal.id`),'rus');
 run(`const champion=C(topLeague('RUS').last[0]);G.P.trophies.push({n:'Лига конференций',club:champion.name,y:'2026/27'});chalCheck()`);
 assert.equal(run(`!!G.chal.done.rusEuro`),true);
});

test('a Russian league winner can play a European competition through a full player season',()=>{
 run(`startChallenge('scen','rus');G.P.clubId=topLeague('RUS').last[0];G.P.ovr=92;G.P.pot=95;G.P.at=makeAttrs(92,G.P.pos);beginSeason();let steps=0;while(RUN&&MATCH&&steps++<3000)stepSeason(0)`);
 assert.equal(run('UI.err||null'),null);
 assert.equal(run('G.seasons.length'),1);
 assert.equal(run(`G.seasons[0].comps.some(c=>EUROCUPS.includes(c.n))`),true);
 assert.equal(run(`Object.values(G.euro).flat().some(id=>C(id).cc==='RUS')`),true);
});
