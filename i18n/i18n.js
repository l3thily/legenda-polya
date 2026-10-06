#!/usr/bin/env node
/* i18n for the single-file game.
   The source (index.html) stays Russian. This tool finds every Cyrillic string literal and template in the
   script, splits it into text segments (HTML tags and ${…} stay as they are) and, for segments that have an
   English translation in en.json, rewrites them as `${EN?`english`:`русский`}`. Game data (clubs, nations,
   names) and the internal vocabulary that the logic compares against (tournaments, stages, awards) are never
   rewritten: they stay Russian in the game state and are translated on screen by the display pass, using
   names.json (embedded into the page as I18N_NAMES).

   node i18n/i18n.js todo            → i18n/todo.json: segments without a translation (+ names without one)
   node i18n/i18n.js build [out]     → writes the translated page (default: i18n/index.built.html)
   node i18n/i18n.js check           → validates en.json placeholders */
const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const DIR=__dirname,SRC=path.join(DIR,'..','index.html');
const CY=/[А-Яа-яЁё]/,CYG=/[А-Яа-яЁё]/g;
const readJ=(f,d)=>{try{return JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))}catch(e){return d}};
const EN=readJ('en.json',{}),NAMES=readJ('names.json',{});
const PH=i=>`\u0001${i}\u0002`,PHRE=/\u0001(\d+)\u0002/g;

/* phrases that stay Russian in code: every key of names.json */
const nameKeys=Object.keys(NAMES).filter(k=>k.length>1).sort((a,b)=>b.length-a.length);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const NAME_RE=nameKeys.length?new RegExp(`(?<![А-Яа-яЁёA-Za-z])(?:${nameKeys.map(esc).join('|')})(?![А-Яа-яЁёA-Za-z])`,'g'):null;
const onlyNames=s=>{if(s.includes('|')&&s.split('|').every(x=>x in NAMES||!CY.test(x.replace(/ \d+$/,''))||onlyNames(x)))return true;let t=s.replace(PHRE,' ');if(NAME_RE)t=t.replace(NAME_RE,' ');return !CY.test(t)};

function parse(html){
  const a=html.indexOf('<script>')+8,b=html.lastIndexOf('</script>');
  const js=html.slice(a,b);
  const ast=acorn.parse(js,{ecmaVersion:'latest'});
  const units=[];
  walk.fullAncestor(ast,(node,st,anc)=>{
    const par=anc[anc.length-2];
    if(node.type==='Literal'&&typeof node.value==='string'&&CY.test(node.value)){
      let test=false;
      if(par&&par.type==='BinaryExpression'&&/[=!]==?/.test(par.operator))test=true;
      else if(par&&par.type==='SwitchCase')test=true;
      else if(par&&par.type==='CallExpression'&&par.callee.type==='MemberExpression'&&par.arguments.includes(node)&&['includes','indexOf','startsWith','endsWith','replace','split','has'].includes(par.callee.property.name))test=true;
      else if(par&&par.type==='MemberExpression'&&par.computed&&par.property===node)test=true;
      units.push({k:'s',s:node.start,e:node.end,text:node.value,raw:node.raw,test});
    }else if(node.type==='TemplateLiteral'&&node.quasis.some(q=>CY.test(q.value.cooked))&&!(par&&par.type==='TaggedTemplateExpression')){
      let text='';node.quasis.forEach((q,i)=>{text+=q.value.cooked;if(i<node.expressions.length)text+=PH(i)});
      units.push({k:'t',s:node.start,e:node.end,text,ex:node.expressions.map(x=>[x.start,x.end])});
    }
  });
  units.sort((x,y)=>x.s-y.s||y.e-x.e);
  // skip marker: a line containing i18n:skip
  const lineSkip=new Set();let off=0;js.split('\n').forEach(l=>{if(l.includes('i18n:skip'))lineSkip.add(off+'');off+=l.length+1});
  const skipRanges=[];off=0;js.split('\n').forEach(l=>{if(l.includes('i18n:skip'))skipRanges.push([off,off+l.length]);off+=l.length+1});
  for(const u of units)u.skip=skipRanges.some(([p,q])=>u.s>=p&&u.s<=q);
  return {pre:html.slice(0,a),js,post:html.slice(b),units};
}

