import {looks, parts, references} from './catalog.js';

const result=document.querySelector('#result');
const controls=document.querySelector('#controls');
const status=document.querySelector('#status');
const input=document.querySelector('#file');
const assets=i=>`assets/look-${i}.webp`;
const defaults=()=>looks.slice(0,2).map((look,i)=>({colors:[...look.colors],url:assets(i+1),mode:'示例 AI 图'}));
const state={base:assets(0),photo:null,selected:0,items:defaults(),tab:'edit',part:0,anchor:null,cloud:false,busy:false,history:[],sample:true,error:'',prefs:'all'};
let revision=0;
let consented=-1;
const exampleLip={
  '#b77d8c':'assets/demo-lip-soft.png',
  '#80354e':'assets/demo-lip-berry.png'
};
const exampleAnchor='#a96c70';
const chosenDemo=new URLSearchParams(location.search).get('demo');
if(['edit','anchor','refs'].includes(chosenDemo))state.tab=chosenDemo;
const service=fetch('/api/status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{state.cloud=!!data?.cloud;}).catch(()=>{});
let samplePhoto;
let visionModule;
const vision=()=>visionModule ||= import('./vision.js');
const safe=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const active=()=>state.items[state.selected];
const activeLook=()=>looks[active()?.lookIndex??Math.max(0,state.selected)];
const cardTitle=i=>i<0?'原始照片':state.items[i]?.label||looks[i].name;
const pill=(text,act,cls='outline',attrs='')=>`<button class="pill ${cls}" data-act="${act}" ${attrs}>${text}</button>`;
const disabled=()=>state.busy?'disabled':'';
const aiDisabled=()=>!state.cloud||state.busy?'disabled':'';
const cloudMode='生成式 AI 图';

function note(text,error=false) {
  status.textContent=text;
  status.classList.toggle('error',error);
}
function jump(){document.querySelector('#studio').scrollIntoView();}
function render() {
  const previewMode=state.sample?'示例照片 · AI 生成妆效':'本人照片 · 自动定位完成';
  const hint=state.sample?(state.cloud?'上传自拍后，用裁切照生成三套妆。':'当前可操作预生成示例。本人实时生图待启用。'):state.busy?'正在处理当前妆容…':state.cloud?'三种妆效会分别生成，可单独重试。':'在线生图服务尚未配置。你仍可预览示例，已裁切的照片只保留在浏览器里。';
  controls.innerHTML=`<div class="mode-bar"><span class="badge">${previewMode}</span><span>${hint}</span><div class="quick-tools">${pill('调口红','tool:edit')}${pill('已有口红搭配','tool:anchor')}${pill('看妆教','tool:refs')}</div>${!state.sample && state.cloud && !state.busy && state.items.every(x=>!x.url&&!x.failed) ? pill('生成三套 AI 妆容','generate','dark') : ''}</div>`;
  const gallery=[{url:state.base,mode:'对照基准'},...state.items].map((item,pos)=>{
    const i=pos-1;
    return `<button class="portrait-card" data-act="choose:${i}" aria-pressed="${state.selected===i}">
      ${item.url?`<img src="${item.url}" alt="${cardTitle(i)}">`:`<span class="placeholder">${item.pending?'AI 正在生成…':item.failed?'生成失败':state.cloud?'待生成':'生图暂不可用'}</span>`}
      <span class="caption"><span>${i>=0?`<i style="--swatch:${item.colors[0]}"></i>`:''}${cardTitle(i)}</span><small>${item.pending?'生成中…':item.failed?'可单独重试':item.mode}</small></span>
    </button>`;
  }).join('');
  const tabs=[['edit','局部改妆'],['anchor','已有彩妆搭配'],['refs','参考妆容']].map(([key,label])=>`<button data-act="tab:${key}" aria-pressed="${state.tab===key}" ${disabled()}>${label}</button>`).join('');
  const detail=state.selected<0?`<h3>原始照片</h3><p>选一套妆容，查看对应色盘和参考。</p>`:!active()?.url?`<h3>${cardTitle(state.selected)}</h3><p>${active()?.failed?'该方案未能生成，可以重试。':'完整妆效生成后会显示在这里。'}</p>${active()?.failed?pill('重试这套 AI 妆容',`retry:${state.selected}`,'dark',disabled()):''}${state.history.length?pill('撤销','undo','outline',disabled()):''}`:`<h3>${cardTitle(state.selected)}</h3><p>${activeLook().tip}</p><div class="swatches">${active().colors.map((color,i)=>`<button class="swatch" style="--swatch:${color}" data-act="part:${i}" ${state.busy || (state.anchor&&i===0) || (!state.cloud&&(!state.sample||i!==0||state.selected!==0))?'disabled':''}><i></i>${parts[i]}${state.anchor&&i===0?' · 锁定':''}</button>`).join('')}</div>${active().failed?pill('重试这套 AI 妆容',`retry:${state.selected}`,'outline',disabled()):''}<div class="toolbar">${pill('查看大图','zoom','outline',active().url?'':'disabled')}${pill('下载妆效','download','outline',active().url?'':'disabled')}</div>`;
  result.innerHTML=`<div class="gallery ${state.items.length===2?'sample-gallery':''}" aria-label="同脸妆容对比">${gallery}</div><section class="selection" id="work-tools"><div class="paper"><p class="kicker">SELECTED LOOK</p>${detail}</div><div class="paper"><div class="tabs" aria-label="妆容工具">${tabs}</div>${panel()}</div></section>`;
}
function panel() {
  if(state.tab==='anchor'){
    const isExample=state.sample&&!state.cloud;
    return `<h3>从已有口红开始</h3><p>先固定一支口红，再对比暖杏眼颊与偏冷玫瑰眼颊的搭配。</p>
      ${isExample?`<div class="preset-row"><span class="badge"><i class="preset-dot" style="--chip:${exampleAnchor}"></i> 示例口红 · 玫瑰豆沙 ${exampleAnchor}</span></div><div class="toolbar">${pill('锁定豆沙色，查看两套搭配','example-anchor','dark',disabled())}${state.anchor?pill('恢复试妆示例','sample','outline'):''}</div><p class="inline-note">示例搭配使用预生成的 AI 图片。用自己的色号重新生成需连接生图服务。</p>`
      :`<div class="form-row"><label>口红名称<input id="lip-name" maxlength="28" placeholder="例如：玫瑰豆沙" value="${safe(state.anchor?.name||'')}"></label><label>口红颜色<input type="color" id="lip-color" value="${state.anchor?.color||exampleAnchor}"></label>${pill('锁定唇色并搭配','anchor','dark',aiDisabled())}${state.anchor?pill('解除锁定','unanchor','outline',aiDisabled()):''}</div>`}
      ${state.anchor?`<p class="inline-note">已锁定 ${safe(state.anchor.name)} · ${state.anchor.color}</p>`:''}`;
  }
  if(state.tab==='refs') {
    const look=activeLook();
    const tags=state.anchor?[...look.tags,state.anchor.warm?'warm':'rose']:look.tags;
    const score=item=>item.tags.filter(tag=>tags.includes(tag)).length;
    const cards=[...references].filter(x=>state.prefs==='all'||x.type===state.prefs).sort((a,b)=>score(b)-score(a)).map(x=>`<a class="reference" href="${x.url}" target="_blank" rel="noopener noreferrer"><strong>${x.name} ↗</strong><small>${x.type} · ${x.source}</small><small>${x.tip}</small></a>`).join('');
    const query=encodeURIComponent((state.anchor?`${state.anchor.name} 搭配 `:look.id==='apricot'?'蜜桃腮红 杏棕眼影 ':look.id==='plum'?'莓果唇 紫调眼妆 ':'玫瑰唇 灰紫眼影 ')+'妆容教程');
    return `<h3>找得到原稿的妆容参考</h3><p>根据「${look.name}」的色彩和妆效排序。点开看可借鉴的上妆位置与手法。</p><div class="toolbar">${[['all','全部'],['明星妆容','明星'],['博主教程','博主']].map(([key,label])=>pill(label,`ref:${key}`,state.prefs===key?'dark':'outline')).join('')}</div><div class="reference-list">${cards}<a class="reference" href="https://www.xiaohongshu.com/search_result?keyword=${query}" target="_blank" rel="noopener noreferrer"><strong>去小红书找同风格妆教 ↗</strong><small>按当前妆容组合关键词，打开平台搜索结果。</small></a></div>`;
  }
  if(state.selected<0||!active()?.url) return '<h3>选中一套妆容再编辑</h3><p>原图会一直保留在左侧，用于前后比较。</p>';
  if(state.sample&&!state.cloud){
    const eligible=state.selected===0&&!state.anchor;
    return `<h3>只换唇色，看看整套妆的变化</h3><p>用玫瑰妆测试局部换色，前后对照并撤销。${eligible?'':'先回到玫瑰妆示例即可操作。'}</p>
      <div class="preset-row">${Object.keys(exampleLip).map((color,i)=>pill(`<i class="preset-dot" style="--chip:${color}"></i>${['低饱和雾粉','深莓果'][i]}`,`example-edit:${color}`,'outline',eligible?`aria-pressed="${active().colors[0]===color}"`:'disabled')).join('')}</div>
      <div class="toolbar">${eligible?pill('撤销','undo','outline',state.history.length?'':'disabled'):pill('回到玫瑰妆示例','sample','outline')}</div><p class="inline-note">两个固定色样使用预生成图。自定义色值与其他部位重绘需连接生图服务。</p>`;
  }
  const blocked=state.anchor&&state.part===0;
  return `<h3>只改你选中的部位</h3><p>修改一个色值，其他妆容区域保留。可在大图里对照，应用后也能撤销。</p><div class="form-row"><label>部位<select id="area">${parts.map((p,i)=>`<option value="${i}" ${i===state.part?'selected':''} ${state.anchor&&i===0?'disabled':''}>${p}</option>`).join('')}</select></label><label>新颜色<input type="color" id="shade" value="${active().colors[state.part]}" ${blocked?'disabled':''}></label>${pill('应用局部调整','edit','dark',blocked?'disabled':aiDisabled())}${pill('撤销','undo','outline',state.history.length&&!state.busy?'':'disabled')}</div>${state.cloud?'<p class="inline-note">AI 编辑会对指定区域重绘，再恢复区域外的原图像素。</p>':'<p class="inline-note">实时改妆需要启用生图服务。</p>'}`;
}
function currentSnapshot() {
  return {items:state.items.map(item=>({...item,colors:[...item.colors]})),anchor:state.anchor};
}
function saveHistory(){state.history.push(currentSnapshot());if(state.history.length>12)state.history.shift();}
function reset(){revision++;Object.assign(state,{base:assets(0),items:defaults(),photo:null,selected:0,tab:'edit',part:0,anchor:null,busy:false,history:[],sample:true,error:''});render();}
async function photoForEdit(){
  if(state.photo) return state.photo;
  const v=await vision();
  if(!samplePhoto) samplePhoto=v.imageFrom(assets(0)).then(img=>v.normalizePhoto(img,true)).catch(err=>{samplePhoto=undefined;throw err;});
  return samplePhoto;
}
async function upload(file) {
  const run=++revision;
  state.busy=true;render();jump();
  note('正在定位人脸、校正方向并裁切头肩区域…');
  const url=URL.createObjectURL(file);
  try{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024) throw new Error('请选择小于 12 MB 的 JPG、PNG 或 WebP。');
    const v=await vision();
    const photo=await v.normalizePhoto(await v.imageFrom(url));
    if(run!==revision) return;
    state.photo=photo;state.base=photo.base.toDataURL('image/webp',.94);state.sample=false;state.history=[];state.anchor=null;state.selected=0;
    state.items=looks.map(look=>({colors:[...look.colors],url:null,mode:'待生成'}));
    await service;
    if(run!==revision)return;
    note(state.cloud?'已裁切头肩区域，即将生成三套妆效。':'定位完成。生图服务暂未配置，当前仅显示原图。');
    state.busy=false;render();
    if(state.cloud) await cloudLooks([0,1,2]);

  }catch(error){if(run===revision) note(error.message||'无法读取照片，请重试。',true);}
  finally{URL.revokeObjectURL(url);if(run===revision){state.busy=false;render();}}
}
async function requestAI(image,index,colors,area,mask,lockLip=false) {
  const response=await fetch('/api/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,index,colors,area,mask,lockLip}),signal:AbortSignal.timeout(155000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||typeof data.image!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(data.image))throw new Error(data.error||'生成服务未返回有效图片。');
  const decoded=new Image();decoded.src=data.image;
  try{await decoded.decode();}catch{throw new Error('妆效图片无法打开，请重新生成。');}
  return data.image;
}
function confirmCloud(){
  if(consented===revision)return Promise.resolve(true);
  const run=revision;
  const dialog=document.createElement('dialog');
  dialog.className='consent-dialog';
  dialog.innerHTML=`<form method="dialog"><p class="eyebrow">AI 试妆</p><h2>用这张照片生成妆容？</h2><p>裁切后的头肩照片会发送至 OpenAI 图像服务。原图会留在左侧，生成结果可逐张比较。</p><div class="toolbar"><button class="pill outline" value="cancel" autofocus>稍后</button><button class="pill dark" value="yes">同意并生成 ↗</button></div></form>`;
  document.body.append(dialog);
  return new Promise(resolve=>{
    dialog.addEventListener('close',()=>{const accepted=dialog.returnValue==='yes'&&run===revision;if(accepted)consented=run;dialog.remove();resolve(accepted);},{once:true});
    dialog.showModal();
  });
}
async function cloudLooks(indices,change){
  if(!state.cloud||state.busy||document.querySelector('.consent-dialog'))return;
  const runBeforeConsent=revision;
  if(!await confirmCloud()||runBeforeConsent!==revision||state.busy)return;
  const run=revision, base=state.base;
  saveHistory();
  if(change){
    state.anchor=change.anchor;
    state.items=looks.map(look=>({colors:state.anchor?anchorPalette(look,state.anchor.color):[...look.colors],url:null,mode:'待生成'}));
    state.selected=Math.max(0,state.selected);state.part=1;
  }
  state.busy=true;
  for(const index of indices)Object.assign(state.items[index],{pending:true,failed:false});
  render();note('AI 正在直接生成上妆图，完成一张显示一张。');
  const errors=[];
  await Promise.all(indices.map(async index=>{
    const item=state.items[index];
    try{
      const url=await requestAI(base,index,item.colors,undefined,undefined,!!state.anchor);
      if(run===revision)Object.assign(item,{url,mode:cloudMode});
    }catch(error){if(run===revision){item.failed=true;errors.push(error.message);}}
    finally{if(run===revision){item.pending=false;render();}}
  }));
  if(run!==revision)return;
  state.busy=false;render();
  note(errors.length?`部分妆容未生成，可单独重试。${errors[0]}`:'生成完成，可对比每套妆效。',!!errors.length);
}
async function updateLook() {
  const index=active()?.lookIndex??state.selected,item=active(),area=state.part, shade=document.querySelector('#shade')?.value;
  if(!item||!shade||state.busy||shade===item.colors[area]||(state.anchor&&area===0)) return;
  const colors=[...item.colors];colors[area]=shade;
  if(!state.cloud||!item.url||document.querySelector('.consent-dialog'))return;
  const runBeforeConsent=revision;
  if(!await confirmCloud()||runBeforeConsent!==revision||state.busy)return;
  const run=revision;state.busy=true;render();note('正在更新'+parts[area]+'…');
  try{
    const v=await vision(), snapshot=await photoForEdit(), baseline=await v.imageFrom(item.url);
    const mask=await v.regionalMask(snapshot,area);
    const current=document.createElement('canvas');current.width=512;current.height=640;current.getContext('2d').drawImage(baseline,0,0,512,640);
    const ai=await requestAI(current.toDataURL('image/png'),index,colors,area,mask.toDataURL('image/png'));
    const edited=v.preserveOutside(baseline,await v.imageFrom(ai),mask);
    if(run!==revision) return;
    saveHistory();Object.assign(item,{colors,url:edited.toDataURL('image/png'),mode:'AI 局部重绘'});
    note(`已更新${parts[area]}。其他部位保持原样。`);
  }catch(error){if(run===revision)note(error.message||'更新失败，已保留之前的效果。',true);}
  finally{if(run===revision){state.busy=false;render();}}
}
function anchorPalette(look,color){
  const value=parseInt(color.slice(1),16),warm=((value>>16)&255)-(value&255)>28;
  const mix=(a,b,p)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-p)+parseInt(b.slice(i,i+2),16)*p).toString(16).padStart(2,'0')).join('');
  return [color,mix(look.colors[1],color,.36),mix(look.colors[2],warm?'#b47a5d':'#8e6b95',.38),mix(look.colors[3],warm?'#674532':'#554452',.4)];
}
async function updateAnchor(clear=false) {
  if(state.busy) return;
  const color=clear?null:document.querySelector('#lip-color').value;
  const name=clear?'':document.querySelector('#lip-name').value.trim()||'我的口红';
  const anchor=clear?null:{name,color,warm:parseInt(color.slice(1,3),16)-parseInt(color.slice(5,7),16)>28};
  await cloudLooks([0,1,2],{anchor});
}

