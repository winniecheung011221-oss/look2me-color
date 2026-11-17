import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const key=process.env.OPENAI_API_KEY;
if(!key){console.error('KEY_MISSING: OPENAI_API_KEY 未配置，未发送请求。');process.exit(2);}
const input=resolve(process.argv[2]||'dist/assets/look-0.webp');
const output=resolve(process.argv[3]||'test-output/lip-edit.png');
try{
  const bytes=await readFile(input);
  const mime=bytes.subarray(0,4).toString()==='RIFF'?'image/webp':bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':null;
  if(!mime)throw Error('输入须为有效 PNG、JPEG 或 WebP');
  const form=new FormData();
  form.append('image[]',new Blob([bytes],{type:mime}),'portrait.'+mime.split('/')[1]);
  form.append('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.6-sunburst');
  form.append('prompt','Change only the lip makeup to soft muted rose pink. Preserve facial features, skin tone, hair, expression, perspective and background.');
  form.append('output_format','png');
  const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key},body:form,signal:AbortSignal.timeout(160000)});
  const data=await response.json().catch(()=>({}));
  console.log('HTTP',response.status,'request ID',response.headers.get('x-request-id')||'unavailable','code',data.error?.code||'none');
  if(!response.ok)throw Error('Image edit rejected');
  const image=Buffer.from(data.data?.[0]?.b64_json||'','base64');
  if(image.length<24||image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid image response');
  await mkdir(resolve(output,'..'),{recursive:true});
  await writeFile(output,image);
  console.log('PNG written:',output,'bytes',image.length);
}catch(error){console.error(error.name,error.message);process.exitCode=1;}
