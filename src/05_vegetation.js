/* =====================================================================
   VEGETATION. Every tree, frond and blade bends with one shared wind:
   a slow sway, travelling gusts sampled from a scrolling noise map,
   and a fast leaf flutter. Shadows bend with them (custom depth shader).
   ===================================================================== */
prog(.56,'Growing trees and grass…');await tick();
const WIND_GLSL=`uniform float uTime,uWindStr;uniform vec2 uWind;uniform sampler2D uGust;`;
function windify(mat,{amp=1,flutter=0,height=30,key=''}={}){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uTime=G.uTime;sh.uniforms.uWind=G.uWind;sh.uniforms.uWindStr=G.uWindStr;sh.uniforms.uGust=G.uGust;
    sh.vertexShader=WIND_GLSL+'\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    {
    #ifdef USE_INSTANCING
      vec3 ip=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
      float isc=length(instanceMatrix[0].xyz);
      mat3 irot=mat3(instanceMatrix)/isc;
    #else
      vec3 ip=vec3(0.);float isc=1.;mat3 irot=mat3(1.);
    #endif
      float hN=max(transformed.y,0.)/${height.toFixed(1)};
      float ph=dot(ip.xz,vec2(.013,.021));
      float gust=texture2D(uGust,(ip.xz-uWind*uTime*26.)/2600.).b;
      float g2=smoothstep(.35,.85,gust);
      float sway=(sin(uTime*1.05+ph)*.55+sin(uTime*2.31+ph*1.7)*.22+sin(uTime*.43+ph*.3)*.35)*(.35+g2*.95);
      vec2 b=uWind*(sway*.5+g2*.85+.15)*uWindStr*${amp.toFixed(2)}*hN*hN;
      transformed+=transpose(irot)*vec3(b.x,0.,b.y)*${(height*.055).toFixed(3)}/isc;
      transformed.y-=dot(b,b)*${(height*.012).toFixed(3)};
      ${flutter?`float fl=sin(uTime*(5.5+fract(ph*13.)*3.)+position.x*1.9+position.z*2.3+position.y*1.3)*(.35+g2);
      transformed+=normal*fl*${flutter.toFixed(3)}*uWindStr*min(hN*1.5,1.);`:''}
    }`);
    if(mat.alphaTest>0)sh.fragmentShader=sh.fragmentShader.replace('#include <alphatest_fragment>',`
    #ifdef USE_MAP
    {vec2 tq=vMapUv*512.;float mipL=max(0.,.5*log2(max(dot(dFdx(tq),dFdx(tq)),dot(dFdy(tq),dFdy(tq)))));diffuseColor.a*=1.+mipL*.32;}
    #endif
    #include <alphatest_fragment>`);
  };
  mat.customProgramCacheKey=()=>'wind'+amp+flutter+height+key;
  return mat;
}
/* leaf textures */
const LEAFC=['#3a6a26','#4b7d2e','#5c8f37','#2d5820','#6c9c3f','#436c29','#7aa447','#55862f'];
const leafTex=canvasTex(512,512,(g)=>{
  const gr=g.createRadialGradient(256,256,20,256,256,170);gr.addColorStop(0,'#2c4f1c');gr.addColorStop(1,'#35602a');
  g.fillStyle=gr;g.beginPath();g.arc(256,256,168,0,6.3);g.fill();
  for(let i=0;i<900;i++){const a=RT()*6.283,r=Math.pow(RT(),.55)*228,x=256+Math.cos(a)*r,y=256+Math.sin(a)*r,L=13+RT()*15;
    g.save();g.translate(x,y);g.rotate(a+(RT()-.5)*1.6);
    const c=LEAFC[(RT()*LEAFC.length)|0];g.fillStyle=c;
    g.beginPath();g.moveTo(-L,0);g.quadraticCurveTo(0,-L*.48,L,0);g.quadraticCurveTo(0,L*.48,-L,0);g.fill();
    g.strokeStyle='rgba(20,40,10,.35)';g.lineWidth=1.1;g.beginPath();g.moveTo(-L*.9,0);g.lineTo(L*.9,0);g.stroke();
    g.fillStyle='rgba(255,255,220,.08)';g.beginPath();g.ellipse(L*.1,-L*.12,L*.5,L*.14,0,0,6.3);g.fill();
    g.restore();}
});
const frondTex=canvasTex(256,1024,(g,w,h)=>{
  const C=['#4e7b2a','#5b8a31','#456f27','#6b953b','#577f2c','#7a9a3e'];
  for(let y=h-10;y>8;y-=4.2){const t=1-y/h,L=(Math.sin(Math.min(1,t*1.2)*Math.PI)*.85+.15)*120;
    for(const s of[-1,1]){g.strokeStyle=C[(RT()*C.length)|0];g.lineWidth=7.5;g.lineCap='round';g.beginPath();g.moveTo(128,y);
      g.quadraticCurveTo(128+s*L*.5,y-10,128+s*L*(.92+RT()*.08),y+26+RT()*8);g.stroke();}}
  g.strokeStyle='#8a7a45';g.lineWidth=6;g.beginPath();g.moveTo(128,h);g.lineTo(128,0);g.stroke();
});
const bananaTex=canvasTex(256,1024,(g,w,h)=>{
  g.fillStyle='#5d8f34';g.beginPath();g.moveTo(128,h);
  for(let y=h;y>=0;y-=16){const t=y/h,W=Math.sin(Math.min(1,(1-t)*1.08)*Math.PI*.98)*118+6;g.lineTo(128+W,y);}
  for(let y=0;y<=h;y+=16){const t=y/h,W=Math.sin(Math.min(1,(1-t)*1.08)*Math.PI*.98)*114+6;g.lineTo(128-W,y);}
  g.fill();
  g.strokeStyle='rgba(30,60,18,.35)';g.lineWidth=1.4;
  for(let y=10;y<h;y+=7){g.beginPath();g.moveTo(128,y);g.lineTo(10,y-26);g.moveTo(128,y);g.lineTo(246,y-26);g.stroke();}
  g.globalCompositeOperation='destination-out';
  for(let i=0;i<14;i++){const y=RT()*h*.9,s=RT()<.5?-1:1;g.fillRect(s<0?0:128+30+RT()*40,y,s<0?128-30-RT()*40:128,2+RT()*2.5);}
  g.globalCompositeOperation='source-over';
  g.strokeStyle='#c2c98a';g.lineWidth=7;g.beginPath();g.moveTo(128,h);g.lineTo(128,0);g.stroke();
});
const ringTex=canvasTex(64,256,(g,w,h)=>{g.fillStyle='#7b6c58';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=10){g.fillStyle='rgba(40,30,20,.5)';g.fillRect(0,y,w,2.5);g.fillStyle='rgba(170,150,120,.3)';g.fillRect(0,y+3,w,3);}
  speck(g,w,h,700,['#5a4c3d','#968466','#6a5b48'],1,2);},true);