function zoom() {
  const item=active();if(!item?.url)return;
  const dialog=document.createElement('dialog');
  dialog.className='lightbox';
  const previous=state.history.at(-1)?.items[state.selected];
  const compare=previous?.url && previous.url!==item.url;
  const before=compare?previous.url:state.base;
  const beforeLabel=compare?'上一步妆效':'原始照片';
  dialog.innerHTML=`<button class="pill dark" aria-label="关闭" autofocus>关闭 ×</button><div><figure><img src="${before}" alt="${beforeLabel}"><figcaption>${beforeLabel}</figcaption></figure><figure><img src="${item.url}" alt="${cardTitle(state.selected)}"><figcaption>${cardTitle(state.selected)}</figcaption></figure></div>`;
  document.body.append(dialog);
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.showModal();
}
async function downloadLook(){
  const item=active(),look=looks[state.selected];
  if(!item?.url)return;
  try{
    const response=await fetch(item.url);
    if(!response.ok) throw new Error('图片不可用');
    const image=await response.blob();
    const url=URL.createObjectURL(image);
    const link=document.createElement('a');
    link.href=url;link.download='LOOK2ME-'+look.id+(image.type==='image/png'?'.png':'.webp');
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }catch{note('下载未完成，请重试。',true);}
}
function demoEdit(color){
  if(!state.sample||state.cloud||state.selected!==0||state.anchor||!exampleLip[color]||active().colors[0]===color)return;
  saveHistory();
  const item=active();
  item.colors[0]=color;item.url=exampleLip[color];item.mode='AI 局部调整示例';
  render();note('已切换唇色示例。可以撤销，也可以打开大图比较。');
}
function demoAnchor(){
  if(!state.sample||state.cloud||state.anchor)return;
  saveHistory();
  state.anchor={name:'玫瑰豆沙',color:exampleAnchor,warm:true};
  state.items=[1,0].map((lookIndex,i)=>({lookIndex,label:['杏棕眼颊','雾紫眼颊'][i],colors:anchorPalette(looks[lookIndex],exampleAnchor),url:`assets/demo-anchor-${i}.webp`,mode:'已有口红搭配示例'}));
  state.selected=0;
  render();note('示例已锁定玫瑰豆沙唇色，可以比较两种眼颊搭配。');
}
const dropZone=document.querySelector('.upload-disc');
dropZone?.addEventListener('dragover',event=>{event.preventDefault();dropZone.classList.add('dragover');});
dropZone?.addEventListener('dragleave',()=>dropZone.classList.remove('dragover'));
dropZone?.addEventListener('drop',event=>{
  event.preventDefault();dropZone.classList.remove('dragover');
  const file=event.dataTransfer?.files[0];
  if(file)upload(file);
});
document.body.addEventListener('click',event=>{
  const action=event.target.closest('[data-act]')?.dataset.act;if(!action)return;
  const [key,value]=action.split(':');
  if(key==='pick')return input.click();
  if(key==='sample'){reset();note('当前展示示例模特，可上传你自己的照片。');return jump();}
  if(key==='choose'){state.selected=Number(value);return render();}
  if(key==='tab'||key==='tool'){state.tab=value;render();const tab=document.querySelector('.tabs button[aria-pressed=true]');if(key==='tool')document.querySelector('#work-tools').scrollIntoView();tab?.focus({preventScroll:true});return;}
  if(key==='part'){state.part=Number(value);state.tab='edit';render();document.querySelector('#shade')?.focus();return;}
  if(key==='ref'){state.prefs=value;return render();}
  if(key==='example-edit')return demoEdit(value);
  if(key==='example-anchor')return demoAnchor();
  if(key==='anchor')return updateAnchor();
  if(key==='unanchor')return updateAnchor(true);
  if(key==='generate')return cloudLooks([0,1,2]);
  if(key==='retry')return cloudLooks([Number(value)]);
  if(key==='edit')return updateLook();
  if(key==='undo'&&!state.busy){const prior=state.history.pop();if(prior){Object.assign(state,prior);if(state.anchor&&state.part===0)state.part=1;render();note('已恢复上一步。');}return;}
  if(key==='zoom') return zoom();
  if(key==='download')return downloadLook();
});
document.body.addEventListener('change',event=>{
  if(event.target.id==='area'){state.part=Number(event.target.value);render();document.querySelector('#area').focus();}
  if(event.target===input&&input.files[0]){upload(input.files[0]);input.value='';}
});
render();
service.then(render);
