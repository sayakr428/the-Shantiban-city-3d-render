/* =====================================================================
   GROUND. A land-use map (paddy / town / wet) drives a procedural
   ground shader; a finer map around the site paints lawns, plot soil and
   grass density, and is reused by the wind-blown grass blades.
   ===================================================================== */
prog(.38,'Shaping the land…');await tick();
const ZN=2048,ZS=28000,ZO=-14000;
/* canvas filters are applied per draw call and are very slow when the browser draws 2D on the CPU,
   so every map is drawn sharp, with shapes batched into single paths, then softened once */
function softened(cv,px){
  /* shrink then enlarge with smoothing: a soft blur that costs almost nothing even on a CPU canvas */
  const k=Math.max(2,px*2),w=Math.round(cv.width/k),h=Math.round(cv.height/k);
  const sm=document.createElement('canvas');sm.width=w;sm.height=h;
  const a=sm.getContext('2d');a.imageSmoothingEnabled=true;a.imageSmoothingQuality='high';a.drawImage(cv,0,0,w,h);
  const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;
  const g=t.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(sm,0,0,cv.width,cv.height);
  return t;
}
let zoneCv=document.createElement('canvas');zoneCv.width=zoneCv.height=ZN;
{
  const g=zoneCv.getContext('2d'),s=ZN/ZS,X=x=>(x-ZO)*s;
  g.fillStyle='rgb(255,0,0)';g.fillRect(0,0,ZN,ZN);
  g.fillStyle='rgb(0,255,0)';
  CLUSTERS.forEach(c=>g.fillRect(X(c.x0-60),X(c.z0-60),(c.x1-c.x0+120)*s,(c.z1-c.z0+120)*s));
  OROADS.forEach(r=>{const h=r.w/2+90;g.fillRect(X(Math.min(r.ax,r.bx)-h),X(Math.min(r.az,r.bz)-h),(Math.abs(r.bx-r.ax)+2*h)*s,(Math.abs(r.bz-r.az)+2*h)*s);});
  g.fillRect(X(SITE.x0-80),X(SITE.z0-90),(SITE.x1-SITE.x0+160)*s,(SITE.z1-SITE.z0+160)*s);
  [MARKET,BUS,SCHOOL,HOSPITAL].forEach(r=>g.fillRect(X(r.x0-50),X(r.z0-50),(r.x1-r.x0+100)*s,(r.z1-r.z0+100)*s));
  {const r=Math.max(1.5,70*s);g.beginPath();HOUSES.forEach(h=>{const x=X(h.x),y=X(h.z);g.moveTo(x+r,y);g.arc(x,y,r,0,6.2832);});g.fill();}
  g.fillStyle='rgb(0,0,255)';
  g.beginPath();PONDS.forEach(p=>{const x=X(p.x),y=X(p.z),a=(p.rx+14)*s;g.moveTo(x+a,y);g.ellipse(x,y,a,(p.rz+14)*s,p.rot,0,6.2832);});g.fill();
}
zoneCv=softened(zoneCv,2);
const zoneTex=new THREE.CanvasTexture(zoneCv);zoneTex.colorSpace=THREE.NoColorSpace;zoneTex.flipY=false;zoneTex.minFilter=THREE.LinearMipmapLinearFilter;

