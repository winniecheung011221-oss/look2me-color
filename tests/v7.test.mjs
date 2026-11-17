import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {styles,families,paletteFor,buildGuide,hexPattern} from '../dist/studio-data.js';
import worker from '../dist/server/index.js';
const profile={undertoneCandidate:'冷',brightness:'中',chroma:'柔和'};
const origin='https://look2me.test';
const request=(path,method='GET',body,env={})=>worker.fetch(new Request(origin+path,{method,headers:{origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
test('16 unique styles across four families',()=>{
  assert.equal(styles.length,16);
  assert.equal(new Set(styles.map(x=>x.id)).size,16);
  for(const family of families)assert.equal(styles.filter(x=>x.family===family).length,4);
  for(const style of styles){
    assert.ok(style.prompt&&style.browRule&&style.complexion&&style.keywords.length===3);
    assert.ok(style.colors.every(hex=>hexPattern.test(hex)));
  }
});
test('locked lipstick stays unchanged and changes complementary colors',()=>{
  const a=paletteFor(styles[0],profile,'#a44c70'),b=paletteFor(styles[0],profile,'#e78438');
  assert.equal(a[0],'#a44c70');assert.equal(b[0],'#e78438');
  assert.notDeepEqual(a.slice(1),b.slice(1));
  const g=buildGuide(styles[0],a,profile);
  for(const [count,data] of [[3,g.lipColors],[6,g.eyeColors],[3,g.cheek],[4,g.hair],[3,g.clothes]])assert.equal(data.length,count);
});
test('worker routes and honest service availability',async()=>{
  for(const path of ['/','/design.html','/design-motion.js','/legacy.html','/v7.js','/v7.css','/assets/look-0.webp'])assert.equal((await request(path)).status,200);
  assert.deepEqual(await (await request('/api/status')).json(),{cloud:false});
  assert.equal((await request('/api/render-makeup','POST',{image:'example'})).status,503);
  assert.equal((await request('/api/analyze-face','POST',{image:'example'})).status,503);
  const design=await (await request('/design.html')).text();
  assert.equal((design.match(/<section\b/g)||[]).length,12);
});
test('structured route validates fields, hex, and anchor with simulated upstream',async()=>{
  const old=globalThis.fetch;
  const plan={lip:{hex:'#c0d0e0',finish:'缎光',saturation:'柔和',edge:'淡化'},eyes:{base:'#eeeeee',main:'#998877',shadow:'#776655',deep:'#443322',highlight:'#fffafa',blend:'羽化',liner:'贴根'},blush:{hex:'#aabbcc',intensity:'轻',placement:'颧前',finish:'雾面'},brows:{hex:'#333333',shape:'自然弧度',depth:'中'},complexion:{finish:'半哑',sculpt:'轻',highlight:'软光'},reason:'颜色协调',keywords:['冷粉唇色']};
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(init.body);assert.equal(body.text.format.strict,true);assert.equal(body.store,false);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
  };
  try{
    const env={OPENAI_API_KEY:'mock'};
    const body={styleId:'date',profile,anchor:'#a44c70'};
    const res=await request('/api/match-existing-lipstick','POST',body,env);
    assert.equal(res.status,200);assert.equal((await res.json()).data.lip.hex,body.anchor);
    plan.eyes.main='n/a';
    assert.equal((await request('/api/match-existing-lipstick','POST',body,env)).status,502);
  }finally{globalThis.fetch=old;}
});
test('render and masked edit use the documented OpenAI route, with mock bytes',async()=>{
  const old=globalThis.fetch;
  const image='data:image/webp;base64,'+(await readFile('dist/assets/look-0.webp')).toString('base64');
  let area;
  globalThis.fetch=async(url,{body})=>{
    assert.equal(url,'https://api.openai.com/v1/images/edits');
    assert.equal(body.get('model'),'gpt-image-2.5-sunburst');
    if(area!==undefined){assert.equal(body.get('mask').type,'image/png');assert.match(body.get('prompt'),/upper eyelid eyeshadow/);}
    return Response.json({data:[{b64_json:image.split(',')[1]}]});
  };
  try{
    const body={styleId:'date',image,colors:styles[5].colors};
    for(const endpoint of ['render-makeup','edit-makeup-part']){
      if(endpoint.startsWith('edit'))area=1;
      const res=await request('/api/'+endpoint,'POST',{...body,area,...(area!==undefined?{mask:'data:image/png;base64,AAAA'}:{})},{OPENAI_API_KEY:'mock'});
      assert.equal(res.status,200);
      assert.equal((await res.json()).image,image);
    }
  }finally{globalThis.fetch=old;}
});