function cardMat(tex,o){return new THREE.MeshStandardMaterial(Object.assign({map:tex,alphaTest:.45,side:THREE.DoubleSide,roughness:.78},o||{}));}
function cardDepth(tex){return new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:.45,side:THREE.DoubleSide});}

/* ---------------- tree geometry builders (local space, base at origin) ---------------- */
function ellipsoidNormals(g,c,sy=1){
  const p=g.attributes.position,n=g.attributes.normal,v=new V3();
  for(let i=0;i<p.count;i++){v.set(p.getX(i)-c.x,(p.getY(i)-c.y)/sy,p.getZ(i)-c.z).normalize();n.setXYZ(i,v.x,v.y,v.z);}
  n.needsUpdate=true;return g;
}
function trunkBetween(a,b,r0,r1,seg=7){
  const L=a.distanceTo(b),g=new THREE.CylinderGeometry(r1,r0,L,seg,1,true);g.translate(0,L/2,0);
  const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),b.clone().sub(a).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a,q,new V3(1,1,1)));return g;
}
function makeBroadleaf(rnd,cards,big){
  const th=(big?9:6)+rnd()*4,R0=(big?13:8)+rnd()*5,cy=th+R0*.75;
  const parts=[trunkBetween(new V3(0,0,0),new V3(0,th+1,0),big?1.05:.7,big?.75:.5)];
  const crown=[];const K=4+((rnd()*3)|0),cl=[];
  for(let k=0;k<K;k++){const a=k/K*6.283+rnd()*.6,r=R0*(.35+rnd()*.3),c=new V3(Math.cos(a)*r,cy+(rnd()-.35)*R0*.45,Math.sin(a)*r);cl.push(c);
    parts.push(trunkBetween(new V3(0,th*.9,0),c.clone().multiplyScalar(.8).setY(c.y*.85),big?.5:.32,big?.22:.15,5));}
  cl.push(new V3(0,cy+R0*.35,0));
  const per=Math.ceil(cards/cl.length);
  cl.forEach(c=>{for(let i=0;i<per;i++){
    const u=rnd()*6.283,v=Math.acos(2*rnd()-1),rr0=Math.cbrt(rnd())*R0*.55;
    const p=new V3(c.x+Math.sin(v)*Math.cos(u)*rr0,c.y+Math.cos(v)*rr0*.7,c.z+Math.sin(v)*Math.sin(u)*rr0);
    const s=R0*(.62+rnd()*.35),pg=new THREE.PlaneGeometry(s,s);
    const out=p.clone().sub(new V3(0,cy,0)).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,0,1),out.add(new V3((rnd()-.5)*1.2,(rnd()-.3)*1.2,(rnd()-.5)*1.2)).normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0,0,1),rnd()*6.28));
    pg.applyMatrix4(new THREE.Matrix4().compose(p,q,new V3(1,1,1)));crown.push(pg);
  }});
  cl.forEach(c=>{
    const b=new THREE.IcosahedronGeometry(R0*.5,1),bp=b.attributes.position,uv=new Float32Array(bp.count*2);
    for(let i=0;i<bp.count;i++){const k=.82+rnd()*.32;bp.setXYZ(i,bp.getX(i)*k,bp.getY(i)*k*.78,bp.getZ(i)*k);uv[i*2]=.36+rnd()*.28;uv[i*2+1]=.36+rnd()*.28;}
    b.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));b.translate(c.x,c.y,c.z);crown.push(b.index?b:b);
  });
  const cg=ellipsoidNormals(mergeGeometries(crown.map(g=>g.index?g.toNonIndexed():g)),new V3(0,cy,0),.8);
  const tg=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
  return{trunk:tg,crown:cg,h:cy+R0};
}
function frondGeo(L,W,droop){
  const g=new THREE.PlaneGeometry(1,1,2,14),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5;
    p.setXYZ(i,x*W*(1-.5*t),-droop*t*t-Math.abs(x)*W*.25,t*L);}
  g.computeVertexNormals();return g;
}
function makePalm(rnd,fronds,kind){
  const areca=kind==='areca';
  const H=areca?32+rnd()*12:34+rnd()*16;
  const lean=areca?.04+rnd()*.05:.08+rnd()*.16,la=rnd()*6.283;
  const top=new V3(Math.cos(la)*H*lean,H,Math.sin(la)*H*lean);
  const curve=new THREE.QuadraticBezierCurve3(new V3(0,0,0),new V3(top.x*.15,H*.55,top.z*.15),top);
  const tube=new THREE.TubeGeometry(curve,14,areca?.3:.55,7,false);
  {const p=tube.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)/H;const k=areca?1:(1.25-.35*y);const cx=curve.getPoint(clamp(y,0,1));p.setX(i,cx.x+(p.getX(i)-cx.x)*k);p.setZ(i,cx.z+(p.getZ(i)-cx.z)*k);}}
  {const uv=tube.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),uv.getY(i)*H/6);}
  const parts=[tube];
  if(areca)parts.push(trunkBetween(top.clone().setY(H-5),top.clone().setY(H+.6),.42,.38,7));
  const fr=[];const n=fronds;
  for(let i=0;i<n;i++){
    const L=areca?8+rnd()*2.5:12+rnd()*4,droop=areca?2+rnd()*2:3+rnd()*4;
    const g=frondGeo(L,areca?5.2:7,droop);
    const pitch=-.65+rnd()*.85+(i%3===0?-.4:0),yaw=i/n*6.283+rnd()*.35;
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(pitch));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw));
    g.translate(top.x,top.y+(areca?.4:0),top.z);fr.push(g);
  }
  return{trunk:mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g)),crown:mergeGeometries(fr),h:H+3};
}
function makeBanana(rnd,leaves){
  const parts=[],lv=[];
  const stems=2+((rnd()*2)|0);
  for(let s=0;s<stems;s++){
    const ox=(rnd()-.5)*3,oz=(rnd()-.5)*3,H=6+rnd()*4;
    parts.push(trunkBetween(new V3(ox,0,oz),new V3(ox,H,oz),.55,.38,7));
    for(let i=0;i<leaves;i++){
      const L=6.5+rnd()*3,g=frondGeo(L,2.6,1.2+rnd()*2.5);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(-1.05+rnd()*.7));
      g.applyMatrix4(new THREE.Matrix4().makeRotationY(i/leaves*6.283+rnd()*.5));
      g.translate(ox,H-rnd()*1.2,oz);lv.push(g);
    }
  }
  return{trunk:mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g)),crown:mergeGeometries(lv),h:12};
}
/* build a few variants of each kind, at two levels of detail */
const TREE_KINDS={};
{
  const r=rng(777);
  const barkMat=new THREE.MeshStandardMaterial({map:TX.bark_brown_02.d,normalMap:TX.bark_brown_02.n,roughness:1,color:new THREE.Color('#c8b8a6')});
  const palmBark=new THREE.MeshStandardMaterial({map:ringTex,roughness:1});
  const bananaStem=new THREE.MeshStandardMaterial({color:'#7d8c45',roughness:.8});
  const def={
    mango:{make:(lod)=>makeBroadleaf(r,lod?90:40,true),leaf:leafTex,trunkMat:barkMat,amp:.7,flutter:.18,h:34},
    shrubby:{make:(lod)=>makeBroadleaf(r,lod?50:24,false),leaf:leafTex,trunkMat:barkMat,amp:.8,flutter:.15,h:22},
    coco:{make:(lod)=>makePalm(r,lod?22:14,'coco'),leaf:frondTex,trunkMat:palmBark,amp:1.2,flutter:.12,h:46},
    areca:{make:(lod)=>makePalm(r,lod?12:9,'areca'),leaf:frondTex,trunkMat:palmBark,amp:1.3,flutter:.1,h:40},
    banana:{make:(lod)=>makeBanana(r,lod?7:4),leaf:bananaTex,trunkMat:bananaStem,amp:1.6,flutter:.22,h:12}
  };
  for(const k in def){
    const d=def[k];
    const crownMat=windify(cardMat(d.leaf),{amp:d.amp,flutter:d.flutter,height:d.h,key:k});
    const crownDepth=windify(cardDepth(d.leaf),{amp:d.amp,flutter:d.flutter,height:d.h,key:k+'d'});
    const trunkMat=windify(d.trunkMat.clone(),{amp:d.amp,height:d.h,key:k+'t'});
    const trunkDepth=windify(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),{amp:d.amp,height:d.h,key:k+'td'});
    TREE_KINDS[k]={near:[0,1,2].map(()=>d.make(1)),far:[0,1].map(()=>d.make(0)),crownMat,crownDepth,trunkMat,trunkDepth};
  }
}
const TREE_GREENS=['#ffffff','#e6efd2','#d6e4bf','#f3f6de','#c9d9ae','#e9e1c4'].map(c=>new THREE.Color(c));
/* hedge shrubs: fresh, lighter leaf greens (a pink or orange tint multiplied into green leaves reads as brown) */
const FLOWER_TINTS=['#e9f5c8','#f4f9dc','#dcecb4','#eef6cf','#d4e8ad'].map(c=>new THREE.Color(c));
function plantTrees(list){
  const bins={},o=new THREE.Object3D();
  list.forEach(t=>{
    const near=Math.hypot(t.x-SITE_C.x,t.z-SITE_C.z)<(MOBILE?900:1700);
    const K=TREE_KINDS[t.t]||TREE_KINDS.mango,nv=near?K.near.length:K.far.length,v=(Math.abs(Math.floor(t.x*7.1+t.z*3.7))%nv);
    const key=t.t+'|'+(near?'n':'f')+'|'+v;(bins[key]=bins[key]||[]).push(t);
  });
  for(const key in bins){
    const[k,lod,v]=key.split('|'),K=TREE_KINDS[k],geo=(lod==='n'?K.near:K.far)[+v],L=bins[key];
    const crown=new THREE.InstancedMesh(geo.crown,K.crownMat,L.length),trunk=new THREE.InstancedMesh(geo.trunk,K.trunkMat,L.length);
    L.forEach((t,i)=>{o.position.set(t.x,0,t.z);o.rotation.set(0,(t.x*1.7+t.z*2.9)%6.283,0);const s=t.s||1;o.scale.set(s,s,s);o.updateMatrix();
      crown.setMatrixAt(i,o.matrix);trunk.setMatrixAt(i,o.matrix);
      crown.setColorAt(i,t.flower?FLOWER_TINTS[i%FLOWER_TINTS.length]:TREE_GREENS[i%TREE_GREENS.length]);});
    crown.instanceColor.needsUpdate=true;
    const cast=lod==='n';
    crown.castShadow=trunk.castShadow=cast;crown.receiveShadow=trunk.receiveShadow=true;
    crown.customDepthMaterial=K.crownDepth;trunk.customDepthMaterial=K.trunkDepth;
    crown.computeBoundingSphere();trunk.computeBoundingSphere();
    scene.add(crown,trunk);
  }
}
/* trees inside the site: the boulevard median palms, the park and flowering shrubs on the boundary */
const SITE_TREES=[];
for(let z=60;z<SZ1-40;z+=52){if(IROADS.some(r=>r!==BOULEVARD&&(r.x1-r.x0)>(r.z1-r.z0)&&z>r.z0-6&&z<r.z1+6))continue;SITE_TREES.push({t:'areca',x:CX,z,s:.95});}
for(let x=8;x<SX1-8;x+=rr(20,30))SITE_TREES.push({t:'shrubby',x,z:SZ1-4+rr(-1,1),s:rr(.45,.6),flower:R()<.7});
for(let z=12;z<ZAM0;z+=rr(22,32)){SITE_TREES.push({t:'shrubby',x:rr(3,6),z,s:rr(.4,.55),flower:R()<.6});SITE_TREES.push({t:'shrubby',x:SX1-rr(3,6),z,s:rr(.4,.55),flower:R()<.6});}
plantTrees(TREES.concat(PARK_TREES,SITE_TREES));
await tick();