/* segments of a string: visible text between tags + title/aria-label/placeholder/alt attribute values */
function segments(text){
  const out=[];const re=/<[^>]*>/g;let last=0,m;
  const pushText=(a,b)=>{const s=text.slice(a,b);if(!CY.test(s))return;const l=s.length-s.trimStart().length,r=s.length-s.trimEnd().length;out.push([a+l,b-r])};
  while((m=re.exec(text))){
    pushText(last,m.index);
    const tag=m[0],ar=/\b(title|aria-label|placeholder|alt)="([^"]*)"/g;let am;
    while((am=ar.exec(tag))){if(CY.test(am[2])){const st=m.index+am.index+am[0].indexOf('"')+1;out.push([st,st+am[2].length])}}
    last=m.index+tag.length;
  }
  pushText(last,text.length);
  return out;
}
/* key: placeholders renumbered by first appearance */
function keyOf(seg){const map=[];const key=seg.replace(PHRE,(_,i)=>{let j=map.indexOf(+i);if(j<0){map.push(+i);j=map.length-1}return `{${j}}`});return {key,map}}

function collect(units){
  const segs=[];
  for(const u of units){
    if(u.skip||(u.k==='s'&&u.test))continue;
    for(const [a,b] of segments(u.text)){const s=u.text.slice(a,b);if(onlyNames(s))continue;segs.push({u,a,b,...keyOf(s)})}
  }
  return segs;
}

const escT=s=>s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
function build(html){
  const P=parse(html);const {js,units}=P;
  const segs=collect(units);const byU=new Map();segs.forEach(s=>{if(!byU.has(s.u))byU.set(s.u,[]);byU.get(s.u).push(s)});
  const missing=new Set();
  // nested rendering: transform a source range applying unit rewrites
  const top=(from,to,list)=>{const r=[];let end=-1;for(const u of list){if(u.s>=from&&u.e<=to&&u.s>=end){r.push(u);end=u.e}}return r};
  const sorted=units;
  function render(from,to){
    let out='',p=from;
    for(const u of top(from,to,sorted.filter(x=>x.s>=from&&x.e<=to))){out+=js.slice(p,u.s)+unit(u);p=u.e}
    return out+js.slice(p,to);
  }
  function unit(u){
    const ss=byU.get(u)||[];
    const exs=u.k==='t'?u.ex.map(([a,b])=>render(a,b)):[];
    const tr=ss.map(s=>{const en=EN[s.key];if(en==null){missing.add(s.key);return null}return en});
    if(u.k==='s'){
      if(!ss.length||tr.every(x=>x==null))return js.slice(u.s,u.e);
      let en='',p=0;ss.forEach((s,i)=>{en+=u.text.slice(p,s.a)+(tr[i]??u.text.slice(s.a,s.b));p=s.b});en+=u.text.slice(p);
      return `(EN?${JSON.stringify(en)}:${u.raw})`;
    }
    // template
    const ph=t=>escT(t).replace(PHRE,(_,i)=>'${'+exs[+i]+'}');
    if(!ss.length||tr.every(x=>x==null))return '`'+ph(u.text)+'`';
    const segCode=(s,en)=>{
      const ru='`'+ph(u.text.slice(s.a,s.b))+'`';
      // order of placeholders in en
      const order=[];en.replace(/\{(\d+)\}/g,(_,i)=>{order.push(+i)});
      const inOrder=order.every((v,i)=>v===i);
      if(inOrder){const e='`'+escT(en).replace(/\\?\{(\d+)\}/g,(_,i)=>'${'+exs[s.map[+i]]+'}')+'`';return `\${EN?${e}:${ru}}`}
      const e='`'+escT(en).replace(/\{(\d+)\}/g,(_,i)=>'${_'+i+'}')+'`';
      return `\${EN?((${s.map.map((_,i)=>'_'+i).join(',')})=>${e})(${s.map.map(j=>exs[j]).join(',')}):${ru}}`;
    };
    let out='`',p=0;
    ss.forEach((s,i)=>{out+=ph(u.text.slice(p,s.a));out+=tr[i]==null?ph(u.text.slice(s.a,s.b)):segCode(s,tr[i]);p=s.b});
    out+=ph(u.text.slice(p))+'`';
    return out;
  }
  const outJs=render(0,js.length);
  const names=JSON.stringify(Object.fromEntries(Object.entries(NAMES).filter(([k,v])=>v)));
  const prose=JSON.stringify(Object.fromEntries(Object.entries(EN).filter(([k,v])=>k.length>=3&&/[а-яё]{2}/.test(k))));
  const final=P.pre+outJs.replace('const I18N_NAMES={};',()=>`const I18N_NAMES=${names};`).replace('const I18N_EN={};',()=>`const I18N_EN=${prose};`)+P.post;
  return {final,missing,segs};
}

