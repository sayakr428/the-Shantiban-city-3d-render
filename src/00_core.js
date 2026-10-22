import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

window.__boot=true;
const $=s=>document.querySelector(s);
function fail(msg){$('#loadMsg').textContent=msg;$('#progBar').style.background='#c0392b';}
addEventListener('error',e=>{if(!window.__ready)fail('Something went wrong while building the scene: '+(e.message||e));});
addEventListener('unhandledrejection',e=>{if(!window.__ready)fail('Something went wrong while building the scene: '+((e.reason&&e.reason.message)||e.reason));});
const prog=(p,m)=>{$('#progBar').style.width=(p*100).toFixed(0)+'%';if(m)$('#loadMsg').textContent=m;};
const tick=()=>new Promise(r=>setTimeout(r,0));

/* ---------------- constants and helpers (units: feet; x = east, z = south, y = up) ---------------- */
const V3=THREE.Vector3,D2R=Math.PI/180,EYE=5.4,PLOT_H=.45;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R=rng(143416097),RT=rng(20261022);
const rr=(a,b)=>a+(b-a)*R(),pick=a=>a[(R()*a.length)|0];
/* quality tiers. Phones get their own tier; 'balanced' is the desktop default and keeps the GPU well below full load.
   world = share of the surrounding town that is built, tex = texture size, life = share of animals and birds */
const MOBILE=coarse||Math.min(screen.width,screen.height)<820;
const QS={
  high:{pr:Math.min(devicePixelRatio||1,1.25),grass:120000,shadow:3072,steps:34,sky:.45,life:1,fps:60,msaa:4,shadowEvery:1,world:1,tex:1024},
  balanced:{pr:1,grass:60000,shadow:2048,steps:22,sky:.34,life:.8,fps:30,msaa:0,shadowEvery:2,world:.85,tex:1024},
  fast:{pr:.85,grass:25000,shadow:1024,steps:14,sky:.28,life:.5,fps:30,msaa:0,shadowEvery:3,world:.6,tex:512},
  mobile:{pr:Math.min(devicePixelRatio||1,1.35),grass:16000,shadow:1024,steps:12,sky:.25,life:.4,fps:30,msaa:0,shadowEvery:3,world:.45,tex:512}
};
let QK=MOBILE?'mobile':'balanced';
try{QK=localStorage.getItem('sb-q3')||QK;}catch(e){}
const Q=Object.assign({},QS[QK]||QS.balanced);

try{
  await Promise.race([
    Promise.all([document.fonts.load('800 40px "Anek Bangla"'),document.fonts.load('600 40px "Anek Bangla"','শান্তিবন সিটি')]),
    new Promise(r=>setTimeout(r,3500))
  ]);
}catch(e){}

/* ---------------- renderer ---------------- */
const canvas=$('#scene');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}
catch(e){fail('This browser can’t show 3D (WebGL is off).');throw e;}
if(!renderer.capabilities.isWebGL2){fail('This walkthrough needs WebGL 2. Please open it in a recent Chrome, Edge, Firefox or Safari.');throw new Error('WebGL2 missing');}
/* software rendering (graphics acceleration off, or the browser's GPU process crashed) runs 3D on the CPU
   and can freeze the whole computer, so drop to a minimal mode and say how to fix it */
let SOFTWARE=false;
try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  SOFTWARE=/swiftshader|basic render|llvmpipe|software|microsoft basic/i.test(name||'');}catch(e){}
if(SOFTWARE){
  Object.assign(Q,{pr:.5,grass:0,shadow:512,steps:8,sky:.2,life:.15,fps:12,msaa:0,shadowEvery:6,world:.3,tex:512});
  const w=document.getElementById('gpuWarn');if(w)w.hidden=false;
  $('#loadMsg').textContent='Paused so your computer stays responsive.';
  const go=$('#loadAnyway');go.hidden=false;
  await new Promise(r=>go.addEventListener('click',r,{once:true}));
  go.hidden=true;
}
renderer.setPixelRatio(Q.pr);
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.8;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
const MAXANI=Math.min(8,renderer.capabilities.getMaxAnisotropy());

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0xc8d6dc,.000075);
const camera=new THREE.PerspectiveCamera(MOBILE&&innerHeight>innerWidth?66:58,innerWidth/innerHeight,1,42000);
camera.rotation.order='YXZ';

