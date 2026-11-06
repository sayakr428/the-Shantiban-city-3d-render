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
const waterMat=new THREE.MeshStandardMaterial({color:'#24332a',roughness:.06,metalness:0,envMapIntensity:1.2,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
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
  const im=new THREE.InstancedMesh(cg,waterMat,PONDS.length),rim=new THREE.InstancedMesh(cg,new THREE.MeshStandardMaterial({color:'#4a3e2b',roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),PONDS.length),o=new THREE.Object3D();
  PONDS.forEach((p,i)=>{o.position.set(p.x,.55,p.z);o.rotation.set(0,p.rot,0);o.scale.set(p.rx,1,p.rz);o.updateMatrix();im.setMatrixAt(i,o.matrix);
    o.position.y=.35;o.scale.set(p.rx+3.5,1,p.rz+3.5);o.updateMatrix();rim.setMatrixAt(i,o.matrix);});
  im.receiveShadow=rim.receiveShadow=true;rim.renderOrder=1;im.renderOrder=2;im.computeBoundingSphere();rim.computeBoundingSphere();scene.add(rim,im);
}

/* ---------------- nearby amenities: photo-surfaced West Bengal buildings ----------------
   The hospital, school and market fronts are photographs generated for this project (Google Flow),
   wrapped onto real 3D masses with roofs, parapets, porches, rooftop water tanks and tin sheds. */
prog(.68,'Adding the market, school, hospital and bus terminus…');await tick();
const AMEN_TREES=[];
const FAC={};
await Promise.all(['hosp_front','hosp_wing','school_front','school_wing','market_shops','market_stall','tin_roof'].map(async n=>{
  const t=await texAsset('tex_fac_'+n+'_d');t.wrapS=THREE.MirroredRepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;FAC[n]=t;}));
const facAspect=n=>FAC[n].image.width/FAC[n].image.height;
const FACMAT=new Map();
/* one material per (photo, repeat count, offset) so the bays always land on whole tiles */
function facMat(n,rep,off=0){
  const k=n+'|'+rep+'|'+off;if(FACMAT.has(k))return FACMAT.get(k);
  const t=FAC[n].clone();t.repeat.set(rep,1);t.offset.set(off,0);t.needsUpdate=true;
  const m=new THREE.MeshStandardMaterial({map:t,roughness:.88});FACMAT.set(k,m);return m;
}
/* a photo wall from (ax,az) to (bx,bz), facing left of the direction of travel, h feet tall.
   The photo is repeated a whole number of times along the wall, at its own aspect ratio. */
function photoWall(n,ax,az,bx2,bz2,h,y0=0,opt={}){
  const L=Math.hypot(bx2-ax,bz2-az),ux=(bx2-ax)/L,uz=(bz2-az)/L;
  const rep=opt.rep||Math.max(1,Math.round(L/(h*facAspect(n))));
  const w=new THREE.Mesh(new THREE.PlaneGeometry(L,h),facMat(n,rep));
  w.position.set((ax+bx2)/2-uz*.02,y0+h/2,(az+bz2)/2+ux*.02);w.rotation.y=Math.atan2(-uz,ux);
  w.castShadow=true;w.receiveShadow=true;scene.add(w);return w;
}
/* a block: plastered core, photo faces where given, a roof slab with an overhang and parapet */
function photoBlock(x0,x1,z0,z1,h,faces,o={}){
  bx(o.core||M.plasterW,x0+.05,x1-.05,0,h,z0+.05,z1-.05);
  const F={s:[x0,z1,x1,z1],e:[x1,z1,x1,z0],n:[x1,z0,x0,z0],w:[x0,z0,x0,z1]};
  for(const k in F)if(faces[k]){const f=faces[k];const[n,rep]=Array.isArray(f)?f:[f,0];photoWall(n,...F[k],h,0,{rep});}
  const ov=o.overhang??1.2,pt=o.parapet??3;
  bx(M.concrete,x0-ov,x1+ov,h,h+.9,z0-ov,z1+ov);
  if(pt){for(const[a,b,c,d]of[[x0-ov,x1+ov,z0-ov,z0-ov+.7],[x0-ov,x1+ov,z1+ov-.7,z1+ov],[x0-ov,x0-ov+.7,z0-ov,z1+ov],[x1+ov-.7,x1+ov,z0-ov,z1+ov]])bx(o.parapetMat||M.white,a,b,h+.9,h+.9+pt,c,d);}
  BLOCK_TOPS.push({x0,x1,z0,z1,y:h+.9});
}
/* the black plastic water tanks every Bengal rooftop carries, and a stair cabin */
const BLOCK_TOPS=[];
const tankMat=new THREE.MeshStandardMaterial({color:'#1b1c1d',roughness:.55});
function roofKit(t,nTanks){
  const cx=(t.x0+t.x1)/2,cz=(t.z0+t.z1)/2;
  bx(M.plasterW,cx-7,cx+7,t.y,t.y+9,cz-6,cz+6);bx(M.concrete,cx-8,cx+8,t.y+9,t.y+9.8,cz-7,cz+7);
  for(let i=0;i<nTanks;i++){const x=t.x0+8+i*((t.x1-t.x0-16)/Math.max(1,nTanks-1)),z=t.z0+7;
    bx(M.concrete,x-3,x+3,t.y,t.y+2.2,z-3,z+3);
    const tk=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.6,5.6,16),tankMat);tk.position.set(x,t.y+2.2+2.8,z);tk.castShadow=true;scene.add(tk);
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.5,12),tankMat);lid.position.set(x,t.y+8.2,z);scene.add(lid);}
}
/* a covered porch on columns in front of a face, with steps */
function porch(cx,cz,ry,w,d,h){
  const L=(m,a,b,c,e,f,g)=>bx(m,cx+a,cx+b,c,e,cz+f,cz+g,ry,cx,cz);
  L(M.concrete,-w/2-1,w/2+1,h,h+1.2,-d,0);L(M.white,-w/2-1.3,w/2+1.3,h+1.2,h+2.4,-d-.3,-d+.6);
  for(const x of[-w/2+1,w/2-1])L(M.white,x-.9,x+.9,0,h,-d+.4,-d+2.2);
  for(let i=0;i<3;i++)L(M.concrete,-w/2+2,w/2-2,0,1.5-i*.5,-d-1.6*(i+1)+1.6,-d-1.6*i+1.6);
}

