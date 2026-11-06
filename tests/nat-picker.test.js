const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const en=JSON.parse(fs.readFileSync(path.join(__dirname,'../i18n/en.json'),'utf8'));

test('nationality and league fields do not use native selects',()=>{
  for(const id of ['f-nat','f-nat2','m-nat','m-nat2','f-lg','m-lg'])assert.equal(source.includes(`<select id="${id}"`),false,id);
  for(const call of ["natSelect('f-nat'","natSelect('f-nat2'","natSelect('m-nat'","natSelect('m-nat2'","leagueButton('f-lg'","leagueButton('m-lg'"])assert.ok(source.includes(call),call);
  assert.match(source,/data-a="natOpen"/);
  assert.match(source,/data-a="leagueOpen"/);
});

test('touch pickers have search and translated strings',()=>{
  assert.match(source,/function natPickModal\(\)/);
  assert.match(source,/id="nat-q"/);
  assert.match(source,/data-a="pickNat"/);
  assert.match(source,/function leaguePickModal\(\)/);
  assert.match(source,/id="lg-q"/);
  assert.match(source,/data-a="pickLeague"/);
  assert.equal(en['Найти страну'],'Find a country');
  assert.equal(en['Без второго гражданства'],'No second nationality');
  assert.equal(en['Страна не найдена.'],'No country found.');
  assert.equal(en['Найти лигу'],'Find a league');
  assert.equal(en['Лига не найдена.'],'No league found.');
});