/* shared uniforms: every animated material reads these same objects */
const G={
  uTime:{value:0},
  uWind:{value:new THREE.Vector2(.86,.51)},
  uWindStr:{value:1},
  uNight:{value:0},
  uGust:{value:null},
  uLampOn:{value:0},uLampTex:{value:null},uLampBox:{value:new THREE.Vector4(0,0,1,1)}
};
/* adds the street-lamp light map to a lit material (chained after any existing shader edits) */
function addLampLight(mat){
  if(!mat||mat.__lamp||!mat.isMeshStandardMaterial)return;mat.__lamp=true;
  const prev=mat.onBeforeCompile,pk=mat.customProgramCacheKey;
  mat.onBeforeCompile=(sh,r)=>{
    if(prev)prev.call(mat,sh,r);
    sh.uniforms.uLampOn=G.uLampOn;sh.uniforms.uLampTex=G.uLampTex;sh.uniforms.uLampBox=G.uLampBox;
    sh.vertexShader='varying vec3 vLampW;\n'+sh.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
    {vec4 lw=vec4(transformed,1.);
    #ifdef USE_INSTANCING
    lw=instanceMatrix*lw;
    #endif
    vLampW=(modelMatrix*lw).xyz;}`);
    sh.fragmentShader='uniform float uLampOn;uniform sampler2D uLampTex;uniform vec4 uLampBox;varying vec3 vLampW;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    if(uLampOn>.01){vec2 luv=(vLampW.xz-uLampBox.xy)/uLampBox.zw;
      if(luv.x>0.&&luv.y>0.&&luv.x<1.&&luv.y<1.){vec3 L=texture2D(uLampTex,luv).rgb*exp(-max(vLampW.y,0.)/16.);
        vec3 alb=mix(vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11))),diffuseColor.rgb,.55);totalEmissiveRadiance+=alb*L*uLampOn*1.15;}}`);
  };
  mat.customProgramCacheKey=()=>'lamp|'+(pk?pk.call(mat):'');
}