/* near map: R = grass density, G = grass height (0 lawn .. 1 paddy), B = bare laterite soil */
const NN=2048,NS=13200,NOX=-5600,NOZ=-6800;
let nearCv=document.createElement('canvas');nearCv.width=nearCv.height=NN;
{
  let g=nearCv.getContext('2d');const s=NN/NS,X=x=>(x-NOX)*s,Z=z=>(z-NOZ)*s;
  const rect=(r,c,pad=0)=>{g.fillStyle=c;g.fillRect(X(r.x0-pad),Z(r.z0-pad),(r.x1-r.x0+2*pad)*s,(r.z1-r.z0+2*pad)*s);};
  g.fillStyle='rgb(245,255,0)';g.fillRect(0,0,NN,NN);
  CLUSTERS.forEach(c=>rect(c,'rgb(170,110,28)',40));
  OROADS.forEach(r=>{g.fillStyle='rgb(120,110,120)';const h=r.w/2+16;g.fillRect(X(Math.min(r.ax,r.bx)-h),Z(Math.min(r.az,r.bz)-h),(Math.abs(r.bx-r.ax)+2*h)*s,(Math.abs(r.bz-r.az)+2*h)*s);});
  rect({x0:SITE.x0-60,x1:SITE.x1+50,z0:SITE.z0-70,z1:SITE.z1+20},'rgb(215,95,0)');
  /* soften only the background layer, then draw the sharp site details on top */
  const soft=softened(nearCv,2);
  if(soft!==nearCv){nearCv=soft;g=nearCv.getContext('2d');}
  rect(SITE,'rgb(190,40,10)');
  plots.forEach(p=>rect({x0:p.x+.5,x1:p.x+p.w-.5,z0:p.z+.5,z1:p.z+p.d-.5},'rgb(90,120,235)'));
  rect(PARK,'rgb(255,20,0)');
  g.strokeStyle='rgb(0,0,255)';g.lineWidth=7*s;
  g.beginPath();g.roundRect(X(PARK.x0+16),Z(PARK.z0+16),(PARK.x1-PARK.x0-32)*s,(PARK.z1-PARK.z0-32)*s,34*s);g.stroke();
  [SHOPS,HALL,PARKING,XFMR,GATELINK].forEach(r=>rect(r,'rgb(0,0,0)',1));
  IROADS.forEach(r=>rect(r,'rgb(0,0,0)',2));
  LANES.forEach(r=>rect(r,'rgb(0,0,0)',2));
  OROADS.forEach(r=>{g.fillStyle='rgb(0,0,0)';const h=r.w/2+3;g.fillRect(X(Math.min(r.ax,r.bx)-h),Z(Math.min(r.az,r.bz)-h),(Math.abs(r.bx-r.ax)+2*h)*s,(Math.abs(r.bz-r.az)+2*h)*s);});
  [MARKET,BUS,SCHOOL,HOSPITAL].forEach(r=>rect(r,'rgb(0,0,40)'));
  g.beginPath();g.arc(X(KOYAL.x),Z(KOYAL.z),12*s,0,6.3);g.fill();
  g.fillStyle='rgb(0,0,0)';
  g.beginPath();
  HOUSES.forEach(h=>{if(h.x<NOX||h.x>NOX+NS||h.z<NOZ||h.z>NOZ+NS)return;
    const c=Math.cos(h.ry),sn=Math.sin(h.ry),hw=h.w/2+2,hd=h.d/2+2;
    [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].forEach(([u,v],k)=>{const x=X(h.x+u*c+v*sn),y=Z(h.z-u*sn+v*c);k?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();});
  g.fill();
  PONDS.forEach(p=>{g.beginPath();g.ellipse(X(p.x),Z(p.z),(p.rx+3)*s,(p.rz+3)*s,p.rot,0,6.3);g.fill();});
}
const nearTex=new THREE.CanvasTexture(nearCv);nearTex.colorSpace=THREE.NoColorSpace;nearTex.flipY=false;nearTex.minFilter=THREE.LinearMipmapLinearFilter;

const GROUND_U={
  uZone:{value:zoneTex},uNear:{value:nearTex},uZO:{value:ZO},uZS:{value:ZS},
  uNO:{value:new THREE.Vector2(NOX,NOZ)},uNS:{value:NS},
  uGrass:{value:TX.leafy_grass.d},uMud:{value:TX.brown_mud_02.d},uLat:{value:TX.red_laterite_soil_stones.d},uMacro:{value:weatherTex}
};
const GROUND_FRAG=`
float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 paddy(vec2 p,vec3 grass,vec3 mud,float macro){
  float a=.18*sin(floor(p.x/2600.)*1.7+floor(p.y/2300.)*2.3);
  vec2 rp=vec2(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y);
  vec2 q=rp/vec2(190.,128.);
  q.x+=floor(q.y)*.37;
  vec2 id=floor(q),f=fract(q);
  float h=gh(id),h2=gh(id+17.3);
  float e=min(min(f.x,1.-f.x)*190.,min(f.y,1.-f.y)*128.);
  float bund=1.-smoothstep(1.2,2.6,e);
  vec3 g1=vec3(.17,.33,.07),g2=vec3(.27,.43,.1),g3=vec3(.52,.5,.2),g4=vec3(.42,.36,.22),wat=vec3(.16,.21,.18);
  vec3 c=h<.5?mix(g1,g2,h2):h<.78?mix(g2,g3,h2*.6):h<.9?g3:g4;
  float rows=.5+.5*sin(rp.y*2.6+h*31.);
  c*=.9+.13*rows;
  float lum=dot(grass,vec3(.3,.55,.15));
  c*=.72+lum*1.1;
  if(h2>.93){c=mix(wat,c,.35+.3*macro);}
  c*=.9+.2*macro;
  return mix(c,mud*vec3(.95,.92,.85)+grass*.15,bund*.85);
}`;
const groundMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,normalMap:TX.leafy_grass.n,normalScale:new THREE.Vector2(.8,.8)});
groundMat.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,GROUND_U);
  sh.vertexShader='varying vec3 vWP;\n'+sh.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
    vWP=(modelMatrix*vec4(transformed,1.)).xyz;
    #ifdef USE_NORMALMAP
    vNormalMapUv=vWP.xz/12.;
    #endif`);
  sh.fragmentShader=`varying vec3 vWP;uniform sampler2D uZone,uNear,uGrass,uMud,uLat,uMacro;uniform float uZO,uZS,uNS;uniform vec2 uNO;\n`+GROUND_FRAG+'\n'+
    sh.fragmentShader.replace('#include <map_fragment>',`
    vec2 wp=vWP.xz;
    vec3 zn=texture2D(uZone,(wp-uZO)/uZS).rgb;
    float macro=texture2D(uMacro,wp/3100.).r*.6+texture2D(uMacro,wp/700.+.37).b*.4;
    vec3 grass=mix(texture2D(uGrass,wp/13.).rgb,texture2D(uGrass,wp/41.+.3).rgb,.45);
    float glum=dot(grass,vec3(.3,.59,.11));grass=mix(grass,vec3(.17,.29,.08)*(.5+glum*1.7),.62);
    vec3 mud=texture2D(uMud,wp/16.).rgb;
    vec3 lat=texture2D(uLat,wp/10.).rgb;
    vec3 field=paddy(wp,grass,mud,macro);
    vec3 town=mix(grass*vec3(1.02,.98,.82),mud*1.05,.35+.35*macro);
    vec3 wet=mix(mud*.8,grass*.7,.3);
    float ws=zn.r+zn.g+zn.b+1e-3;
    vec3 c=(field*zn.r+town*zn.g+wet*zn.b)/ws;
    vec2 nuv=(wp-uNO)/uNS;
    if(nuv.x>0.&&nuv.y>0.&&nuv.x<1.&&nuv.y<1.){
      vec3 nr=texture2D(uNear,nuv).rgb;
      float edge=smoothstep(0.,.04,min(min(nuv.x,1.-nuv.x),min(nuv.y,1.-nuv.y)));
      float isField=smoothstep(.85,.97,nr.g)*smoothstep(.85,.97,nr.r);
      vec3 lawn=grass*mix(vec3(.92,.9,.72),vec3(1.05,1.08,.95),nr.r);
      vec3 nc=mix(lawn,mix(mud,grass,.25),1.-nr.r);
      nc=mix(nc,lat*vec3(1.,.95,.9),nr.b*.85);
      c=mix(c,mix(nc,field,isField),edge);
    }
    diffuseColor.rgb*=c;
  `);
};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(56000,56000),groundMat);
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

