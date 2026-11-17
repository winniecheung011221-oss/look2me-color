export const parts = ['唇妆','腮红','眼影','眉色'];
export const looks = [
  {id:'rose',name:'雾感玫瑰',type:'冷柔 · 日常',colors:['#a6536b','#d187a4','#987991','#615362'],tip:'重点放在低饱和玫瑰唇和灰紫眼影，颊色向颧骨外侧轻扫。',prompt:'Muted cool rose satin lipstick, sheer cool pink blush, smoky taupe mauve upper eyeshadow, natural soft ash brows; polished muted rose daily makeup.',tags:['rose','soft','cool']},
  {id:'apricot',name:'杏糖柔光',type:'暖透 · 约会',colors:['#b9553a','#df8971','#a5694f','#654b3d'],tip:'暖杏眼影衔接珊瑚唇，桃色腮红从苹果肌向斜上方晕开。',prompt:'Luminous warm terracotta coral lip, peach blush lifted over cheekbones, warm soft apricot brown upper eyeshadow, naturally groomed brown eyebrows.',tags:['peach','soft','warm']},
  {id:'plum',name:'夜莓微醺',type:'浓郁 · 聚会',colors:['#8c3059','#a85c81','#78446e','#493648'],tip:'以莓果唇作为重心，灰紫眼影集中在眼尾，让眼唇之间有轻重变化。',prompt:'Distinct deep saturated berry plum lip, muted berry blush, richer mauve plum upper eye shadow softly shading outer lids, sculpted cool brown brows.',tags:['berry','deep','cool']}
];
export const references = [
  {type:'明星妆容',name:'Sienna Miller · 玫瑰唇颊',source:'Charlotte Tilbury',url:'https://www.charlottetilbury.com/hk/secrets/sienna-miller-pillow-talk-makeup-look',tags:['rose','soft'],tip:'先用玫瑰色连接唇妆与颊色，再用柔和眼妆维持全脸低对比。'},
  {type:'明星妆容',name:'Eva Longoria · 蜜桃腮红',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/beauty-secrets-let-eva-longoria',tags:['peach','warm'],tip:'霜状腮红落在苹果肌，可以向上晕染，调整脸部妆容重心。'},
  {type:'博主教程',name:'PONY · 暖调粉色妆',source:'PONY Syndrome 原视频',url:'https://www.youtube.com/watch?v=5h7UZezsGJI',tags:['rose','soft','warm','berry'],tip:'观察粉色眼影与玫瑰唇的逐层叠搭。喜欢低饱和妆感时可先减轻眼尾颜色。'}
];

export const verifiedReferences=[
  ...references.map(x=>({...x,type:x.type==='博主教程'?'美妆博主':'明星',terms:x.tags.includes('peach')?['杏桃','蜜桃','暖']:['玫瑰','灰粉','柔和']})),
  {type:'明星',name:'JIHYO · 眼妆与柔和腮红',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/beauty-secrets-jihyos',terms:['眼尾','透粉','清透'],tip:'结合柔和的腮红观察眼妆如何成为全脸重心。'},
  {type:'明星',name:'Hailey Bieber · 光泽约会妆',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/beauty-secrets-hailey-bieber',terms:['约会','水润','光泽'],tip:'参考底妆光泽与唇部质感之间的衔接。'},
  {type:'明星',name:'Selena Gomez · 日夜妆转换',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/selena-gomez-beauty-secrets-skincare-makeup',terms:['日常','眼线','通勤'],tip:'观察造型中哪些部位可以作为日常到晚间的妆感调整重点。'},
  {type:'明星',name:'Alexandra Daddario · 轻简日常妆',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/alexandra-daddario-beauty-secrets',terms:['日常','自然','米棕'],tip:'参考日常妆的步骤优先级，按需要选择底妆与眉眼步骤。'},
  {type:'美妆博主',name:'Emma Chamberlain · 个人标志眼影',source:'Vogue Beauty Secrets',url:'https://www.vogue.com/video/watch/beauty-secrets-with-emma-chamberlain',terms:['眼尾','眼窝','棕','烟熏'],tip:'观察眼影的落点、边缘晕染和色阶变化，选一项迁移到自己的眼妆。'}
];
