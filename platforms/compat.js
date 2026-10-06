// Down-levels the game bundle for older browsers (iOS 12+, Chrome 64+): ?. ?? spread etc. → plain JS.
const fs=require('fs'),path=require('path');
const esbuild=require(path.join(__dirname,'..','i18n','node_modules','esbuild'));
const f=process.argv[2],src=fs.readFileSync(f,'utf8');
const out=esbuild.transformSync(src,{target:['es2017','safari12','chrome64','firefox60'],loader:'js',legalComments:'none',charset:'utf8',minifyWhitespace:true});
fs.writeFileSync(f,out.code);
console.log('compat:',path.basename(f),Math.round(src.length/1024)+'KB →',Math.round(out.code.length/1024)+'KB');