/* ---------------- roads ---------------- */
const roadMat=M.asphalt;
const newAsphalt=worldUV(new THREE.MeshStandardMaterial({map:TX.asphalt_02.d,normalMap:TX.asphalt_02.n,color:new THREE.Color('#7c7c7c'),roughness:.82,normalScale:new THREE.Vector2(.5,.5)}),1/15,'na');
const laneMat=M.concrete;
const shoulderMat=M.mud;
/* flat layers sit a fraction of a foot apart; polygon offset keeps them from flickering at a distance */
function flat(w,d,cx,cz,y,mat,ry=0,rec=true){
  if(!mat.polygonOffset){const k=Math.max(1,Math.round(y*10));mat.polygonOffset=true;mat.polygonOffsetFactor=-k;mat.polygonOffsetUnits=-k*2;}
  const m=new THREE.Mesh(UNITPLANE,mat);m.rotation.set(-Math.PI/2,0,ry);m.scale.set(w,d,1);m.position.set(cx,y,cz);m.receiveShadow=rec;scene.add(m);return m;
}
OROADS.forEach(r=>{
  const L=Math.hypot(r.bx-r.ax,r.bz-r.az),cx=(r.ax+r.bx)/2,cz=(r.az+r.bz)/2,ew=Math.abs(r.bx-r.ax)>Math.abs(r.bz-r.az);
  if(ew){flat(L,r.w,cx,cz,.14,roadMat);flat(L,r.w+12,cx,cz,.07,shoulderMat);}
  else{flat(r.w,L,cx,cz,.14,roadMat);flat(r.w+12,L,cx,cz,.07,shoulderMat);}
});
LANES.forEach(l=>flat(l.x1-l.x0,l.z1-l.z0,(l.x0+l.x1)/2,(l.z0+l.z1)/2,.12,laneMat));
flat(GATELINK.x1-GATELINK.x0,GATELINK.z1-GATELINK.z0+2,CX,(GATELINK.z0+GATELINK.z1)/2,.16,newAsphalt);
IROADS.forEach(r=>flat(r.x1-r.x0,r.z1-r.z0,(r.x0+r.x1)/2,(r.z0+r.z1)/2,r===BOULEVARD?.17:.16,newAsphalt));

