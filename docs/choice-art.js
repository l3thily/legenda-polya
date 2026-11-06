/* The same small, shaded vector people as the Legend menu, drawn for choice cards. */
(function(){
 'use strict';
 const palettes={fb:['#79D4A4','#284E40'],hk:['#8ED8ED','#284459'],bb:['#EDA675','#583B32'],tn:['#B0D87D','#344A33'],f1:['#EF8581','#573640'],ufc:['#EA8B87','#50313D'],cs:['#B5A3F2','#39334F'],dota:['#E79C84','#513833'],lol:['#E5C985','#514733'],val:['#EF9DAD','#53323F'],fn:['#8FCBED','#30465D'],cr:['#C4A0F0','#49365E'],bs:['#F1D07E','#514C30'],hub:['#E2C488','#514633']};
 const p=(d,f,s='none',w=2)=>'<path d="'+d+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const c=(x,y,r,f)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'"/>';
 function unit(game,role,accent){
  const martial=game==='ufc',ice=game==='hk',goalie=ice&&role==='G',race=game==='f1',magic=['dota','lol'].includes(game);
  if(race)return '<g class="lc-art-kart"><ellipse cx="0" cy="24" rx="43" ry="8" fill="#07111A" opacity=".6"/>'+p('M-33 14-17 3 19 3 39 16 21 26-26 24Z',accent)+p('M-25 14 25 14 16 21-21 21Z','#C9D6DC')+p('M-29 8v23M28 10v23','none','#192736',9)+c(0,-4,16,'#DCE6EB')+p('M-14-10q13-17 28 0v8h-28Z',accent)+p('M-12-4h24v8h-24Z','#293B4F')+'</g>';
  let gear='';
  if(game==='fb')gear='<g class="lc-art-ball">'+c(27,35,9,'#E4ECEC')+p('m27 30 5 4-2 5h-6l-2-5Z','#364C56')+'</g>';
  if(ice)gear=p('M-16 6-32 36-48 37','none','#D8C9AA',4)+'<g class="lc-art-puck">'+p('M-50 38h10v3h-10Z','#B0D9E6')+'</g>';
  if(game==='bb')gear='<g class="lc-art-ball">'+c(24,20,10,'#D78D58')+p('M15 20h18M24 10v20M18 12q10 7 0 16','none','#5E392C',1.1)+'</g>';
  if(game==='tn')gear='<g class="lc-art-racket">'+p('M17 9 30-8','none','#D8E3E6',4)+'<ellipse cx="35" cy="-14" rx="10" ry="14" transform="rotate(30 35 -14)" fill="#243B43" stroke="#C9D6DF" stroke-width="3"/>'+p('M29-22 40-6M29-15l12-5','none','#81B8B2',1)+'</g><g class="lc-art-tennis">'+c(48,-16,4,'#E1ECA0')+'</g>';
  if(magic)gear=p('M-13-8-30 34-9 27 0 34 13 27 29 34 13-8Z',game==='dota'?'#674747':'#536882')+'<g class="lc-art-magic">'+c(27,-14,7,accent)+c(27,-14,3,'#F5E5BD')+'</g>';
  if(['cs','val'].includes(game))gear=p('M10 2h30v7H24v8h-7V9H7Z','#8D9EAD')+p('M34 3h12','none',accent,3);
  if(['fn','cr','bs'].includes(game))gear='<g class="lc-art-controller">'+p('M-21 2q21-10 42 0l5 13-9 4-9-7H-7l-9 7-10-4Z','#CCDCE5')+p('M-14 3v10M-19 8h10','none','#405C71',2)+c(14,6,2,accent)+c(19,10,2,'#E69A9A')+'</g>';
  const stance=martial&&/wrest|judo|bjj|sambo|grap/.test(role||'');
  return '<g class="lc-art-person '+(stance?'lc-art-grapple':'')+'"><ellipse cx="0" cy="38" rx="24" ry="6" fill="#07111A" opacity=".65"/>'+ (magic?gear:'')+
   '<g class="lc-art-legs">'+p('M-14 10-21 33h12L0 18 9 33h12L14 10Z',goalie?'#DCE3DF':'#354B61')+(goalie?p('M-18 17h10v18h-14ZM7 17h11l4 18H8Z','#DDE9E8','#83A8B6',1):'')+p('M-21 31h14v6h-16ZM8 31h15v6H8Z',ice?'#C6D9E1':'#1B2A39')+'</g>'+
   p('M-15-15q15-10 30 0l4 29h-38Z',accent)+p('M-15-15-19 14h9l3-31Z','#FFFFFF22')+
   '<g class="lc-art-arms">'+(martial?p('M-15-10-24 1-17-22M15-10 23-21 10-25','none','#E1B59B',8)+c(-17,-24,6,'#C97970')+c(8,-25,6,'#C97970'):p('M-16-10-24 6-14 14M15-10 23 6 12 13','none','#DEB79C',7))+'</g>'+
   c(0,-31,12,'#E1B79D')+p('M-12-33q0-20 23-7l2 9-8-6-16 7Z','#293D50')+
   (ice?p('M-14-38q15-17 28 0v6h-28Z','#D2E2EA')+p('M-13-30h26','none','#677F8C',2):'')+
   p('M-4-7h8v9h-8Z',martial?'#5F3E42':'#E8ECE344')+(magic?'':gear)+'</g>';
 }
 function scene(game='fb',role='',compact=false){
  const [accent,dark]=palettes[game]||palettes.fb;
  const roleClass=' lc-role-'+String(role).replace(/[^a-z0-9_-]/gi,'');
  if(compact)return '<svg class="lc-figure lc-figure-mini lc-figure-'+game+roleClass+'" viewBox="-53 -57 108 108" aria-hidden="true">'+unit(game,role,accent)+'</svg>';
  let field=p('M19 99 112 55 224 99 130 145Z',dark)+p('M19 99v6l111 46v-6ZM130 145v6l94-46v-6Z','#142431')+p('m39 98 74-34 89 35-73 36Z','none','#BDD4D52B',1.5);
  if(['fb','hk','bb','tn'].includes(game))field+=p('M112 65 129 134M75 81l90 36M75 81l-9 27 54 22 44-13','none','#D7E2DE25',1);
  if(game==='ufc')field+=p('M71 85 102 70 146 75 180 92 174 116 143 132 99 127 65 110Z','none','#D7E2DE44',2);
  if(['cs','val','fn','dota','lol','cr','bs'].includes(game))field+=p('M30 91 30 69 54 57 54 81M177 82V55l24 9v28','#263B4C','#C5D9E229',1);
  if(game==='f1'&&role==='rain')field+=p('M52 28l-5 10M75 18l-5 10M174 23l-5 10M192 50l-5 10','none','#8BCBE6',2);
  if(game==='f1'&&role==='quali')field+=p('M39 78V37l27 5-27 14','none','#E2D9BB',2)+p('M40 38l10 2v6l-10-2ZM51 47l13 2v6l-13-2Z','#D9E4E7');
  if(game==='f1'&&role==='prof')field+='<circle cx="52" cy="83" r="13" fill="#15232F" stroke="#8198A7" stroke-width="4"/>';
  return '<svg class="lc-figure lc-figure-'+game+roleClass+'" viewBox="0 0 240 155" aria-hidden="true">'+field+'<g transform="translate(123 83) scale(1.05)">'+unit(game,role,accent)+'</g><path class="lc-art-spark" d="m194 40 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill="'+accent+'" opacity=".7"/></svg>';
 }
 window.LegendChoiceArt={scene,palettes};
})();
