import {styles,families,hexPattern,paletteFor,buildGuide,blend,rgb} from './studio-data.js';
import {verifiedReferences as references} from './catalog.js';

const app=document.querySelector('#app'), announce=document.querySelector('#announce');
const fields={
  undertoneCandidate:['冷暖倾向',['待确认','冷','暖','中性']],
  brightness:['明度',['待确认','高','中','低']],
  chroma:['饱和度偏好',['待确认','柔和','鲜明']],
  skinDepthCandidate:['可见肤色深浅',['待确认','偏浅','中等','偏深']],
  hairColor:['当前发色',null],browColor:['当前眉色',null],
  visibleFaceFeatures:['可选轮廓参考',null],preference:['妆容风格偏好',null]
};
const questions=[
  ['更想试哪一种口红？',['浆果冷粉','杏桃暖橙','陶土砖红','柔雾豆沙','中性色','还不确定'],['#f4b985','#fbdd91','#ffb9a6']],
  ['哪种首饰搭配更顺眼？',['银色','金色','都喜欢','不确定'],['#90bcda','#9bd0ca','#c9dde9']],
  ['偏爱怎样的色彩浓度？',['柔和','鲜明','都愿意试'],['#96d1ac','#dfeb88','#b5e5cc']],
  ['你更常尝试什么妆感？',['轻透日常','柔和约会','通勤表达','鲜明风格'],['#c7a9e1','#df8dbd','#e9b9d7']],
  ['更想把妆用在什么场合？',['日常','上班','约会','聚会'],['#b0a4ae','#e8dce8','#c1bec5']]
];
const labels=['唇妆','眼影','腮红','眉色'];
const state={page:'home',mode:'manual',photo:null,base:'',quality:'待查看',status:'',error:false,busy:false,startedAt:null,consent:false,cloud:'checking',answers:[],q:0,profile:null,skinOverride:null,confirmed:false,selected:['k-clear','retro'],family:0,focus:'original',scene:'日常',intensity:'按风格',anchor:null,anchorName:'',anchorTone:'中性',tab:'palette',part:0,revision:0,looks:[],history:[],draft:null,saved:false,filter:'全部',editSheet:false,compareBefore:false,drapeColor:'#6B3025'};
const storageKey='look2me-v7-report';
let cueTimer,visionModule;
const vision=()=>visionModule||=import('./vision.js');
const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const styleBy=id=>styles.find(x=>x.id===id);
const effectiveProfile=()=>({...state.profile,undertoneCandidate:state.skinOverride||state.profile?.undertoneCandidate||'中性'});
const styleScore=(style,tone)=>50+(tone==='暖'&&['retro','peach','j-natural','thai','east'].includes(style.id)?20:0)+(tone==='冷'&&['k-clear','icy','date','sweet-cool','smoky','dream'].includes(style.id)?20:0)+(tone==='中性'&&['bare','water','mature','office'].includes(style.id)?20:0);
const item=()=>state.looks.find(x=>x.id===(state.focus==='original'?state.selected[0]:state.focus))||state.looks[0];
const pill=(text,key,primary=false,attributes='')=>`<button type="button" class="pill ${primary?'primary':''}" data-action="${key}" ${attributes}>${text}</button>`;
const disabled=()=>state.busy?'disabled':'';
const field=(colors=[])=>`<div class="fieldlight" style="${colors.map((c,i)=>`--${['one','two','three'][i]}:${c}`).join(';')}" aria-hidden="true"><i></i><i></i><i></i></div>`;
const dots=(colors)=>`<div class="sample-bars">${colors.map(c=>`<span style="background:${c}"></span>`).join('')}</div>`;
const safeText=()=>state.status?`<p class="notice ${state.error?'error':''}" role="status">${esc(state.status)}</p>`:'';
const note=(message,error=false)=>{state.status=message;state.error=error;};
function toast(text){clearTimeout(cueTimer);announce.textContent=text;cueTimer=setTimeout(()=>{announce.textContent='';},5200);}
function go(page){state.page=page;note('');render();window.scrollTo(0,0);}
function chapter(title,sub,content){return `<section class="page"><h1>${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}${safeText()}${content}</section>`;}
function home(){const recent=reportData()||readSaved();return `<section class="cover">${field()}<div class="cover-copy"><p class="kicker">LOOK2ME COLOR / PERSONAL BEAUTY</p><h1>你的色彩，<br>你的妆。</h1><p>从一张自拍，找到可尝试的颜色；在自己的脸上比较妆效，保留喜欢的部分，再调整其余细节。</p><div class="actions">${pill('上传自拍，开始探索 ↗','start',true)}${pill('我有一支口红 ↗','anchor-start')}${recent?pill('查看我的生成结果 ↗',reportData()?'report':'saved'):''}</div><small class="cover-note">16 种妆容风格 · 可编辑配色 · 可带走的妆容指南</small></div><div class="cover-side" aria-hidden="true"><span>MAKEUP<br>IN COLOR</span><i></i></div></section>${recent?`<section class="home-result"><div><p class="kicker">YOUR MAKEUP RESULT</p><h2>${esc(recent.look.name)}</h2><p>你的方案已保留在这里。可以继续调整配色或下载报告。</p><div class="actions">${pill('继续查看方案 ↗',reportData()?'report':'saved',true)}${pill('重新探索','start')}</div></div><div class="home-result-photo">${recent.look.image?`<img src="${esc(recent.look.image)}" alt="已生成的本人妆效">`:state.base?`<img src="${esc(state.base)}" alt="你的上传照片；妆效尚未生成">`:'<span>你的照片位置<br><small>上传自拍后可在这里对照方案</small></span>'}</div></section>`:''}<section class="home-palettes"><div class="home-palettes-head"><h2>从一抹颜色，<br>看到整套妆容。</h2><p>选择你喜欢的唇色，从已有彩妆开始搭配。</p></div><div class="palette-gallery">${[['#A6536B','玫瑰豆沙','冷柔'],['#B9553A','蜜桃珊瑚','暖透'],['#9D423A','复古砖红','暖浓'],['#9D4774','冷调莓果','冷浓']].map(([hex,name,tone])=>`<button type="button" class="palette-tile" style="--tile:${hex}" data-action="anchor-color:${hex}"><span>${name}</span><small>${tone} · ${hex} ↗</small></button>`).join('')}</div><div class="home-feature"><span>生成</span><span>调整</span><span>复用</span><p>同一张脸比较风格，只改想改的部分，用好手边已有彩妆。</p></div></section>`;}
function uploadPage(){
  const pic=state.base?`<img src="${state.base}" alt="自动裁切后的人像">`:'<b aria-hidden="true">＋</b><span>点此上传自拍</span>';
  return `<section class="upload-stage">${field(['#fff7a9','#f2c45f','#fb9892'])}<div class="upload-top">${pill('← 返回首页','home')}<div class="upload-progress"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="upload-center"><p class="kicker">01 / YOUR PHOTO</p><h1>先来一张自拍</h1><p>自然光、正面、单人。选好照片，再一起探索你的颜色。</p><input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><button type="button" class="upload-zone" data-action="pick" aria-label="选择自拍照片">${pic}</button><div class="upload-cta">${pill(state.base?'更换照片':'选择照片 →','pick',true)}${state.base?pill('继续色彩问答 →','quiz',true,state.busy?'disabled':''):''}</div><p class="upload-quality">${state.base?esc(state.quality):'窗边自然光 · 素颜或淡妆 · 不戴美瞳'}</p>${safeText()}<div class="upload-meta"><p>照片先在浏览器中定位和裁切；点击生成后才会发送到图像服务。支持 PNG、JPEG、WebP，最大 12 MB。</p><button type="button" data-action="manual">暂不上传，手动探索 →</button></div></div></section>`;
}
function question(){
  const [title,options,colors]=questions[state.q];
  return `<section class="question">${field(colors)}<header>${pill('‹ 返回','qback')}<div><span>${state.q+1} / ${questions.length}</span><div class="progress" role="progressbar" aria-label="问答进度" aria-valuenow="${state.q+1}" aria-valuemax="${questions.length}"><i style="width:${(state.q+1)/questions.length*100}%"></i></div></div></header><article><h1>${title}</h1><p>选你实际愿意尝试的方向，稍后仍可修改。</p><div class="actions">${options.map((s,i)=>pill(s,'answer:'+i,false,`aria-pressed="${state.answers[state.q]===s}"`)).join('')}</div></article><footer>${pill('跳过这题','skip')}</footer></section>`;
}
function defaultProfile(){
  const q=state.answers, tone=q[0]==='浆果冷粉'?'冷':['杏桃暖橙','陶土砖红'].includes(q[0])?'暖':['柔雾豆沙','中性色'].includes(q[0])?'中性':'待确认';
  return {profileId:crypto.randomUUID(),photoQuality:state.base?state.quality:'未上传',undertoneCandidate:tone,skinDepthCandidate:'待确认',brightness:'待确认',chroma:['柔和','鲜明'].includes(q[2])?q[2]:'待确认',contrast:'待确认',seasonCandidate:'未判定',hairColor:'待填写',browColor:'待填写',visibleFaceFeatures:[],preference:q[3]||'日常',userCorrections:{},limitations:['此档案来自问答和手动输入。饰品与妆色偏好可用于搭配，无法测量皮肤底色。'],version:1,source:'手动确认'};
}
function profilePage(){
  const profile=state.profile;
  const tone=state.skinOverride||profile.undertoneCandidate;
  return chapter('确认你的色彩方向','',`<div class="profile-confirm">${state.base?`<img src="${esc(state.base)}" alt="你的上传照片">`:''}<div><span class="badge">${esc(profile.source)}</span><h2>你想先从哪组颜色试起？</h2><p>当前建议：${esc(tone==='待确认'?'中性':tone)}调。照片光线会改变观感，随时可以修正。</p><div class="tone-pills">${['暖','冷','中性'].map(t=>pill(t+'调','skin:'+t,false,`aria-pressed="${tone===t}"`)).join('')}</div>${dots(paletteFor(styleBy('date'),effectiveProfile()))}<p class="caption">已记住你的妆感与场景选择，后续不会重复提问。</p><div class="actions">${pill('选择妆容风格 ↗','confirm-profile',true)}${pill('修改上一题','quiz')}${state.cloud==='ready'&&state.photo&&state.consent?pill('重新分析照片','analyze',false,disabled()):''}</div></div></div>`);
}
function stylePanel(){
  const tone=state.skinOverride||state.profile?.undertoneCandidate;
  const list=styles.filter(x=>x.family===families[state.family]).sort((a,b)=>styleScore(b,tone)-styleScore(a,tone));
  return `<aside class="sheet"><h2>妆容风格</h2><p>16 种参数模板，选 2–3 种对比</p><div class="selectors">${families.map((x,i)=>pill(x,'family:'+i,false,`aria-pressed="${state.family===i}"`)).join('')}</div>
  <div class="style-list">${list.map((x,i)=>`<button type="button" class="style" data-action="style:${x.id}" aria-pressed="${state.selected.includes(x.id)}" ${disabled()}><i style="--swatch:${x.colors[0]}"></i><strong>${x.name}</strong><small>${i===0?'为你推荐':x.intensity}</small></button>`).join('')}</div>
  <p class="caption">已选 ${state.selected.length} · ${state.selected.map(id=>styleBy(id).name).join('、')}</p>
  <p class="caption">场景：${esc(state.scene)} · 妆感：${esc(state.intensity)}。这些已由问答带入。</p>
  <div class="actions">${pill('生成所选方案 →','generate',true,state.selected.length>=2&&!state.busy?'':'disabled')}</div></aside>`;
}
function displayImage(url,alt,label){return url?`<img src="${url}" alt="${alt}">`:`<span class="empty">${label}</span>`;}
function gallery(){
  const list=[{id:'original',name:'参考原图',image:state.base},...state.looks];
  return `<section class="gallery"><h2>本人照片对照</h2><p>风格是主角，照片用于查看生成前后变化。</p><div class="photo-grid" style="--count:${list.length}">${list.map(x=>{
    const caption=x.id==='original'?'固定参考':x.status==='rendering'?'生成中…':x.status==='draft'?'预览待更新':x.status==='error'?'生成失败':x.status==='example'?'预生成示例':x.status==='ready'?'本人 AI 图':'配色方案';
    return `<button type="button" data-action="focus:${x.id}" aria-pressed="${state.focus===x.id}">${displayImage(x.status==='draft'?null:x.image,x.name,caption)}<span>${x.name}<br>${caption}</span></button>`;
  }).join('')}</div>${state.busy&&state.startedAt?'<div class="generation-wait" role="status"><i aria-hidden="true"></i><strong>正在生成本人妆效</strong><span>已等待 <b id="elapsed">0</b> 秒</span></div>':''}<div class="actions">${pill('打开妆容工具','mobile-tools',false,'data-mobile-only')}${item()?.image&&item()?.status!=='draft'?pill('查看大图','zoom'):''}${['error','draft'].includes(item()?.status)&&live()?pill('重试当前图','retry',true,disabled()):''}${item()?.status==='ready'?pill('重新生成当前图','retry',false,disabled()):''}</div>
  <p class="caption">${state.mode==='sample'?'展示虚构示例人像及已生成的案例图。其他风格可查看结构化调色建议。':state.cloud==='ready'&&state.consent?'确认生成后，原图与新妆效逐张就位。':'目前可保存选色方案。本人妆容图需要真实图像 API 返回。'}</p></section>`;
}
function generationPage(){
  const complete=state.looks.filter(x=>x.status==='ready').length;
  const total=state.looks.length;
  const active=state.looks.find(x=>x.status==='rendering');
  return `<section class="generation-stage" role="status" aria-live="polite">${field()}<div class="generation-top"><span>LOOK2ME COLOR.</span><span>${complete} / ${total} 张妆效已完成</span></div><div class="generation-main"><h1>${complete?'继续生成下一张':'正在把妆容画到你的照片上'}</h1><p>${active?esc(active.name)+' · 正在请求真实图像服务':'正在整理生成结果'}</p><div class="generation-portrait">${state.base?`<img src="${esc(state.base)}" alt="你的原始照片">`:''}<span class="generation-sheen" aria-hidden="true"></span><span class="generation-spinner" aria-hidden="true"></span></div><div class="generation-meter"><i style="--progress:${total?complete/total:0}"></i></div><p class="generation-time">已等待 <b id="elapsed">0</b> 秒 · ${complete} / ${total} 张返回</p><small>进度按真实返回的图片更新；所需时间取决于图像服务。</small></div></section>`;
}
function swatches(values,names,interactive=false){
  return `<div class="swatch-row">${values.map((x,i)=>interactive?`<button type="button" class="swatch" data-action="copy:${x}" title="复制 ${x}"><i style="--swatch:${x}"></i><span>${names[i]||x}</span></button>`:`<span class="swatch"><i style="--swatch:${x}"></i><span>${names[i]||x}</span></span>`).join('')}</div>`;
}
function editPanel(current){
  if(!current)return '<p>先选风格并生成方案。</p>';
  const editingLocked=state.anchor&&state.part===0;
  return `<p>只更新选中部位，保留其他色值。</p><div class="edit-tools"><label class="field">编辑部位<select id="part">${labels.map((x,i)=>`<option value="${i}" ${state.part===i?'selected':''} ${state.anchor&&i===0?'disabled':''}>${x}${state.anchor&&i===0?'（已锁定）':''}</option>`).join('')}</select></label>
    <label class="field">自定义 HEX<input id="edit-color" value="${state.draft?.hex||current.colors[state.part]}" maxlength="7"></label>
    <div class="selectors">${['更深','更浅','更暖','更冷','更鲜明','更柔和'].map(x=>pill(x,'adjust:'+x,false,editingLocked?'disabled':'')).join('')}</div>
    <label class="field">补充修改要求<input id="edit-description" maxlength="150" placeholder="例如唇峰边缘更柔和"></label>
    <div class="actions">${pill('预览新配色','preview',true,editingLocked||state.busy?'disabled':'')}${state.history.length?pill('撤销上一步','undo',false,disabled()):''}</div>
    ${state.mode==='sample'&&current.id==='date'&&state.part===0&&!state.anchor?`<div class="selectors">${pill('雾粉示例','example-soft',false,disabled())}${pill('深莓示例','example-berry',false,disabled())}</div>`:''}
    ${state.draft?`<p>新色值 ${state.draft.hex}。图像将在提交后更新。</p><div class="actions">${pill('应用到方案','apply',true,disabled())}${pill('取消预览','cancel-edit')}</div>`:''}
    </div>`;
}
function anchorPanel(){
  return `<p>为现有口红补全眼影、腮红与眉色。唇色锁定为你确认的 HEX。</p><div class="edit-tools"><label class="field">已有口红名称<input id="anchor-name" value="${esc(state.anchorName)}" maxlength="35" placeholder="玫瑰豆沙"></label><label class="field">拾色器<input type="color" id="anchor-picker" value="${state.anchor||'#a96c70'}"></label><label class="field">口红 HEX<input id="anchor-hex" maxlength="7" value="${state.anchor||'#a96c70'}"></label><div class="actions">${pill('锁定口红并搭配','anchor',true,state.selected.length<2||state.busy?'disabled':'')}${state.anchor?pill('解锁唇色','unlock',false,disabled()):''}</div></div>`;
}
function refPanel(){
  const style=styleBy(item()?.id||state.selected[0])||styles[0], tags=[style.family,style.name,style.eyeRule,style.lipRule].join(' ');
  const score=ref=>(ref.terms||[]).reduce((sum,t)=>sum+Number(tags.includes(t)),0);
  const found=[...references].filter(x=>state.filter==='全部'||x.type===state.filter).sort((a,b)=>score(b)-score(a));
  const query=encodeURIComponent(style.keywords[0]);
  return `<div class="selectors">${['全部','明星','美妆博主'].map(x=>pill(x,'ref-filter:'+x,false,`aria-pressed="${state.filter===x}"`)).join('')}</div><div class="reference-list">${found.map(x=>`<article><h3>${esc(x.name)}</h3><small>${esc(x.type)} · ${esc(x.source)}</small><p>${esc(x.tip)}</p><p>联系当前妆容：${esc((x.terms||[]).find(t=>tags.includes(t))||'可参考其妆容手法与质感')}</p><a href="${x.url}" target="_blank" rel="noopener noreferrer">查看原内容 ↗</a></article>`).join('')}<a href="https://www.xiaohongshu.com/search_result?keyword=${query}" target="_blank" rel="noopener noreferrer">在小红书搜索「${style.keywords[0]}」↗</a></div>`;
}
function toolsPanel(){
  const x=item();
  const tabs=[['palette','配色色盘'],['edit','局部编辑'],['anchor','已有口红'],['refs','风格参考']];
  let content;
  if(state.tab==='edit')content=editPanel(x);
  else if(state.tab==='anchor')content=anchorPanel();
  else if(state.tab==='refs')content=refPanel();
  else content=x?`<h3>${x.name}</h3>${swatches(x.colors,labels,true)}<p>${esc(x.plan?.reason||styleBy(x.id).description)}</p><p class="caption">档案 v${x.profileVersion} / 妆容 v${x.lookVersion} / 图像 ${x.imageVersion?'v'+x.imageVersion:'待更新'}</p>`:'<p>选择风格生成方案。</p>';
  return `<aside class="sheet tools"><h2>妆容编辑台</h2><div class="tabs">${tabs.map(([id,name])=>`<button type="button" data-action="tab:${id}" aria-pressed="${state.tab===id}">${name}</button>`).join('')}</div>${content}</aside>`;
}
function studio(){
  return `<section class="page studio-page"><div class="studio-head"><div><p class="kicker">02 / CHOOSE YOUR LOOK</p><h1>挑选想试的妆容风格</h1><p class="sub">选择 2–3 种风格，生成后在报告里比较妆效与穿搭颜色。</p></div><div class="actions">${item()?pill('查看个人报告 →','report',true):''}${state.history.length?pill('恢复上一版','undo',false,disabled()):''}</div></div>${safeText()}<div class="studio">${stylePanel()}${state.looks.length?toolsPanel():''}</div></section>`;
}
const shadeCandidates=[
  {shade:'150',depth:['偏浅'],tone:'中性',description:'浅色、中性底色',source:'https://fentybeauty.com/products/pro-filtr-soft-matte-longwear-foundation-150'},
  {shade:'230',depth:['偏浅','中等'],tone:'中性',description:'浅至中等深度、中性底色',source:'https://fentybeauty.com/products/pro-filtr-soft-matte-longwear-foundation-230'}
];
function guideSections(current,profile){
  const style=styleBy(current.id), data=buildGuide(style,current.colors,profile);
  if(current.plan){
    const eye=current.plan.eyes;
    data.eyeColors=[eye.base,eye.main,eye.shadow,eye.deep,eye.highlight,data.eyeColors[5]];
  }
  const candidates=shadeCandidates.filter(x=>x.tone===profile.undertoneCandidate&&x.depth.includes(profile.skinDepthCandidate));
  const cards=[
    ['口红',data.lipColors,['搭配主色','轻透淡色','强调深色'],style.lipRule],
    ['眼影',data.eyeColors,['打底','主色','阴影','加深','提亮','强调'],current.plan?.eyes.blend||style.eyeRule],
    ['腮红',data.cheek,['当前主色','柔杏','冷粉'],current.plan?.blush.placement||style.blushRule],
    ['眉色',[data.brow],['当前眉色'],style.browRule+'。以当前发色 '+profile.hairColor+' 为参照，再试深浅。'],
    ['粉底方向',[],[],'候选色深 '+profile.skinDepthCandidate+'，底色 '+profile.undertoneCandidate+'。建议自然光下试涂下颌。'+(candidates.length?'下方为品牌公开色阶，可作实体试色参考。':'当前暂无可靠的具体色号匹配。')],
    ['发色',data.hair,['自然深茶','可可棕','玫瑰茶棕','杏茶棕'],'保持眉色不比发色跳出太多；偏冷可尝试玫瑰茶，偏暖可先试杏茶。']
  ];
  return cards.map(([name,colors,usage,tip],i)=>`<article><h3>${name}</h3>${swatches(colors,usage,true)}<p>${esc(tip)}</p>${i===4&&candidates.length?`<ul>${candidates.map(x=>`<li><a href="${x.source}" target="_blank" rel="noopener noreferrer">Fenty Pro Filt’r #${x.shade} · ${x.description} ↗</a></li>`).join('')}</ul><small>品牌标注系列逐步退出，库存需另查。此处仅提供品牌色阶核对。</small>`:''}${i===0?colors.map((color,j)=>`<small>${usage[j]} · ${color} · RGB ${rgb(color).join('/')} · ${rgb(color)[0]-rgb(color)[2]>42?'暖红倾向':'偏冷／中性倾向'} · ${['中明度 / 中饱和 / 缎光','较浅 / 低饱和 / 透润','偏深 / 中饱和 / 丝绒'][j]} · ${['日常','通勤','聚会'][j]}</small>`).join(''):''}
  <button type="button" class="caption" data-action="keyword:${i}" data-copy="${esc(style.name+' '+name+' '+(colors[0]||'试色')+' '+(i===0?'质地对比':usage[0]||'方向'))}">复制搜索关键词</button></article>`).join('');
}
function guidePage(){
  const x=item();if(!x)return chapter('美妆选色指南','先完成一套配色。',pill('回工作台','studio'));
  return chapter('美妆选色指南',x.name+' · 点色块复制 HEX，以参考色值搜索或到线下试色。',`<div class="actions">${pill('回工作台','studio')}${pill('保存个人指南','save',true)}${pill('查看个人报告','report')}</div><div class="guide">${guideSections(x,state.profile)}</div>`);
}
function readSaved(){try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch{return null;}}
function reportData(){
  const x=item();if(!x)return null;
  return {look:x,profile:state.profile,scene:state.scene,anchor:state.anchor,created:new Date().toISOString(),guide:buildGuide(styleBy(x.id),x.colors,state.profile)};
}
function reportModules(look,profile){
  const style=styleBy(look.id),[lip,eye,blush,brow]=look.colors,guide=buildGuide(style,look.colors,profile);
  const tone=profile.undertoneCandidate==='待确认'?'中性':profile.undertoneCandidate;
  const palette=[
    ['口红',lip,look.partNames?.[0]||style.lipstick.name,look.partReasons?.[0]||style.lipstick.reason],
    ['眼影',eye,look.partNames?.[1]||style.eyeshadow.name,look.partReasons?.[1]||style.eyeshadow.reason],
    ['腮红',blush,look.partNames?.[2]||style.blush.name,look.partReasons?.[2]||style.blush.reason],
    ['眉色',brow,look.partNames?.[3]||style.brow.name,look.partReasons?.[3]||style.brow.reason],
    ['底妆',tone==='暖'?'#d6aa8a':tone==='冷'?'#d6b5b0':'#ccb5a2',tone+'调方向','先在自然光下对照下颌，避免直接按照片购买色号。']
  ];
  const eyeSteps=[`用 ${guide.eyeColors[0]} 大面积薄铺眼窝`,`用 ${eye} 加深眼尾并晕开边缘`,`用 ${guide.eyeColors[4]} 少量提亮眼头与卧蚕`,`贴近睫毛根部描细眼线，保留眼型`];
  const lips=[['日常',guide.lipColors[1],'轻透'+style.lipstick.name,'轻薄一层，保留自然唇纹'],['约会',lip,style.lipstick.name,'与当前眼颊配色呼应'],['派对',guide.lipColors[2],'深调'+style.lipstick.name,'加深唇心，突出妆容重心']];
  const card=(n,title,body)=>`<article class="report-card"><span class="report-index">0${n}</span><h2>${title}</h2>${body}</article>`;
  return `<div class="report-stack">
  ${card(1,'风格定位',`<p class="report-lead">${esc(style.name)} · ${esc(style.complexion)} + ${esc(style.eyeRule)} + ${esc(style.lipRule)}</p><p class="caption">来自当前风格模板与已确认档案，供试妆参考。</p>`)}
  ${card(2,'色彩搭配',`<div class="report-colors">${palette.map(([part,hex,name,reason])=>`<div class="report-color"><i style="background:${hex}"></i><small>${part} · ${hex}</small><strong>${esc(name)}</strong><p>${esc(reason)}</p></div>`).join('')}</div>`)}
  ${card(3,'底妆建议',`<div class="report-list"><p><b>粉底</b> ${esc(style.complexion)}；${esc(tone)}调方向，实体试色后确认。</p><p><b>遮瑕</b> 只在需要处薄叠；眼下暗沉可先试少量蜜桃校色。</p><p><b>定妆</b> 易出油区域轻压散粉，保留颧面自然光泽。</p><p><b>提亮</b> 面中与眼下少量点涂，避免整体过亮。</p></div>`)}
  ${card(4,'眼妆步骤',`<ol class="report-steps">${eyeSteps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`)}
  ${card(5,'唇妆推荐',`<div class="report-lips">${lips.map(([scene,hex,name,tip])=>`<div><i style="background:${hex}"></i><b>${scene} · ${esc(name)}</b><strong>${hex}</strong><small>${tip}</small></div>`).join('')}</div>`)}
  ${card(6,'妆容小技巧',`<ul class="report-tips"><li>${esc(tone)}调只作为试色方向，冷暖都可以在脸旁比较后再选。</li><li>轮廓修饰从少量开始，按想要的妆感决定位置与强度。</li><li>眼、颊、唇先定一个重点，其余颜色少量多次叠加。</li></ul>`)}
  </div>`;
}
function colorDirection(profile){
  const tone=profile.undertoneCandidate, depth=profile.skinDepthCandidate;
  const deep=depth==='偏深'||profile.brightness==='低';
  const light=depth==='偏浅'&&profile.brightness==='高';
  if(tone==='暖'&&deep)return {best:'秋季暖深型',second:'冬季冷深型',avoid:'夏季冷浅型',lead:'浓郁、温暖而沉稳。深而柔和的暖色适合放在面部附近，冰冷浅色与纯白建议先做对照试色。',styles:[['#Quiet Luxury 静奢风','用巧克力棕、深茶与柔和象牙白做同色层次；让面料质感成为重点。'],['#Old Money 老钱风','森林绿、驼色和象牙白适合经典、克制的搭配。'],['#Dark Academia 暗黑学院','巧克力棕、酒红与深蓝绿色适合浓郁的学院层次。']]};
  if(tone==='冷'&&deep)return {best:'冬季冷深型',second:'秋季暖深型',avoid:'春季暖浅型',lead:'先试清晰、偏冷的深色；靠近脸部的暖黄与浅橙建议和冷白、莓红并排比较。',styles:[['#Modern Classic 现代经典','炭黑、冷白与深莓红形成清楚的轮廓。'],['#Dark Academia 暗黑学院','深蓝、冷酒红与灰棕叠出沉稳层次。'],['#Minimal Chic 极简利落','用一处银色金属感点亮深色造型。']]};
  if(tone==='暖'&&light)return {best:'春季暖浅型',second:'秋季暖深型',avoid:'冬季冷深型',lead:'轻盈暖色与明亮度值得优先对比；大面积冷黑和冰紫可先离开面部。',styles:[['#Soft Natural 柔和自然','奶油白与蜜桃色组合，保持柔和亮度。'],['#Old Money 老钱风','浅驼与暖白组成日常经典感。'],['#Fresh Romance 清新温柔','珊瑚色作为小面积点缀。']]};
  if(tone==='冷'&&light)return {best:'夏季冷浅型',second:'冬季冷深型',avoid:'秋季暖深型',lead:'灰粉、柔蓝与冷调浅色适合先试；浓重暖棕和橘黄建议在脸旁对照。',styles:[['#Soft Minimal 柔雾极简','雾蓝、灰粉与冷白保持轻柔对比。'],['#Quiet Luxury 静奢风','用冷灰面料与少量银饰展现质感。'],['#Modern Romance 现代浪漫','柔莓色点缀低饱和造型。']]};
  return {best:'待自然光试色',second:'跨季型比较',avoid:'暂不判定',lead:'目前只有颜色偏好或单张照片线索，缺少可靠的冷暖、明度与脸旁布料对照。先比较同色的冷暖、深浅，再确认季型。',styles:[['#Quiet Luxury 静奢风','选一组同色系深浅，比较面部气色与面料质感。'],['#Old Money 老钱风','用柔和中性色作底，金银饰品分别在脸旁试戴。'],['#Dark Academia 暗黑学院','用浓郁棕、酒红或蓝绿作小面积对照，再决定主色。']]};
}
function reportExtended(look,profile){
  const guide=buildGuide(styleBy(look.id),look.colors,profile), direction=colorDirection(profile);
  const valid=direction.best!=='待自然光试色';
  const rows=[['最适合'+(valid?'候选':''),direction.best],['次适合'+(valid?'候选':''),direction.second],['谨慎尝试',direction.avoid]];
  const outfits=['日常','职场','约会'].map((name,i)=>({name,colors:guide.clothes[i],text:['浅中性色作底，主色放在上半身，用第三色小面积点缀。','以较深的外套稳定轮廓，内搭保留柔和亮度。','让主色靠近脸部，配饰与点缀色呼应。'][i]}));
  const swatch=(hex)=>`<i class="report-dot" style="background:${hex}" title="${hex}"></i>`;
  return `<section class="editorial-report"><div class="editorial-heading"><span>色彩诊断</span><h2>从脸旁的颜色，走向整套造型。</h2><p>这是一份可试色的个人方案。季型是候选方向，照片、灯光与妆容会影响判断。</p></div><div class="season-layout"><div class="season-name"><small>YOUR COLOR DIRECTION</small><strong>${esc(direction.best)}</strong><p>${esc(direction.lead)}</p></div><div class="season-ranking">${rows.map(([label,name])=>`<div><span>${label}</span><strong>${esc(name)}</strong></div>`).join('')}<p>${valid?'判断依据：已记录的冷暖与明度线索。仍建议用自然光下的冷暖布料确认。':'当前不把色彩偏好或单张照片当成确定诊断。'}</p></div></div><div class="editorial-section"><div class="section-title"><span>01 / WARDROBE</span><h3>穿搭配色</h3><p>主色决定气质，浅色留出面部空间，点缀色小面积使用。</p></div><div class="outfit-grid">${outfits.map(row=>`<article><div class="outfit-band">${row.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</div><h4>${row.name}</h4><p>${esc(row.text)}</p><small>${row.colors.join(' · ')}</small></article>`).join('')}</div></div><div class="editorial-section beauty-details"><div class="section-title"><span>02 / FINISHING TOUCHES</span><h3>发色与饰品</h3></div><div class="detail-columns"><article><h4>发色建议</h4><div class="report-dots">${guide.hair.slice(0,3).map(swatch).join('')}</div><p>${profile.undertoneCandidate==='暖'?'自然深茶、可可棕或柔暖茶棕可先试；避免一次漂成发黄的浅色。':profile.undertoneCandidate==='冷'?'深咖、冷茶棕或柔和黑茶可先试；先把色卡放在脸旁比较。':'保留当前发色作参照，分别试暖茶与冷茶，再决定染发方向。'}</p><small>眉色与发色保持接近，实物染发需考虑发质与褪色。</small></article><article><h4>饰品建议</h4><div class="jewel-colors">${swatch('#C8A565')}${swatch('#D6D9DC')}${swatch('#6A4A38')}</div><p>${profile.undertoneCandidate==='暖'?'优先试哑光金、古金或暖铜；偏小而有分量的耳饰可呼应深色穿搭。':profile.undertoneCandidate==='冷'?'先试银色、白金色与冷调珍珠；线条清晰的饰品可让整体更利落。':'把金色与银色放在脸旁分别试戴，观察肤色是否更均匀；造型优先选细线条。'}</p><small>金属偏好来自问答；适合度以脸旁实物对照为准。</small></article></div></div><div class="editorial-section"><div class="section-title"><span>03 / STYLE EDIT</span><h3>适合尝试的三种风格</h3></div><div class="style-editorial">${direction.styles.map(([name,tip],i)=>`<article><span>0${i+1}</span><h4>${esc(name)}</h4><p>${esc(tip)}</p></article>`).join('')}</div></div></section>`;
}
function wardrobePalette(profile){
  const warm=profile.undertoneCandidate==='暖';
  const cool=profile.undertoneCandidate==='冷';
  if(warm)return {
    main:[['深酒红','#6B3025'],['焦糖色','#8A4B24'],['森林绿','#315344'],['深青绿','#244B50']],
    pair:[['干邑棕','#A66A3F'],['橄榄绿','#777044'],['茄紫','#754052'],['暖驼色','#D1B58A']],
    accent:[['番茄红','#B94A2D'],['古金色','#B18B28']],
    avoid:[['冰蓝色','#E4E9F2'],['冰薰衣草紫','#DCD6E8'],['冷灰色','#BFC6CE'],['纯白色','#FFFFFF']],
    looks:[['日常','柔和象牙白针织衫','苔藓橄榄绿长裤','蘑菇棕包'],['职场','暖灰褐色外套','森林绿衬衫','驼色长裤'],['约会','陶土色上衣','灰调玫瑰色裙子','砖红唇妆']]
  };
  if(cool)return {
    main:[['深海蓝','#233F55'],['冷酒红','#71364A'],['松柏绿','#274D4A'],['炭灰色','#454550']],
    pair:[['冷灰色','#A6ABB3'],['雾紫色','#857388'],['深莓色','#69354D'],['冷米白','#E9E5E4']],
    accent:[['莓果红','#A9445A'],['银灰色','#BAC3CB']],
    avoid:[['橘黄色','#F3B461'],['暖驼色','#D1B58A'],['荧光黄绿','#D9FF28'],['奶油黄','#F2DB9A']],
    looks:[['日常','冷米白针织衫','深海蓝长裤','银灰色包'],['职场','炭灰色西装','冷米白衬衫','深莓色点缀'],['约会','冷酒红上衣','雾紫色半裙','银色耳饰']]
  };
  return {
    main:[['深酒红','#6B3025'],['森林绿','#315344'],['深青绿','#244B50'],['暖灰褐','#817064']],
    pair:[['干邑棕','#A66A3F'],['暖驼色','#D1B58A'],['柔和象牙白','#E7D8BE'],['茄紫','#754052']],
    accent:[['砖红色','#A44935'],['古金色','#B18B28']],
    avoid:[['冰蓝色','#E4E9F2'],['冰薰衣草紫','#DCD6E8'],['荧光黄绿','#D9FF28'],['纯白色','#FFFFFF']],
    looks:[['日常','柔和象牙白针织衫','森林绿长裤','干邑棕包'],['职场','暖灰褐色外套','深青绿衬衫','暖驼色长裤'],['约会','深酒红上衣','茄紫色半裙','古金色饰品']]
  };
}
function reportExtendedV2(look,profile){
  const guide=buildGuide(styleBy(look.id),look.colors,profile), direction=colorDirection(profile), palette=wardrobePalette(profile);
  const valid=direction.best!=='待自然光试色';
  const rows=[['最适合候选',direction.best],['次适合候选',direction.second],['谨慎尝试',direction.avoid]];
  const swatch=(hex)=>`<i class="report-dot" style="background:${hex}" title="${hex}"></i>`;
  const cell=([name,hex])=>`<button type="button" class="wardrobe-color" style="--color:${hex};--ink:${['#E4E9F2','#DCD6E8','#BFC6CE','#FFFFFF','#E9E5E4','#E7D8BE','#D1B58A','#F2DB9A'].includes(hex)?'#181b19':'#fff'}" data-action="drape:${hex}" aria-label="试穿${name} ${hex}"><strong>${name}</strong><small>${hex}</small></button>`;
  const combo=palette.looks.map(([name,...items])=>`<article><span>${name}</span><strong>${items.join(' · ')}</strong><p>${name==='日常'?'浅色靠近面部，深色稳定整体轮廓。':name==='职场'?'用面料和深浅层次替代强烈撞色。':'让唇色与一处衣物或饰品呼应。'}</p></article>`).join('');
  const tryColors=[...palette.main,...palette.pair,...palette.accent,...palette.avoid.slice(0,2)];
  if(!tryColors.some(([,hex])=>hex===state.drapeColor))state.drapeColor=tryColors[0][1];
  return `<section class="editorial-report"><div class="editorial-heading"><span>色彩诊断</span><h2>从脸旁的颜色，走向整套造型。</h2><p>季型是候选方向；照片光线和现有妆容会影响判断，可用自然光下的布料再对照。</p></div><div class="season-layout"><div class="season-name"><small>YOUR COLOR DIRECTION</small><strong>${esc(direction.best)}</strong><p>${esc(direction.lead)}</p></div><div class="season-ranking">${rows.map(([label,name])=>`<div><span>${label}</span><strong>${esc(name)}</strong></div>`).join('')}<p>${valid?'依据来自已记录的色彩线索，仍建议在脸旁比较冷暖布料。':'目前的颜色偏好不足以确定季型。'}</p></div></div><div class="editorial-section wardrobe-section"><div class="section-title"><span>01 / WARDROBE</span><h3>穿搭配色</h3><p>先从适合日常衣橱的颜色开始，点色块即可在下方试穿预览。</p></div><div class="wardrobe-grid"><div><h4>主打色</h4>${palette.main.map(cell).join('')}</div><div><h4>搭配色</h4>${palette.pair.map(cell).join('')}</div><div><h4>点缀色</h4>${palette.accent.map(cell).join('')}</div><div><h4>先避开</h4>${palette.avoid.map(cell).join('')}</div></div><div class="wardrobe-combinations"><h4>配色组合</h4><div>${combo}</div></div><div class="tryon-section"><div><span>COLOR TRY-ON</span><h3>多色试穿</h3><p>点选颜色，比较靠近脸部时的整体感觉。此处为色布模拟预览，实际衣服需在自然光下试穿。</p><div class="tryon-swatches">${tryColors.map(([name,hex])=>`<button type="button" data-action="drape:${hex}" aria-pressed="${state.drapeColor===hex}" style="--color:${hex}" title="${name} ${hex}"><i></i><span>${name}</span></button>`).join('')}</div></div><div class="tryon-preview">${state.base?`<canvas id="drape-canvas" width="512" height="640" role="img" aria-label="当前照片的色布模拟预览"></canvas>`:'<div class="tryon-empty">上传自拍后，在这里比较脸旁配色</div>'}<strong>${esc(tryColors.find(x=>x[1]===state.drapeColor)?.[0]||'深酒红')} <small>${state.drapeColor}</small></strong></div></div></div><div class="editorial-section beauty-details"><div class="section-title"><span>02 / FINISHING TOUCHES</span><h3>发色与饰品</h3></div><div class="detail-columns"><article><h4>发色建议</h4><div class="report-dots">${guide.hair.slice(0,3).map(swatch).join('')}</div><p>${profile.undertoneCandidate==='暖'?'自然深茶、可可棕或柔暖茶棕可先试。':profile.undertoneCandidate==='冷'?'深咖、冷茶棕或柔和黑茶可先试。':'保留当前发色作参照，分别试暖茶与冷茶。'}</p></article><article><h4>饰品建议</h4><div class="jewel-colors">${swatch('#C8A565')}${swatch('#D6D9DC')}${swatch('#6A4A38')}</div><p>${profile.undertoneCandidate==='暖'?'优先试哑光金、古金或暖铜，选择有分量的小型耳饰。':profile.undertoneCandidate==='冷'?'先试银色、白金色与冷调珍珠，线条清晰更利落。':'金色与银色分别在脸旁试戴，观察哪一种让肤色更均匀。'}</p></article></div></div><div class="editorial-section"><div class="section-title"><span>03 / STYLE EDIT</span><h3>适合尝试的三种风格</h3></div><div class="style-editorial">${direction.styles.map(([name,tip],i)=>`<article><span>0${i+1}</span><h4>${esc(name)}</h4><p>${esc(tip)}</p></article>`).join('')}</div></div></section>`;
}
function hydrateDrape(){
  const canvas=document.querySelector('#drape-canvas');if(!canvas||!state.base)return;
  const img=new Image();img.onload=()=>{
    if(!canvas.isConnected)return;
    const w=512,h=640,ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const chin=state.photo?.points?.[8]||{x:w/2,y:420};
    const center=Math.max(180,Math.min(332,chin.x));
    const shoulder=Math.max(455,Math.min(555,chin.y+75));
    const collar=Math.min(600,shoulder+22);
    const neckHalf=62;
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const m=mask.getContext('2d');m.fillStyle='#fff';m.beginPath();
    m.moveTo(-10,h);m.lineTo(-10,shoulder+28);
    m.quadraticCurveTo(center-neckHalf-115,shoulder-30,center-neckHalf,collar);
    m.bezierCurveTo(center-neckHalf+6,collar+55,center+neckHalf-6,collar+55,center+neckHalf,collar);
    m.quadraticCurveTo(center+neckHalf+115,shoulder-30,w+10,shoulder+28);
    m.lineTo(w+10,h);m.closePath();m.fill();
    const soft=document.createElement('canvas');soft.width=w;soft.height=h;
    const sc=soft.getContext('2d',{willReadFrequently:true});sc.filter='blur(5px)';sc.drawImage(mask,0,0);
    const pixels=ctx.getImageData(0,0,w,h),alpha=sc.getImageData(0,0,w,h).data;
    const target=state.drapeColor.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));
    for(let i=0;i<pixels.data.length;i+=4){
      const a=alpha[i+3]/255;if(a<.02)continue;
      const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      const light=.2126*r+.7152*g+.0722*b;
      if(light<34)continue; // Keep dark hair and deep shadows intact.
      const texture=Math.max(.36,Math.min(1.48,light/135));
      const mix=a*.86;
      for(let k=0;k<3;k++)pixels.data[i+k]=pixels.data[i+k]*(1-mix)+Math.min(255,target[k]*texture)*mix;
    }
    ctx.putImageData(pixels,0,0);
  };img.src=state.base;
}
const celebrityLooks=[
  {name:'倪妮',region:'中国',event:'2022 金鸡奖',file:'Ni Ni at the 35th Golden Rooster Awards in November 2022.jpg',asset:'nini.jpg',credit:'小Y爱抓马DramaY · CC BY 3.0',tags:['retro','east','mature'],tip:'观察唇色如何承担红毯妆的视觉重心。'},
  {name:'刘亦菲',region:'中国',event:'2017 北京国际电影节',file:'Liu Yifei at the Beijing International Film Festival.jpg',asset:'liuyifei.jpg',credit:'刘亦菲吧官方 · CC BY-SA 2.5',tags:['bare','k-clear','date'],tip:'观察柔和眉眼与唇色之间的轻重关系。'},
  {name:'IU',region:'韩国',event:'2024 Estée Lauder 活动',file:'240807 IU at Estee Lauder Photo Call.png',asset:'iu.png',credit:'K-POPIT 케이팝잇 · CC BY 3.0',tags:['k-clear','dream','water'],tip:'观察眼妆和唇色的低对比衔接。'},
  {name:'裴秀智',region:'韩国',event:'2024 CELINE 活动',file:'20241128 Bae Suzy CELINE photocall.jpg',asset:'suzy.jpg',credit:'티비텐 · CC BY 3.0',tags:['office','mature','j-natural'],tip:'观察自然眉与干净底妆的搭配。'},
  {name:'小松菜奈',region:'日本',event:'2025 戛纳红毯',file:'Nana Komatsu at 2025 Cannes Red Carpet 1 (cropped).jpg',asset:'komatsu.jpg',credit:'Kacy Bao · CC BY-SA 4.0',tags:['smoky','icy','pop'],tip:'观察眼尾色彩如何形成更鲜明的风格。'},
  {name:'桥本环奈',region:'日本',event:'2017 东京国际电影节',file:'Hashimoto Kanna at Opening Ceremony of the 30th TIFF 2017 01.jpg',asset:'hashimoto.jpg',credit:'宗田英治 · CC BY-SA 2.0',tags:['peach','j-natural','bare'],tip:'观察轻盈颊色与自然唇色的搭配。'}
];
function celebrityCards(look){
  const ranked=[...celebrityLooks].sort((a,b)=>Number(b.tags.includes(look.id))-Number(a.tags.includes(look.id))).slice(0,3);
  return `<div class="celebrity-grid">${ranked.map(x=>{const link='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(x.file).replace(/%20/g,'_');return `<article><img loading="lazy" src="assets/celebrity/${x.asset}" alt="${x.name}公开活动造型"><div><small>${x.region} · ${x.event}</small><h3>${x.name}</h3><p>${x.tip}</p><small>${x.credit}</small><a href="${link}" target="_blank" rel="noopener noreferrer">查看原图 ↗</a></div></article>`}).join('')}</div>`;
}
const editOptions=[
  [['#A6536B','玫瑰豆沙'],['#B9553A','蜜桃珊瑚'],['#9D423A','复古砖红'],['#9D4774','冷调莓果'],['#B67976','柔雾裸粉']],
  [['#9D7789','粉棕'],['#A5694F','大地棕'],['#826B92','灰紫'],['#854D3C','暖棕'],['#745071','莓紫']],
  [['#D8839A','透粉'],['#DF8971','蜜桃'],['#B982AA','冷玫瑰'],['#B77064','砖杏'],['#C78580','自然血色']],
  [['#685461','灰棕'],['#654B3D','暖棕'],['#5B4F66','冷棕'],['#504134','深茶'],['#62544E','自然棕']]
];
function editSheet(look){
  return `<div class="sheet-backdrop" data-action="close-edit"></div><section class="bottom-sheet" role="dialog" aria-modal="true" aria-label="调整某个部位"><div class="sheet-handle"></div><div class="sheet-title"><h2>只改一个部位</h2>${pill('关闭','close-edit')}</div><p>眼、颊、唇和眉各自保留；图片更新完成前会标记“预览待更新”。</p><div class="tabs">${labels.map((x,i)=>`<button type="button" data-action="edit-tab:${i}" aria-pressed="${state.part===i}" ${state.anchor&&i===0?'disabled':''}>${x}</button>`).join('')}</div><div class="edit-color-grid">${editOptions[state.part].map(([hex,name])=>`<button type="button" data-action="edit-choice:${hex}" ${disabled()}><i style="background:${hex}"></i><b>${name}</b><small>${hex}</small></button>`).join('')}</div><p class="caption">当前 ${look.colors[state.part]} · ${state.draft?'已选择 '+state.draft.hex:'请选择新颜色'}</p><div class="actions">${pill('撤销','undo',false,state.history.length?'':'disabled')}${pill('确认修改','confirm-edit',true,state.draft?'':'disabled')}</div></section>`;
}
function anchorStartPage(){
  const choices=[['#A6536B','玫瑰豆沙','柔雾'],['#B9553A','蜜桃珊瑚','缎光'],['#9D423A','复古砖红','丝绒'],['#9D4774','冷调莓果','水光'],['#B67976','柔雾粉','柔雾'],['#8C3059','深梅子','丝绒'],['#C45C54','番茄红','缎光'],['#A8725B','奶茶棕','柔雾'],['#D77D83','蜜桃粉','水光'],['#7F3845','酒渍红','丝绒'],['#B94D6A','玫瑰红','缎光'],['#AA6C6F','赤茶豆沙','柔雾']];
  return chapter('用你现有的口红，搭配完整妆容','选一个接近的色系，或上传照片、填写 HEX。品牌名称仅用于记录，不会凭空换算色值。',`<div class="anchor-layout"><div class="sheet"><h2>先选唇色</h2><div class="anchor-swatches">${choices.map(([hex,name,finish])=>`<button type="button" data-action="anchor-color:${hex}" aria-pressed="${state.anchor===hex}"><i style="background:${hex}"></i><strong>${name}</strong><small>${finish} · ${hex}</small></button>`).join('')}</div><details><summary>填写品牌色号或精确色值</summary><label class="field">品牌与色号<input id="anchor-name" maxlength="35" placeholder="例如 YSL 21" value="${esc(state.anchorName)}"></label><label class="field">自定义 HEX<input id="anchor-hex" maxlength="7" value="${state.anchor||'#a6536b'}"></label></details><label class="field">或上传口红试色照片<input id="lip-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="caption">照片拾色仅供屏幕参考，光线、质地会改变实际观感。</p><div class="tone-pills">${['暖','冷','中性'].map(t=>pill(t+'调','anchor-tone:'+t,false,`aria-pressed="${state.anchorTone===t}"`)).join('')}</div><div class="actions">${pill('生成完整搭配 ↗','anchor-generate',true)}</div></div><div class="anchor-preview"><div class="preview-lip" style="background:${state.anchor||'#a6536b'}"></div><p>一支口红，可以有一整套妆。</p><small>当前参考色 ${state.anchor||'#a6536b'} · 实物请以试色为准。</small></div></div>`);
}
function reportComparison(){
  const looks=state.looks;if(!looks.length)return '';
  return `<section class="report-comparison"><div><h2>在报告里比较妆效</h2><p>选一个风格，下方的妆容和穿搭建议会同步切换。</p></div><div class="report-comparison-grid">${looks.map(look=>`<button type="button" data-action="focus:${look.id}" aria-pressed="${item()?.id===look.id}">${look.image&&look.status==='ready'?`<img src="${esc(look.image)}" alt="${esc(look.name)}妆效">`:state.base?`<img src="${esc(state.base)}" alt="${esc(look.name)}参考原图">`:`<span class="report-look-palette">${look.colors.map(color=>`<i style="background:${color}"></i>`).join('')}</span>`}<strong>${esc(look.name)}</strong><small>${look.status==='ready'?'已生成妆效':look.status==='error'?'生成失败 · 显示原图':look.status==='rendering'?'正在生成':'配色方案'}</small></button>`).join('')}</div></section>`;
}
function reportPage(saved=false){
  const report=saved?readSaved():reportData();
  if(!report)return chapter('个人妆容报告','暂无报告。',pill('返回首页','home'));
  const {look,profile}=report;
  return chapter('你的个人色彩报告',look.name+' · '+report.scene,`<div class="actions">${pill('下载 PDF','pdf',true)}${pill('下载分享卡','share')}${saved?pill('返回首页','home'):pill('保存到本机','save')}${saved?'':pill('返回风格选择','studio')}</div><div class="report-hero"><div class="saved">${look.image&&look.status!=='draft'?`<img src="${esc(state.compareBefore&&look.before?look.before:look.image)}" alt="当前本人妆效">`:state.base?`<img src="${esc(state.base)}" alt="你的原始照片；妆效尚未生成">`:'<div class="report-image-empty">留给你的照片<br><small>上传自拍，可把报告和本人妆效放在一起。</small></div>'}</div><div><p class="report-eyebrow">PERSONAL COLOR & MAKEUP REPORT</p><h2>${esc(look.name)}</h2><p>${esc(profile.source)} · ${esc(profile.undertoneCandidate)}调候选</p>${dots(look.colors)}<p class="caption">${look.status==='rendering'?'正在生成妆效…':look.status==='ready'?'本人妆效已生成':'当前显示原图或照片位置；妆效尚未生成。'} 色值为屏幕参考，实物请试色。</p></div></div>${saved?"":reportComparison()}${reportExtendedV2(look,profile)}<div class="makeup-heading"><span>BEAUTY EDIT</span><h2>妆容与上妆步骤</h2><p>以当前选定风格为起点，再根据本人照片与实物试色调整。</p></div>${reportModules(look,profile)}<section class="report-guide"><h2>美妆选色指南</h2>${guideSections(look,profile)}</section><div class="report-actions">${pill('调整某个部位','open-edit',true)}${pill('用我的口红搭配','anchor-start')}${!state.base?pill('上传自拍试妆','try-photo'):''}${look.before?pill(state.compareBefore?'查看修改后':'查看修改前','compare'):''}${state.history.length?pill('撤销上一步','undo'):''}</div>${state.editSheet?editSheet(look):''}<section class="report-reference"><h2>和你气质相似的明星</h2>${celebrityCards(look,profile)}</section><section class="report-image-final"><p class="report-index">FINAL / YOUR LOOK</p><h2>你的妆容效果</h2>${look.image&&look.status==='ready'?`<img src="${esc(look.image)}" alt="本人妆容生成结果">`:state.base?`<img src="${esc(state.base)}" alt="本人原图；妆效等待生成"><p>目前显示原图。${look.status==='rendering'?'妆效正在生成…':'妆效暂未生成成功，可保留配色方案。'}</p>`:'<div class="report-image-empty">这里为你的照片与妆效留出位置</div>'}</section>`);
}
const views={home,upload:uploadPage,quiz:question,profile:profilePage,studio,guide:guidePage,report:()=>reportPage(),saved:()=>reportPage(true),anchorStart:anchorStartPage};
function render(){
  const markup=state.busy&&state.startedAt?generationPage():views[state.page]();
  const current=app.querySelector('.question');
  if(state.page==='quiz'&&current){
    const template=document.createElement('template');
    template.innerHTML=markup;
    const next=template.content.firstElementChild;
    const light=current.querySelector('.fieldlight');
    light.style.cssText=next.querySelector('.fieldlight').style.cssText;
    for(const tag of ['header','article','footer'])current.querySelector(tag).replaceWith(next.querySelector(tag));
  }else app.innerHTML=markup;
  hydrateDrape();
  document.title='LOOK2ME COLOR｜'+({home:'个人色彩',upload:'自拍上传',quiz:'色彩问答',profile:'色彩档案',studio:'妆容工作台',guide:'美妆指南',report:'个人报告',saved:'已保存报告',anchorStart:'已有口红搭配'}[state.page]);}
