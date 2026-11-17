export const families=['日常自然','温柔氛围','气场表达','风格探索'];
const styleRows=[
['bare','伪素颜','上课、周末','轻','#b67976','#937c70','#c78580','#62544e','润泽薄涂、柔化唇缘','米棕贴近睫毛根部','少量血色在苹果肌内侧','沿原生毛流补空','保留皮肤纹理，鼻梁轻提亮'],
['water','法式慵懒','日常、见面','轻','#ba838b','#9c8795','#d79aa2','#6e6064','低饱和裸粉、水润','浅灰粉铺底，灰棕收眼尾','淡粉横扫颧骨','灰棕直眉','半哑底，眼下微提亮'],
['k-clear','韩系清透','春游、自拍','轻','#bd687e','#9d7789','#d8839a','#685461','透亮玫瑰、唇心加深','浅粉打底与细小珠光卧蚕','透粉放在颧前','柔和平眉','保留皮肤光泽，限制珠光层次'],
['j-natural','日杂自然','逛街、日常','轻','#b97e65','#a68067','#d8a080','#695343','杏棕丝绒、指腹晕开','黄棕沿眼窝外缘','杏色从眼下向太阳穴展开','暖灰棕自然弧','柔焦，颧骨有小面积提亮'],
['dream','纯欲妆','约会、近景拍照','中','#b87088','#9b7794','#d7889f','#6e5764','透明浆果唇釉','灰粉晕染，细化下眼睑','透粉集中在眼下外侧','柔软自然弧线','低对比修容，短范围眼头高光'],
['date','约会心动','约会、聚餐','中','#a6536b','#987991','#d187a4','#615362','雾玫瑰缎光','灰紫过渡，细化眼尾','豆沙颊色扫在颧骨上缘','柔边灰棕','暖白提亮，弱化脸颊阴影'],
['peach','元气少女','周末、晴天户外','中','#b9553a','#a5694f','#df8971','#654b3d','蜜桃珊瑚半透唇','杏桃打底，可点亮眼头','蜜桃弧形靠近苹果肌','微暖棕柔软圆弧','轻透底，杏白颧骨提亮'],
['mature','知性通勤','餐叙、日常职场','中','#a16c73','#827078','#c18b90','#5b4c52','玫瑰木丝绒','烟灰杏棕向外晕染','低饱和玫瑰在颧外','微挑细弧','保留轮廓，颊面光泽克制'],
['office','杂志大片','会议、职场','中','#945758','#7e6b66','#b47c7a','#584942','豆沙棕半哑','中性眼窝色与贴根细眼线','暖豆沙沿颧骨轻扫','自然眉峰、棕灰眉色','匀净半哑，鼻侧轻修饰'],
['icy','清冷妆','展览、晚餐','中','#a15a83','#826b92','#b982aa','#5b4f66','冷玫瑰薄雾感','冷灰紫，重心在外眼角','灰紫浅腮在颧外','偏冷的细长眉','冷白微光，保留原脸部比例'],
['sweet-cool','甜酷妆','街拍、派对','强','#9d4774','#745071','#b76390','#534653','冷莓果饱和唇线','紫棕外扩与窄黑色眼线','偏冷玫红扫在侧颧','平直灰棕','点状高光，轻微轮廓对比'],
['smoky','暗黑系','晚餐、演出','强','#90636a','#655363','#aa7581','#554650','低饱和玫瑰棕','灰棕烟熏，层次从睫毛根扩散','薄扫暗玫瑰','灰棕眉峰','哑光阴影配眼头一点亮色'],
['retro','港风复古','聚会、复古拍照','强','#9d423a','#854d3c','#b77064','#504134','砖红丝绒，清晰而柔和唇缘','暖棕眼窝与外扬眼线','砖红腮红靠外颧','深棕自然眉峰','侧脸轮廓稍清晰，保留肌理'],
['thai','欧美浓颜','度假、夜晚','强','#9c6043','#885e46','#be8660','#573d32','暖棕裸色渐变','金棕渐层、上挑眼尾','暖杏偏外侧衔接修容','暖深棕毛流眉','暖金提亮颧面，阴影柔边'],
['east','新中式妆','节庆、正式造型','强','#9d4252','#895867','#bd7583','#534651','朱砂玫瑰薄晕唇','红棕渐层与细长外眼角','浅绯红颊内外渐变','深灰棕长眉','干净半哑，鼻尖轻提亮'],
['pop','派对闪耀','音乐节、创意聚会','强','#bf4c87','#8b64b8','#d071a8','#645171','明艳玫粉水润唇','紫粉跳色，保留局部留白','鲜粉少量放在颧前','冷棕自然眉','清透底，控制彩色面积']
];
export const styles=styleRows.map(([id,name,scene,intensity,lip,eyes,blush,brow,lipRule,eyeRule,blushRule,browRule,complexion],i)=>({
  id,name,family:families[Math.floor(i/4)],scene,intensity,colors:[lip,eyes,blush,brow],
  emoji:['◌','✦','✳','✿','♡','◇','☀','●','▣','❄','◆','☾','❖','✧','▥','✺'][i],
  colorTemp:['neutral','neutral','cool','warm','cool','cool','warm','neutral','neutral','cool','cool','cool','warm','warm','warm','cool'][i],
  colorDepth:['light','light','light','medium','light','medium','medium','medium','medium','light','medium','deep','deep','deep','medium','medium'][i],
  suitableFaces:['round','square','long'],texture:complexion.includes('光泽')||complexion.includes('轻透')?'dewy':complexion.includes('哑')?'matte':'satin',
  lipstick:{name:lipRule.split(/[、，]/)[0],hex:lip,reason:lipRule+'；与眼颊色保持同一妆容重心。'},
  eyeshadow:{name:eyeRule.split(/[、，]/)[0],hex:eyes,reason:eyeRule+'，由浅到深逐层晕染。'},
  blush:{name:blushRule.split(/[、，]/)[0],hex:blush,reason:blushRule+'，少量叠加更容易控制。'},
  brow:{name:browRule.split(/[、，]/)[0],hex:brow,reason:browRule+'，与当前发色自然衔接。'},
  baseTone:complexion,baseDescription:complexion+' + '+eyeRule+' + '+lipRule,
  steps:{eye:['浅色大面积薄铺眼窝',eyeRule,'眼头与卧蚕少量提亮','贴睫毛根部描细眼线'],lip:['日常薄涂 '+lipRule,'约会使用主色 '+lip,'派对叠加深色唇心']},
  tips:['先在自然光下确认色彩方向',blushRule,'少量多次叠加，保留皮肤原有质感'],
  description:lipRule+'，配合'+eyeRule,lipRule,eyeRule,blushRule,browRule,complexion,
  colorRule:'根据确认的冷暖、明度和饱和度调整基色。保留选定口红色值。',
  prompt:[lipRule,eyeRule,blushRule,browRule,complexion].join('。'),
  keywords:[name+' 妆教',name+' 口红色系',name+' 眼影腮红搭配']
}));
export const hexPattern=/^#[0-9a-f]{6}$/i;
/** @param {string} value */
export function rgb(value){return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));}
/** @param {string} a @param {string} b @param {number} t */
export function blend(a,b,t){return '#'+rgb(a).map((v,i)=>Math.round(v*(1-t)+rgb(b)[i]*t).toString(16).padStart(2,'0')).join('');}
/** @typedef {{undertoneCandidate:string,brightness:string,chroma:string}} ColorInputs */
/** @param {(typeof styles)[number]} style @param {ColorInputs} profile @param {string|null} anchor */
export function paletteFor(style,profile,anchor=null){
  const tone=profile.undertoneCandidate;
  const tint=tone==='暖'?'#b2805d':tone==='冷'?'#926d9b':null;
  const brightness=profile.brightness==='高'?'#f5dfdf':profile.brightness==='低'?'#543a49':null;
  /** @param {string} value @param {number} i */
  const color=(value,i)=>{
    let adjusted=tint?blend(value,tint,.22):value;
    if(brightness)adjusted=blend(adjusted,brightness,.13);
    if(profile.chroma==='柔和')adjusted=blend(adjusted,'#a58889',.23);
    if(anchor&&i!==0)adjusted=blend(adjusted,anchor,i===2?.49:.28);
    return adjusted;
  };
  return style.colors.map((value,i)=>i===0&&anchor?anchor:color(value,i));
}
/** @param {(typeof styles)[number]} style @param {string[]} colors @param {ColorInputs} profile */
export function buildGuide(style,colors,profile){
  const [lip,eyes,blush,brow]=colors;
  const lipColors=[lip,blend(lip,'#ecd0cb',.32),blend(lip,'#673444',.30)];
  const eyeColors=[blend(eyes,'#eee4d8',.72),eyes,blend(eyes,'#655467',.36),blend(eyes,'#2f2229',.49),blend(eyes,'#fff2dc',.79),blend(eyes,lip,.47)];
  const cheek=[blush,blend(blush,'#e6b38b',.43),blend(blush,'#c18ba9',.42)];
  const hair=['#3b2f31','#5e443e','#775650','#967164'].map(c=>profile.undertoneCandidate==='冷'?blend(c,'#71617c',.19):profile.undertoneCandidate==='暖'?blend(c,'#b37a55',.19):c);
  const clothes=profile.undertoneCandidate==='暖'
    ?[['#E7D8BE','#5B6845',lip],['#D8C6A1','#4A3329','#A6663D'],['#B9956F','#704344','#B18A36']]
    :profile.undertoneCandidate==='冷'
    ?[['#E4E8ED','#4B6170',lip],['#D6DBE3','#343B52',blush],['#C7B9CA','#594054','#A05B79']]
    :[['#ede1d5',eyes,lip],['#d9d2d7','#463447',blush],['#e9ddc7','#67575a',brow]];
  return {lipColors,eyeColors,cheek,hair,clothes,brow,profile,style};
}
