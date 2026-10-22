/* =====================================================================
   SAMPLE VILLA (from the earlier walkthrough), fitted to any plot on demand
   ===================================================================== */
const col=h=>new THREE.Color(h);
const woodTex=canvasTex(256,256,(g,w,h)=>{const W=['#7a4a2a','#8a5632','#6d4024','#94603a','#7f4f2d'];
  for(let b=0;b<8;b++){g.fillStyle=W[(RT()*W.length)|0];g.fillRect(b*32,0,32,h);
    for(let i=0;i<14;i++){g.strokeStyle=`rgba(${RT()<.5?'40,20,8':'190,140,90'},${.12+RT()*.18})`;g.lineWidth=1+RT()*1.5;const x=b*32+3+RT()*26;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+(RT()-.5)*6,h*.3,x+(RT()-.5)*6,h*.7,x+(RT()-.5)*4,h);g.stroke();}
    g.fillStyle='rgba(20,10,4,.75)';g.fillRect(b*32,0,2,h);}},true);
const gravelTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#a99c8a';g.fillRect(0,0,w,h);
  const C=['#c7bba8','#8f8272','#b8ab97','#d8cfbf','#7d7062','#9e8f7c'];
  for(let i=0;i<2600;i++){g.fillStyle=C[(RT()*C.length)|0];g.beginPath();g.ellipse(RT()*w,RT()*h,1.2+RT()*2.6,1+RT()*2,RT()*3,0,6.3);g.fill();}},true);
const tileTex=canvasTex(256,256,(g,w,h)=>{for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.fillStyle=['#d6cbb8','#cfc3ae','#dcd2c0'][(RT()*3)|0];g.fillRect(i*128,j*128,128,128);
  for(let k=0;k<5;k++){g.strokeStyle='rgba(150,135,110,.25)';g.beginPath();g.moveTo(i*128+RT()*128,j*128);g.quadraticCurveTo(i*128+RT()*128,j*128+64,i*128+RT()*128,j*128+128);g.stroke();}}
  g.strokeStyle='#9f9584';g.lineWidth=2;for(let k=0;k<=256;k+=128){g.beginPath();g.moveTo(k,0);g.lineTo(k,256);g.moveTo(0,k);g.lineTo(256,k);g.stroke();}},true);
const screenTex=canvasTex(256,512,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-out';
  for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64){const cx=x+32,cy=y+32;
    for(let k=0;k<6;k++){g.save();g.translate(cx,cy);g.rotate(k*Math.PI/3);g.beginPath();g.ellipse(0,-14,5,12,0,0,6.3);g.fill();g.restore();}
    g.beginPath();g.arc(cx,cy,4,0,6.3);g.fill();
    for(const[a,b]of[[x,y],[x+64,y],[x,y+64],[x+64,y+64]]){g.beginPath();g.arc(a,b,7,0,6.3);g.fill();}}
  g.globalCompositeOperation='source-over';g.strokeStyle='#fff';g.lineWidth=10;g.strokeRect(0,0,w,h);});
const tuftTex=canvasTex(128,128,(g,w,h)=>{for(let i=0;i<60;i++){const x0=64+(RT()-.5)*30,x1=x0+(RT()-.5)*95,y1=8+RT()*72;
  g.strokeStyle=['#5f8a35','#7aa043','#8fae55','#4d7a2c','#a3b765'][(RT()*5)|0];g.lineWidth=1.6+RT()*1.4;
  g.beginPath();g.moveTo(x0,h);g.quadraticCurveTo((x0+x1)/2,(h+y1)/2,x1,y1);g.stroke();}});
const tuftGeo=(()=>{const a=new THREE.PlaneGeometry(1.5,1.1);a.translate(0,.55,0);const b=a.clone();b.rotateY(Math.PI/2);return mergeGeometries([a,b]);})();
const agaveGeo=(()=>{const parts=[],n=16;
  for(let i=0;i<n;i++){const g=new THREE.ConeGeometry(.2,2.3,4,1);g.translate(0,1.15,0);g.scale(1,1,.36);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(i*2.4).multiply(new THREE.Matrix4().makeRotationX(.2+(i/n)*1.0)));parts.push(g.toNonIndexed());}
  return mergeGeometries(parts);})();
