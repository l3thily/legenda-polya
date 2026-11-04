/* Permanent cosmetics plus limited-use Yandex purchases. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LegendaYgStore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const products=[
    {id:'potential_90',group:'gameplay',kind:'consumable',uses:1,price:69,icon:'goat',ru:['Золотое поколение','Одна новая обычная карьера начинается с потенциалом не ниже 90. Покупать можно сколько угодно раз. Не действует в испытаниях и комнатах.'],en:['Golden generation','Boost one new regular player career to at least 90 potential. Unlimited repurchases. No effect in challenges or rooms.']},
    {id:'academy_growth',group:'gameplay',kind:'consumable',uses:1,price:39,icon:'career',ru:['Сборы с академией','Бонус +0,5 к росту на первый сезон одной обычной карьеры. Покупать можно сколько угодно раз.'],en:['Academy camp','A +0.5 development bonus for the first season of one regular player career. Unlimited repurchases.']},
    {id:'medical_team',group:'gameplay',kind:'consumable',uses:1,price:59,icon:'life',ru:['Клиника восстановления','На одну карьеру травмы длятся вдвое меньше, а срок карьеры увеличивается на один год. Повторные покупки без лимита.'],en:['Recovery clinic','For one career, injuries last half as long and the career is extended by one year. Unlimited repurchases.']},
    {id:'cryo_chamber',group:'gameplay',kind:'consumable',uses:1,price:49,icon:'life',ru:['Барокамера дома','На одну карьеру травмы случаются на 20% реже, срок карьеры увеличивается на полсезона. Покупать можно снова без ограничений.'],en:['Home recovery chamber','For one career, injuries are 20% less likely and the career lasts half a season longer. Unlimited repurchases.']},
    {id:'super_agent',group:'gameplay',kind:'consumable',uses:1,price:49,icon:'hall',ru:['Агент топ-уровня','На одну карьеру: +5 к репутации и зарплата первого контракта выше на 25%. Повторные покупки без лимита.'],en:['Top-tier agent','For one career: +5 reputation and 25% higher starting contract wages. Unlimited repurchases.']},
    {id:'signing_bonus',group:'gameplay',kind:'consumable',uses:1,price:59,icon:'saves',ru:['Подъёмные','Добавляет €2 млн к стартовым деньгам одной новой обычной карьеры. Повторные покупки без лимита.'],en:['Signing bonus','Adds €2 million to the starting funds of one new regular career. Unlimited repurchases.']},
    {id:'disable_ads',group:'comfort',kind:'ads',value:'off',price:149,icon:'life',ru:['Без рекламных пауз','Отключает полноэкранную рекламу между сезонами. Добровольные ролики за бонус остаются.'],en:['No ad breaks','Removes interstitial ads between seasons. Optional rewarded videos remain available.']},
    {id:'card_gold',group:'cards',kind:'card',value:'gold',price:79,icon:'goat',ru:['Золотая коллекция','Карточка из чёрного золота: тёмная основа, золотая рамка и сияние.'],en:['Gold collection','A black and gold player card with a gilded frame and sheen.']},
    {id:'card_neon',group:'cards',kind:'card',value:'neon',price:79,icon:'ball',ru:['Под прожекторами','Неоновая карточка: холодный бирюзовый свет и фиолетовые акценты.'],en:['Under the floodlights','A neon player card with cyan light and violet accents.']},
    {id:'card_retro',group:'cards',kind:'card',value:'retro',price:79,icon:'saves',ru:['Классика футбола','Карточка в духе старого футбольного альбома: бумага, печать и бордовая рамка.'],en:['Football classics','A vintage football album card with paper, print and a burgundy frame.']},
    {id:'theme_midnight',group:'themes',kind:'theme',value:'midnight',price:59,icon:'world',ru:['Ночной стадион','Глубокий синий интерфейс с ледяными акцентами на всех экранах.'],en:['Midnight stadium','A deep blue interface with icy accents throughout the game.']},
    {id:'theme_emerald',group:'themes',kind:'theme',value:'emerald',price:59,icon:'career',ru:['Изумрудный газон','Тёмно-зелёный интерфейс с мятными акцентами и атмосферой поля.'],en:['Emerald pitch','A dark green interface with mint accents and a pitch-side feel.']},
    {id:'museum_luxe',group:'museum',kind:'museum',value:'luxe',price:99,icon:'museum',ru:['Зал славы Deluxe','Новое оформление музея: подсвеченные витрины трофеев и рамки для футболок.'],en:['Hall of Fame Deluxe','A museum restyle with illuminated trophy displays and framed shirts.']},
    {id:'supporter_badge',group:'support',kind:'badge',value:'supporter',price:49,icon:'hall',ru:['Друг «Легенды»','Постоянный значок поддержки рядом с названием игры. Спасибо за вклад в развитие!'],en:['Friend of the Legend','A permanent supporter badge next to the game title. Thank you for supporting development!']}
  ];
  const byId=new Map(products.map(p=>[p.id,p]));
  const defaults=()=>({card:'default',theme:'default',museum:'default',badge:'default'});
  function create(onChange){
    const s={phase:'loading',owned:new Set(),catalog:[],prefs:defaults(),consumables:{potential_90:{uses:0,bought:0},academy_growth:{uses:0,bought:0}},busy:false,message:'',syncError:false};
    let sdk=null,payments=null,player=null,generation=0,saveChain=Promise.resolve();
    const emit=()=>{if(onChange)onChange(s)};
    const owns=id=>s.owned.has(id);
    function cleanPrefs(raw){
      const p=defaults();
      for(const def of products)if(def.kind!=='ads'&&owns(def.id)&&raw&&raw[def.kind]===def.value)p[def.kind]=def.value;
      return p;
    }
    async function persist(){
      s.syncError=false;
      if(player&&typeof player.setData==='function'){
        try{await player.setData({legendaShop:{v:1,prefs:{...s.prefs}}},true)}
        catch(e){s.syncError=true}
      }
    }
    function normalizedConsumables(raw){const out={};for(const d of products.filter(x=>x.kind==='consumable')){const v=raw&&raw[d.id]||{};out[d.id]={uses:Math.max(0,Math.floor(+v.uses||0)),bought:Math.max(0,Math.floor(+v.bought||0))}}return out}
    async function saveLedger(){if(!player||typeof player.setData!=='function')return false;const target=player,snapshot={legendaShop:{v:2,prefs:{...s.prefs},consumables:JSON.parse(JSON.stringify(s.consumables)),tokens:s.tokens.slice()}};saveChain=saveChain.catch(()=>{}).then(()=>target.setData(snapshot,true));try{await saveChain;s.syncError=false;return true}catch(e){s.syncError=true;return false}}
    async function settle(p){const d=p&&byId.get(p.productID);if(!d||d.kind!=='consumable'||!p.purchaseToken||!payments||typeof payments.consumePurchase!=='function')return false;
      if(!s.tokens.includes(p.purchaseToken)){const v=s.consumables[d.id];v.bought++;v.uses+=d.uses;s.tokens.push(p.purchaseToken);if(s.tokens.length>100)s.tokens=s.tokens.slice(-100);if(!await saveLedger())return false}
      try{await payments.consumePurchase(p.purchaseToken)}catch(e){s.syncError=true}return true}
    async function load(nextSdk){
      if(s.busy)return false;
      sdk=nextSdk||sdk;const gen=++generation;
      s.phase='loading';s.message='';s.owned=new Set();s.catalog=[];s.prefs=defaults();s.consumables=normalizedConsumables(null);s.tokens=[];
      payments=null;player=null;emit();
      try{
        const pay=typeof sdk.getPayments==='function'?await sdk.getPayments({signed:false}):sdk.payments;
        if(!pay)throw Error('NO_PAYMENTS');
        const [catalog,purchases]=await Promise.all([pay.getCatalog(),pay.getPurchases()]);
        if(!Array.isArray(catalog)||!Array.isArray(purchases))throw Error('INVALID_PAYMENTS');
        if(gen!==generation)return false;
        payments=pay;
        s.catalog=catalog.filter(p=>p&&byId.has(p.id)&&typeof p.price==='string'&&/\d/.test(p.price));
        try{
          const nextPlayer=await sdk.getPlayer();
          const data=await nextPlayer.getData(['legendaShop']);
          if(gen!==generation)return false;
          player=nextPlayer;const shop=data&&data.legendaShop||{};s.prefs=cleanPrefs(shop.prefs);s.consumables=normalizedConsumables(shop.consumables);s.tokens=Array.isArray(shop.tokens)?shop.tokens.filter(x=>typeof x==='string').slice(-100):[];
        }catch(e){/* Ownership works independently of cosmetic preferences. */}
        s.owned=new Set(purchases.filter(p=>p&&byId.has(p.productID)&&byId.get(p.productID).kind!=='consumable'&&typeof p.purchaseToken==='string'&&p.purchaseToken).map(p=>p.productID));
        for(const p of purchases.filter(p=>p&&byId.get(p.productID)?.kind==='consumable')){if(gen!==generation)return false;await settle(p)}
        if(gen===generation){s.phase='ready';emit();return true}
        return false;
      }catch(e){
        if(gen===generation){s.phase='unavailable';s.message='unavailable';emit()}
        return false;
      }
    }
    async function buy(id){
      const def=byId.get(id);
      if(s.busy||s.phase!=='ready'||!def||!s.catalog.some(p=>p.id===id)||(def.kind!=='consumable'&&owns(id)))return false;
      s.busy=true;s.message='';emit();
      try{
        const receipt=await payments.purchase({id});
        if(!receipt||receipt.productID!==id||typeof receipt.purchaseToken!=='string'||!receipt.purchaseToken)throw Error('INVALID_RECEIPT');
        if(def.kind==='consumable'){if(!await settle(receipt))throw Error('PENDING_SETTLEMENT')}
        else{s.owned.add(id);if(['card','theme','museum','badge'].includes(def.kind))s.prefs[def.kind]=def.value}
        s.message='purchased';if(def.kind!=='consumable')await persist();return true;
      }catch(e){s.message='not_completed';return false}
      finally{s.busy=false;emit()}
    }
    async function equip(id){
      if(s.busy)return false;
      const def=byId.get(id);
      if(!def||!['card','theme','museum','badge'].includes(def.kind)||!owns(id))return false;
      s.prefs[def.kind]=s.prefs[def.kind]===def.value?'default':def.value;
      s.message='';s.busy=true;emit();
      try{await persist();return true}finally{s.busy=false;emit()}
    }
    function use(id){const def=byId.get(id),v=s.consumables[id];if(!def||def.kind!=='consumable'||!v||v.uses<1)return false;v.uses--;void saveLedger();emit();return true}
    return {state:s,load,buy,equip,use,owns,adsBlocked:()=>s.phase!=='ready'||owns('disable_ads')};
  }
  return {products,byId,defaults,create};
});
