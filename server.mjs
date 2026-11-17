import http from 'node:http';
import path from 'node:path';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {imageRoute} from './ai.mjs';
import {Readable} from 'node:stream';

const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.task':'application/octet-stream','.json':'application/json','.txt':'text/plain','':'application/octet-stream'};
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
async function route(req,res){
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname.startsWith('/api/')){
    const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const out=await imageRoute(request,process.env);
    res.writeHead(out.status,Object.fromEntries(out.headers));
    return res.end(Buffer.from(await out.arrayBuffer()));
  }
  if(!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'此地址不支持该方法。'});
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root)||!mime[path.extname(file)]) return json(res,404,{error:'文件不存在。'});
  const meta=await stat(file).catch(()=>null);
  if(!meta?.isFile())return json(res,404,{error:'文件不存在。'});
  res.writeHead(200,{'content-type':mime[path.extname(file)],'content-length':meta.size,'x-content-type-options':'nosniff'});
  if(req.method==='HEAD')return res.end();
  createReadStream(file).pipe(res);
}
const port=Number(process.env.PORT||8787);
http.createServer((req,res)=>route(req,res).catch(error=>{if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'服务暂时不可用。'});else res.end();})).listen(port,'127.0.0.1',()=>console.log(`LOOK2ME COLOR: http://127.0.0.1:${port}`));