/* ---------------- assets: embedded (single-file build) or separate files (web build) ---------------- */
const ASSET_URLS=window.__ASSET_URLS||{};
const PREFETCH={};
for(const id in ASSET_URLS){
  if(id.startsWith('tex_')&&(id.endsWith('_s')!==(Q.tex<1024)))continue;
  PREFETCH[id]=fetch(ASSET_URLS[id]).then(r=>{if(!r.ok)throw new Error('Could not load '+ASSET_URLS[id]);return r.arrayBuffer();});
}
async function bytes(id){
  if(id.startsWith('tex_')&&Q.tex<1024&&(ASSET_URLS[id+'_s']||document.getElementById('a-'+id+'_s')))id+='_s';
  const el=document.getElementById('a-'+id);
  if(el){const s=atob(el.textContent.trim()),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
  if(!PREFETCH[id]&&ASSET_URLS[id])PREFETCH[id]=fetch(ASSET_URLS[id]).then(r=>r.arrayBuffer());
  if(!PREFETCH[id])throw new Error('missing asset '+id);
  return new Uint8Array(await PREFETCH[id]);
}
async function imgAsset(id,mime){
  const url=URL.createObjectURL(new Blob([await bytes(id)],{type:mime||'image/webp'}));
  const im=new Image();im.src=url;await im.decode();return im;
}
async function texAsset(id,srgb=true){
  const t=new THREE.Texture(await imgAsset(id));
  t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=MAXANI;t.needsUpdate=true;
  return t;
}
function canvasTex(w,h,draw,repeat,srgb=true){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=MAXANI;
  if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
function speck(g,w,h,n,cols,smin,smax){
  for(let i=0;i<n;i++){g.globalAlpha=.25+RT()*.55;g.fillStyle=cols[(RT()*cols.length)|0];
    const s=smin+RT()*(smax-smin);g.fillRect(RT()*w,RT()*h,s,s);}
  g.globalAlpha=1;
}

/* world-space texture coordinates (works for instanced meshes too) */
function worldUV(mat,scale,key){
  const prev=mat.onBeforeCompile;
  mat.onBeforeCompile=(sh,r)=>{
    sh.uniforms.uWS={value:scale};
    sh.vertexShader='uniform float uWS;\n'+sh.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
    {mat4 wm=modelMatrix;
    #ifdef USE_INSTANCING
    wm=modelMatrix*instanceMatrix;
    #endif
    vec3 wpx=(wm*vec4(position,1.0)).xyz;vec3 wn=abs(normalize(mat3(wm)*normal));
    vec2 tt=(wn.y>0.6?wpx.xz:(wn.x>wn.z?vec2(wpx.z,wpx.y):vec2(wpx.x,wpx.y)))*uWS;
    #ifdef USE_MAP
    vMapUv=tt;
    #endif
    #ifdef USE_NORMALMAP
    vNormalMapUv=tt;
    #endif
    #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv=tt;
    #endif
    }`);
    if(prev)prev(sh,r);
  };
  const pk=mat.customProgramCacheKey?mat.customProgramCacheKey.bind(mat):()=>'';
  mat.customProgramCacheKey=()=>'wuv'+scale+(key||'')+pk();
  return mat;
}

/* ---------------- textures and materials ---------------- */
prog(.04,'Unpacking photo textures…');
const TEXN=['leafy_grass','asphalt_02','red_laterite_soil_stones','red_brick_03','painted_plaster_wall','concrete_floor_02','concrete_pavers','bark_brown_02','brown_mud_02','plastered_wall_02'];
const TX={};
await Promise.all(TEXN.map(async n=>{const[d,nn]=await Promise.all([texAsset('tex_'+n+'_d'),texAsset('tex_'+n+'_n',false)]);TX[n]={d,n:nn};}));
/* the Shantiban City logo, used on the HUD badge and the main gate */
const LOGO_IMG=await imgAsset('img_logo');
{const el=document.getElementById('logo');if(el){el.src=LOGO_IMG.src;el.hidden=false;}}
await tick();

function pbr(name,scale,o={},key){
  const m=new THREE.MeshStandardMaterial(Object.assign({map:TX[name].d,normalMap:TX[name].n,roughness:.92},o));
  return worldUV(m,scale,key);
}
const M={
  asphalt:pbr('asphalt_02',1/15,{roughness:.86,normalScale:new THREE.Vector2(.7,.7)}),
  brick:pbr('red_brick_03',1/7),
  plaster:pbr('painted_plaster_wall',1/9,{color:new THREE.Color('#f1ead9')}),
  plasterW:pbr('plastered_wall_02',1/10,{color:new THREE.Color('#d8d4cb')}),
  concrete:pbr('concrete_floor_02',1/10),
  pavers:pbr('concrete_pavers',1/8,{roughness:.78}),
  laterite:pbr('red_laterite_soil_stones',1/9,{roughness:1}),
  mud:pbr('brown_mud_02',1/12,{roughness:1}),
  white:new THREE.MeshStandardMaterial({color:'#d9d7cf',roughness:.75}),
  laterRed:new THREE.MeshStandardMaterial({color:'#a5432a',roughness:.8}),
  cream:pbr('painted_plaster_wall',1/9,{color:new THREE.Color('#efe3c6')}),
  dark:new THREE.MeshStandardMaterial({color:'#2a2c2e',roughness:.5,metalness:.4}),
  metal:new THREE.MeshStandardMaterial({color:'#8d9397',roughness:.45,metalness:.7}),
  black:new THREE.MeshStandardMaterial({color:'#1a1b1c',roughness:.6}),
  glass:new THREE.MeshStandardMaterial({color:'#3d4c55',roughness:.05,metalness:.9}),
  mark:new THREE.MeshStandardMaterial({color:'#f2efe2',roughness:.7,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-8}),
  yellowMark:new THREE.MeshStandardMaterial({color:'#e8b62c',roughness:.7}),
  water:new THREE.MeshStandardMaterial({color:'#1d1f14',roughness:.6})
};
const UNITBOX=new THREE.BoxGeometry(1,1,1),UNITPLANE=new THREE.PlaneGeometry(1,1);
const BOX0=UNITBOX.clone().translate(0,.5,0); /* unit box standing on y = 0 */
function box(w,h,d,mat,x,y,z,ry,cast=true,parent){
  const m=new THREE.Mesh(UNITBOX,mat);m.scale.set(w,h,d);m.position.set(x,y,z);if(ry)m.rotation.y=ry;
  m.castShadow=cast;m.receiveShadow=true;(parent||scene).add(m);return m;
}
/* batches of boxes merged by material: far fewer draw calls for the many small parts */
const BATCH=new Map();
function bx(mat,x0,x1,y0,y1,z0,z1,ry=0,cx=0,cz=0){
  let L=BATCH.get(mat);if(!L){L=[];BATCH.set(mat,L);}
  const w=Math.abs(x1-x0)||.02,h=Math.abs(y1-y0)||.02,d=Math.abs(z1-z0)||.02;
  const m=new THREE.Matrix4().compose(new V3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),new THREE.Quaternion(),new V3(w,h,d));
  if(ry){const r=new THREE.Matrix4().makeTranslation(cx,0,cz).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeTranslation(-cx,0,-cz));m.premultiply(r);}
  L.push(m);
}
function bxM(mat,m){let L=BATCH.get(mat);if(!L){L=[];BATCH.set(mat,L);}L.push(m);}
function flushBatches(cast=true){
  BATCH.forEach((L,mat)=>{
    const im=new THREE.InstancedMesh(UNITBOX,mat,L.length);
    L.forEach((m,i)=>im.setMatrixAt(i,m));im.instanceMatrix.needsUpdate=true;
    im.castShadow=cast;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);
  });
  BATCH.clear();
}
function labelTex(lines,o={}){
  const w=o.w||1024,h=o.h||256;
  return canvasTex(w,h,(g)=>{
    g.fillStyle=o.bg||'#1f4d2c';g.fillRect(0,0,w,h);
    if(o.border!==false){g.strokeStyle=o.border||'#f0a91b';g.lineWidth=Math.max(6,h*.035);g.strokeRect(g.lineWidth,g.lineWidth,w-2*g.lineWidth,h-2*g.lineWidth);}
    drawLines(g,lines,o.x0||0,0,o.x1||w,h,o.pad);
  });
}
/* stack text lines by their measured ink height (Bengali glyphs rise well above Latin caps),
   shrinking the whole stack if needed, and centre it inside the box */
function drawLines(g,lines,x0,y0,x1,y1,pad){
  const W=x1-x0,H=y1-y0,P=pad??Math.max(10,H*.1),gap=H*.06;
  const n=lines.length;
  const sz=lines.map(ln=>ln.s||Math.round(H*.5/n*1.5));
  const M=(k)=>lines.map((ln,i)=>{
    let fs=sz[i]*k;g.font=`${ln.wt||800} ${fs}px "Anek Bangla", sans-serif`;
    while(g.measureText(ln.t).width>W*.88&&fs>8){fs-=2;g.font=`${ln.wt||800} ${fs}px "Anek Bangla", sans-serif`;}
    const m=g.measureText(ln.t);
    return{fs,a:m.actualBoundingBoxAscent||fs*.75,d:m.actualBoundingBoxDescent||fs*.2};
  });
  let k=1,ms=M(1),tot=ms.reduce((s,m)=>s+m.a+m.d,0)+gap*(n-1);
  for(let it=0;it<8&&tot>H-2*P;it++){k*=(H-2*P)/tot;ms=M(k);tot=ms.reduce((s,m)=>s+m.a+m.d,0)+gap*(n-1);}
  let y=y0+(H-tot)/2;
  g.textAlign='center';g.textBaseline='alphabetic';
  lines.forEach((ln,i)=>{const m=ms[i];g.font=`${ln.wt||800} ${m.fs}px "Anek Bangla", sans-serif`;g.fillStyle=ln.c||'#fbfaf3';
    g.fillText(ln.t,(x0+x1)/2,y+m.a);y+=m.a+m.d+gap;});
}
function signBoard(lines,W,H,x,y,z,ry,o={}){
  const t=labelTex(lines,o),m=new THREE.MeshStandardMaterial({map:t,roughness:.55,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:0});
  SIGNS.push(m);
  const g=new THREE.PlaneGeometry(W,H);
  const f=new THREE.Mesh(g,m);f.position.set(x,y,z);f.rotation.y=ry||0;f.translateZ(.12);scene.add(f);
  if(o.back!==false){const b=new THREE.Mesh(g,m);b.position.set(x,y,z);b.rotation.y=(ry||0)+Math.PI;b.translateZ(.12);scene.add(b);}
  if(o.frame!==false)box(W+.5,H+.5,.2,M.dark,x,y,z,ry);
  return f;
}
const SIGNS=[];
