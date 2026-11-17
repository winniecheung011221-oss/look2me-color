import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8','':'application/octet-stream'};
const assets={};
async function add(dir,prefix=''){
  for(const file of await readdir(dir,{withFileTypes:true})){
    if(file.name.startsWith('.')||file.name==='server')continue;
    const rel=prefix+'/'+file.name, source=path.join(dir,file.name);
    if(file.isDirectory()){await add(source,rel);continue;}
    assets[rel]=[mime[path.extname(file.name)]||mime[''],(await readFile(source)).toString('base64')];
  }
}
await add('dist');
const worker=await readFile('worker/index.mjs','utf8');
const api=await readFile('ai.mjs','utf8');
const catalog=await readFile('dist/catalog.js','utf8');
const studio=await readFile('dist/studio-data.js','utf8');
const structured=await readFile('structured.mjs','utf8');
const flatten=source=>source.replace(/^import[^\n]*\n/gm,'').replace(/^export (?=(?:const|function|async function))/gm,'');
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/server/index.js',[
  'const assets='+JSON.stringify(assets)+';',
  flatten(catalog),
  flatten(studio),
  flatten(structured),
  flatten(api),
  worker.replace(/^import[^\n]*\n/gm,'')
].join('\n'));
