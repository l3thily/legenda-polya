// usage: node bdo.js <index.html> N [pos] [strategy: top|stay]
const fs=require('fs'),vm=require('vm');
const [file,N0,pos0,strat0]=process.argv.slice(2);const N=+N0||10,POSX=pos0||'ST',STRAT=strat0||'top';
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
const out=[];
for(let n=0;n<N;n++){
  seed=1000+n;for(const k of Object.keys(store))delete store[k];
  run(`UI.form={...UI.form,name:'Тест ${n}',nat:'Франция',pos:'${POSX}',lg:'FRA1',club:'Лион',rus:'random',num:9,mode:'player'};UI.roomSeed=null;UI.chal=null;LS.clear&&LS.clear();startCareer();if(process.env.POT){G.P.pot=+process.env.POT;G.P.potOff=0}`);
  let guard=0;
  while(run(`G.phase`)!=='retired'&&guard++<40){
    run(`{beginSeason();let k=0;while(RUN&&MATCH&&k++<3000){const m=MATCH;let i=0;if(m.kind==='pens')i=Math.floor(Math.random()*9);else if(m.opts&&m.opts.length){i=Math.floor(Math.random()*m.opts.length);if(process.env.SMART){const j=m.opts.findIndex(o=>/Взять игру|Речь|Бить|удар|сам/i.test(o.label));if(j>=0)i=j}}stepSeason(i)};if(UI.err)throw new Error(UI.err)}`);
    run(`{let q=0;while(G.pending&&G.pending.length&&q++<30){const d=G.pending[0];let i=0;
      const tr=d.opts.map((o,j)=>[o,j]).filter(([o])=>o.act&&o.act.t==='transfer'&&!o.act.loan);
      if(d.dl){const st=dlState(d);let b=-1,bs=0;st.offers.forEach((o,j)=>{const s=C(o.club).str;if('${STRAT}'==='top'&&s>bs+2&&s>C(G.P.clubId).str)b=j,bs=s});i=b>=0?b:d.opts.length-1}
      else if(tr.length&&'${STRAT}'==='top'){let best=null;tr.forEach(([o,j])=>{if(!best||C(o.act.club).str>C(best[0].act.club).str)best=[o,j]});i=C(best[0].act.club).str>C(G.P.clubId).str+1?best[1]:(d.opts.findIndex(o=>!(o.act&&o.act.t==='transfer'))+1||1)-1}
      else{const ok=d.opts.map((o,j)=>j).filter(j=>!(d.opts[j].act&&(d.opts[j].act.t==='retire')));i=ok[Math.floor(Math.random()*ok.length)]||0}
      chooseOpt(i)}}`);
  }
  if(process.env.DUMP)run(`G.seasons.slice().reverse().forEach(s=>{if(s.bdo&&s.bdo.mine)console.log(s.label,s.clubName,'ovr',s.ovrBefore,'place',s.bdo.place,'me',JSON.stringify(s.bdo.mine),s.bdo.myScore,'| top',s.bdo.cmp&&s.bdo.cmp.n,JSON.stringify(s.bdo.cmp&&s.bdo.cmp.p),s.bdo.cmp&&s.bdo.cmp.sc)});console.log('rivals top',G.rivals.map(r=>r.ovr).sort((a,b)=>b-a).slice(0,10).join(','))`);
  const r=run(`(()=>{const P=G.P;const b=P.awards.filter(a=>a.n==='Золотой мяч').length;const clubs=[...new Set(G.seasons.map(s=>s.clubName))].reverse().join('>');return {bdo:b,peak:Math.max(...P.ovrHist.map(h=>h.ovr)),seasons:G.seasons.length,ucl:P.trophies.filter(t=>t.n==='Лига чемпионов').length,score:Math.round(legacyScore()),tier:legacyTier(),places:G.seasons.map(s=>s.bdo?s.bdo.place:0).reverse().join(','),clubs}})()`);
  out.push(r);console.log(JSON.stringify(r));
}
const bd=out.map(r=>r.bdo).sort((a,b)=>a-b);console.log('BDO sorted',bd.join(' '),'mean',(bd.reduce((a,b)=>a+b,0)/bd.length).toFixed(2),'score mean',Math.round(out.reduce((a,r)=>a+r.score,0)/out.length));
