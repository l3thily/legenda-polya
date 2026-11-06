const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const en=JSON.parse(fs.readFileSync(path.join(__dirname,'../i18n/en.json'),'utf8'));

test('nationality fields do not use native selects',()=>{
  for(const id of ['f-nat','f-nat2','m-nat','m-nat2'])assert.equal(source.includes(`<select id="${id}"`),false,id);
  for(const call of ["natSelect('f-nat'","natSelect('f-nat2'","natSelect('m-nat'","natSelect('m-nat2'"])assert.ok(source.includes(call),call);
  assert.match(source,/data-a="natOpen"/);
});

test('touch nationality picker has search and translated strings',()=>{
  assert.match(source,/function natPickModal\(\)/);
  assert.match(source,/id="nat-q"/);
  assert.match(source,/data-a="pickNat"/);
  assert.equal(en['Найти страну'],'Find a country');
  assert.equal(en['Без второго гражданства'],'No second nationality');
  assert.equal(en['Страна не найдена.'],'No country found.');
});