function check(){
  let bad=0;
  for(const [k,v] of Object.entries(EN)){
    if(typeof v!=='string'){console.log('NOT STRING',k);bad++;continue}
    const a=(k.match(/\{\d+\}/g)||[]).sort().join(),b=(v.match(/\{\d+\}/g)||[]).sort().join();
    if(a!==b){console.log('PLACEHOLDERS',JSON.stringify(k),'→',JSON.stringify(v));bad++}
    if(CY.test(v)&&!onlyNames(v)){console.log('CYRILLIC LEFT',JSON.stringify(v));bad++}
  }
  console.log(bad?bad+' problems':'en.json ok');return bad;
}

function main(){
const cmd=process.argv[2]||'build';
const html=fs.readFileSync(SRC,'utf8');
if(cmd==='todo'){
  const P=parse(html),segs=collect(P.units);
  const lines=P.js.split('\n');const lineOf=pos=>P.js.slice(0,pos).split('\n').length;
  const todo=new Map();
  for(const s of segs){if(EN[s.key]!=null||todo.has(s.key))continue;
    const pos=s.u.s,ctx=P.js.slice(Math.max(0,pos-70),Math.min(P.js.length,s.u.e+30)).replace(/\s+/g,' ');
    todo.set(s.key,{line:lineOf(pos),ctx:s.key.length<25?ctx.slice(0,200):undefined})}
  const out=[...todo].map(([k,v])=>({ru:k,...v}));
  fs.writeFileSync(path.join(DIR,'todo.json'),'[\n'+out.map(x=>JSON.stringify(x)).join(',\n')+'\n]\n');
  const nm=Object.entries(NAMES).filter(([k,v])=>!v).length;
  console.log(`segments: ${segs.length}, unique: ${new Set(segs.map(s=>s.key)).size}, untranslated: ${out.length} (${out.reduce((a,x)=>a+x.ru.length,0)} chars); names without EN: ${nm}`);
}else if(cmd==='check'){process.exit(check()?1:0)}
else{
  const {final,missing}=build(html);
  const out=process.argv[3]||path.join(DIR,'index.built.html');
  fs.writeFileSync(out,final);
  // sanity: the result must parse
  acorn.parse(final.slice(final.indexOf('<script>')+8,final.lastIndexOf('</script>')),{ecmaVersion:'latest'});
  console.error(`i18n: ${missing.size} untranslated segments → ${path.relative(process.cwd(),out)} (${final.length} bytes)`);
}
}
module.exports={parse,segments,collect,onlyNames,build};
if(require.main===module)main();