/* lane markings */
const dashes=[];
function dashLine(ax,az,bx,bz,skip,gap=15,len=7.5,wid=.5){
  const L=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/L,uz=(bz-az)/L,ang=Math.atan2(ux,uz);
  for(let s=6;s<L-6;s+=gap){const x=ax+ux*s,z=az+uz*s;if(skip&&skip(x,z))continue;dashes.push([x,z,ang,len,wid]);}
}
const nearJunction=(x,z)=>{
  for(const r of OROADS){const ew=Math.abs(r.bx-r.ax)>Math.abs(r.bz-r.az);if(ew&&Math.abs(z-r.az)<r.w/2+10&&x>Math.min(r.ax,r.bx)&&x<Math.max(r.ax,r.bx))return true;if(!ew&&Math.abs(x-r.ax)<r.w/2+10&&z>Math.min(r.az,r.bz)&&z<Math.max(r.az,r.bz))return true;}
  return false;
};
OROADS.forEach(r=>{
  const ew=Math.abs(r.bx-r.ax)>Math.abs(r.bz-r.az);
  dashLine(r.ax,r.az,r.bx,r.bz,(x,z)=>{for(const o of OROADS){if(o===r)continue;const oe=Math.abs(o.bx-o.ax)>Math.abs(o.bz-o.az);if(oe&&!ew&&Math.abs(z-o.az)<o.w/2+12)return true;if(!oe&&ew&&Math.abs(x-o.ax)<o.w/2+12)return true;}return false;});
  if(r.big){const o=r.w/2-1.2;dashLine(r.ax,r.az-o,r.bx,r.bz-o,(x)=>Math.abs(x-WEST_X)<20||Math.abs(x-EAST_X)<20||Math.abs(x-CX)<22,4,4.2,.4);dashLine(r.ax,r.az+o,r.bx,r.bz+o,(x)=>Math.abs(x-EAST_X)<20,4,4.2,.4);}
});
IROADS.forEach(r=>{if(r===BOULEVARD)return;const zc=(r.z0+r.z1)/2,ew=(r.x1-r.x0)>(r.z1-r.z0);
  if(ew)dashLine(r.x0,zc,r.x1,zc,(x)=>(x>XB0-6&&x<XB1+6)||x<LANE+6||x>XE1-6,12,5,.4);
  else dashLine((r.x0+r.x1)/2,r.z0,(r.x0+r.x1)/2,r.z1,(x,z)=>IROADS.some(o=>o!==r&&(o.x1-o.x0)>(o.z1-o.z0)&&z>o.z0-5&&z<o.z1+5),12,5,.4);});
{
  const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const im=new THREE.InstancedMesh(g,M.mark,dashes.length),o=new THREE.Object3D();
  dashes.forEach((d,i)=>{o.position.set(d[0],.2,d[1]);o.rotation.set(0,d[2],0);o.scale.set(d[4],1,d[3]);o.updateMatrix();im.setMatrixAt(i,o.matrix);});
  im.receiveShadow=true;scene.add(im);
}
/* zebra crossing in front of the gate */
for(let i=0;i<9;i++)flat(2.2,MAIN_W-6,CX-12+i*3,MAIN_Z,.21,M.mark);

