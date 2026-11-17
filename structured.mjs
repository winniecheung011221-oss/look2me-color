import {styles,hexPattern} from './dist/studio-data.js';

const str={type:'string'};
const list={type:'array',items:str};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const profileSchema=object({photoQuality:str,undertoneCandidate:{type:'string',enum:['冷','暖','中性','待确认']},skinDepthCandidate:str,brightness:{type:'string',enum:['高','中','低','待确认']},chroma:{type:'string',enum:['柔和','鲜明','待确认']},contrast:str,seasonCandidate:str,hairColor:str,browColor:str,visibleFaceFeatures:list,limitations:list});
const planSchema=object({lip:object({hex:str,finish:str,saturation:str,edge:str}),eyes:object({base:str,main:str,shadow:str,deep:str,highlight:str,blend:str,liner:str}),blush:object({hex:str,intensity:str,placement:str,finish:str}),brows:object({hex:str,shape:str,depth:str}),complexion:object({finish:str,sculpt:str,highlight:str}),reason:str,keywords:list});
export const structuredRoutes=new Set(['/api/analyze-face','/api/analyze-color','/api/generate-makeup-plan','/api/match-existing-lipstick']);

function matches(value,schema){
  if(schema.type==='string')return typeof value==='string'&&(!schema.enum||schema.enum.includes(value));
  if(schema.type==='array')return Array.isArray(value)&&value.length<=30&&value.every(item=>matches(item,schema.items));
  return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length&&schema.required.every(key=>matches(value[key],schema.properties[key]));
}
export async function structuredResponse(url,request,env,parseBody,reply,fail){
  const parsingProfile=url.pathname==='/api/analyze-face'||url.pathname==='/api/analyze-color';
  const schema=parsingProfile?profileSchema:planSchema;
  const body=await parseBody(request);
  const messages=[];
  if(parsingProfile){
    if(typeof body.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(body.image))throw fail(400,'需要有效的裁切人像。');
    messages.push({type:'input_text',text:'以简体中文分析自拍仅可见的照片质量、色深、冷暖、对比、发眉与轮廓。仅给候选，不做颜值评分，不推断身份、种族或健康。光线不可靠则输出待确认。用户偏好仅用于建议，解释限制。偏好 '+JSON.stringify(body.answers||{}).slice(0,1600)},{type:'input_image',image_url:body.image,detail:'auto'});
  }else{
    const selected=styles.find(item=>item.id===body.styleId);
    if(!selected||!body.profile||typeof body.profile!=='object'||(body.anchor&&!hexPattern.test(body.anchor)))throw fail(400,'请选择有效风格与档案，输入六位口红 HEX。');
    messages.push({type:'input_text',text:'以简体中文给出单套可操作妆容 JSON。颜色全为六位 HEX，各部位要能按描述画出来，不生成商品色号。风格 '+JSON.stringify(selected)+'。档案 '+JSON.stringify(body.profile).slice(0,5000)+'。场景与妆感 '+String(body.scene||'').slice(0,250)+' '+String(body.intensity||'').slice(0,20)+'。已有唇色必须保持 '+String(body.anchor||'无')});
  }
  let upstream;
  try{
    upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_TEXT_MODEL||'gpt-5-mini',store:false,input:[{role:'user',content:messages}],text:{format:{type:'json_schema',name:parsingProfile?'color_profile':'makeup_plan',strict:true,schema}}}),signal:AbortSignal.timeout(65000)});
  }catch{throw fail(504,'分析服务连接超时。');}
  const response=await upstream.json().catch(()=>({}));
  if(!upstream.ok){console.warn('OpenAI structured request failed',{route:url.pathname,status:upstream.status,code:response.error?.code||null});throw fail(upstream.status===429?429:502,serviceMessage(upstream.status,response.error?.code));}
  const text=response.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text;
  let data;
  try{data=JSON.parse(text);}catch{throw fail(502,'模型未返回结构化结果，可重试。');}
  if(!matches(data,schema))throw fail(502,'模型结果未通过字段校验。');
  if(!parsingProfile){
    const colors=[data.lip.hex,data.eyes.base,data.eyes.main,data.eyes.shadow,data.eyes.deep,data.eyes.highlight,data.blush.hex,data.brows.hex];
    if(!colors.every(color=>hexPattern.test(color)))throw fail(502,'模型返回的配色格式无效。');
    if(body.anchor)data.lip.hex=body.anchor;
  }
  return reply({data,model:env.OPENAI_TEXT_MODEL||'gpt-5-mini'});
}
export function serviceMessage(status,code){
  if(status===401)return 'OpenAI 项目密钥认证失败。';
  if(status===403)return '当前项目没有模型权限，或需组织验证。';
  if(status===404)return '当前项目无法访问指定模型或端点。';
  if(status===429){
    if(['insufficient_quota','credit_balance_exhausted'].includes(code))return 'OpenAI API 预付额度不足，请在平台 Billing 添加额度。';
    if(['project_spend_limit_exceeded','organization_spend_limit_exceeded'].includes(code))return 'OpenAI API 支出上限已到，请在项目或组织设置中提高上限。';
    if(code==='organization_usage_limit_exceeded')return 'OpenAI API 组织用量上限已到，请申请提高限额。';
    return 'OpenAI API 当前请求过快，请稍后重试。';
  }
  if(status>=500)return 'OpenAI 服务暂时异常，可保留输入稍后重试。';
  return 'OpenAI 未接受该请求，请检查照片和模型参数。';
}
