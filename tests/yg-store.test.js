'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Store=require('../platforms/yg-store-core.js');
function mock({purchases=[],fail='',prefs={}}={}){
  const receipts=[...purchases],calls={purchase:0,consume:0,saves:[]};
  let payment=null,data={legendaShop:{prefs}};
  const sdk={
    async getPlayer(){if(fail==='player')throw Error('NO_PLAYER');return {async getData(){return data},async setData(d,flush){calls.saves.push({d,flush});if(fail==='save')throw Error('OFFLINE');data={...data,...d}}}},
    async getPayments(){if(fail==='init')throw Error('UNAVAILABLE');return {
      async getCatalog(){if(fail==='catalog')throw Error('OFFLINE');return Store.products.map(p=>({id:p.id,price:p.price+' TST'})).concat([{id:'unsupported_item',price:'1 TST'}])},
      async getPurchases(){if(fail==='restore')throw Error('OFFLINE');return receipts},
      async purchase({id}){calls.purchase++;if(fail==='purchase')throw Error('CANCELED');if(payment)return payment;const receipt={productID:id,purchaseToken:'paid-'+id};receipts.push(receipt);return receipt},
      async consumePurchase(){calls.consume++}
    }}
  };
  return {sdk,calls,receipts,delayPurchase(p){payment=p}};
}
test('restores permanent ownership on another device; never consumes it',async()=>{
  const m=mock({purchases:[{productID:'disable_ads',purchaseToken:'from-other-device'},{productID:'card_neon',purchaseToken:'neon'}],prefs:{card:'neon'}}),shop=Store.create();
  assert.equal(shop.adsBlocked(),true);assert.equal(await shop.load(m.sdk),true);
  assert.equal(shop.state.catalog.length,8);assert.equal(shop.owns('disable_ads'),true);assert.equal(shop.state.prefs.card,'neon');
  assert.equal(shop.adsBlocked(),true);assert.equal(await shop.buy('disable_ads'),false);assert.equal(m.calls.purchase,0);assert.equal(m.calls.consume,0);
});
test('new purchase applies once, saves preferences, and is recoverable after reload',async()=>{
  const m=mock(),shop=Store.create();await shop.load(m.sdk);assert.equal(shop.adsBlocked(),false);
  assert.equal(await shop.buy('card_gold'),true);assert.equal(shop.state.prefs.card,'gold');assert.equal(m.calls.saves.at(-1).flush,true);
  assert.equal(await shop.buy('card_gold'),false);assert.equal(m.calls.purchase,1);
  const fresh=Store.create();await fresh.load(m.sdk);assert.equal(fresh.owns('card_gold'),true);assert.equal(fresh.state.prefs.card,'gold');assert.equal(m.calls.consume,0);
  await fresh.equip('card_gold');assert.equal(fresh.state.prefs.card,'default');
});
test('cancellation never grants an item or changes style',async()=>{
  const m=mock({fail:'purchase'}),shop=Store.create();await shop.load(m.sdk);assert.equal(await shop.buy('card_gold'),false);
  assert.equal(shop.owns('card_gold'),false);assert.equal(shop.state.prefs.card,'default');assert.equal(shop.state.message,'not_completed');assert.equal(shop.state.busy,false);
});
test('missing/failed SDK or restoration suppresses ads and disables checkout',async()=>{
  for(const fail of ['init','catalog','restore']){const m=mock({fail}),shop=Store.create();assert.equal(await shop.load(m.sdk),false);assert.equal(shop.state.phase,'unavailable');assert.equal(shop.adsBlocked(),true);assert.equal(await shop.buy('disable_ads'),false);assert.equal(m.calls.purchase,0)}
  const shop=Store.create();assert.equal(await shop.load(null),false);
});
test('invalid receipt and unknown, unavailable or unowned products are rejected',async()=>{
  const m=mock(),shop=Store.create();await shop.load(m.sdk);
  assert.equal(await shop.buy('unsupported_item'),false);assert.equal(await shop.equip('card_retro'),false);
  m.delayPurchase(Promise.resolve({productID:'card_gold',purchaseToken:''}));assert.equal(await shop.buy('card_gold'),false);assert.equal(shop.owns('card_gold'),false);
});
test('double-click cannot create simultaneous payments; interrupted success restores later',async()=>{
  const m=mock(),shop=Store.create();await shop.load(m.sdk);let resolve;
  m.delayPurchase(new Promise(r=>resolve=r));const pending=shop.buy('disable_ads');
  assert.equal(await shop.buy('disable_ads'),false);assert.equal(await shop.load(m.sdk),false);assert.equal(m.calls.purchase,1);
  const receipt={productID:'disable_ads',purchaseToken:'interrupted'};m.receipts.push(receipt);resolve(receipt);await pending;
  const fresh=Store.create();await fresh.load(m.sdk);assert.equal(fresh.owns('disable_ads'),true);
});
test('switching accounts removes ownership and preferences from the old account',async()=>{
  const shop=Store.create(),first=mock({purchases:[{productID:'card_gold',purchaseToken:'old'}],prefs:{card:'gold'}}),second=mock();
  await shop.load(first.sdk);assert.equal(shop.state.prefs.card,'gold');await shop.load(second.sdk);assert.equal(shop.owns('card_gold'),false);assert.equal(shop.state.prefs.card,'default');
});
test('preferences cannot unlock unpaid cosmetics; failed preference sync cannot revoke a paid item',async()=>{
  const unpaid=Store.create();await unpaid.load(mock({prefs:{card:'gold',theme:'midnight'}}).sdk);assert.equal(unpaid.state.prefs.card,'default');assert.equal(unpaid.state.prefs.theme,'default');
  const m=mock({fail:'save'}),shop=Store.create();await shop.load(m.sdk);assert.equal(await shop.buy('card_gold'),true);assert.equal(shop.owns('card_gold'),true);assert.equal(shop.state.syncError,true);
  const fresh=Store.create();await fresh.load(m.sdk);assert.equal(fresh.owns('card_gold'),true);
});
test('late results from a previous account never overwrite the current account',async()=>{
  const shop=Store.create(),slow=mock({purchases:[{productID:'disable_ads',purchaseToken:'old'}]});let resolve;
  const getPay=slow.sdk.getPayments;slow.sdk.getPayments=()=>new Promise(r=>resolve=()=>getPay().then(r));
  const loading=shop.load(slow.sdk);await shop.load(mock().sdk);resolve();await loading;assert.equal(shop.owns('disable_ads'),false);assert.equal(shop.state.phase,'ready');
});
