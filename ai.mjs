import {styles} from './dist/studio-data.js';
import {structuredRoutes,structuredResponse,serviceMessage} from './structured.mjs';
import {looks,parts} from './dist/catalog.js';

const maxBody=5*1024*1024;
let imageWindow=0,imageCalls=0,activeImages=0;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const problem=(status,message)=>Object.assign(new Error(message),{status});

async function readJSON(request){
  const reader=request.body?.getReader();
  if(!reader) throw problem(400,'缺少请求内容。');
  const decoder=new TextDecoder();
  let size=0, text='';
  while(true){
    const {value,done}=await reader.read();
    if(done)break;
    size+=value.length;
    if(size>maxBody){await reader.cancel();throw problem(413,'图片请求过大。');}
    text+=decoder.decode(value,{stream:true});
  }
  try{return JSON.parse(text+decoder.decode());}
  catch{throw problem(400,'无法读取请求。');}
}
function imagePart(form,key,data,onlyPng=false){
  const match=typeof data==='string'&&data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match||(onlyPng&&match[1]!=='png'))throw problem(400,'图片格式不受支持。');
  const [,format,encoded]=match;
  let bytes;
  try {bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}
  catch {throw problem(400,'图片编码无效。');}
  form.append(key,new Blob([bytes],{type:'image/'+format}),'portrait.'+format);
}
export async function imageRoute(request,env){
  const url=new URL(request.url);
  const secret=env.OPENAI_API_KEY;
  if(url.pathname==='/api/status'&&request.method==='GET')return json({cloud:!!secret});
  if((!['/api/edit','/api/render-makeup','/api/edit-makeup-part'].includes(url.pathname)&&!structuredRoutes.has(url.pathname))||request.method!=='POST')return json({error:'接口不存在。'},404);
  try{
    if(!secret)throw problem(503,'生成式试妆暂未配置。');
    if(request.headers.get('origin')!==url.origin)throw problem(403,'请从同一工作台发起请求。');
    if(structuredRoutes.has(url.pathname))return await structuredResponse(url,request,env,readJSON,json,problem);
    const {image,mask,index,colors,area,lockLip,styleId,direction,visualPlan}=await readJSON(request);
    const style=styles.find(item=>item.id===styleId)||looks[index];
    if(!style||!Array.isArray(colors)||colors.length!==4||colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw problem(400,'妆容参数无效。');
    if(area!==undefined&&(!Number.isInteger(area)||!parts[area]||!mask))throw problem(400,'请选择有效编辑部位。');
    const form=new FormData();
    form.append('model',env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-sunburst');
    form.append('quality','medium');
    form.append('size','auto');
    form.append('output_format','webp');
    imagePart(form,'image[]',image);
    if(area!==undefined)imagePart(form,'mask',mask,true);
    const edit='Photorealistic cosmetic retouch of the same person, in the same photo. Match face proportions, nose, mouth geometry, expression, hair, skin texture, lighting, background and original head crop. No face reshaping, airbrushing, digital stickers, graphic masks, harsh contours or additional objects.';
    const finish='Ensure a professional natural makeup finish: soft gradient shadows and blush, feathered luminous edges, pigment blends with natural skin, lips retain texture, specular highlights and real lip contours. Work with existing brow hairs; do not draw a second eyebrow. Preserve the input composition and camera perspective.';
    const areas=styleId?['lip makeup','upper eyelid eyeshadow','cheek blush','eyebrow color']:['lip makeup','cheek blush','upper eyelid eyeshadow','eyebrow color'];
    const palette=areas.map((name,i)=>`${name} around ${colors[i]}`).join(', ');
    form.append('prompt',area===undefined
      ?`${edit} ${finish} Makeup direction: ${style.prompt}. Proposed makeup layout: ${JSON.stringify(visualPlan||{}).slice(0,2200)} Use this palette: ${palette}. ${lockLip===true?`The shared lipstick color ${colors[0]} takes precedence over any other styling instructions. Use the same lip finish: soft satin.`:''}`
      :`${edit} ${finish} Make a localized cosmetic change only to ${areas[area]} around ${colors[area]}, within the supplied mask. Direction: ${String(direction||'').slice(0,150)}. Preserve all other cosmetics exactly.`);
    const now=Date.now();
    if(now-imageWindow>=3600000){imageWindow=now;imageCalls=0;}
    const hourly=Number(env.OPENAI_IMAGE_HOURLY_LIMIT)||24;
    if(activeImages>=3||imageCalls>=hourly)throw problem(429,'站点当前生成额度已用完，保留输入后稍后重试。');
    activeImages++;imageCalls++;
    let upstream;
    try{upstream=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{authorization:`Bearer ${secret}`},body:form,signal:AbortSignal.timeout(145000)});}
    catch{throw problem(504,'图像服务连接超时，请重试。');}
    finally{activeImages--;}
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){console.warn('OpenAI image request failed',{status:upstream.status,code:data.error?.code||null});throw problem(upstream.status===429?429:502,serviceMessage(upstream.status,data.error?.code));}
    const result=data.data?.[0]?.b64_json;
    if(typeof result!=='string'||!result)throw problem(502,'图像服务没有返回可用图片。');
    return json({image:'data:image/webp;base64,'+result});
  }catch(error){return json({error:error.status?error.message:'生成服务暂时不可用。'},error.status||500);}
}