/* the photographs carry daylight in them: dim them with the evening so they sit in the night scene */
const FAC_DIM=[];
TIME_HOOKS.push((on,night)=>{const k=1-.62*Math.max(on,night||0);FACMAT.forEach(m=>m.color.setScalar(k));FAC_DIM.forEach(m=>m.color.setScalar(k));});
/* market, about 500 m: shop rows on the road, tin-roofed bazaar sheds behind */
{
  const m=MARKET,gx=(m.x0+m.x1)/2;
  flat(m.x1-m.x0,m.z1-m.z0,gx,(m.z0+m.z1)/2,.15,M.mud);
  /* two-storey shop rows facing the main road, either side of the bazaar entrance */
  const sh=24,sd=30;
  for(const[a,b]of[[m.x0+8,gx-26],[gx+26,m.x1-8]]){
    photoBlock(a,b,m.z0+4,m.z0+4+sd,sh,{n:'market_shops',s:'market_shops'},{core:M.plaster,parapet:2.4,overhang:.8});
    roofKit(BLOCK_TOPS.at(-1),Math.max(1,Math.round((b-a)/70)));
    BLOCKERS?.push?.([a,b,m.z0+4,m.z0+4+sd]);
  }
  /* entrance arch */
  for(const x of[gx-22,gx+22])bx(M.laterRed,x-1.2,x+1.2,0,17,m.z0+2,m.z0+4.4);
  signBoard([{t:'MARKET',s:120},{t:'বাজার',s:66,wt:600,c:'#f0a91b'}],40,6.5,gx,18,m.z0+3.2,Math.PI,{w:1024,h:180,bg:'#7a2e1f'});
  /* open bazaar sheds: steel posts, a pitched corrugated tin roof, stalls of produce underneath */
  const tinMat=worldUV(new THREE.MeshStandardMaterial({map:FAC.tin_roof,roughness:.5,metalness:.45,side:THREE.DoubleSide}),1/13,'tin');
  const stallMat=facMat('market_stall',1);
  FAC_DIM.push(tinMat);
  const post=new THREE.MeshStandardMaterial({color:'#5d5f60',roughness:.5,metalness:.6}),woodM=new THREE.MeshStandardMaterial({color:'#7a5f42',roughness:.9});
  const shedL=150,shedD=34,z0=m.z0+sd+30;
  for(let row=0;row*48+z0+shedD<m.z1-10;row++)for(const sx of[m.x0+30,m.x0+30+shedL+30]){
    if(sx+shedL>m.x1-10)continue;
    const sz=z0+row*48,cx=sx+shedL/2,cz=sz+shedD/2;
    for(let x=sx;x<=sx+shedL+.1;x+=25)for(const z of[sz,sz+shedD])bx(post,x-.3,x+.3,0,12,z-.3,z+.3);
    for(const sg of[-1,1]){const r=new THREE.Mesh(UNITBOX,tinMat);r.scale.set(shedL+6,.12,shedD/2+3);
      r.position.set(cx,13.6,cz+sg*(shedD/4+.6));r.rotation.x=sg*.2;r.castShadow=true;r.receiveShadow=true;scene.add(r);}
    bx(post,sx-3,sx+shedL+3,15.3,15.7,cz-.25,cz+.25);
    /* a walkway down the middle of the shed, with a line of stalls either side facing it:
       a wooden platform and the photographed produce on a display leaning back from the walkway */
    for(let x=sx+3;x<sx+shedL-12;x+=14)for(const sg of[-1,1]){
      const fz=cz+sg*5.5,bz=cz+sg*(shedD/2-1);
      bx(woodM,x,x+12,0,2.4,Math.min(fz,bz),Math.max(fz,bz));
      const dw=12,dh=dw/facAspect('market_stall'),d=new THREE.Mesh(new THREE.PlaneGeometry(dw,dh),stallMat);
      d.position.set(x+6,2.4+dh*.35,fz+sg*1.1);d.rotation.order='YXZ';d.rotation.y=sg>0?Math.PI:0;d.rotation.x=-1.0;d.castShadow=true;d.receiveShadow=true;scene.add(d);
    }
  }
  for(let i=0;i<8;i++)AMEN_TREES.push({t:R()<.5?'mango':'coco',x:m.x0+rr(10,m.x1-m.x0-10),z:m.z1-rr(4,9),s:rr(.8,1)});
}
/* school, about 1.5 km: a three-storey U of classroom wings round a courtyard that opens to the road */
{
  const s=SCHOOL,h=34,d=36;
  flat(s.x1-s.x0,s.z1-s.z0,(s.x0+s.x1)/2,(s.z0+s.z1)/2,.13,pbr('brown_mud_02',1/12,{color:new THREE.Color('#c9b08a'),roughness:1},'sch'));
  const x0=s.x0+40,zc=(s.z0+s.z1)/2,half=140,wingL=150;
  /* main wing: central staircase block flanked by classroom bays, all facing the courtyard (east) */
  const cw=Math.round(h*facAspect('school_front'));
  photoBlock(x0,x0+d,zc-cw/2,zc+cw/2,h+4,{e:'school_front'},{parapet:3});roofKit(BLOCK_TOPS.at(-1),2);
  for(const[a,b]of[[zc-half,zc-cw/2],[zc+cw/2,zc+half]])photoBlock(x0,x0+d,a,b,h,{e:'school_wing',w:'school_wing',n:a<zc?'school_wing':0,s:a<zc?0:'school_wing'});
  /* side wings running toward the road */
  photoBlock(x0+d,x0+d+wingL,zc-half,zc-half+d,h,{s:'school_wing',n:'school_wing',e:'school_wing'});roofKit(BLOCK_TOPS.at(-1),1);
  photoBlock(x0+d,x0+d+wingL,zc+half-d,zc+half,h,{n:'school_wing',s:'school_wing',e:'school_wing'});roofKit(BLOCK_TOPS.at(-1),1);
  BLOCKERS?.push?.([x0,x0+d,zc-half,zc+half],[x0+d,x0+d+wingL,zc-half,zc-half+d],[x0+d,x0+d+wingL,zc+half-d,zc+half]);
  /* flag post in the courtyard, goal posts, boundary wall and gate */
  const fx=x0+d+wingL-20;
  bx(M.concrete,fx-3,fx+3,0,1.6,zc-3,zc+3);bx(M.metal,fx-.2,fx+.2,1.6,30,zc-.2,zc+.2);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(7,4.5),new THREE.MeshStandardMaterial({map:canvasTex(96,64,(g,w,hh)=>{g.fillStyle='#ff9933';g.fillRect(0,0,w,hh/3);g.fillStyle='#ffffff';g.fillRect(0,hh/3,w,hh/3);g.fillStyle='#138808';g.fillRect(0,2*hh/3,w,hh/3);g.strokeStyle='#000080';g.lineWidth=2;g.beginPath();g.arc(w/2,hh/2,8,0,6.3);g.stroke();}),side:THREE.DoubleSide,roughness:.7}));
  flag.position.set(fx+3.6,27.5,zc);scene.add(flag);
  for(const z of[zc-60,zc+60]){bx(M.white,x0+d+70-.3,x0+d+70+.3,0,8,z-12,z-11.4);bx(M.white,x0+d+70-.3,x0+d+70+.3,0,8,z+11.4,z+12);bx(M.white,x0+d+70-.3,x0+d+70+.3,7.6,8.2,z-12,z+12);}
  const wallC=pbr('painted_plaster_wall',1/9,{color:new THREE.Color('#e9eef3')},'swl'),blue=new THREE.MeshStandardMaterial({color:'#3f7fc0',roughness:.6});
  for(let z=s.z0;z<s.z1;z+=10){const z2=Math.min(z+10,s.z1);if(Math.abs((z+z2)/2-zc)>14){bx(wallC,s.x1-1,s.x1,0,5.5,z,z2);bx(blue,s.x1-1.1,s.x1+.1,4.9,5.6,z,z2);}bx(wallC,s.x0,s.x0+1,0,5.5,z,z2);}
  for(let x=s.x0;x<s.x1;x+=10){const x2=Math.min(x+10,s.x1);bx(wallC,x,x2,0,5.5,s.z0,s.z0+1);bx(wallC,x,x2,0,5.5,s.z1-1,s.z1);bx(blue,x,x2,4.9,5.6,s.z0-.1,s.z0+1.1);bx(blue,x,x2,4.9,5.6,s.z1-1.1,s.z1+.1);}
  for(const z of[zc-14,zc+14])bx(blue,s.x1-1.5,s.x1+.5,0,10,z-1.5,z+1.5);
  signBoard([{t:'SCHOOL',s:120},{t:'বিদ্যালয়',s:66,wt:600,c:'#f0a91b'}],26,5.4,s.x1+.6,13.4,zc,Math.PI/2,{w:1024,h:240,bg:'#2f6fb0'});
  for(let i=0;i<12;i++)AMEN_TREES.push({t:R()<.5?'mango':'coco',x:rr(s.x0+8,s.x1-8),z:R()<.5?s.z0+rr(6,14):s.z1-rr(6,14),s:rr(.8,1.05)});
  AMEN_TREES.push({t:'mango',x:x0+d+wingL-60,z:zc+40,s:1.15});
}
/* hospital, about 2 km: a five-storey block facing the road (west), with a porch and wings */
{
  const H=HOSPITAL,h=58,d=60,xf=H.x0+150,zc=(H.z0+H.z1)/2;
  /* grounds: lawn, a paved forecourt and drive in front, parking strips along the sides */
  flat(H.x1-H.x0,H.z1-H.z0,(H.x0+H.x1)/2,zc,.13,pbr('leafy_grass',1/10,{roughness:1},'hgr'));
  flat(xf-8-H.x0,150,(H.x0+xf-8)/2,zc,.15,M.pavers);
  flat(xf-8-H.x0,28,(H.x0+xf-8)/2,zc,.16,M.asphalt);
  for(const z of[zc-130,zc+130])flat(xf-H.x0-30,40,(H.x0+xf)/2,z,.15,M.concrete);
  const cw=Math.round((h+6)*facAspect('hosp_front')),wing=110;
  photoBlock(xf-8,xf-8+d+8,zc-cw/2,zc+cw/2,h+6,{w:'hosp_front',n:'hosp_wing',s:'hosp_wing',e:'hosp_wing'},{parapet:3.4});roofKit(BLOCK_TOPS.at(-1),3);
  photoBlock(xf,xf+d,zc-cw/2-wing,zc-cw/2,h,{w:'hosp_wing',n:'hosp_wing',e:'hosp_wing'});roofKit(BLOCK_TOPS.at(-1),2);
  photoBlock(xf,xf+d,zc+cw/2,zc+cw/2+wing,h,{w:'hosp_wing',s:'hosp_wing',e:'hosp_wing'});roofKit(BLOCK_TOPS.at(-1),2);
  BLOCKERS?.push?.([xf-8,xf+d,zc-cw/2-wing,zc+cw/2+wing]);
  /* drive-in porch with a ramp, at the main entrance */
  porch(xf-8,zc,-Math.PI/2,46,30,14);
  const ramp=new THREE.Mesh(UNITBOX,M.pavers);ramp.scale.set(30,.6,10);ramp.position.set(xf-30,.3,zc+30);ramp.receiveShadow=true;scene.add(ramp);
  const cross=canvasTex(256,256,(g,w,h2)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h2);g.fillStyle='#d32f2f';g.fillRect(96,28,64,200);g.fillRect(28,96,200,64);});
  const cm=new THREE.MeshStandardMaterial({map:cross,emissive:'#ffffff',emissiveMap:cross,emissiveIntensity:0,roughness:.5});SIGNS.push(cm);
  for(const[x,z,ry]of[[xf-8.4,zc-cw/2+16,-Math.PI/2],[xf-8.4,zc+cw/2-16,-Math.PI/2]]){const cp=new THREE.Mesh(new THREE.PlaneGeometry(12,12),cm);cp.position.set(x,h-6,z);cp.rotation.y=ry;scene.add(cp);}
  signBoard([{t:'HOSPITAL',s:120,c:'#c62828'},{t:'হাসপাতাল',s:66,wt:600,c:'#1f3f6e'}],34,6.2,xf-8-.35,h-14,zc,-Math.PI/2,{back:false,frame:false,w:1024,h:200,bg:'#ffffff',border:'#c62828'});
  /* boundary wall with a gate onto the road */
  const wallC=pbr('painted_plaster_wall',1/9,{color:new THREE.Color('#e9eef3')},'hwl'),blue=new THREE.MeshStandardMaterial({color:'#3f7fc0',roughness:.6});
  for(let z=H.z0;z<H.z1;z+=10){const z2=Math.min(z+10,H.z1);if(Math.abs((z+z2)/2-zc)>20){bx(wallC,H.x0,H.x0+1,0,5.5,z,z2);bx(blue,H.x0-.1,H.x0+1.1,4.9,5.6,z,z2);}}
  for(const z of[zc-20,zc+20])bx(blue,H.x0-.5,H.x0+1.5,0,11,z-1.5,z+1.5);
  for(let i=0;i<14;i++)AMEN_TREES.push({t:R()<.5?'areca':'coco',x:H.x0+rr(12,xf-H.x0-30),z:R()<.5?rr(H.z0+15,zc-80):rr(zc+80,H.z1-15),s:rr(.85,1)});
  for(let i=0;i<8;i++)AMEN_TREES.push({t:'mango',x:rr(xf+d+20,H.x1-15),z:rr(H.z0+20,H.z1-20),s:rr(.85,1.05)});
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
