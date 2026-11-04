/* Injected by yg_assets.py into Yandex builds only, before the game's boot. */
const YG_STORE={open:false,preview:null,filter:'all',returnFocus:null,authBusy:false,pausedAt:0,deadline:null};
const ygStoreText=(ru,en)=>EN?en:ru;
const ygStore=LegendaYgStore.create(()=>ygStoreDraw());
// The two gameplay perks are permanent account entitlements, applied only in ordinary
// player careers. Challenges and multiplayer rooms keep their equal-start rules.
const ygOriginalEndSeasonPlayer=endSeasonPlayer;
endSeasonPlayer=function(){if(G&&G.P&&G.P.academyBoost){G.P.growMod+=.5;G.P.academyBoost=false}return ygOriginalEndSeasonPlayer()};
const ygOriginalStartCareer=startCareer;
startCareer=function(){const ok=ygOriginalStartCareer();if(ok&&G&&G.P&&!UI.chal&&!UI.roomSeed){let applied=false;if(ygStore.use('potential_90')){G.P.pot=Math.max(90,G.P.pot);G.summer.push(ygStoreText('Скаутская сеть открыла карьеру с потенциалом не ниже 90.','Scouting network set your starting potential to at least 90.'));applied=true}if(ygStore.use('academy_growth')){G.P.academyBoost=true;G.summer.push(ygStoreText('Академия проведёт для вас усиленный сбор в первом сезоне.','The academy will boost your development during your first season.'));applied=true}if(ygStore.use('medical_team')){G.P.own.clinic=G.year;G.P.retireAge+=1;G.summer.push(ygStoreText('К вашей карьере прикреплена клиника: травмы будут заживать вдвое быстрее.','A recovery clinic joins your career: injuries will heal twice as fast.'));applied=true}if(ygStore.use('cryo_chamber')){G.P.own.cryo=G.year;G.P.retireAge+=.5;G.summer.push(ygStoreText('Домашняя барокамера снизит риск травм на 20% на протяжении карьеры.','A home recovery chamber reduces injury risk by 20% for this career.'));applied=true}if(ygStore.use('super_agent')){G.P.rep=Math.min(100,G.P.rep+5);G.P.wage=Math.round(G.P.wage*1.25);G.summer.push(ygStoreText('Агент добился повышения зарплаты первого контракта на 25%.','Your agent raised the first contract wage by 25%.'));applied=true}if(ygStore.use('signing_bonus')){G.P.earn+=2e6;G.P.gross+=2;G.summer.push(ygStoreText('Вы получили €2 млн подъёмных.','You received a €2 million signing bonus.'));applied=true}if(applied){save();render()}}return ok};
const ygStoreBag='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>';
function ygStoreAdsBlocked(){return YG_STORE.open||ygStore.state.busy||ygStore.adsBlocked()}
function ygStoreInit(sdk){return ygStore.load(sdk)}
function ygStoreUnavailable(){ygStore.state.phase='unavailable';ygStore.state.message='unavailable';ygStoreDraw()}
const ygOriginalPlay=ygPlay;
ygPlay=function(on){ygOriginalPlay(on&&!YG_STORE.open&&!ygStore.state.busy&&!YG_STORE.authBusy&&document.visibilityState!=='hidden')};
const ygOriginalLiveTick=liveTick,ygOriginalDeadlineTick=dlTick;
liveTick=function(){if(YG_STORE.open){clearTimeout(UI.liveT);return}ygOriginalLiveTick()};
dlTick=function(){if(!YG_STORE.open)ygOriginalDeadlineTick()};
const ygOriginalTopbar=topbar;
topbar=function(){
  const label=ygStoreText('Магазин','Shop');
  let html=ygOriginalTopbar().replace('<div class="topact">',`<div class="topact"><button class="btn ghost yg-shop-nav" data-yg-store="open" aria-label="${label}" title="${label}">${ygStoreBag}<span>${label}</span></button>`);
  if(ygStore.state.prefs.badge==='supporter')html=html.replace('<i></i>',`<i></i><span class="yg-supporter" title="${ygStoreText('Друг «Легенды»','Friend of the Legend')}">★</span>`);
  return html;
};
const ygOriginalHome=viewHome;
viewHome=function(){return ygOriginalHome()+`<section class="panel yg-store-invite"><div><p class="eyebrow">${ygStoreText('Твоя карьера. Твой стиль.','Your career. Your style.')}</p><h2>${ygStoreText('Коллекция «Легенды»','The Legend collection')}</h2><p class="small muted">${ygStoreText('Особенные карточки, атмосфера стадиона и поддержка игры.','Special player cards, stadium atmosphere and support for the game.')}</p></div><button class="btn primary" data-yg-store="open">${ygStoreText('Открыть магазин','Open shop')} →</button></section>`};
const ygOriginalRender=render;
render=function(){ygOriginalRender();ygStoreApply();ygStoreDraw()};
function ygStoreApply(){
  const prefs={...ygStore.state.prefs},def=YG_STORE.open&&LegendaYgStore.byId.get(YG_STORE.preview);
  if(def&&def.kind!=='ads')prefs[def.kind]=def.value;
  for(const kind of ['card','theme','museum'])document.body.dataset['yg'+kind[0].toUpperCase()+kind.slice(1)]=prefs[kind];
  document.body.classList.toggle('yg-store-open',YG_STORE.open);
}
function ygStorePrice(p){
  let uri='';try{uri=p.getPriceCurrencyImage('small')}catch(e){}
  if(typeof uri!=='string'||(!/^https:\/\//.test(uri)&&!uri.startsWith('data:image/svg+xml,')))uri='';
  return `<span class="yg-price">${esc(p.price)}${uri?`<img src="${esc(uri)}" alt="" width="18" height="18">`:''}</span>`;
}
function ygStoreMessage(){
  const s=ygStore.state;
  if(s.message==='purchased')return ygStoreText('Покупка получена. Спасибо за поддержку!','Purchase received. Thank you for your support!');
  if(s.message==='not_completed')return ygStoreText('Покупка не завершена. Если оплата прошла, нажмите «Восстановить покупки».','Purchase was not completed. If you were charged, select Restore purchases.');
  if(s.phase==='unavailable')return ygStoreText('Магазин временно недоступен. Попробуйте восстановить покупки позже.','The shop is temporarily unavailable. Try restoring purchases later.');
  return '';
}
function ygStoreOffer(p){
  const def=LegendaYgStore.byId.get(p.id),s=ygStore.state,owned=ygStore.owns(p.id),selected=s.prefs[def.kind]===def.value,active=YG_STORE.preview===p.id;
  const stock=def.kind==='consumable'?s.consumables[p.id]:null;
  const title=p.title||def[EN?'en':'ru'][0],desc=p.description||def[EN?'en':'ru'][1];
  return `<article class="yg-offer ${active?'previewing':''} ${owned?'owned':''}" data-yg-offer="${p.id}">
    <button class="yg-offer-art art-${def.kind}-${def.value}" data-yg-store="preview" data-id="${p.id}" aria-label="${esc(ygStoreText('Примерить: ','Preview: ')+title)}"><span>${ico(def.icon)}</span><i>${def.kind==='card'?'93':def.kind==='ads'?'▶':def.kind==='badge'?'★':''}</i><small>${ygStoreText('ПРИМЕРИТЬ','PREVIEW')} ↗</small></button>
    <div class="yg-offer-copy"><span class="yg-offer-type">${stock?ygStoreText(`Осталось применений: ${stock.uses} · покупок: ${stock.bought}`,`Uses left: ${stock.uses} · purchases: ${stock.bought}`):owned?ygStoreText('В коллекции','In your collection'):ygStoreText('Разовая покупка · навсегда','One-time purchase · permanent')}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>
    <div class="yg-offer-bottom">${owned?`<span class="yg-owned">✓ ${ygStoreText('Куплено','Owned')}</span>`:ygStorePrice(p)}
    ${stock?`<button class="btn primary mini" data-yg-store="buy" data-id="${p.id}" ${s.busy||YG_STORE.authBusy||s.phase!=='ready'?'disabled':''}>${s.busy?ygStoreText('Подождите…','Please wait…'):ygStoreText(stock.uses?'Купить ещё':'Купить применение',stock.uses?'Buy again':'Buy a use')}</button>`:owned?(['ads','perk'].includes(def.kind)?`<span class="yg-active">${ygStoreText('Активно','Active')}</span>`:`<button class="btn mini ${selected?'ghost':'primary'}" data-yg-store="equip" data-id="${p.id}" ${s.busy?'disabled':''}>${selected?ygStoreText('Снять','Unequip'):ygStoreText('Применить','Equip')}</button>`):`<button class="btn primary mini" data-yg-store="buy" data-id="${p.id}" ${s.busy||YG_STORE.authBusy||s.phase!=='ready'?'disabled':''}>${s.busy?ygStoreText('Подождите…','Please wait…'):ygStoreText('Купить','Buy')}</button>`}</div></article>`;
}
function ygStoreSample(){
  const def=LegendaYgStore.byId.get(YG_STORE.preview),P=G&&G.P&&!isCoach()?G.P:null;
  const card=playerCard({ovr:P?Math.round(P.ovr):93,pos:P?POS[P.pos].s:(EN?'ST':'НАП'),age:P?P.age:27,num:P?P.num:10,name:P?P.name:ygStoreText('Твоя легенда','Your legend'),club:P?C(P.clubId).name:ygStoreText('Клуб мечты','Dream club'),nat:P?N(P.nat).name:'Россия',face:P?P.face:'f01',posFull:ygStoreText('Коллекция «Легенды»','The Legend collection')});
  const title=def?def[EN?'en':'ru'][0]:ygStoreText('Твоя легенда','Your legend');
  const gameplay=def&&def.id==='potential_90'?`<div class="yg-gameplay-preview"><span>${ygStoreText('ОДНА НОВАЯ КАРЬЕРА','ONE NEW CAREER')}</span><b>90+</b><small>${ygStoreText('потенциал · покупок без лимита','potential · unlimited purchases')}</small></div>`:def&&def.id==='academy_growth'?`<div class="yg-gameplay-preview"><span>${ygStoreText('ОДИН СЕЗОН','ONE SEASON')}</span><b>+0,5</b><small>${ygStoreText('к росту · покупок без лимита','development · unlimited purchases')}</small></div>`:def&&def.id==='medical_team'?`<div class="yg-gameplay-preview"><span>${ygStoreText('ОДНА КАРЬЕРА','ONE CAREER')}</span><b>½</b><small>${ygStoreText('срок травм · +1 год карьеры','injury duration · +1 career year')}</small></div>`:def&&def.id==='cryo_chamber'?`<div class="yg-gameplay-preview"><span>${ygStoreText('ОДНА КАРЬЕРА','ONE CAREER')}</span><b>−20%</b><small>${ygStoreText('риск травм · +½ сезона','injury risk · +½ season')}</small></div>`:def&&def.id==='super_agent'?`<div class="yg-gameplay-preview"><span>${ygStoreText('СТАРТ КАРЬЕРЫ','CAREER START')}</span><b>+25%</b><small>${ygStoreText('к стартовой зарплате · +5 репутации','starting wage · +5 reputation')}</small></div>`:def&&def.id==='signing_bonus'?`<div class="yg-gameplay-preview"><span>${ygStoreText('СТАРТ КАРЬЕРЫ','CAREER START')}</span><b>€2M</b><small>${ygStoreText('подъёмные на одну карьеру','starting funds for one career')}</small></div>`:'';
  return `<aside class="yg-fitting"><div class="yg-fitting-head"><span class="eyebrow">${ygStoreText('Примерочная','Fitting room')}</span><button class="btn ghost mini" data-yg-store="clear">${ygStoreText('Сбросить примерку','Reset preview')}</button></div><div class="yg-fitting-stage">${gameplay||card}${!gameplay&&def&&def.kind==='badge'?`<span class="yg-sample-badge">★ ${ygStoreText('Друг «Легенды»','Friend of the Legend')}</span>`:''}</div>
    <div class="yg-mini-museum"><span>${ico('hall')}</span><span>${ico('career')}</span><span>${ico('goat')}</span></div><h3>${esc(title)}</h3><p class="small muted">${gameplay?ygStoreText('Одна покупка — одно применение при начале новой обычной карьеры игрока. Испытания и комнаты сохраняют равные условия.','One purchase gives one use when starting a new regular player career. Challenges and rooms remain balanced.'):ygStoreText('Примерка бесплатная. Выберите оформление в витрине, чтобы увидеть его здесь.','Previews are free. Select a style in the shop to see it here.')}</p><p class="yg-fitting-note">${gameplay?ygStoreText('Применение расходуется при старте карьеры; бонус не остаётся навсегда.','A use is spent when a career starts; the bonus is temporary.'):ygStoreText('Оформление не меняет рейтинг, результаты матчей и таблицу GOAT.','Styles do not change ratings, match results or GOAT rankings.')}</p></aside>`;
}
function ygStoreDraw(){
  ygStoreApply();
  const app=document.getElementById('app');if(!app)return;
  let host=document.getElementById('yg-shop');
  if(!YG_STORE.open){if(host)host.remove();app.inert=false;return}
  app.inert=true;
  if(!host){host=document.createElement('div');host.id='yg-shop';host.className='yg-store';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','yg-store-title');host.tabIndex=-1;document.body.appendChild(host)}
  const scroll=host.scrollTop,s=ygStore.state,focus=host.contains(document.activeElement)?document.activeElement.dataset:null;
  const groups=[['all',ygStoreText('Всё','All')],['gameplay',ygStoreText('На игру','Gameplay')],['cards',ygStoreText('Карточки','Cards')],['themes',ygStoreText('Атмосфера','Atmosphere')],['museum',ygStoreText('Музей','Museum')],['comfort',ygStoreText('Комфорт','Comfort')],['support',ygStoreText('Поддержать','Support')]];
  const list=s.catalog.filter(p=>YG_STORE.filter==='all'||LegendaYgStore.byId.get(p.id).group===YG_STORE.filter);
  const msg=ygStoreMessage();
  host.innerHTML=`<div class="yg-store-shell"><header class="yg-store-header"><a class="yg-store-wordmark" href="#" data-yg-store="close">${ico('ball')} ЛЕГЕНДА <span>COLLECTION</span></a><button class="btn ghost" data-yg-store="close" ${s.busy||YG_STORE.authBusy?'disabled':''}>${ygStoreText('Вернуться в игру','Back to game')} ×</button></header>
    ${window.__YG_SHOP_PREVIEW?`<div class="yg-demo-banner"><b>${ygStoreText('Локальная примерка','Local preview')}</b> · ${ygStoreText('14 вариантов для выбора. Тестовые цены, деньги не списываются.','14 options to choose from. Test prices; no real money is charged.')}<button data-yg-store="reset-demo" class="btn ghost mini" ${s.busy?'disabled':''}>${ygStoreText('Сбросить тестовые покупки','Reset test purchases')}</button></div>`:''}
    <div class="yg-store-intro"><p class="eyebrow">${ygStoreText('Карьера и атмосфера','Career and atmosphere')}</p><h1 id="yg-store-title">${ygStoreText('Твоя карьера.<br><em>Твои правила.</em>','Your career.<br><em>Your rules.</em>')}</h1><p>${ygStoreText('Выбери игровые преимущества или собери оформление. Покупки остаются с твоим аккаунтом Яндекса.','Choose gameplay perks or personalize the look. Purchases stay with your Yandex account.')}</p></div>
    <div class="yg-store-layout"><div class="yg-store-catalog"><nav class="yg-store-filters" aria-label="${ygStoreText('Категории магазина','Shop categories')}">${groups.map(([k,n])=>`<button data-yg-store="filter" data-id="${k}" aria-pressed="${YG_STORE.filter===k}">${n}</button>`).join('')}</nav>
    <div class="yg-store-status" role="status" aria-live="polite">${s.phase==='loading'?ygStoreText('Загружаем коллекцию и восстанавливаем покупки…','Loading the collection and restoring purchases…'):esc(msg)}</div>
    <div class="yg-offers">${list.map(ygStoreOffer).join('')}</div>
    ${!list.length&&s.phase==='ready'?`<p class="note">${ygStoreText('В этой категории пока нет доступных товаров.','There are no available items in this category yet.')}</p>`:''}
    <footer class="yg-store-footer"><button class="btn ghost" data-yg-store="restore" ${s.busy||YG_STORE.authBusy||s.phase==='loading'?'disabled':''}>${ygStoreText('Восстановить покупки','Restore purchases')}</button><p>${ygStoreText('Оформление покупается навсегда. Игровой бонус даёт одно применение на карьеру; после расходования его можно покупать снова без ограничений.','Cosmetics are permanent. Each gameplay purchase gives one career use and can be repurchased without a limit after use.')}</p>${s.syncError?`<p role="status">${ygStoreText('Покупка или применение сохранены, но Яндекс пока не подтвердил обработку расходуемого товара. Повторите восстановление позже.','Your item is saved, but Yandex has not confirmed consumable processing yet. Restore purchases again later.')}</p>`:''}</footer></div>${ygStoreSample()}</div></div>`;
  host.scrollTop=scroll;
  if(focus&&focus.ygStore){const el=[...host.querySelectorAll('[data-yg-store]')].find(x=>x.dataset.ygStore===focus.ygStore&&x.dataset.id===focus.id&&!x.disabled);(el||host).focus({preventScroll:true})}
}
function ygStoreOpen(){
  if(YG_STORE.open)return;
  YG_STORE.returnFocus=document.activeElement;YG_STORE.open=true;
  YG_STORE.pausedAt=Date.now();YG_STORE.deadline=UI.dlFor;
  clearTimeout(UI.liveT);clearInterval(UI.dlTimer);UI.dlTimer=null;
  sndHold('store',1);ygPlay(0);ygStoreDraw();document.getElementById('yg-shop').focus();
}
function ygStoreClose(){
  if(ygStore.state.busy||YG_STORE.authBusy)return;
  if(YG_STORE.deadline&&UI.dlFor===YG_STORE.deadline)UI.dlT+=Date.now()-YG_STORE.pausedAt;
  YG_STORE.open=false;YG_STORE.preview=null;ygStoreDraw();render();sndHold('store',0);ygPlay(1);
  const old=YG_STORE.returnFocus;if(old&&old.isConnected)old.focus();else document.querySelector('[data-yg-store="open"]')?.focus();
}
async function ygStoreBuy(id){
  if(ygStore.state.busy||YG_STORE.authBusy)return;
  YG_STORE.authBusy=true;ygStoreDraw();
  try{
    let player=await YGS.sdk.getPlayer();
    if(!player.isAuthorized()){
      await YGS.sdk.auth.openAuthDialog();
      if(!await ygStore.load(YGS.sdk))return;
      player=await YGS.sdk.getPlayer();if(!player.isAuthorized())return;
    }
    YG_STORE.preview=null;await ygStore.buy(id);
  }catch(e){ygStore.state.message='not_completed'}
  finally{YG_STORE.authBusy=false;render()}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-yg-store]');if(!b)return;e.preventDefault();
  if(b.disabled)return;
  const a=b.dataset.ygStore,id=b.dataset.id;
  if(a==='open')ygStoreOpen();
  else if(a==='close')ygStoreClose();
  else if(a==='preview'){YG_STORE.preview=id;ygStoreDraw()}
  else if(a==='clear'){YG_STORE.preview=null;ygStoreDraw()}
  else if(a==='filter'){YG_STORE.filter=id;ygStoreDraw()}
  else if(a==='buy')void ygStoreBuy(id);
  else if(a==='equip'){YG_STORE.preview=null;void ygStore.equip(id).then(()=>render())}
  else if(a==='restore'){YG_STORE.preview=null;void ygStoreInit(YGS.sdk).then(()=>{render()})}
  else if(a==='reset-demo'&&window.__YG_SHOP_PREVIEW&&YGS.sdk.resetShopDemo){YGS.sdk.resetShopDemo();YG_STORE.preview=null;void ygStoreInit(YGS.sdk).then(()=>render())}
});
document.addEventListener('keydown',e=>{
  if(!YG_STORE.open)return;
  if(e.key==='Escape'){e.preventDefault();ygStoreClose()}
  if(e.key==='Tab'){
    const host=document.getElementById('yg-shop'),items=[...host.querySelectorAll('button:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);
    if(!host.contains(document.activeElement)&&document.activeElement!==host)return;
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===host)){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===host)){e.preventDefault();first?.focus()}
  }
});
if(window.__YG_SHOP_PREVIEW)setTimeout(ygStoreOpen,0);