/* ---------------- kerbs, drains, median ---------------- */
/* each internal road keeps 2 ft on both sides for a covered concrete drain and kerb */
const drainFloor=new THREE.MeshStandardMaterial({color:'#2f3326',roughness:.35,metalness:.1});
IROADS.forEach(r=>{
  const ew=(r.x1-r.x0)>(r.z1-r.z0);
  const sides=ew?[[r.z0,1],[r.z1,-1]]:[[r.x0,1],[r.x1,-1]];
  sides.forEach(([e,sg])=>{
    const a=ew?r.x0:r.z0,b=ew?r.x1:r.z1;
    const segs=[];let s=a;
    const cuts=IROADS.filter(o=>o!==r&&(ew?((o.x1-o.x0)<(o.z1-o.z0)&&e>o.z0-.5&&e<o.z1+.5):((o.x1-o.x0)>(o.z1-o.z0)&&e>o.x0-.5&&e<o.x1+.5))).map(o=>ew?[o.x0,o.x1]:[o.z0,o.z1]).sort((p,q)=>p[0]-q[0]);
    cuts.forEach(([c0,c1])=>{if(c0>s)segs.push([s,c0]);s=Math.max(s,c1);});if(s<b)segs.push([s,b]);
    segs.forEach(([u0,u1])=>{
      if(u1-u0<3)return;
      const w0=e,w1=e+sg*.45,w2=e+sg*1.75,w3=e+sg*2.2;
      if(ew){bx(M.concrete,u0,u1,0,.75,Math.min(w0,w1),Math.max(w0,w1));bx(drainFloor,u0,u1,0,.2,Math.min(w1,w2),Math.max(w1,w2));bx(M.concrete,u0,u1,0,.75,Math.min(w2,w3),Math.max(w2,w3));}
      else{bx(M.concrete,Math.min(w0,w1),Math.max(w0,w1),0,.75,u0,u1);bx(drainFloor,Math.min(w1,w2),Math.max(w1,w2),0,.2,u0,u1);bx(M.concrete,Math.min(w2,w3),Math.max(w2,w3),0,.75,u0,u1);}
    });
  });
});
/* culvert slabs at each plot front so the drain can be crossed */
plots.forEach(p=>{
  const cx=p.x+p.w/2,z=p.f==='n'?p.z:p.z+p.d,sg=p.f==='n'?-1:1;
  bx(M.concrete,cx-4,cx+4,.7,.82,Math.min(z,z+sg*2.2),Math.max(z,z+sg*2.2));
});
/* boulevard median with hedges */
const hedgeMat=new THREE.MeshStandardMaterial({color:'#3f6a2a',roughness:.9});
IROADS.filter(r=>r!==BOULEVARD&&(r.x1-r.x0)>(r.z1-r.z0)).map(r=>[r.z0,r.z1]).concat([[SZ1-30,SZ1+5]]).sort((a,b)=>a[0]-b[0]).reduce((s,[c0,c1])=>{
  if(c0-s>12){bx(M.concrete,CX-2.2,CX+2.2,0,.9,s+4,c0-4);bx(hedgeMat,CX-1.7,CX+1.7,.9,2.2,s+5,c0-5);}
  return c1;
},0);

