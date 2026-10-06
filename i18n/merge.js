// tr/NNN.txt lines "index<TAB>english" → en.json, keyed by the Russian text from tr/todo-snapshot*.json
const fs=require('fs'),path=require('path');const D=__dirname;
const en=fs.existsSync(D+'/en.json')?JSON.parse(fs.readFileSync(D+'/en.json','utf8')):{};
for(const snap of fs.readdirSync(D+'/tr').filter(f=>/^todo-snapshot.*\.json$/.test(f))){
  const todo=JSON.parse(fs.readFileSync(D+'/tr/'+snap,'utf8'));const tag=snap.replace(/^todo-snapshot|\.json$/g,'');
  for(const f of fs.readdirSync(D+'/tr').filter(f=>f.endsWith('.txt')&&(tag?f.startsWith(tag+'-'):/^\d/.test(f)))){
    for(const line of fs.readFileSync(D+'/tr/'+f,'utf8').split('\n')){if(!line.trim())continue;const i=line.indexOf('\t');const k=+line.slice(0,i);const v=line.slice(i+1);
      if(!todo[k]){console.log('bad index',f,k);continue}en[todo[k].ru]=v.replace(/\\n/g,'\n')}
  }
}
if(fs.existsSync(D+'/tr/extra.json'))Object.assign(en,JSON.parse(fs.readFileSync(D+'/tr/extra.json','utf8')));
fs.writeFileSync(D+'/en.json','{\n'+Object.entries(en).map(([k,v])=>JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n}\n');
console.log('en.json:',Object.keys(en).length);
// names: tr/names-NNN.txt lines "index<TAB>english" → names.json, keyed by tr/names-snapshot.json
{const snap=JSON.parse(fs.readFileSync(D+'/tr/names-snapshot.json','utf8'));const nm=JSON.parse(fs.readFileSync(D+'/names.json','utf8'));
for(const f of fs.readdirSync(D+'/tr').filter(f=>/^names-\d+\.txt$/.test(f)))for(const line of fs.readFileSync(D+'/tr/'+f,'utf8').split('\n')){if(!line.trim())continue;const i=line.indexOf('\t');const k=snap[+line.slice(0,i)];if(k==null){console.log('bad name index',f,line);continue}nm[k]=line.slice(i+1)}
fs.writeFileSync(D+'/names.json','{\n'+Object.entries(nm).map(([k,v])=>JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n}\n');
console.log('names.json:',Object.keys(nm).length,'empty:',Object.values(nm).filter(v=>!v).length)}