const HMAT={
  plaster:M.plasterW,
  wood:worldUV(new THREE.MeshStandardMaterial({map:woodTex,roughness:.6}),1/6,'vw'),
  doorWood:worldUV(new THREE.MeshStandardMaterial({map:woodTex,color:col('#b89a82'),roughness:.5}),1/4,'vd'),
  gravel:worldUV(new THREE.MeshStandardMaterial({map:gravelTex,roughness:1}),1/5,'vg'),
  concrete:M.concrete,
  tile:worldUV(new THREE.MeshStandardMaterial({map:tileTex,roughness:.4}),1/6,'vt'),
  paver:M.pavers,
  canopy:pbr('concrete_floor_02',1/8,{color:col('#f2e9da'),roughness:.85},'vc'),
  coping:new THREE.MeshStandardMaterial({color:col('#d9d6ce'),roughness:.8}),
  frame:new THREE.MeshStandardMaterial({color:col('#2c2f31'),roughness:.38,metalness:.7}),
  shade:new THREE.MeshStandardMaterial({color:col('#55585a'),roughness:.6,metalness:.3}),
  metal:new THREE.MeshStandardMaterial({color:col('#3a3d40'),roughness:.4,metalness:.75}),
  glass:new THREE.MeshStandardMaterial({color:col('#5d6c73'),roughness:.04,metalness:.9}),
  glassLit:new THREE.MeshStandardMaterial({color:col('#5d6c73'),roughness:.04,metalness:.9,emissive:new THREE.Color('#ffb466'),emissiveIntensity:0}),
  soil:new THREE.MeshStandardMaterial({color:col('#3b2a1e'),roughness:1}),
  lamp:new THREE.MeshStandardMaterial({color:col('#f5efe0'),emissive:new THREE.Color('#ffd49a'),emissiveIntensity:0}),
  screen:new THREE.MeshStandardMaterial({map:screenTex,color:col('#7a6248'),metalness:.6,roughness:.45,alphaTest:.5,side:THREE.DoubleSide}),
  agave:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.55}),
  tuft:new THREE.MeshStandardMaterial({map:tuftTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.85})
};
TIME_HOOKS.push(on=>{HMAT.glassLit.emissiveIntensity=on*1.2;HMAT.lamp.emissiveIntensity=on*3;});
const AGC=['#7f9f8c','#6f9078','#8aa592','#9a7a6a','#7a9a70'].map(col);
const LEAFTINT=['#ffffff','#e3eed2','#d2e2bd','#f1f5dc','#c8d9b0'].map(col);
const CATDEF={};
['plaster','wood','doorWood','gravel','concrete','tile','paver','canopy','coping','frame','shade','metal','glass','glassLit','soil','lamp'].forEach(k=>
  CATDEF[k]={geo:UNITBOX,mat:HMAT[k],cast:!['gravel','paver','tile','soil','glass','glassLit','lamp'].includes(k)});