/* haystacks by the homesteads */
{
  const strawTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#b79a55';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.strokeStyle=['#d6bd72','#9c8143','#c9ab61','#8a7038'][(RT()*4)|0];g.lineWidth=1;const x=RT()*w,y=RT()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+(RT()-.5)*6,y+6+RT()*8);g.stroke();}},true);
  const g=new THREE.ConeGeometry(6,9,12,3);g.translate(0,8.5,0);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<5){const k=1+Math.sin(y/5*Math.PI)*.15;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}}
  g.computeVertexNormals();
  const pole=new THREE.CylinderGeometry(.25,6,4.2,12);pole.translate(0,2.1,0);
  const hay=mergeGeometries([g,pole]);
  const im=new THREE.InstancedMesh(hay,new THREE.MeshStandardMaterial({map:strawTex,roughness:1}),HAY.length),o=new THREE.Object3D();
  HAY.forEach((h,i)=>{o.position.set(h.x,0,h.z);o.rotation.set(0,i,0);o.scale.setScalar(h.s);o.updateMatrix();im.setMatrixAt(i,o.matrix);});
  im.castShadow=im.receiveShadow=true;scene.add(im);
}

/* ---------------- grass blades: a wrapping patch that follows the camera ---------------- */
const GRASS={patch:MOBILE?120:170,mesh:null};
{
  const seg=4,pos=[],idx=[];
  for(let i=0;i<=seg;i++){const y=i/seg;pos.push(-1,y,0, 1,y,0);}
  for(let i=0;i<seg;i++){const a=i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
  const base=new THREE.BufferGeometry();base.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));base.setAttribute('normal',new THREE.Float32BufferAttribute(pos.map((v,i)=>i%3===2?1:0),3));base.setIndex(idx);
  const ig=new THREE.InstancedBufferGeometry();ig.index=base.index;ig.attributes.position=base.attributes.position;ig.attributes.normal=base.attributes.normal;
  const N=Q.grass,off=new Float32Array(N*2),rnd=new Float32Array(N*4),gr=rng(99);
  for(let i=0;i<N;i++){off[i*2]=gr();off[i*2+1]=gr();for(let k=0;k<4;k++)rnd[i*4+k]=gr();}
  ig.setAttribute('aOff',new THREE.InstancedBufferAttribute(off,2));ig.setAttribute('aRnd',new THREE.InstancedBufferAttribute(rnd,4));
  ig.instanceCount=N;
  const gm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,side:THREE.DoubleSide});
  const GU={uCam:{value:new THREE.Vector2()},uPatch:{value:GRASS.patch},uNear:{value:nearTex},uNO:{value:new THREE.Vector2(NOX,NOZ)},uNS:{value:NS},uZone:{value:zoneTex},uZO:{value:ZO},uZS:{value:ZS}};
  GRASS.u=GU;
  gm.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,GU);sh.uniforms.uTime=G.uTime;sh.uniforms.uWind=G.uWind;sh.uniforms.uWindStr=G.uWindStr;sh.uniforms.uGust=G.uGust;
    sh.vertexShader=WIND_GLSL+`
      attribute vec2 aOff;attribute vec4 aRnd;uniform vec2 uCam,uNO;uniform float uPatch,uNS,uZO,uZS;uniform sampler2D uNear,uZone;varying vec3 vGC;\n`+
      sh.vertexShader.replace('#include <beginnormal_vertex>',`
      vec2 wpos=aOff*uPatch;wpos+=uPatch*floor((uCam-wpos)/uPatch+.5);
      float dist=length(wpos-uCam);
      vec2 nuv=(wpos-uNO)/uNS;
      vec3 nr;
      if(nuv.x>0.&&nuv.y>0.&&nuv.x<1.&&nuv.y<1.)nr=texture2D(uNear,nuv).rgb;
      else{vec3 z=texture2D(uZone,(wpos-uZO)/uZS).rgb;nr=vec3(z.r*.95+z.g*.55,z.r,z.g*.25);}
      float keep=step(aRnd.x,nr.r)*smoothstep(uPatch*.5,uPatch*.34,dist);
      float tall=nr.g;
      float H=mix(mix(.35,.85,aRnd.y),mix(1.9,3.2,aRnd.y),tall*tall)*keep;
      float Wd=mix(.045,.085,aRnd.z)*mix(1.,1.5,tall);
      float ang=aRnd.w*6.2832;vec2 fdir=vec2(cos(ang),sin(ang));
      float gust=texture2D(uGust,(wpos-uWind*uTime*26.)/2600.).b;float g2=smoothstep(.3,.85,gust);
      float wv=(sin(uTime*2.1+dot(wpos,vec2(.19,.23))+aRnd.y*3.)*.3+.35+g2*.85)*uWindStr;
      float yy=position.y;
      vec3 gp=vec3(wpos.x,0.,wpos.y)+vec3(fdir.y,0.,-fdir.x)*position.x*Wd*(1.-yy*.88)+vec3(0.,yy*H,0.);
      float bend=wv*yy*yy*H*.55;
      gp.xz+=uWind*bend+fdir*(aRnd.z-.5)*yy*yy*H*.45;
      gp.y-=bend*bend*.12;
      vec3 objectNormal=normalize(vec3(fdir.y,0.,-fdir.x)*.35+vec3(0.,1.,0.));
      vec3 dry=vec3(.42,.40,.18),lush=vec3(.13,.26,.05),paddyC=vec3(.20,.36,.07);
      vec3 base=mix(lush,dry,clamp(nr.b*.35+aRnd.z*.3-.12,0.,1.));
      base=mix(base,paddyC*(.85+aRnd.y*.3),tall*.85);
      vGC=base*mix(.35,1.0,yy)*(.8+aRnd.y*.35);
      #ifdef USE_TANGENT
      vec3 objectTangent=vec3(1.,0.,0.);
      #endif`).replace('#include <begin_vertex>','vec3 transformed=gp;');
    sh.fragmentShader='varying vec3 vGC;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vGC;');
  };
  gm.customProgramCacheKey=()=>'grassblades';
  const mesh=new THREE.Mesh(ig,gm);mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);
  GRASS.mesh=mesh;
}
