/* Shared locale selection; explicit locale URL always wins. */
(function(){var codes=['ru','en','es','fr','ar','hi','it','zh','de'],p=location.pathname.split('/')[1],q=new URLSearchParams(location.search).get('lang'),l=p;
try{if(!codes.includes(l))l=codes.includes(q)?q:localStorage.getItem('legenda-polya-lang')||'en'}catch(e){}
if(!codes.includes(l))l='en';if(['ru','en'].includes(l))return;
var asset=new URL('locales-'+l+'.js',document.currentScript.src);asset.searchParams.set('v',window.LEGENDA_SITE_REGISTRY?.assetVersion||'20261023-9l-v1');var src=asset.href;document.write('<script src="'+src+'"><\/script>');})();
