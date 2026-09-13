import {build} from 'esbuild';
import {mkdir,copyFile,readdir,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await copyFile('node_modules/html-to-image/dist/html-to-image.js','dist/vendor/html-to-image.js');
await copyFile('node_modules/html-to-image/LICENSE','dist/vendor/html-to-image-LICENSE');
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){
 if(entry.name.startsWith('.')||['server','client'].includes(entry.name))continue;
 await cp('dist/'+entry.name,'dist/client/'+entry.name,{recursive:true});
}
await build({entryPoints:['server/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await mkdir('dist/.openai',{recursive:true});
try{await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'))}catch(e){if(e.code!=='ENOENT')throw e}
