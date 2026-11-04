/* Local-only payment simulator. yg_assets.py NEVER adds this to the upload ZIP. */
(function(){
  'use strict';
  const key='legenda-yg-shop-demo-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}};
  const write=d=>localStorage.setItem(key,JSON.stringify(d));
  const en=()=>new URLSearchParams(location.search).get('lang')==='en';
  const sdk={
    environment:{i18n:{lang:en()?'en':'ru'}},
    features:{LoadingAPI:{ready(){}},GameplayAPI:{start(){},stop(){}}},
    adv:{showFullscreenAdv({callbacks:c}){c.onOpen?.();c.onClose?.()},showRewardedVideo({callbacks:c}){c.onOpen?.();c.onRewarded?.();c.onClose?.()}},
    auth:{async openAuthDialog(){}},
    async getPlayer(){return {isAuthorized:()=>true,getUniqueID:()=> 'local-preview',async getData(){return read().data||{}},async setData(data){const d=read();d.data={...d.data,...data};write(d)}}},
    async getPayments(){return sdk.payments},
    resetShopDemo(){localStorage.removeItem(key)},
    payments:{
      async getCatalog(){return LegendaYgStore.products.map(p=>({id:p.id,title:p[en()?'en':'ru'][0],description:p[en()?'en':'ru'][1],price:p.price+' TST',priceValue:String(p.price),priceCurrencyCode:'TST',getPriceCurrencyImage:()=> 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23d6b768%22/%3E%3Ctext x=%2212%22 y=%2217%22 text-anchor=%22middle%22 font-size=%2215%22%3E%C2%A5%3C/text%3E%3C/svg%3E'}))},
      async getPurchases(){return read().purchases||[]},
      async consumePurchase(token){const d=read();d.purchases=(d.purchases||[]).filter(p=>p.purchaseToken!==token);write(d)},
      purchase({id}){return new Promise((resolve,reject)=>{
        const def=LegendaYgStore.byId.get(id);if(!def){reject(Error('UNKNOWN_PRODUCT'));return}
        const modal=document.createElement('div');modal.className='yg-test-checkout';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
        modal.style.cssText='position:fixed;inset:0;z-index:150;background:#000c;display:grid;place-items:center;padding:20px';
        modal.innerHTML=`<div style="width:min(420px,100%);padding:28px;background:#14202d;color:#edf4fa;border:1px solid #476179;border-radius:18px;font:14px/1.6 sans-serif"><small style="color:#8ccfff">${en()?'LOCAL PAYMENT SIMULATOR':'ЛОКАЛЬНЫЙ СИМУЛЯТОР ОПЛАТЫ'}</small><h2 style="margin:14px 0">${def[en()?'en':'ru'][0]}</h2><p>${def.price} TST · ${en()?'No real charge':'Без списания денег'}</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px"><button class="btn primary" data-test-pay="success">${en()?'Simulate purchase':'Тестовая покупка'}</button><button class="btn ghost" data-test-pay="cancel">${en()?'Cancel':'Отмена'}</button><button class="btn ghost" data-test-pay="error">${en()?'Network error':'Ошибка сети'}</button></div></div>`;
        const previous=document.activeElement;
        const finish=choice=>{modal.remove();if(previous?.isConnected)previous.focus();if(choice!=='success'){reject(Error(choice==='cancel'?'CANCELED':'NETWORK_ERROR'));return}const d=read(),receipt={productID:id,purchaseToken:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2)};d.purchases=[...(d.purchases||[]),receipt];write(d);resolve(receipt)};
        modal.addEventListener('click',e=>{const b=e.target.closest('[data-test-pay]');if(b)finish(b.dataset.testPay)});
        modal.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish('cancel')}if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button')],i=buttons.indexOf(document.activeElement),next=(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length;e.preventDefault();buttons[next].focus()}});
        document.body.appendChild(modal);modal.querySelector('button').focus();
      })}
    }
  };
  window.YaGames={async init(){return sdk}};
})();
