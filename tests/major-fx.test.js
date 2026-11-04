const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

function fixture(name){
 const context={
  S:{trophies:[],label:'2035/36'},
  G:{P:{trophies:[]},C:{job:'club',clubId:1,trophies:[],jobs:[{tro:0}]}},
  BIGCOMP:/^(Лига чемпионов|Чемпионат мира|Чемпионат Европы|Копа Америка|Клубный чемпионат мира)/,
  C:()=>({name:'Arsenal'}),N:()=>({name:'Turkey'}),
  trText:s=>'translated: '+s,
  majorL:(ru,en)=>ru,
  trophyIcon:()=>'art',
  calls:[]
 };
 context.majorWin=o=>context.calls.push(o);
 const match=source.match(new RegExp('function '+name+'\\(n\\)\\{[^\\n]+\\}'));
 assert.ok(match,name+' is present');
 vm.runInNewContext(match[0],context);
 return context;
}

test('player trophy ceremony uses football localization without shared T',()=>{
 const f=fixture('trophy');
 f.trophy('Лига чемпионов');
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].title,'translated: Лига чемпионов');
 assert.deepEqual(f.S.trophies,['Лига чемпионов']);
});

test('coach trophy ceremony uses football localization without shared T',()=>{
 const f=fixture('coachTrophy');
 f.coachTrophy('Лига чемпионов');
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].title,'translated: Лига чемпионов');
 assert.equal(f.G.C.jobs[0].tro,1);
});
