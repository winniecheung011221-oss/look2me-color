let detector;
const assets = new URL('./assets/face/', import.meta.url);
const W = 512;
const H = 640;
const lips = [48,49,50,51,52,53,54,55,56,57,58,59];
const lids = [[36,37,38,39],[42,43,44,45]];
const brows = [[17,18,19,20,21],[22,23,24,25,26]];
const cheeks = [2,14];
function canvas(w=W,h=H) {
  const node = document.createElement('canvas');
  node.width=w; node.height=h;
  return node;
}
function getDetector() {
  if (!detector) detector=(async()=>{
    const script=document.createElement('script');
    script.src=new URL('face-api.min.js',assets).href;
    await new Promise((resolve,reject)=>{
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    const api=window.faceapi;
    await api.tf.setBackend('cpu');
    const folder=assets.href.replace(/\/$/,'');
    await Promise.all([api.nets.tinyFaceDetector.loadFromUri(folder),api.nets.faceLandmark68TinyNet.loadFromUri(folder)]);
    return api;
  })().catch(error=>{detector=undefined;throw error;});
  return detector;
}
export async function normalizePhoto(image, keepFrame=false) {
  const model=await getDetector().catch(()=>{throw new Error('面部模型加载失败，请刷新后再试。');});
  const ratio = Math.min(1,1500/Math.max(image.width,image.height));
  const w = Math.max(1,Math.round(image.width*ratio)), h = Math.max(1,Math.round(image.height*ratio));
  let source, points;
  for (const turn of [0,1,3,2]) {
    const rotated = canvas(turn%2?h:w,turn%2?w:h);
    const ctx = rotated.getContext('2d');
    ctx.translate(rotated.width/2,rotated.height/2);
    ctx.rotate(turn*Math.PI/2);
    ctx.drawImage(image,-w/2,-h/2,w,h);
    const faces = await model.detectAllFaces(rotated,new model.TinyFaceDetectorOptions({inputSize:288,scoreThreshold:.53})).withFaceLandmarks(true);
    if (faces.length>1) throw new Error('检测到多张人脸，请换一张单人照片。');
    if (faces.length===1) {
      const found=faces[0].landmarks.positions;
      if (found[8].y < found[27].y || Math.abs(found[45].y-found[36].y)>Math.abs(found[45].x-found[36].x)*.65) continue;
      source=rotated;
      points=found.map(p=>({x:p.x,y:p.y}));
      break;
    }
  }
  if (!points) throw new Error('未找到可用的正脸。请换自然光下、无遮挡的清晰单人照。');
  const height=points[8].y-Math.min(points[19].y,points[24].y);
  if(height<Math.min(source.width,source.height)*.095) throw new Error('照片里的人脸太小，请换一张距离更近的自拍。');
  const cropWidth=keepFrame ? source.width : Math.min(source.width,source.height*.8,Math.max(height*1.95,Math.abs(points[16].x-points[0].x)*1.4));
  const cropHeight=cropWidth*1.25;
  const clamp=(v,max)=>Math.max(0,Math.min(max,v));
  const x=clamp((points[0].x+points[16].x)/2-cropWidth/2,source.width-cropWidth);
  const y=clamp(Math.min(points[19].y,points[24].y)-height*.76,source.height-cropHeight);
  const output=canvas();
  output.getContext('2d').drawImage(source,x,y,cropWidth,cropHeight,0,0,W,H);
  return {base:output,points:points.map(p=>({x:(p.x-x)*W/cropWidth,y:(p.y-y)*H/cropHeight}))};
}

function faceWidth(points) { return Math.hypot(points[16].x-points[0].x,points[16].y-points[0].y); }
export async function imageFrom(url) {
  const img = new Image();
  img.src=url;
  await img.decode();
  return img;
}
export async function regionalMask(photo, index) {
  const output=canvas();
  const ctx=output.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const unit=faceWidth(photo.points);
  const groups=index===0?[lips]:index===1?cheeks.map(i=>[i]):index===2?lids:brows;
  ctx.globalCompositeOperation='destination-out';
  for(const [position,group] of groups.entries()){
    const pts=group.map(i=>index===1?{x:photo.points[i].x+unit*(position===0?.14:-.14),y:photo.points[i].y+unit*.035}:photo.points[i]);
    const head=[Math.min(...pts.map(p=>p.x)),Math.min(...pts.map(p=>p.y))];
    const tail=[Math.max(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.y))];
    const padX=unit*(index===1?.15:.035), padY=unit*(index===1?.10:index===2?.065:.025);
    ctx.beginPath();ctx.ellipse((head[0]+tail[0])/2,(head[1]+tail[1])/2-(index===2?padY/2:0),(tail[0]-head[0])/2+padX,(tail[1]-head[1])/2+padY,0,0,Math.PI*2);ctx.fill();
  }
  return output;
}
export function preserveOutside(base, edited, mask) {
  const output=canvas(), region=canvas();
  const ctx=output.getContext('2d'), tool=region.getContext('2d');
  ctx.drawImage(base,0,0,W,H);
  tool.drawImage(edited,0,0,W,H);
  tool.globalCompositeOperation='destination-out';tool.drawImage(mask,0,0);
  ctx.drawImage(region,0,0);
  return output;
}