/* ---------------- street lights and electric lines ---------------- */
const LAMPS=[];
IROADS.forEach(r=>{
  const ew=(r.x1-r.x0)>(r.z1-r.z0);
  if(r===BOULEVARD){for(let z=40;z<SZ1-20;z+=62)LAMPS.push([CX,z,0,0,1]);return;}
  if(ew)for(let x=r.x0+30;x<r.x1-10;x+=62){if(x>XB0-8&&x<XB1+8)continue;LAMPS.push([x,r.z1-2.7,0,-1]);}
  else for(let z=r.z0+30;z<r.z1-10;z+=62)LAMPS.push([r.x0===0?r.x0+2.7:r.x1-2.7,z,r.x0===0?1:-1,0]);
});
for(let x=-1400;x<2600;x+=120){if(Math.abs(x-CX)<30)continue;LAMPS.push([x,MAIN_Z-MAIN_W/2-4,0,1]);}
const LAMP_HEADS=[];
const lampMat=new THREE.MeshStandardMaterial({color:'#f6f0dc',emissive:new THREE.Color('#ffd69a'),emissiveIntensity:0});
const poleMat=new THREE.MeshStandardMaterial({color:'#9aa0a3',roughness:.45,metalness:.6});
const glowTex=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,226,170,1)');gr.addColorStop(.35,'rgba(255,196,120,.45)');gr.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
{
  const n=LAMPS.length,o=new THREE.Object3D();
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.32,1,8),poleMat,n);
  const ag=new THREE.BoxGeometry(.2,.2,1);ag.translate(0,0,.5);
  const arms=new THREE.InstancedMesh(ag,poleMat,n*2);
  const heads=new THREE.InstancedMesh(new THREE.BoxGeometry(1.6,.35,.75),lampMat,n*2);
  const pg=new THREE.PlaneGeometry(1,1);pg.rotateX(-Math.PI/2);
  const spMat=new THREE.SpriteMaterial({map:glowTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  let k=0;
  LAMPS.forEach(([x,z,ax,az,dbl],i)=>{
    o.position.set(x,9,z);o.rotation.set(0,0,0);o.scale.set(1,18,1);o.updateMatrix();poles.setMatrixAt(i,o.matrix);
    const dirs=dbl?[[1,0],[-1,0]]:[[ax,az]];
    dirs.forEach(([dx,dz])=>{
      const ry=Math.atan2(dx,dz);
      o.position.set(x,17.4,z);o.rotation.set(0,ry,0);o.scale.set(1,1,4.2);o.updateMatrix();arms.setMatrixAt(k,o.matrix);
      const hx=x+dx*4.4,hz=z+dz*4.4;
      o.position.set(hx,17.3,hz);o.scale.set(1,1,1);o.updateMatrix();heads.setMatrixAt(k,o.matrix);
      LAMP_HEADS.push([hx,hz]);
      const s=new THREE.Sprite(spMat);s.position.set(hx,16.9,hz);s.scale.set(3.4,3.4,1);scene.add(s);
      k++;
    });
  });
  arms.count=heads.count=k;
  poles.castShadow=arms.castShadow=true;scene.add(poles,arms,heads);
  TIME_HOOKS.push(on=>{lampMat.emissiveIntensity=on*2.2;spMat.opacity=on*.45;G.uLampOn.value=on;});
}
/* street-lamp light: every lamp's pool of light painted once into an overhead map that all ground-level
   surfaces read, so the pools are round, never pop in with distance, and light the road, verge, median and kerbs alike */
const LMAP={x0:-1500,z0:-120,w:4200,h:1080};
const lampCv=document.createElement('canvas');lampCv.width=2048;lampCv.height=Math.round(2048*LMAP.h/LMAP.w);
{
  const g=lampCv.getContext('2d'),sx=lampCv.width/LMAP.w,R0=30*sx;
  g.fillStyle='#000';g.fillRect(0,0,lampCv.width,lampCv.height);g.globalCompositeOperation='lighter';
  const spot=document.createElement('canvas');spot.width=spot.height=Math.ceil(R0*2);
  {const q=spot.getContext('2d'),gr=q.createRadialGradient(R0,R0,0,R0,R0,R0);
   gr.addColorStop(0,'rgba(255,205,140,1)');gr.addColorStop(.3,'rgba(255,190,120,.7)');gr.addColorStop(.65,'rgba(250,170,100,.25)');gr.addColorStop(1,'rgba(240,160,90,0)');
   q.fillStyle=gr;q.fillRect(0,0,spot.width,spot.height);}
  LAMP_HEADS.forEach(([x,z])=>g.drawImage(spot,(x-LMAP.x0)*sx-R0,(z-LMAP.z0)*sx-R0));
}
const lampTex=new THREE.CanvasTexture(lampCv);lampTex.colorSpace=THREE.NoColorSpace;lampTex.flipY=false;
G.uLampTex.value=lampTex;G.uLampBox.value.set(LMAP.x0,LMAP.z0,LMAP.w,LMAP.h);

/* concrete electric poles with sagging wires along the outer roads */
const EPOLES=[];
function poleLine(ax,az,bx,bz,step){const L=Math.hypot(bx-ax,bz-az),n=Math.floor(L/step),pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push([ax+(bx-ax)*t,az+(bz-az)*t]);}EPOLES.push(pts);}
poleLine(-3400,MAIN_Z+MAIN_W/2+6,4200,MAIN_Z+MAIN_W/2+6,130);
poleLine(WEST_X-18,-5200,WEST_X-18,MAIN_Z-40,130);
poleLine(EAST_X+18,-6800,EAST_X+18,5600,130);
poleLine(LANE+2,-6,SX1-2,-6,100);
{
  const all=EPOLES.flat(),o=new THREE.Object3D();
  const pm=new THREE.MeshStandardMaterial({color:'#b7b3a8',roughness:.85});
  const poles=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,1,.42),pm,all.length);
  const xa=new THREE.InstancedMesh(new THREE.BoxGeometry(5.5,.28,.28),M.metal,all.length);
  const ins=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.16,.5,6),new THREE.MeshStandardMaterial({color:'#e9e6dc',roughness:.4}),all.length*3);
  let k=0;const wires=[];
  EPOLES.forEach(line=>{
    for(let i=0;i<line.length;i++){
      const[x,z]=line[i],nx=line[Math.min(i+1,line.length-1)],px=line[Math.max(i-1,0)];
      const ry=Math.atan2(nx[0]-px[0],nx[1]-px[1]);
      o.position.set(x,15,z);o.rotation.set(0,ry,0);o.scale.set(1,30,1);o.updateMatrix();poles.setMatrixAt(k,o.matrix);
      o.position.set(x,28.6,z);o.scale.set(1,1,1);o.updateMatrix();xa.setMatrixAt(k,o.matrix);
      for(let j=-1;j<=1;j++){o.position.set(x+Math.cos(ry)*j*2.3,29.05,z-Math.sin(ry)*j*2.3);o.rotation.set(0,0,0);o.updateMatrix();ins.setMatrixAt(k*3+j+1,o.matrix);}
      if(i<line.length-1){
        for(let j=-1;j<=1;j++){
          const ox=Math.cos(ry)*j*2.3,oz=-Math.sin(ry)*j*2.3,ax=x+ox,az=z+oz,bxx=nx[0]+ox,bzz=nx[1]+oz;
          for(let s=0;s<10;s++){const t0=s/10,t1=(s+1)/10,sag=t=>29.2-3.2*4*t*(1-t);
            wires.push(ax+(bxx-ax)*t0,sag(t0),az+(bzz-az)*t0,ax+(bxx-ax)*t1,sag(t1),az+(bzz-az)*t1);}
        }
      }
      k++;
    }
  });
  poles.castShadow=xa.castShadow=true;scene.add(poles,xa,ins);
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));
  scene.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:'#24262a',transparent:true,opacity:.75})));
}
