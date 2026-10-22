/* =====================================================================
   TOWN. Thousands of homes drawn as instanced boxes; a facade shader adds
   windows, frames, grills, sunshades, slab lines, shop shutters and
   damp stains, and lights a share of windows after dark.
   ===================================================================== */
prog(.62,'Building the neighbourhood…');await tick();
const facadeMat=new THREE.MeshStandardMaterial({map:TX.painted_plaster_wall.d,normalMap:TX.painted_plaster_wall.n,roughness:.9,normalScale:new THREE.Vector2(.6,.6)});
facadeMat.onBeforeCompile=sh=>{
  sh.uniforms.uNight=G.uNight;
  sh.vertexShader=`attribute vec4 aInfo;varying vec4 vInfo;varying vec3 vLoc,vBS;varying float vWN;\n`+sh.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
    vInfo=aInfo;vLoc=position;
    vBS=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
    vWN=abs(normal.y);
    vec2 fuv=abs(normal.x)>.5?vec2(position.z*vBS.z,position.y*vBS.y):(abs(normal.y)>.5?vec2(position.x*vBS.x,position.z*vBS.z):vec2(position.x*vBS.x,position.y*vBS.y));
    fuv+=aInfo.z*.37;
    #ifdef USE_MAP
    vMapUv=fuv/9.;
    #endif
    #ifdef USE_NORMALMAP
    vNormalMapUv=fuv/9.;
    #endif`);
  sh.fragmentShader=`uniform float uNight;varying vec4 vInfo;varying vec3 vLoc,vBS;varying float vWN;float winM=0.,litM=0.,signM=0.;vec3 signC=vec3(0.);
    float fh(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\n`+
  sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    if(vWN<.5){
      bool sideX=abs(vLoc.x)>.499;
      float wl=sideX?vBS.z:vBS.x;
      float u=(sideX?vLoc.z:vLoc.x)*wl+wl*.5;
      float y=vLoc.y*vBS.y;
      float fl=floor((y-1.6)/10.),fy=fract((y-1.6)/10.);
      float nw=max(1.,floor(wl/8.5)),cw=wl/nw,cu=floor(u/cw),fu=fract(u/cw);
      bool front=vLoc.z>.499;
      bool shopF=vInfo.y>.5&&front&&fl<.5;
      float floorsN=vInfo.x;
      float rnd=fh(vec3(cu,fl,vInfo.z));
      float hasWin=step(0.,fl)*step(fl,floorsN-1.)*step(.12,rnd+ (front?.5:0.) )*(shopF?0.:1.);
      float inW=step(.3,fu)*step(fu,.7)*step(.27,fy)*step(fy,.76)*hasWin;
      float fr=step(.27,fu)*step(fu,.73)*step(.24,fy)*step(fy,.79)*hasWin-inW;
      float bars=inW*step(.82,fract(fu*30.))*step(.5,fh(vec3(vInfo.z,1.,2.)));
      float chj=step(.25,fu)*step(fu,.75)*step(.79,fy)*step(fy,.84)*hasWin;
      float shadeBelow=step(.25,fu)*step(fu,.75)*step(.6,fy)*step(fy,.76)*hasWin;
      float slab=(1.-step(.035,fy))*step(.5,fl+.5);
      vec3 base=diffuseColor.rgb;
      float damp=(1.-smoothstep(0.,4.5,y))*(.5+.5*fh(floor(vec3(u*.3,0.,vInfo.z))));
      base*=1.-damp*.28;
      base*=1.-.10*slab;
      base*=1.-.18*shadeBelow*(1.-inW);
      if(y<1.6)base=vec3(.42,.41,.39)*(.8+.2*texture2D(map,vMapUv*.5).r);
      vec3 glass=mix(vec3(.05,.06,.07),vec3(.16,.13,.1),step(.6,rnd))*(.8+.4*fh(vec3(cu*3.,fl,1.)));
      base=mix(base,vec3(.82,.81,.78),fr*.9);
      base=mix(base,vec3(.6,.59,.56),chj);
      base=mix(base,glass,inW);
      base=mix(base,vec3(.12,.13,.14),bars);
      winM=inW;
      litM=inW*step(.48,fh(vec3(cu,fl,vInfo.z+7.)))*uNight;
      if(shopF){
        float su=fract(u/max(wl/max(1.,floor(wl/11.)),1.));
        float sh1=step(.06,su)*step(su,.94)*step(.0,y-1.6)*step(y,8.8);
        float strip=.5+.5*sin(y*9.);
        base=mix(base,vec3(.55,.57,.58)*(.82+.22*strip),sh1*step(.35,fh(vec3(cu,9.,vInfo.z))));
        float openS=sh1*(1.-step(.35,fh(vec3(cu,9.,vInfo.z))));
        base=mix(base,vec3(.32,.26,.2),openS);
        litM+=openS*uNight*.6;
        float sg=step(9.,y)*step(y,11.2);
        signC=vec3(fh(vec3(vInfo.z,3.,1.)),fh(vec3(vInfo.z,5.,2.)),fh(vec3(vInfo.z,7.,3.)));
        signC=mix(vec3(.75,.15,.1),vec3(.1,.35,.7),step(.5,signC.x))*(.6+.6*signC.y);
        base=mix(base,signC,sg);signM=sg;
      }
      diffuseColor.rgb=base;
    }else{
      diffuseColor.rgb=vec3(.58,.56,.52)*(.75+.35*texture2D(map,vMapUv*.7).g);
    }`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.08,winM);')
     .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=litM*vec3(1.,.7,.4)*1.7+signM*signC*uNight*.8;');
};
facadeMat.customProgramCacheKey=()=>'facade';
{
  const n=HOUSES.length,im=new THREE.InstancedMesh(BOX0,facadeMat,n),info=new Float32Array(n*4),o=new THREE.Object3D(),c=new THREE.Color();
  HOUSES.forEach((h,i)=>{o.position.set(h.x,0,h.z);o.rotation.set(0,h.ry,0);o.scale.set(h.w,h.h,h.d);o.updateMatrix();im.setMatrixAt(i,o.matrix);
    im.setColorAt(i,c.set(h.c));info.set([h.floors,h.shop,h.seed%97,0],i*4);});
  im.geometry=BOX0.clone();im.geometry.setAttribute('aInfo',new THREE.InstancedBufferAttribute(info,4));
  im.castShadow=im.receiveShadow=true;im.instanceColor.needsUpdate=true;im.computeBoundingSphere();scene.add(im);
}
/* roof parapets, water tanks, stair rooms, balconies and shop awnings */
{
  const par=[],tank=[],stair=[],balc=[],rail=[],awn=[],awnC=[],o=new THREE.Object3D();
  const AW=['#2f6fb0','#c8452e','#2e7d4f','#d8a030','#6c3f8f','#e0e0e0'].map(c=>new THREE.Color(c));
  const local=(h,lx,ly,lz,sx,sy,sz)=>{const c=Math.cos(h.ry),s=Math.sin(h.ry);o.position.set(h.x+lx*c+lz*s,ly,h.z-lx*s+lz*c);o.rotation.set(0,h.ry,0);o.scale.set(sx,sy,sz);o.updateMatrix();return o.matrix.clone();};
  HOUSES.forEach(h=>{
    const t=.55,ph=2.8,y=h.h;
    par.push(local(h,0,y,h.d/2-t/2,h.w,ph,t),local(h,0,y,-h.d/2+t/2,h.w,ph,t),local(h,h.w/2-t/2,y,0,t,ph,h.d-2*t),local(h,-h.w/2+t/2,y,0,t,ph,h.d-2*t));
    if(h.tank)tank.push(local(h,(h.seed%2?1:-1)*(h.w/2-3.4),y,-h.d/2+3.4,1,1,1));
    if(h.stair&&h.w>18)stair.push(local(h,-(h.seed%2?1:-1)*(h.w/2-5),y,-h.d/2+5,8,8.5,8));
    if(h.floors>1&&(h.shop||h.seed%3<1.6)){
      for(let f=1;f<h.floors;f++){const bw=Math.min(h.w*.62,16);
        balc.push(local(h,0,1.6+f*10-.1,h.d/2+1.5,bw,.45,3));
        rail.push(local(h,0,1.6+f*10+.35,h.d/2+2.9,bw,3,.12));}
    }
    if(h.shop){awn.push(local(h,0,9.3,h.d/2+2.6,h.w*.94,.18,5.2));awnC.push(AW[(h.seed|0)%AW.length]);}
  });
  const mk=(list,geo,mat,cast=true,cols)=>{if(!list.length)return;const im=new THREE.InstancedMesh(geo,mat,list.length);list.forEach((m,i)=>{im.setMatrixAt(i,m);if(cols)im.setColorAt(i,cols[i]);});
    if(cols)im.instanceColor.needsUpdate=true;im.castShadow=cast;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);return im;};
  mk(par,BOX0,M.plasterW);
  const tg=new THREE.CylinderGeometry(2.1,2.1,4.6,14);tg.translate(0,2.3,0);const tl=new THREE.CylinderGeometry(1,2.1,.6,14);tl.translate(0,4.9,0);
  mk(tank,mergeGeometries([tg,tl]),new THREE.MeshStandardMaterial({color:'#1d1e20',roughness:.55}));
  mk(stair,BOX0,M.plasterW);
  mk(balc,BOX0,M.concrete);
  mk(rail,BOX0,new THREE.MeshStandardMaterial({color:'#3a3d40',roughness:.4,metalness:.6,transparent:true,opacity:.85}));
  const awg=BOX0.clone();awg.applyMatrix4(new THREE.Matrix4().makeRotationX(.22));
  mk(awn,awg,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.7}),true,awnC);
}
/* ponds with slow ripples, fresnel and sky reflections */
const waterMat=new THREE.MeshStandardMaterial({color:'#24332a',roughness:.06,metalness:0,envMapIntensity:1.2});
waterMat.onBeforeCompile=sh=>{
  sh.uniforms.uTime=G.uTime;sh.uniforms.uWindStr=G.uWindStr;
  sh.vertexShader='varying vec3 vWWP;\n'+sh.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\nvWWP=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader='uniform float uTime,uWindStr;varying vec3 vWWP;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',`
    {vec2 wp=vWWP.xz;float t=uTime;vec2 g=vec2(0.);
     g+=vec2(cos(dot(wp,vec2(.31,.17))+t*1.3),cos(dot(wp,vec2(-.23,.41))+t*1.1))*.035;
     g+=vec2(cos(dot(wp,vec2(1.3,.7))+t*2.7),cos(dot(wp,vec2(-.9,1.4))+t*2.3))*.018;
     g+=vec2(cos(dot(wp,vec2(3.1,-2.2))+t*4.1),cos(dot(wp,vec2(2.6,3.3))+t*3.7))*.008;
     g*=.6+.6*uWindStr;
     vec3 nW=normalize(vec3(-g.x,1.,-g.y));normal=normalize((viewMatrix*vec4(nW,0.)).xyz);}`);
};
{
  const cg=new THREE.CircleGeometry(1,48);cg.rotateX(-Math.PI/2);
  const im=new THREE.InstancedMesh(cg,waterMat,PONDS.length),rim=new THREE.InstancedMesh(cg,new THREE.MeshStandardMaterial({color:'#4a3e2b',roughness:1}),PONDS.length),o=new THREE.Object3D();
  PONDS.forEach((p,i)=>{o.position.set(p.x,.09,p.z);o.rotation.set(0,p.rot,0);o.scale.set(p.rx,1,p.rz);o.updateMatrix();im.setMatrixAt(i,o.matrix);
    o.position.y=.05;o.scale.set(p.rx+3.5,1,p.rz+3.5);o.updateMatrix();rim.setMatrixAt(i,o.matrix);});
  im.receiveShadow=rim.receiveShadow=true;im.computeBoundingSphere();rim.computeBoundingSphere();scene.add(rim,im);
}

/* ---------------- nearby amenities (illustrative buildings at the stated distances) ---------------- */
prog(.68,'Adding the market, school, hospital and bus terminus…');await tick();
const AMEN_TREES=[];
/* market, about 500 m */
const STALLS=[];
{
  const m=MARKET;
  flat(m.x1-m.x0,m.z1-m.z0,(m.x0+m.x1)/2,(m.z0+m.z1)/2,.15,M.mud);
  const tarp=['#2f6fb0','#3a86c8','#d8a030','#c8452e','#e9e4d8','#2e7d4f','#f08c2e'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.75,side:THREE.DoubleSide}));
  const bamboo=new THREE.MeshStandardMaterial({color:'#a88b55',roughness:.8});
  const veg=['#c8361e','#7b3a6b','#9a7448','#3f7a2a','#e8c22a','#d9702a','#e9e2cc'].map(c=>new THREE.Color(c));
  const piles=[];
  for(let row=0;row<5;row++)for(let col=0;col<11;col++){
    const x=m.x0+30+col*39+(row%2)*8,z=m.z0+26+row*42;if(x>m.x1-20)continue;
    STALLS.push([x,z]);
    bx(M.concrete,x-5,x+5,0,2.6,z-3,z+3);
    for(const[a,b]of[[-5.5,-3.5],[5.5,-3.5],[-5.5,3.5],[5.5,3.5]])bx(bamboo,x+a-.15,x+a+.15,0,b<0?8.6:7.4,z+b-.15,z+b+.15);
    const t=new THREE.Mesh(UNITBOX,tarp[(row*11+col)%tarp.length]);t.scale.set(12.6,.08,8.6);t.position.set(x,8,z);t.rotation.x=.14;t.castShadow=true;t.receiveShadow=true;scene.add(t);
    for(let k=0;k<6;k++)piles.push([x-3.6+k*1.45,2.6,z+(k%2?.9:-.9),veg[(row+col+k)%veg.length]]);
  }
  const pg=new THREE.SphereGeometry(.85,10,6);pg.scale(1,.55,1);
  const pm=new THREE.InstancedMesh(pg,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6}),piles.length),o=new THREE.Object3D();
  piles.forEach(([x,y,z,c],i)=>{o.position.set(x,y+.35,z);o.scale.setScalar(.9+((i*7)%5)*.08);o.updateMatrix();pm.setMatrixAt(i,o.matrix);pm.setColorAt(i,c);});
  pm.castShadow=true;pm.instanceColor.needsUpdate=true;scene.add(pm);
  /* market gate arch onto the main road */
  const gx=(m.x0+m.x1)/2;
  for(const x of[gx-22,gx+22])bx(M.laterRed,x-1.2,x+1.2,0,17,m.z0-3,m.z0-.6);
  signBoard([{t:'MARKET',s:120},{t:'বাজার',s:66,wt:600,c:'#f0a91b'}],40,6.5,gx,18,m.z0-1.8,Math.PI,{w:1024,h:180,bg:'#7a2e1f'});
  for(let i=0;i<10;i++)AMEN_TREES.push({t:'mango',x:m.x0+rr(10,m.x1-m.x0-10),z:m.z1-rr(6,14),s:rr(.8,1)});
}
/* school, about 1.5 km */
{
  const s=SCHOOL,x0=s.x0+20,x1=s.x0+190,z0=s.z0+25,z1=s.z1-25;
  flat(s.x1-s.x0,s.z1-s.z0,(s.x0+s.x1)/2,(s.z0+s.z1)/2,.13,pbr('brown_mud_02',1/12,{color:new THREE.Color('#c9b08a'),roughness:1},'sch'));
  const ylw=pbr('painted_plaster_wall',1/9,{color:new THREE.Color('#f1d48a')},'ylw'),grn=new THREE.MeshStandardMaterial({color:'#2f6b3e',roughness:.7});
  const wing=(a,b,c,d)=>{bx(ylw,a,b,0,32,c,d);for(let f=0;f<3;f++){bx(grn,a-.2,b+.2,f*10.5+.0,f*10.5+1.1,c-.2,d+.2);}
    bx(M.concrete,a-1,b+1,32,33.2,c-1,d+1);};
  wing(x0,x0+42,z0,z1);wing(x0+42,x1,z0,z0+40);wing(x0+42,x1,z1-40,z1);
  for(let z=z0+4;z<z1-4;z+=9){for(let f=0;f<3;f++)bx(M.glass,x0+42-.1,x0+42.05,f*10.5+3.5,f*10.5+8.5,z,z+5);}
  for(const z of[z0+40,z1-40])for(let x=x0+48;x<x1-4;x+=9)for(let f=0;f<3;f++)bx(M.glass,x,x+5,f*10.5+3.5,f*10.5+8.5,z>s.z0+100?z-.05:z-.05,z+.1);
  const pf=(s.x0+s.x1)/2+60;
  for(const z of[s.z0+70,s.z1-70]){bx(M.white,pf-.3,pf+.3,0,8,z-12,z-11.4);bx(M.white,pf-.3,pf+.3,0,8,z+11.4,z+12);bx(M.white,pf-.3,pf+.3,7.6,8.2,z-12,z+12);}
  bx(M.metal,x1+20,x1+20.4,0,32,(z0+z1)/2-.2,(z0+z1)/2+.2);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(7,4.5),new THREE.MeshStandardMaterial({map:canvasTex(96,64,(g,w,h)=>{g.fillStyle='#ff9933';g.fillRect(0,0,w,h/3);g.fillStyle='#ffffff';g.fillRect(0,h/3,w,h/3);g.fillStyle='#138808';g.fillRect(0,2*h/3,w,h/3);g.strokeStyle='#000080';g.lineWidth=2;g.beginPath();g.arc(w/2,h/2,8,0,6.3);g.stroke();}),side:THREE.DoubleSide,roughness:.7}));
  flag.position.set(x1+23.8,29.5,(z0+z1)/2);scene.add(flag);
  for(let z=s.z0;z<=s.z1;z+=10){bx(M.cream,s.x1-1,s.x1,0,5.5,z,Math.min(z+10,s.z1));bx(M.cream,s.x0,s.x0+1,0,5.5,z,Math.min(z+10,s.z1));}
  for(let x=s.x0;x<s.x1;x+=10){bx(M.cream,x,Math.min(x+10,s.x1),0,5.5,s.z0,s.z0+1);bx(M.cream,x,Math.min(x+10,s.x1),0,5.5,s.z1-1,s.z1);}
  signBoard([{t:'SCHOOL',s:120},{t:'বিদ্যালয়',s:66,wt:600,c:'#f0a91b'}],22,5.4,x0-.4,20,(z0+z1)/2,-Math.PI/2,{w:1024,h:240,bg:'#2f6b3e'});
  for(let i=0;i<12;i++)AMEN_TREES.push({t:R()<.5?'mango':'coco',x:rr(s.x0+8,s.x1-8),z:R()<.5?s.z0+rr(6,14):s.z1-rr(6,14),s:rr(.8,1.05)});
}
/* hospital, about 2 km */
{
  const h=HOSPITAL,x0=h.x0+90,x1=h.x1-30,z0=h.z0+60,z1=h.z1-90;
  flat(h.x1-h.x0,h.z1-h.z0,(h.x0+h.x1)/2,(h.z0+h.z1)/2,.14,M.concrete);
  bx(M.plasterW,x0,x1,0,52,z0,z1);bx(M.concrete,x0-1.5,x1+1.5,52,54,z0-1.5,z1+1.5);
  for(let f=0;f<5;f++){bx(M.glass,x1-.05,x1+.1,f*10.4+3,f*10.4+9.2,z0+6,z1-6);bx(M.glass,x0+6,x1-6,f*10.4+3,f*10.4+9.2,z0-.1,z0+.05);bx(M.glass,x0+6,x1-6,f*10.4+3,f*10.4+9.2,z1-.05,z1+.1);
    bx(M.glass,x0-.1,x0+.05,f*10.4+3,f*10.4+9.2,z0+6,z1-6);bx(new THREE.MeshStandardMaterial({color:'#2d6aa8',roughness:.4}),x0-.4,x0,f*10.4+9.2,f*10.4+10.4,z0+2,z1-2);}
  bx(M.white,x0-30,x0,13,14.2,(z0+z1)/2-26,(z0+z1)/2+26);
  for(const z of[(z0+z1)/2-24,(z0+z1)/2+24])bx(M.white,x0-29,x0-27.6,0,13,z-.7,z+.7);
  const cross=canvasTex(256,256,(g,w,h2)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h2);g.fillStyle='#d32f2f';g.fillRect(96,28,64,200);g.fillRect(28,96,200,64);});
  const cm=new THREE.MeshStandardMaterial({map:cross,emissive:'#ffffff',emissiveMap:cross,emissiveIntensity:0,roughness:.5});SIGNS.push(cm);
  const cp=new THREE.Mesh(new THREE.PlaneGeometry(14,14),cm);cp.position.set(x0-.3,40,(z0+z1)/2-60);cp.rotation.y=-Math.PI/2;scene.add(cp);
  const cp2=cp.clone();cp2.position.set((x0+x1)/2,40,z1+.3);cp2.rotation.y=0;scene.add(cp2);const cp3=cp.clone();cp3.position.set((x0+x1)/2,40,z0-.3);cp3.rotation.y=Math.PI;scene.add(cp3);
  signBoard([{t:'HOSPITAL',s:120},{t:'হাসপাতাল',s:66,wt:600,c:'#d32f2f'}],40,7,x0-.3,24,(z0+z1)/2,-Math.PI/2,{back:false,frame:false,w:1024,h:200,bg:'#ffffff',border:'#d32f2f'});
  for(let i=0;i<10;i++)AMEN_TREES.push({t:'areca',x:h.x0+rr(10,60),z:rr(h.z0+20,h.z1-20),s:rr(.85,1)});
}
/* bus terminus, about 1.5 km */
{
  const b=BUS;
  flat(b.x1-b.x0,b.z1-b.z0,(b.x0+b.x1)/2,(b.z0+b.z1)/2,.15,M.concrete);
  const tin=new THREE.MeshStandardMaterial({color:'#8f979c',roughness:.4,metalness:.7,side:THREE.DoubleSide});
  const sx0=b.x0+40,sx1=b.x1-40,sz=b.z0+22;
  for(let x=sx0;x<=sx1;x+=26){bx(M.metal,x-.35,x+.35,0,13,sz-.35,sz+.35);bx(M.metal,x-.35,x+.35,0,11,sz+15-.35,sz+15+.35);}
  {const r=new THREE.Mesh(UNITBOX,tin);r.scale.set(sx1-sx0+6,.2,19);r.position.set((sx0+sx1)/2,12.2,sz+7.5);r.rotation.x=-.12;r.castShadow=true;r.receiveShadow=true;scene.add(r);}
  for(let x=sx0+6;x<sx1-6;x+=14)bx(M.metal,x,x+9,1.4,1.7,sz+4,sz+6);
  bx(M.plasterW,b.x1-36,b.x1-18,0,10,b.z0+10,b.z0+24);bx(M.laterRed,b.x1-37,b.x1-17,10,10.8,b.z0+9,b.z0+25);
  signBoard([{t:'BUS TERMINUS',s:110},{t:'বাস টার্মিনাস',s:62,wt:600,c:'#f0a91b'}],36,5.5,(b.x0+b.x1)/2,17,b.z0-.2,Math.PI,{w:1024,h:200,bg:'#1d3f66'});
  for(const x of[(b.x0+b.x1)/2-19,(b.x0+b.x1)/2+19])bx(M.metal,x-.3,x+.3,0,14.5,b.z0-.6,b.z0+.2);
  for(let i=0;i<8;i++)AMEN_TREES.push({t:R()<.6?'mango':'coco',x:rr(b.x0+10,b.x1-10),z:b.z1-rr(6,16),s:rr(.85,1.05)});
}
/* Koyal More: the crossing, with an auto stand and a traffic island */
{
  const k=KOYAL;
  const isl=new THREE.Mesh(new THREE.CylinderGeometry(9,9.6,1.2,32),M.concrete);isl.position.set(k.x,.6,k.z);isl.receiveShadow=true;scene.add(isl);
  const lawnI=new THREE.Mesh(new THREE.CylinderGeometry(8.2,8.2,.3,32),hedgeMat);lawnI.position.set(k.x,1.3,k.z);scene.add(lawnI);
  bx(M.white,k.x-1.4,k.x+1.4,1.2,15,k.z-1.4,k.z+1.4);
  signBoard([{t:'KOYAL MORE',s:120},{t:'কোয়াল মোড়',s:66,wt:600,c:'#f0a91b'}],16,4,k.x,18.5,k.z,0,{w:1024,h:240});
  signBoard([{t:'KOYAL MORE',s:120},{t:'কোয়াল মোড়',s:66,wt:600,c:'#f0a91b'}],16,4,k.x,18.5,k.z,Math.PI/2,{w:1024,h:240,frame:false});
}
plantTrees(AMEN_TREES);
flushBatches(true);

/* ---------------- floating labels for the nearby places ---------------- */
const PINS=[];
function pinTex(title,sub){
  return canvasTex(512,150,(g,w,h)=>{
    g.fillStyle='rgba(16,38,26,.86)';g.beginPath();g.roundRect(4,4,w-8,h-30,22);g.fill();
    g.beginPath();g.moveTo(w/2-16,h-27);g.lineTo(w/2,h-4);g.lineTo(w/2+16,h-27);g.fill();
    g.strokeStyle='#f0a91b';g.lineWidth=3;g.beginPath();g.roundRect(4,4,w-8,h-30,22);g.stroke();
    g.textAlign='center';g.fillStyle='#fbfaf3';g.font='700 44px "Anek Bangla", sans-serif';g.fillText(title,w/2,58);
    g.fillStyle='#f0a91b';g.font='600 30px "Anek Bangla", sans-serif';g.fillText(sub,w/2,98);
  },false);
}
function addPin(title,sub,x,y,z,kind){
  const sm=new THREE.SpriteMaterial({map:pinTex(title,sub),depthTest:false,transparent:true,sizeAttenuation:false});
  const s=new THREE.Sprite(sm);s.center.set(.5,0);s.scale.set(.17,.05,1);s.position.set(x,y,z);s.renderOrder=20;scene.add(s);
  PINS.push({s,kind,p:new V3(x,y,z)});return s;
}
AMEN.forEach(a=>addPin(a.n,a.d,a.p.x,a.key==='hospital'?75:a.key==='school'?50:40,a.p.z,'out'));
addPin('Shantiban City','220 plots · Tapna, Baruipur',SITE_C.x,70,SITE_C.z,'site');
INSIDE.slice(2).forEach(a=>addPin(a.n,'inside the gate',a.p.x,a.key==='hall'?40:28,a.p.z,'in'));
/* connectivity arcs from the gate to each nearby place */
const ARCS=new THREE.Group();scene.add(ARCS);
{
  const mat=new THREE.MeshBasicMaterial({color:'#ffb52e',transparent:true,opacity:.85,depthWrite:false});
  AMEN.forEach(a=>{
    const p0=new V3(CX,4,SZ1+20),p1=a.p.clone().setY(8),mid=p0.clone().lerp(p1,.5);mid.y=p0.distanceTo(p1)*.16;
    const c=new THREE.QuadraticBezierCurve3(p0,mid,p1);
    const l=new THREE.Mesh(new THREE.TubeGeometry(c,90,7,6,false),mat);l.renderOrder=19;ARCS.add(l);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(60,5,6,40),mat);ring.rotation.x=-Math.PI/2;ring.position.copy(p1).setY(10);ARCS.add(ring);
  });
}
