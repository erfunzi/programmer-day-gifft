import {build} from 'esbuild';
import {mkdir,copyFile,readdir,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await copyFile('node_modules/html-to-image/dist/html-to-image.js','dist/vendor/html-to-image.js');
await copyFile('node_modules/html-to-image/LICENSE','dist/vendor/html-to-image-LICENSE');
// html-to-image floors font-size by 0.1px and breaks Vazir/Persian metrics in PNG export.
{
 const vendor=await readFile('dist/vendor/html-to-image.js','utf8');
 const hack='if("font-size"===n&&o.endsWith("px")){var u=Math.floor(parseFloat(o.substring(0,o.length-2)))-.1;o="".concat(u,"px")}';
 if(vendor.includes(hack))await writeFile('dist/vendor/html-to-image.js',vendor.replace(hack,''));
}
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){
 if(entry.name.startsWith('.')||['server','client'].includes(entry.name))continue;
 await cp('dist/'+entry.name,'dist/client/'+entry.name,{recursive:true});
}
await build({entryPoints:['server/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await mkdir('dist/.openai',{recursive:true});
try{await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'))}catch(e){if(e.code!=='ENOENT')throw e}