async function call(endpoint,body,timeout=155000){
  const response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(payload.error||'服务未返回结果。');
  return payload;
}
function inspectQuality(photo){
  const image=photo.base.getContext('2d').getImageData(0,0,photo.base.width,photo.base.height);
  const luma=(offset)=>.2126*image.data[offset]+.7152*image.data[offset+1]+.0722*image.data[offset+2];
  let sum=0,diff=0,count=0;
  for(let y=170;y<445;y+=5)for(let x=130;x<380;x+=5){const i=(y*image.width+x)*4;sum+=luma(i);diff+=Math.abs(luma(i)-luma(i+4));count++;}
  if(sum/count<48)return '人脸已定位，光线偏暗，建议换自然光自拍';
  if(sum/count>230)return '人脸已定位，高光可能过曝，建议避免直射光';
  if(diff/count<1.15)return '人脸已定位，细节偏软，建议换更清晰的照片';
  return '单脸已定位，方向已校正。光照和滤镜仍可能影响色彩参考';
}
async function upload(file){
  if(!file||state.busy)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){note('请选择小于 12 MB 的 PNG、JPEG 或 WebP。',true);render();return;}
  const url=URL.createObjectURL(file);
  state.busy=true;note('正在定位、转正和裁切照片…');render();
  try{
    const v=await vision(),photo=await v.normalizePhoto(await v.imageFrom(url));
    state.photo=photo;state.base=photo.base.toDataURL('image/webp',.93);state.quality=inspectQuality(photo);
    state.profile=null;state.confirmed=false;state.looks=[];state.history=[];if(!state.anchor)state.anchorName='';state.consent=false;state.mode='person';state.revision++;
    note('照片已准备好，可以继续色彩问答。');
  }catch(error){note(error.message||'未找到可用正脸，请换一张照片。',true);}
  finally{URL.revokeObjectURL(url);state.busy=false;render();}
}
async function nextQuestion(){
  if(state.q<questions.length-1){state.q++;render();return;}
  state.scene=state.answers[4]||state.scene;
  await finishProfile();
}
async function finishProfile(){
  const profile=state.profile||defaultProfile();
  state.profile=profile;go('profile');
  if(state.cloud!=='ready'||!state.photo||!state.consent){
    
    render();return;
  }
  state.busy=true;note('正在分析照片中可见的色彩特征…');render();
  try{
    const {data,model}=await call('analyze-face',{image:state.base,answers:state.answers},70000);
    state.profile={...profile,...data,version:profile.version+1,source:'OpenAI 初步参考',model};
    state.confirmed=false;
    note('AI 已返回候选，请检查和修正。');
  }catch(error){note(error.message+' 可以保留当前手动档案或重试。',true);}
  finally{state.busy=false;render();}
}
function launchSample(){
  Object.assign(state,{mode:'sample',photo:null,base:'assets/look-0.webp',quality:'虚构示例，预生成素材',consent:false,answers:[],selected:['date','peach'],family:1,anchor:null,anchorName:'',tab:'palette',focus:'date',history:[],draft:null,revision:state.revision+1});
  state.profile={...defaultProfile(),source:'示例档案',undertoneCandidate:'中性',skinDepthCandidate:'中等',brightness:'中',chroma:'柔和',hairColor:'深棕',browColor:'灰棕',limitations:['示例档案仅用于体验功能。']};
  state.confirmed=true;state.looks=state.selected.map((id,i)=>({...createLook(id),colors:[...styleBy(id).colors],image:'assets/look-'+(i+1)+'.webp',status:'example',imageVersion:1}));
  go('studio');
}
function createLook(id){
  const style=styleBy(id);
  return {id,name:style.name,colors:paletteFor(style,effectiveProfile(),state.anchor),image:null,profileVersion:state.profile.version,lookVersion:1,imageVersion:0,status:'palette',plan:null};
}
function snapshot(){state.history.push({looks:structuredClone(state.looks),anchor:state.anchor,anchorName:state.anchorName,focus:state.focus});if(state.history.length>8)state.history.shift();}
async function verifyImage(url){
  if(typeof url!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(url))throw Error('未收到有效的妆效图。');
  const v=await vision();return v.imageFrom(url);
}
async function createRemote(x){
  const route=state.anchor?'match-existing-lipstick':'generate-makeup-plan';
  let data;
  try{({data}=await call(route,{styleId:x.id,profile:effectiveProfile(),scene:state.scene,intensity:state.intensity,anchor:state.anchor},70000));}
  catch(error){data=null;x.planError=error.message;}
  if(data){x.plan=data;x.colors=[data.lip.hex,data.eyes.main,data.blush.hex,data.brows.hex];}
  x.status='rendering';render();
  const {image}=await call('render-makeup',{image:state.base,styleId:x.id,colors:x.colors,visualPlan:{...data,scene:state.scene,intensity:state.intensity},lockLip:!!state.anchor});
  await verifyImage(image);
  x.image=image;x.status='ready';x.imageVersion=x.lookVersion;x.before=null;
}
const live=()=>state.mode==='person'&&state.cloud==='ready'&&state.consent&&state.photo;
async function generate(){
  if(state.selected.length<2||!state.confirmed||state.busy)return;
  // The generation button is the explicit action that sends the cropped photo.
  state.consent=true;
  const first=state.selected[0];
  state.looks=state.selected.map(id=>createLook(id));state.focus=first;state.draft=null;
  if(!live()){
    if(state.mode==='sample'){
      for(const look of state.looks){
        const file=state.anchor==='#a96c70'?{'date':'demo-anchor-1.webp','peach':'demo-anchor-0.webp'}[look.id]:!state.anchor?{'date':'look-1.webp','peach':'look-2.webp'}[look.id]:null;
        if(file){look.image='assets/'+file;look.status='example';look.imageVersion=1;if(!state.anchor)look.colors=[...styleBy(look.id).colors];}
      }
    }
    go('report');note('已生成选色方案。无实时服务时，本人照片仅作为原图显示。');render();return;
  }
  state.busy=true;state.startedAt=Date.now();note('正在生成结构化方案与独立妆效，完成一张显示一张。');
  state.looks.forEach(x=>x.status='rendering');render();
  for(const look of state.looks){
    try{await createRemote(look);}catch(error){look.status='error';look.error=error.message;}
    render();
    if(look.error&&/额度不足|计费|限流|模型权限|密钥认证|站点当前生成额度/.test(look.error)){
      for(const pending of state.looks.filter(x=>x.status==='rendering')){pending.status='error';pending.error=look.error;}
      break;
    }
  }
  state.busy=false;state.startedAt=null;
  const errors=state.looks.filter(x=>x.error);
  go('report');note(errors.length?errors[0].error+' 配色方案已保留，可在服务恢复后重试。':'生成完成，可以比较或编辑。',!!errors.length);render();
}
async function retry(){
  const old=item();if(!live()||!old||state.busy)return;
  const x={...old,lookVersion:old.lookVersion+1,status:'rendering',error:null,before:old.image};
  state.busy=true;note('正在重新生成当前图…');render();
  try{
    if(old.status==='draft'&&old.editTarget){
      const direction=old.editTarget;
      const candidate=await renderPart({...old,image:old.before},x,direction);
      Object.assign(x,candidate);
    }else await createRemote(x);
    snapshot();
    state.looks=state.looks.map(prior=>prior===old?x:prior);
    note('已更新当前图。');
  }catch(error){note(error.message+' 当前有效方案已保留。',true);}
  finally{state.busy=false;render();}
}
function applyProfile(form){
  const p=state.profile;
  const next={...p,version:p.version+1,userCorrections:{...p.userCorrections}};
  for(const [key,value] of new FormData(form)){
    const normalized=key==='visibleFaceFeatures'?value.split(/[、,，]/).map(x=>x.trim()).filter(Boolean):value.trim();
    if(JSON.stringify(normalized)!==JSON.stringify(p[key]))next.userCorrections[key]=normalized;
    next[key]=normalized;
  }
  if(Object.hasOwn(next.userCorrections,'undertoneCandidate')||Object.hasOwn(next.userCorrections,'brightness')||Object.hasOwn(next.userCorrections,'chroma'))next.seasonCandidate='随用户修正重新确认';
  state.profile=next;state.confirmed=true;state.looks=[];state.history=[];state.draft=null;state.focus='original';
  state.skinOverride=next.userCorrections.undertoneCandidate||state.skinOverride;
  go('studio');
}
function setSkin(tone){
  if(!state.profile)return;
  state.skinOverride=tone;
  state.profile={...state.profile,undertoneCandidate:tone,seasonCandidate:'随用户修正重新确认',version:state.profile.version+1,source:'用户手动修正'};
  state.looks=state.looks.map(x=>({...x,colors:paletteFor(styleBy(x.id),effectiveProfile(),state.anchor),image:null,status:'draft',imageVersion:0,profileVersion:state.profile.version}));
  note('已按'+tone+'调更新风格顺序与配色；妆效图需重新生成。');render();
}
async function generateAnchorReport(){
  const raw=document.querySelector('#anchor-hex')?.value.trim().toLowerCase();
  if(!hexPattern.test(raw||'')){note('请确认六位 HEX 色值，例如 #A6536B。',true);render();return;}
  state.anchor=raw;state.anchorName=document.querySelector('#anchor-name')?.value.trim()||'我的口红';state.part=1;
  state.profile={...defaultProfile(),undertoneCandidate:state.anchorTone,source:'已有口红 · 手动确认'};
  state.skinOverride=state.anchorTone;state.confirmed=true;state.mode='manual';state.selected=state.anchorTone==='暖'?['retro','k-clear']:['k-clear','retro'];state.focus=state.selected[0];
  await generate();go('report');
}
function adjust(kind){
  const current=item();if(!current||(state.anchor&&state.part===0))return;
  const options={更深:'#553449',更浅:'#f1d7ca',更暖:'#d99968',更冷:'#997eb1',更鲜明:'#ca5483',更柔和:'#ad9597'};
  const input=document.querySelector('#edit-color');
  if(input)input.value=blend(current.colors[state.part],options[kind],.43);
}
function previewEdit(){
  const hex=document.querySelector('#edit-color')?.value.trim().toLowerCase();
  if(!hexPattern.test(hex||'')){note('请输入六位 HEX，例如 #A44C70。',true);render();return;}
  state.draft={hex,part:state.part,direction:document.querySelector('#edit-description')?.value||''};
  note('已准备局部配色预览。');render();
}
function revisedPlan(plan,area,hex){
  if(!plan)return null;
  if(area===0)return {...plan,lip:{...plan.lip,hex}};
  if(area===1)return {...plan,eyes:{...plan.eyes,main:hex}};
  if(area===2)return {...plan,blush:{...plan.blush,hex}};
  return {...plan,brows:{...plan.brows,hex}};
}
async function renderPart(old,changed,draft){
  const v=await vision(),baseline=await v.imageFrom(old.image);
  const normalized=document.createElement('canvas');
  normalized.width=512;normalized.height=640;
  const ctx=normalized.getContext('2d');
  ctx.drawImage(baseline,0,0,512,640);
  const identified=await v.normalizePhoto(await v.imageFrom(normalized.toDataURL('image/png')),true);
  const mask=await v.regionalMask(identified,[0,2,1,3][draft.part]);
  const response=await call('edit-makeup-part',{image:normalized.toDataURL('image/png'),mask:mask.toDataURL('image/png'),styleId:changed.id,colors:changed.colors,area:draft.part,direction:draft.direction});
  const face=await verifyImage(response.image);
  const merged=v.preserveOutside(normalized,face,mask), area=mask.getContext('2d').getImageData(0,0,512,640).data;
  const before=ctx.getImageData(0,0,512,640).data, after=merged.getContext('2d').getImageData(0,0,512,640).data;
  let delta=0,count=0;
  for(let i=0;i<area.length;i+=4)if(area[i+3]<25){delta+=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);count++;}
  if(!count||delta/(count*3)<1.2)throw Error('图像修改幅度过低，请调整目标后重试。');
  return {image:merged.toDataURL('image/png'),status:'ready',imageVersion:changed.lookVersion,before:old.image,editTarget:null};
}
async function applyEdit(){
  const old=item(),d=state.draft;
  if(!old||!d||state.busy||(state.anchor&&d.part===0))return;
  const partNames=[...(old.partNames||[])],partReasons=[...(old.partReasons||[])];
  partNames[d.part]=d.name||'自选 '+labels[d.part];
  partReasons[d.part]='你将'+labels[d.part]+'改为 '+partNames[d.part]+'；其余三个部位的色值保持不变。';
  const next={...old,colors:old.colors.map((c,i)=>i===d.part?d.hex:c),partNames,partReasons,plan:revisedPlan(old.plan,d.part,d.hex),lookVersion:old.lookVersion+1,before:old.image,image:null,editTarget:d,status:'draft'};
  state.busy=true;note('正在应用局部修改…');render();
  try{
    if(live()&&old.image)Object.assign(next,await renderPart(old,next,d));
    else if(state.mode==='sample'&&old.id==='date'&&d.part===0&&!state.anchor){
      const file={'#b77d8c':'demo-lip-soft.png','#80354e':'demo-lip-berry.png'}[d.hex];
      if(file)Object.assign(next,{image:'assets/'+file,status:'example',imageVersion:next.lookVersion});
    }
    snapshot();state.looks=state.looks.map(x=>x===old?next:x);state.draft=null;
    note(next.image?'局部修改已应用。可以打开大图对照。':'色值已更新。预览待更新，旧图已保留在历史中。');
  }catch(error){note(error.message+' 已保留原方案。',true);}
  finally{state.busy=false;render();}
}
async function anchor(clear=false){
  const value=clear?null:document.querySelector('#anchor-hex')?.value.trim().toLowerCase();
  if(!clear&&!hexPattern.test(value||'')){note('请输入六位 HEX，例如 #A96C70。',true);render();return;}
  const name=clear?'':document.querySelector('#anchor-name')?.value.trim()||'我的口红';
  snapshot();state.anchor=value;state.anchorName=name;state.part=clear?0:1;await generate();
}
function zoom(){
  const x=item();if(!x?.image||x.status==='draft')return;
  const dialog=document.createElement('dialog');dialog.className='photo-dialog';
  dialog.innerHTML=`<form method="dialog"><button class="pill" autofocus>关闭</button></form><div><figure><img src="${x.before||state.base}" alt="对照图"><figcaption>${x.before?'修改前妆效':'参考原图'}</figcaption></figure><figure><img src="${x.image}" alt="当前妆效"><figcaption>${x.name}</figcaption></figure></div>`;
  document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
async function copy(value){try{await navigator.clipboard.writeText(value);toast('已复制 · '+value);}catch{toast('复制未完成：'+value);}}
async function sampleLipColor(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){note('请选择小于 12 MB 的口红照片。',true);render();return;}
  try{
    const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,80,80);bitmap.close();
    const data=ctx.getImageData(20,20,40,40).data;let colors=[];
    for(let i=0;i<data.length;i+=16){const [r,g,b,a]=data.slice(i,i+4);if(a>220&&r>g*1.08&&r>b*1.05)colors.push([r,g,b]);}
    if(!colors.length)throw Error('照片中没有找到足够明确的唇膏色，请改用色卡或 HEX。');
    colors.sort((a,b)=>a[0]-b[0]);const median=colors[Math.floor(colors.length/2)];
    state.anchor='#'+median.map(v=>v.toString(16).padStart(2,'0')).join('');
    note('已提取照片中心区域的参考色，请核对 HEX。');render();
  }catch(error){note(error.message||'照片读取失败，请改用色卡。',true);render();}
}
function paintReport(canvas,report,share=false){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,look=report.look,style=styleBy(look.id);
  ctx.fillStyle='#F8F0EB';ctx.fillRect(0,0,w,h);
  const grad=ctx.createLinearGradient(0,0,w,share?720:540);grad.addColorStop(0,'#6D3434');grad.addColorStop(1,'#335447');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,share?780:500);
  ctx.fillStyle='#fffaf5';ctx.font='bold 48px sans-serif';ctx.fillText('LOOK2ME COLOR',72,100);
  ctx.font=share?'bold 100px sans-serif':'bold 82px sans-serif';ctx.fillText(style.name,72,share?310:260);
  ctx.font='32px sans-serif';ctx.fillText(report.profile.undertoneCandidate+'调候选 · '+report.scene,72,share?385:340);
  const colors=look.colors;colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(72+i*(share?220:225),share?620:405,share?190:190,share?70:55);});
  let y=share?910:610;
  function line(text,size=31,weight='normal'){ctx.fillStyle='#2D2D2D';ctx.font=weight+' '+size+'px sans-serif';const max=w-144;let row='';for(const ch of text){if(ctx.measureText(row+ch).width>max){ctx.fillText(row,72,y);y+=size*1.55;row=ch;}else row+=ch;}if(row){ctx.fillText(row,72,y);y+=size*1.55;}}
  if(share){line('我的妆容配色',42,'bold');line('唇 '+colors[0]+'   眼 '+colors[1]);line('颊 '+colors[2]+'   眉 '+colors[3]);y+=20;line('生成 · 调整 · 复用',30,'bold');line('试色方向由我确认，妆容由我决定。',28);}
  else{
    line('01  风格定位',40,'bold');line(style.complexion+'；'+style.description,30);y+=20;
    line('02  色彩搭配',40,'bold');line('口红 '+colors[0]+' / 眼影 '+colors[1],30);line('腮红 '+colors[2]+' / 眉色 '+colors[3],30);y+=20;
    line('03  底妆建议',40,'bold');line(style.complexion+'；自然光下在下颌试色。',30);y+=20;
    line('04  眼妆步骤',40,'bold');line('浅色打底 → 主色加深眼尾 → 提亮眼头 → 细眼线',30);y+=20;
    line('05  唇妆推荐',40,'bold');line('日常薄涂 · 约会用主色 · 派对叠加深色',30);y+=20;
    line('06  妆容技巧',40,'bold');line('少量多次叠加，先确定一个妆容重点。',30);
  }
  ctx.fillStyle='#665B58';ctx.font='23px sans-serif';ctx.fillText('颜色为屏幕参考值 · LOOK2ME COLOR',72,h-68);
}
function paintReportDetails(canvas,report){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,look=report.look,guide=buildGuide(styleBy(look.id),look.colors,report.profile),direction=colorDirection(report.profile),wardrobe=wardrobePalette(report.profile);
  ctx.fillStyle='#F7F5F0';ctx.fillRect(0,0,w,h);ctx.fillStyle='#315549';ctx.fillRect(0,0,w,260);ctx.fillStyle='#fff';ctx.font='bold 47px sans-serif';ctx.fillText('LOOK2ME COLOR',72,96);ctx.font='bold 70px sans-serif';ctx.fillText('个人色彩与穿搭建议',72,190);
  let y=345;const line=(text,size=30,bold=false)=>{ctx.fillStyle='#1B2620';ctx.font=`${bold?'bold ':''}${size}px sans-serif`;let row='';for(const ch of text){if(ctx.measureText(row+ch).width>w-144){ctx.fillText(row,72,y);y+=size*1.5;row=ch;}else row+=ch;}if(row){ctx.fillText(row,72,y);y+=size*1.5;}};
  line('色彩方向 · '+direction.best,46,true);line(direction.lead,29);y+=40;
  line('穿搭配色',43,true);
  wardrobe.looks.forEach(([name,...items],i)=>{const colors=[wardrobe.main[i][1],wardrobe.pair[i][1],wardrobe.accent[i%wardrobe.accent.length][1]];line(name+'  '+items.join(' / '),28,true);colors.forEach((c,j)=>{ctx.fillStyle=c;ctx.fillRect(72+j*180,y,160,36);});y+=64;});
  y+=55;line('发色与饰品',43,true);line('发色方向  '+guide.hair.slice(0,3).join(' / '),28);line(report.profile.undertoneCandidate==='暖'?'首饰先试哑光金、古金、暖铜。':report.profile.undertoneCandidate==='冷'?'首饰先试银色、白金色、冷调珍珠。':'金银饰品都在自然光下放到脸旁比较。',28);
  y+=40;line('风格灵感',43,true);direction.styles.forEach(([name,tip])=>{y+=10;line(name,30,true);line(tip,27);});
  ctx.fillStyle='#52665A';ctx.font='23px sans-serif';ctx.fillText('季型是候选方向 · 色值仅作屏幕参考 · 请用实物试色',72,h-68);
}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function downloadShareCard(){
  const report=state.page==='saved'?readSaved():reportData();if(!report)return;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;paintReport(canvas,report,true);
  canvas.toBlob(blob=>blob?saveBlob(blob,'LOOK2ME-分享卡.png'):toast('分享卡生成失败'),'image/png');
}
async function downloadPdf(){
  const report=state.page==='saved'?readSaved():reportData();if(!report)return;
  const canvases=[document.createElement('canvas'),document.createElement('canvas')];
  canvases.forEach(c=>{c.width=1240;c.height=1754;});paintReport(canvases[0],report);paintReportDetails(canvases[1],report);
  const images=canvases.map(canvas=>{const jpg=atob(canvas.toDataURL('image/jpeg',.9).split(',')[1]),image=new Uint8Array(jpg.length);for(let i=0;i<jpg.length;i++)image[i]=jpg.charCodeAt(i);return image;});
  const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
  const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
  const object=(n,body)=>{offsets[n]=length;add(n+' 0 obj\n');add(body);add('\nendobj\n');};
  add('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>');
  for(let page=0;page<2;page++){
    const base=page?6:3,image=images[page];
    object(base,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${page} ${base+1} 0 R >> >> /Contents ${base+2} 0 R >>`);
    offsets[base+1]=length;add(`${base+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);add(image);add('\nendstream\nendobj\n');
    const content=`q 595 0 0 842 0 0 cm /Im${page} Do Q`;object(base+2,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  const start=length;add('xref\n0 9\n0000000000 65535 f \n');for(let i=1;i<=8;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  add('trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
  saveBlob(new Blob(chunks,{type:'application/pdf'}),'LOOK2ME-个人色彩报告.pdf');
}
async function embed(url){
  if(!url||url.startsWith('data:'))return url;
  const response=await fetch(url);
  if(!response.ok)throw Error('无法读取妆效图');
  const blob=await response.blob();
  return new Promise((yes,no)=>{const reader=new FileReader();reader.onload=()=>yes(reader.result);reader.onerror=no;reader.readAsDataURL(blob);});
}
async function exportReport(saved=false){
  try{
    const r=saved?readSaved():reportData();
    if(!r)throw Error('没有可导出的报告');
    const image=r.look.status!=='draft'?await embed(r.look.image):null;
    const contents=guideSections(r.look,r.profile).replace(/<button[^>]* data-copy="([^"]+)"[^>]*>复制搜索关键词<\/button>/g,'<p>检索词 $1</p>');
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>LOOK2ME 个人色彩指南</title><link rel="stylesheet" href="v7.css"><style>body{background:#f7f5f0;max-width:1100px;margin:35px auto;padding:0 17px;font:16px/1.6 sans-serif;color:#18231d}img{width:min(100%,300px)}.swatch-row{display:flex;flex-wrap:wrap;gap:8px}.swatch{display:grid;justify-items:center;font-size:12px}.swatch i{width:27px;height:27px;border-radius:50%;background:var(--swatch)}small{display:block}</style><h1>LOOK2ME 个人色彩指南</h1><h2>${esc(r.look.name)}</h2><p>${esc(r.profile.source)} · ${esc(r.scene)} · 妆容 v${r.look.lookVersion}</p>${image?`<img src="${esc(image)}" alt="当前妆效">`:'<p>本报告包含配色建议，暂无当前版本妆图。</p>'}${reportExtendedV2(r.look,r.profile)}${contents}</html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='LOOK2ME-个人妆容指南.html';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),6000);toast('已导出个人妆容指南');
  }catch(error){note(error.message||'文件未能导出。',true);render();}
}
async function save(){
  const report=reportData();if(!report)return;
  try{
    report.look={...report.look,before:null,image:report.look.status==='draft'?null:await embed(report.look.image)};
    localStorage.setItem(storageKey,JSON.stringify(report));state.saved=true;toast('指南已保存到当前浏览器');
  }catch{note('本机储存空间不足。可从报告页直接下载。',true);render();}
}
const actions={
  home:()=>go('home'),start:()=>{state.anchor=null;state.anchorName='';state.skinOverride=null;go('upload');},'try-photo':()=>go('upload'),'anchor-start':()=>go('anchorStart'),'anchor-generate':generateAnchorReport,sample:launchSample,pick:()=>document.querySelector('#photo-file')?.click(),'confirm-profile':()=>{state.confirmed=true;state.focus='original';go('studio');},
  quiz:()=>go('quiz'),manual:()=>{state.mode='manual';state.photo=null;state.base='';state.consent=false;state.profile=null;state.confirmed=false;state.looks=[];state.history=[];state.anchor=null;state.anchorName='';state.q=0;go('quiz');},
  qback:()=>{if(state.q>0){state.q--;render();}else go('upload');},next:nextQuestion,skip:()=>{state.answers[state.q]=undefined;return nextQuestion();},
  analyze:finishProfile,profile:()=>go('profile'),studio:()=>go('studio'),guide:()=>go('guide'),report:()=>go('report'),saved:()=>go('saved'),
  generate:()=>{snapshot();return generate();},retry,preview:previewEdit,apply:applyEdit,'cancel-edit':()=>{state.draft=null;note('已取消预览。');render();},anchor:()=>anchor(),unlock:()=>anchor(true),zoom,
  'example-soft':()=>{state.part=0;state.draft={part:0,hex:'#b77d8c',direction:'低饱和雾粉'};return applyEdit();},
  'example-berry':()=>{state.part=0;state.draft={part:0,hex:'#80354e',direction:'深莓果'};return applyEdit();},
  undo:()=>{const x=state.history.pop();if(x){Object.assign(state,x,{draft:null,part:x.anchor?1:0});note('已恢复上一版。');render();}},
  export:()=>exportReport(),'export-saved':()=>exportReport(true),pdf:()=>downloadPdf(),share:()=>downloadShareCard(),save,
  'open-edit':()=>{state.editSheet=true;render();},
  'close-edit':()=>{state.editSheet=false;state.draft=null;render();},
  'confirm-edit':async()=>{await applyEdit();state.editSheet=false;go('report');},
  compare:()=>{state.compareBefore=!state.compareBefore;render();}
};
document.body.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]');
  if(!control||control.disabled)return;
  const [key,value]=control.dataset.action.split(':');
  if(state.busy&&!['focus','copy','keyword'].includes(key))return;
  if(key==='answer'){state.answers[state.q]=questions[state.q][1][Number(value)];render();setTimeout(()=>{if(state.page==='quiz'&&!state.busy)nextQuestion();},240);return;}
  if(key==='skin')return setSkin(value);
  if(key==='anchor-tone'){state.anchorTone=value;return render();}
  if(key==='anchor-color'){state.anchor=value;if(state.page==='home')go('anchorStart');else render();return;}
  if(key==='edit-tab'){state.part=Number(value);state.draft=null;return render();}
  if(key==='edit-choice'){state.draft={part:state.part,hex:value.toLowerCase(),name:editOptions[state.part].find(x=>x[0].toLowerCase()===value.toLowerCase())?.[1],direction:'将'+labels[state.part]+'调整为'+value};return render();}
  if(key==='family'){state.family=Number(value);return render();}
  if(key==='style'){
    const index=state.selected.indexOf(value);
    if(index>=0)state.selected.splice(index,1);
    else if(state.selected.length===3){toast('一次最多比较三种风格');return;}else state.selected.push(value);
    return render();
  }
  if(key==='mobile-tools'){document.querySelector('.tools')?.scrollIntoView({block:'start'});return;}
  if(key==='tab'){state.tab=value;state.draft=null;return render();}
  if(key==='focus'){state.focus=value;state.draft=null;return render();}
  if(key==='drape'){state.drapeColor=value;return render();}
  if(key==='ref-filter'){state.filter=value;return render();}
  if(key==='adjust')return adjust(value);
  if(key==='copy')return copy(value);
  if(key==='keyword')return copy(control.dataset.copy);
  return actions[key]?.();
});
document.body.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='photo-file')return upload(target.files[0]);
  if(target.id==='consent'){state.consent=target.checked;return;}
  if(target.id==='scene')state.scene=target.value;
  if(target.id==='intensity')state.intensity=target.value;
  if(target.id==='part'){state.part=Number(target.value);state.draft=null;render();}
  if(target.id==='anchor-picker')document.querySelector('#anchor-hex').value=target.value;
  if(target.id==='lip-photo')sampleLipColor(target.files?.[0]);
});
app.addEventListener('submit',event=>{if(event.target.id==='profile-form'){event.preventDefault();if(!state.busy)applyProfile(event.target);}});
app.addEventListener('dragover',event=>{const zone=event.target.closest('.upload-zone');if(zone){event.preventDefault();zone.classList.add('drag');}});
app.addEventListener('dragleave',event=>event.target.closest('.upload-zone')?.classList.remove('drag'));
app.addEventListener('drop',event=>{const zone=event.target.closest('.upload-zone');if(zone){event.preventDefault();zone.classList.remove('drag');upload(event.dataTransfer.files[0]);}});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  app.addEventListener('pointermove',event=>{
    const cover=event.target.closest('.cover,.question,.upload-stage,.studio-page,.report-hero');
    if(!cover||event.pointerType==='touch')return;
    const r=cover.getBoundingClientRect();
    cover.style.setProperty('--dx',((event.clientX-r.left)/r.width-.5)*170+'px');
    cover.style.setProperty('--dy',((event.clientY-r.top)/r.height-.5)*115+'px');
    cover.style.setProperty('--mx',((event.clientX-r.left)/r.width*100).toFixed(1)+'%');
    cover.style.setProperty('--my',((event.clientY-r.top)/r.height*100).toFixed(1)+'%');
  });
}
render();
setInterval(()=>{const node=document.querySelector('#elapsed');if(node&&state.startedAt)node.textContent=String(Math.floor((Date.now()-state.startedAt)/1000));},1000);
fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():null).then(data=>{state.cloud=data?.cloud?'ready':'offline';}).catch(()=>{state.cloud='offline';}).finally(()=>{if(state.page==='upload'&&!state.busy)render();});