CATDEF.screen={geo:UNITPLANE,mat:HMAT.screen,cast:true,depth:cardDepth(screenTex)};
CATDEF.agave={geo:agaveGeo,mat:HMAT.agave,cast:true,colors:AGC};
CATDEF.tuft={geo:tuftGeo,mat:HMAT.tuft,cast:false,colors:LEAFTINT};
const Q0=new THREE.Quaternion();
function boxM(x0,x1,y0,y1,z0,z1){return new THREE.Matrix4().compose(new V3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),Q0,new V3(Math.abs(x1-x0)||.01,Math.abs(y1-y0)||.01,Math.abs(z1-z0)||.01));}
/* local frame: front (road side) is +z, frontage along x, feet; y = 0 at the plot surface */
const VILLA=(()=>{
  const P={};const add=(c,x0,x1,y0,y1,z0,z1)=>(P[c]=P[c]||[]).push(boxM(x0,x1,y0,y1,z0,z1));
  const plant=(c,x,y,z,s)=>(P[c]=P[c]||[]).push(new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),R()*6.28),new V3(s,s,s)));
  const PY0=12,PY1=15;
  const par=(x0,x1,z0,z1,y0=PY0,y1=PY1)=>{add('plaster',x0,x1,y0,y1,z0,z1);add('coping',x0-.12,x1+.12,y1,y1+.22,z0-.12,z1+.12);};
  const par4=(x0,x1,z0,z1,y0,y1)=>{par(x0,x1,z1-.6,z1,y0,y1);par(x0,x1,z0,z0+.6,y0,y1);par(x0,x0+.6,z0+.6,z1-.6,y0,y1);par(x1-.6,x1,z0+.6,z1-.6,y0,y1);};
  const rail=(x0,x1,z0,z1,y0)=>{const ax=Math.abs(x1-x0)>Math.abs(z1-z0),L=ax?x1-x0:z1-z0,n=Math.max(2,Math.round(L/2.2));
    for(let i=0;i<=n;i++){const u=(ax?x0:z0)+L*i/n;ax?add('metal',u-.09,u+.09,y0,y0+3.1,z0-.09,z0+.09):add('metal',x0-.09,x0+.09,y0,y0+3.1,u-.09,u+.09);}
    [.9,1.7,2.5,3.1].forEach(hh=>ax?add('metal',x0,x1,y0+hh-.06,y0+hh+.06,z0-.05,z0+.05):add('metal',x0-.05,x0+.05,y0+hh-.06,y0+hh+.06,z0,z1));};
  const fb=(c,ax,sg,pl,u0,u1,y0,y1,w0,w1)=>{const a=pl+sg*w0,b=pl+sg*w1;
    ax==='z'?add(c,u0,u1,y0,y1,Math.min(a,b),Math.max(a,b)):add(c,Math.min(a,b),Math.max(a,b),y0,y1,u0,u1);};
  const win=(ax,sg,pl,u0,u1,y0,y1,o={})=>{
    fb(o.door?'doorWood':'glass',ax,sg,pl,u0,u1,y0,y1,-.3,.04);
    const t=.22;fb('frame',ax,sg,pl,u0-t,u0,y0-(o.door?0:t),y1+t,-.1,.16);fb('frame',ax,sg,pl,u1,u1+t,y0-(o.door?0:t),y1+t,-.1,.16);
    fb('frame',ax,sg,pl,u0,u1,y1,y1+t,-.1,.16);if(!o.door)fb('frame',ax,sg,pl,u0,u1,y0-t,y0,-.1,.16);
    if(!o.door&&u1-u0>3){const m=(u0+u1)/2;fb('frame',ax,sg,pl,m-.08,m+.08,y0,y1,-.05,.1);}
    if(!o.door&&!o.nomid&&y1-y0>4.5){const m=y0+(y1-y0)*.66;fb('frame',ax,sg,pl,u0,u1,m-.07,m+.07,-.05,.1);}
    if(o.shade!==false)fb('shade',ax,sg,pl,u0-.5,u1+.5,y1+.45,y1+.75,0,o.shadeD||1.9);
    if(!o.door)fb('coping',ax,sg,pl,u0-.25,u1+.25,y0-.44,y0-.22,0,.45);};
  add('concrete',-15.3,15.3,0,1.5,-14.3,14.3);add('tile',-3,10,1.5,1.56,4,14.3);
  add('plaster',-15,-3,1.5,12,-14,14);add('plaster',-3,15,1.5,12,-14,4);add('plaster',10,15,1.5,12,4,14);
  add('gravel',-15,-3,12,12.08,-14,14);add('gravel',-3,15,12,12.08,-14,4);add('gravel',10,15,12,12.08,4,14);
  add('plaster',1,15,12,22,-14,-2);add('gravel',1.6,14.4,22,22.1,-13.4,-2.6);par4(1,15,-14,-2,22,23.2);
  add('wood',-12,1,12,23.5,-14,-4);add('gravel',-11.4,.4,23.5,23.6,-13.4,-4.6);par4(-12,1,-14,-4,23.5,24.5);
  par(-15,-11,13.4,14);rail(-11,-6.5,13.7,13.7,PY0);par(-6.5,-3,13.4,14);
  par(-15,-14.4,-14,0);rail(-14.7,-14.7,0,8,PY0);par(-15,-14.4,8,13.4);
  par(-3,0,4,4.6);rail(0,7,4.3,4.3,PY0);par(7,10,4,4.6);par(-3.6,-3,4.6,13.4);
  par(10,15,13.4,14);par(10,10.6,4.6,13.4);par(14.4,15,-2,3);rail(14.7,14.7,3,9,PY0);par(14.4,15,9,13.4);
  par(-15,-12,-14,-13.4);
  win('z',1,14,-13.2,-9.6,3.6,10.2);add('wood',-8.7,-6.3,2.2,11.6,14,14.25);
  win('x',-1,-15,-9.6,-5.8,3.6,10.2);win('x',-1,-15,3,6.8,3.6,10.2);add('wood',-15.25,-15,2.2,11.6,-3.6,-1.2);
  win('z',1,4,.6,4.2,1.56,9.6,{door:true,shade:false});win('z',1,4,5.6,9.2,3.8,9.2,{shade:false});
  win('z',1,14,11.3,14,5,9);win('x',1,15,6.2,10,4,9);win('x',1,15,-10,-6,3.8,9.6);
  win('z',-1,-14,-11,-7.4,4,9);win('z',-1,-14,3,6.6,4,9);win('z',-1,-14,9,12.6,4,9);
  win('z',1,-2,8.8,13.8,12.4,20.2,{nomid:true});win('z',1,-2,3,6.6,14.6,19.6);win('x',1,15,-10,-6,14.6,19.2);
  win('z',1,-4,-7.6,-4.6,12.4,20.4,{nomid:true,shadeD:1.4});win('x',-1,-12,-11,-7.6,14.6,19.6);
  win('z',-1,-14,4,7.6,14.6,19.2);win('z',-1,-14,-8,-4.4,14.6,19.2);
  add('lamp',-.55,-.15,6.8,7.6,4,4.3);add('lamp',4.65,5.05,6.8,7.6,4,4.3);
  add('canopy',-3.6,10.6,10.2,10.85,3.6,15.4);
  (P.screen=P.screen||[]).push(new THREE.Matrix4().compose(new V3(-.8,5.88,15.1),Q0,new V3(4.4,8.64,1)));
  add('metal',-3.12,-2.9,1.56,10.2,15,15.2);add('metal',1.3,1.52,1.56,10.2,15,15.2);
  add('concrete',1.6,5,0,3,14.3,15.5);add('soil',1.8,4.8,2.9,3.02,14.5,15.3);plant('agave',2.6,3,14.9,.75);plant('tuft',4,3,14.9,1.1);
  add('concrete',5.2,9.4,0,.75,14.3,15.9);add('concrete',5.2,9.4,.75,1.5,14.3,15.1);
  add('concrete',10,15.3,0,2.4,14.3,16.4);add('soil',10.2,15.1,2.3,2.42,14.5,16.2);
  plant('agave',11.4,2.4,15.4,.9);plant('agave',13.7,2.4,15.3,.7);plant('tuft',12.6,2.4,15.6,1.2);
  add('concrete',-14.4,-11,12.08,13.6,11.4,13.4);add('soil',-14.2,-11.2,13.5,13.62,11.6,13.2);
  plant('agave',-13.3,13.6,12.4,.7);plant('tuft',-11.9,13.6,12.4,1);
  add('concrete',11,14.4,12.08,13.6,10.8,13.4);add('soil',11.2,14.2,13.5,13.62,11,13.2);
  plant('agave',12,13.6,12.1,.7);plant('agave',13.5,13.6,12,.55);
  add('concrete',-14.4,-12.8,12.08,13.4,0,8);add('soil',-14.2,-13,13.3,13.42,.2,7.8);
  plant('tuft',-13.6,13.4,1.5,1.1);plant('tuft',-13.6,13.4,4,1);plant('agave',-13.6,13.4,6.5,.6);
  add('concrete',-2.4,-.2,12.08,13.6,4.7,6.4);add('soil',-2.2,-.4,13.5,13.62,4.9,6.2);plant('tuft',-1.3,13.6,5.5,1);
  return P;
})();
const VILLA_FRONT=16.4,VILLA_REAR=-14.3;
const houseGroup=new THREE.Group();scene.add(houseGroup);
const built=new Map(),HOUSE_BLOCK=[];
function plotFrame(p){
  const nz=p.f==='n'?-1:1,ry=Math.atan2(0,nz),F=p.w,Dp=p.d;
  const P=new THREE.Matrix4().compose(new V3(p.x+p.w/2,PLOT_H,p.z+p.d/2),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),ry),new V3(1,1,1));
  const sx=clamp((F-5)/30.6,.7,1.15),sz=clamp((Dp-9)/(VILLA_FRONT-VILLA_REAR),.7,1.15),oz=-Dp/2+3-VILLA_REAR*sz;
  const H=P.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,oz)).multiply(new THREE.Matrix4().makeScale(sx,1,sz));
  return{P,H,F,Dp,sz,oz};
}
function aabbOf(Mx,x0,x1,z0,z1,pad){
  let a=1e9,b=-1e9,c=1e9,d=-1e9;
  for(const[x,z]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1]]){const v=new V3(x,0,z).applyMatrix4(Mx);a=Math.min(a,v.x);b=Math.max(b,v.x);c=Math.min(c,v.z);d=Math.max(d,v.z);}
  return[a-pad,b+pad,c-pad,d+pad];
}
function rebuildHouses(){
  while(houseGroup.children.length)houseGroup.remove(houseGroup.children[0]);
  HOUSE_BLOCK.length=0;
  const lists={},push=(c,m)=>(lists[c]=lists[c]||[]).push(m);
  built.forEach((v,p)=>{
    const fr=plotFrame(p),{F,Dp}=fr;
    for(const c in VILLA){const tc=c==='glass'&&v.lit?'glassLit':c;VILLA[c].forEach(m=>push(tc,fr.H.clone().multiply(m)));}
    const front=fr.oz+VILLA_FRONT*fr.sz,s=(c,x0,x1,y0,y1,z0,z1)=>push(c,fr.P.clone().multiply(boxM(x0,x1,y0,y1,z0,z1)));
    s('gravel',-F/2+.3,F/2-.3,0,.07,-Dp/2+.3,front);s('paver',-F/2+.3,F/2-.3,0,.09,front,Dp/2-.3);
    const wh=2.6,g=6;
    s('concrete',-F/2,-F/2+.6,0,wh,-Dp/2,Dp/2);s('concrete',F/2-.6,F/2,0,wh,-Dp/2,Dp/2);s('concrete',-F/2+.6,F/2-.6,0,wh,-Dp/2,-Dp/2+.6);
    s('concrete',-F/2+.6,-g,0,wh,Dp/2-.6,Dp/2);s('concrete',g,F/2-.6,0,wh,Dp/2-.6,Dp/2);
    s('plaster',-g-1.2,-g,0,4.4,Dp/2-.9,Dp/2);s('plaster',g,g+1.2,0,4.4,Dp/2-.9,Dp/2);
    s('coping',-g-1.35,-g+.15,4.4,4.65,Dp/2-1.05,Dp/2+.15);s('coping',g-.15,g+1.35,4.4,4.65,Dp/2-1.05,Dp/2+.15);
    HOUSE_BLOCK.push(aabbOf(fr.H,-15.3,15.3,VILLA_REAR,VILLA_FRONT,.8));
    HOUSE_BLOCK.push(aabbOf(fr.P,-F/2,-F/2+.6,-Dp/2,Dp/2,.5),aabbOf(fr.P,F/2-.6,F/2,-Dp/2,Dp/2,.5),aabbOf(fr.P,-F/2,F/2,-Dp/2,-Dp/2+.6,.5),
      aabbOf(fr.P,-F/2,-g,Dp/2-.9,Dp/2,.5),aabbOf(fr.P,g,F/2,Dp/2-.9,Dp/2,.5));
  });
  for(const c in lists){
    const def=CATDEF[c],L=lists[c],im=new THREE.InstancedMesh(def.geo,def.mat,L.length);
    L.forEach((m,i)=>{im.setMatrixAt(i,m);if(def.colors)im.setColorAt(i,def.colors[i%def.colors.length]);});
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
    im.castShadow=def.cast;im.receiveShadow=true;if(def.depth)im.customDepthMaterial=def.depth;im.computeBoundingSphere();houseGroup.add(im);
  }
  const b=$('#allVillas');if(b)b.textContent=built.size>=plots.length?'Clear sample homes':'Sample homes on all plots';
}
function setVilla(p,on,quiet){if(on)built.set(p,{lit:((p.no*7)%10)<7});else built.delete(p);if(!quiet)rebuildHouses();}
