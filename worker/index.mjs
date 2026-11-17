import {imageRoute} from '../ai.mjs';
import {assets} from './assets.mjs';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/'))return imageRoute(request,env);
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
    const key=url.pathname==='/'?'/index.html':url.pathname==='/design'?'/design.html':url.pathname;
    const asset=Object.hasOwn(assets,key)?assets[key]:null;
    if(!asset)return new Response('Not found',{status:404});
    const [type,encoded]=asset;
    return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{
      headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':key.startsWith('/assets/')?'public, max-age=3600':'no-cache'}
    });
  }
};
