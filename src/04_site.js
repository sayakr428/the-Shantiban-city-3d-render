/* =====================================================================
   SITE: plots, numbers, boundary, gate and the community facilities
   ===================================================================== */
prog(.44,'Marking the plots…');await tick();

/* plot surfaces: filled laterite with lime boundary lines, one instanced mesh */
const plotMat=new THREE.MeshStandardMaterial({map:TX.red_laterite_soil_stones.d,normalMap:TX.red_laterite_soil_stones.n,roughness:1,color:new THREE.Color('#c4ab98')});
worldUV(plotMat,1/9,'plot');
{
  const prev=plotMat.onBeforeCompile;
  plotMat.onBeforeCompile=(sh,r)=>{
    prev(sh,r);
    sh.uniforms.uMacro={value:weatherTex};sh.uniforms.uGrassP={value:TX.leafy_grass.d};
    sh.vertexShader='varying vec2 vBoxUv;varying float vUp;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvBoxUv=uv;vUp=normal.y;');
    sh.fragmentShader='uniform sampler2D uMacro,uGrassP;varying vec2 vBoxUv;varying float vUp;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      if(vUp>.5){
        float e=min(min(vBoxUv.x,1.-vBoxUv.x)*${PW.toFixed(1)},min(vBoxUv.y,1.-vBoxUv.y)*${PD.toFixed(1)});
        vec2 wxz=vMapUv*9.;
        float gp=smoothstep(.4,.74,texture2D(uMacro,wxz/150.).b*.55+texture2D(uMacro,wxz/29.+.2).r*.45);
        vec3 gc=texture2D(uGrassP,wxz/11.).rgb;float gl=dot(gc,vec3(.3,.59,.11));gc=vec3(.2,.31,.1)*(.5+gl*1.6);
        diffuseColor.rgb=mix(diffuseColor.rgb,gc,gp*.8);
        float line=1.-smoothstep(.28,.42,e);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.8,.79,.74),line*.9);
      }else{diffuseColor.rgb*=.78;}`);
  };
}
const plotIM=new THREE.InstancedMesh(new THREE.BoxGeometry(PW-.3,PLOT_H,PD-.3),plotMat,plots.length);
{const o=new THREE.Object3D(),c=new THREE.Color(1,1,1);
 plots.forEach((p,i)=>{o.position.set(p.x+p.w/2,PLOT_H/2,p.z+p.d/2);o.updateMatrix();plotIM.setMatrixAt(i,o.matrix);plotIM.setColorAt(i,c);p.idx=i;});}
plotIM.receiveShadow=true;plotIM.instanceColor.needsUpdate=true;scene.add(plotIM);

/* painted numbers on the soil, all from one atlas, read north-up from the air */
function atlas(cellW,cellH,cols,draw){
  const rows=Math.ceil(plots.length/cols),W=cellW*cols,H=cellH*rows;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  plots.forEach((p,i)=>{const cx=(i%cols)*cellW,cy=Math.floor(i/cols)*cellH;g.save();g.translate(cx,cy);draw(g,p,cellW,cellH);g.restore();});
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANI;
  return{t,uv:i=>{const cx=(i%cols)*cellW,cy=Math.floor(i/cols)*cellH;return[cx/W,1-(cy+cellH)/H,(cx+cellW)/W,1-cy/H];}};
}
const numAtlas=atlas(192,213,16,(g,p,w,h)=>{
  g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(236,230,214,.6)';
  g.font='800 78px "Anek Bangla", sans-serif';g.fillText(String(p.no),w/2,h*.44);
  g.font='600 22px "Anek Bangla", sans-serif';g.fillText(`${p.b} · ${+p.katha.toFixed(2)} katha`,w/2,h*.71);
  g.font='500 18px "Anek Bangla", sans-serif';g.fillText(`${p.w}′ × ${p.d}′`,w/2,h*.83);
});
const boardAtlas=atlas(256,146,16,(g,p,w,h)=>{
  g.fillStyle='#fbfaf3';g.fillRect(0,0,w,h);g.strokeStyle='#1f4d2c';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);
  g.strokeStyle='#a5432a';g.lineWidth=2;g.strokeRect(14,14,w-28,h-28);
  g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#6d7d70';g.font='600 17px "Anek Bangla", sans-serif';g.fillText('PLOT',w/2,31);
  g.fillStyle='#a5432a';g.font='800 64px "Anek Bangla", sans-serif';g.fillText(String(p.no),w/2,h/2+4);
  g.fillStyle='#1f4d2c';g.font='600 19px "Anek Bangla", sans-serif';g.fillText(`${p.b} · ${+p.katha.toFixed(2)} katha`,w/2,h-28);
});
function quadGeo(list){
  const pos=[],uv=[],nor=[],idx=[];
  list.forEach(({c,ux,uz,vx,vy,vz,n,uvr},q)=>{
    const b=pos.length/3;
    const P=(s,t)=>[c.x+ux.x*s+vx*t,c.y+ux.y*s+vy*t,c.z+ux.z*s+vz*t];
    [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].forEach(([s,t])=>{pos.push(...P(s,t));nor.push(n.x,n.y,n.z);});
    uv.push(uvr[0],uvr[1],uvr[2],uvr[1],uvr[2],uvr[3],uvr[0],uvr[3]);
    idx.push(b,b+1,b+2,b,b+2,b+3);
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}
{
  const L=plots.map((p,i)=>({c:new V3(p.x+p.w/2,PLOT_H+.04,p.z+p.d/2),ux:new V3(p.w*.92,0,0),vx:0,vy:0,vz:-p.d*.92,n:new V3(0,1,0),uvr:numAtlas.uv(i)}));
  const m=new THREE.Mesh(quadGeo(L),new THREE.MeshStandardMaterial({map:numAtlas.t,transparent:true,depthWrite:false,roughness:.9,polygonOffset:true,polygonOffsetFactor:-2}));
  m.renderOrder=1;m.receiveShadow=true;scene.add(m);
}
/* plot boards on two posts at each plot's road edge */
{
  const L=[],posts=[];
  plots.forEach((p,i)=>{
    const cx=p.x+p.w/2,fz=p.f==='n'?p.z+2.6:p.z+p.d-2.6,nz=p.f==='n'?-1:1;
    p.board=new V3(cx,PLOT_H+3.9,fz);
    const front=new V3(cx,PLOT_H+3.9,fz+nz*.07),back=new V3(cx,PLOT_H+3.9,fz-nz*.07);
    L.push({c:front,ux:new V3(nz*3.6,0,0),vx:0,vy:2.05,vz:0,n:new V3(0,0,nz),uvr:boardAtlas.uv(i)});
    L.push({c:back,ux:new V3(-nz*3.6,0,0),vx:0,vy:2.05,vz:0,n:new V3(0,0,-nz),uvr:boardAtlas.uv(i)});
    posts.push([cx-1.55,fz],[cx+1.55,fz]);
  });
  const bm=new THREE.MeshStandardMaterial({map:boardAtlas.t,roughness:.6,emissive:'#ffffff',emissiveMap:boardAtlas.t,emissiveIntensity:0});
  SIGNS.push(bm);
  const m=new THREE.Mesh(quadGeo(L),bm);m.castShadow=true;scene.add(m);
  posts.forEach(([x,z])=>bx(M.white,x-.11,x+.11,PLOT_H,PLOT_H+5,z-.11,z+.11));
}
/* white corner pillars with laterite caps, shared where plots meet */
{
  const corners=new Map();
  plots.forEach(p=>[[p.x,p.z],[p.x+p.w,p.z],[p.x,p.z+p.d],[p.x+p.w,p.z+p.d]].forEach(([x,z])=>corners.set(x+','+z,[x,z])));
  corners.forEach(([x,z])=>{bx(M.white,x-.4,x+.4,0,PLOT_H+2.1,z-.4,z+.4);bx(M.laterRed,x-.46,x+.46,PLOT_H+2.1,PLOT_H+2.45,z-.46,z+.46);});
}

/* ---------------- boundary wall along the real outline ---------------- */
prog(.48,'Building the boundary wall and gates…');await tick();
const BLOCKERS=[];
/* local-frame helper: boxes given relative to an anchor (cx,cz) and turned by ry about it */
const lbx=(mat,cx,cz,ry,x0,x1,y0,y1,z0,z1)=>bx(mat,cx+x0,cx+x1,y0,y1,cz+z0,cz+z1,ry,cx,cz);
const GATE_GAP=WMAIN/2+9;                         /* opening either side of a gate's centre line */
{
  for(let i=0;i<SITE_POLY.length;i++){
    const[ax,az]=SITE_POLY[i],[bx2,bz2]=SITE_POLY[(i+1)%SITE_POLY.length],L=Math.hypot(bx2-ax,bz2-az);
    if(L<1)continue;
    const ux=(bx2-ax)/L,uz=(bz2-az)/L,ry=Math.atan2(-uz,ux);
    /* cut the wall where it crosses a gate opening */
    const cuts=[];
    for(const g of[...GATES,...EXITS]){
      const t=(g.x-ax)*ux+(g.z-az)*uz,d=Math.abs((g.x-ax)*uz-(g.z-az)*ux);
      const G=g.ry!==undefined?WMAIN/2+4.4:GATE_GAP+4;   /* exit gates: the wall runs right up to their pillars */
      if(d<G)cuts.push([t-Math.sqrt(Math.max(0,G**2-d*d)),t+Math.sqrt(Math.max(0,G**2-d*d))]);
    }
    let pieces=[[0,L]];
    for(const[c0,c1]of cuts)pieces=pieces.flatMap(([a,b])=>c1<=a||c0>=b?[[a,b]]:[[a,Math.max(a,c0)],[Math.min(b,c1),b]].filter(([p,q])=>q-p>1));
    for(const[a,b]of pieces){
      const m=(a+b)/2,cx=ax+ux*m,cz=az+uz*m,h=(b-a)/2;
      lbx(M.concrete,cx,cz,ry,-h,h,0,.9,-.55,.55);
      lbx(M.cream,cx,cz,ry,-h,h,.9,6.4,-.38,.38);
      lbx(M.white,cx,cz,ry,-h,h,6.4,6.75,-.48,.48);
      /* brick piers every 12 ft, and at both ends: trim where the masses meet */
      const n=Math.max(1,Math.round((b-a)/12));
      for(let k=0;k<=n;k++){const s=-h+(b-a)*k/n;lbx(M.brick,cx,cz,ry,s-.8,s+.8,0,7.4,-.75,.75);lbx(M.laterRed,cx,cz,ry,s-.95,s+.95,7.4,7.75,-.85,.85);}
      for(let s=a;s<b;s+=6){const x=ax+ux*s,z=az+uz*s;BLOCKERS.push([x-1.6,x+1.6,z-1.6,z+1.6]);}
    }
  }
}

/* ---------------- the two gates, each with a security cabin and a boom barrier ---------------- */
const gateTex=(sub,ch=420)=>canvasTex(2048,ch,(g,w,h)=>{
  g.fillStyle='#1f4d2c';g.fillRect(0,0,w,h);
  g.strokeStyle='#f0a91b';g.lineWidth=14;g.strokeRect(14,14,w-28,h-28);
  g.strokeStyle='rgba(240,169,27,.45)';g.lineWidth=3;g.strokeRect(36,36,w-72,h-72);
  const b=h-120,bx0=64,by0=60;
  g.fillStyle='#ffffff';g.beginPath();g.roundRect(bx0,by0,b,b,28);g.fill();
  g.strokeStyle='#f0a91b';g.lineWidth=6;g.stroke();
  const ar=LOGO_IMG.width/LOGO_IMG.height,lw=ar>=1?b-28:(b-28)*ar,lh=ar>=1?(b-28)/ar:b-28;
  g.drawImage(LOGO_IMG,bx0+(b-lw)/2,by0+(b-lh)/2,lw,lh);
  drawLines(g,[{t:'শান্তিবন সিটি',s:118,wt:600,c:'#f0a91b'},{t:'SHANTIBAN CITY',s:150},{t:sub,s:50,wt:600,c:'#cfe0c9'}],bx0+b+30,40,w-60,h-40,10);
});
const grill=new THREE.MeshStandardMaterial({color:'#2d3134',roughness:.4,metalness:.8});
const boomR=new THREE.MeshStandardMaterial({color:'#d33b2c',roughness:.5}),boomW=new THREE.MeshStandardMaterial({color:'#f4f1ea',roughness:.5});
/* local frame of a gate: x across the opening, +z pointing out of the site */
function buildGate(g,ry,outerSub,innerSub,big){
  const cx=g.x,cz=g.z,W=WMAIN/2+4,L=(...a)=>lbx(...a.slice(0,1),cx,cz,ry,...a.slice(1));
  const toW=(x,z)=>[cx+x*Math.cos(ry)+z*Math.sin(ry),cz-x*Math.sin(ry)+z*Math.cos(ry)];
  const ph=big?21:17;
  for(const x of[-W,W]){
    L(M.brick,x-2.6,x+2.6,0,ph,-2.6,2.6);L(M.cream,x-2.9,x+2.9,0,3,-2.9,2.9);
    L(M.laterRed,x-3.1,x+3.1,ph,ph+1,-3.1,3.1);L(M.white,x-2.2,x+2.2,ph+1,ph+2.2,-2.2,2.2);
    L(M.white,x-.3,x+.3,ph-3,ph-2.4,2.6,3.6);L(M.dark,x-.2,x+.2,ph-2.9,ph-2.5,3.6,3.9);   /* CCTV */
    const[wx,wz]=toW(x,0);BLOCKERS.push([wx-3.6,wx+3.6,wz-3.6,wz+3.6]);
  }
  L(M.laterRed,-W-2,W+2,ph-5.8,ph-3.6,-1.6,1.6);
  L(M.cream,-W-1,W+1,ph-3.6,ph+3.6,-.9,.9);
  for(const[side,sub]of[[1,outerSub],[-1,innerSub]]){
    /* the board spans only the clear opening between the pillars, so neither end (the logo) hides behind them */
    const sw=2*W-5.6,sh=(2*W+2)*.205,t=gateTex(sub,Math.round(2048*sh/sw)),m=new THREE.MeshStandardMaterial({map:t,roughness:.55,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:0});SIGNS.push(m);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),m);
    const[px,pz]=toW(0,side*1.02);f.position.set(px,ph,pz);f.rotation.y=ry+(side>0?0:Math.PI);f.translateZ(.12);scene.add(f);
  }
  /* sliding gate leaves, pushed open behind the wall */
  for(const sg of[-1,1]){
    const x0=sg<0?-W-16:W,x1=sg<0?-W:W+16;
    L(grill,x0,x1,.3,.6,-1.6,-1.3);L(grill,x0,x1,6.7,7,-1.6,-1.3);
    for(let x=x0;x<=x1;x+=.8)L(grill,x-.06,x+.06,.3,7,-1.5,-1.4);
  }
  /* security cabin just inside, on the right as you enter */
  const c0=W+4,c1=W+16,z0=-16,z1=-5;
  L(M.concrete,c0-.5,c1+.5,0,.8,z0-.5,z1+.5);L(M.plasterW,c0,c1,.8,9.5,z0,z1);
  L(M.laterRed,c0-1.2,c1+1.2,9.5,10.2,z0-1.2,z1+1.2);
  L(M.glass,c0+1.2,c1-1.2,4,7.6,z1-.04,z1+.06);L(M.glass,c0-.06,c0+.04,4,7.6,z0+1.2,z1-1.2);
  {const[a,b]=toW(c0,z0),[c,d]=toW(c1,z1);BLOCKERS.push([Math.min(a,c)-1,Math.max(a,c)+1,Math.min(b,d)-1,Math.max(b,d)+1]);}
  const st=signBoard([{t:'SECURITY',s:110},{t:'নিরাপত্তা',s:60,wt:600,c:'#f0a91b'}],8,2.6,0,11.6,0,0,{back:false,frame:false,w:512,h:170,bg:'#123a24'});
  {const[x,z]=toW((c0+c1)/2,z1+.75);st.position.set(x,11.6,z);st.rotation.y=ry;}
  /* boom barrier across the entry lane */
  L(M.white,W-2,W-.5,0,3.6,-9.5,-8);
  for(let i=0;i<7;i++)L(i%2?boomW:boomR,W-3.2-i*2,W-1.2-i*2,3.1,3.6,-9,-8.5);
  /* paved forecourt in and out of the gate */
  const fc=flat(2*W+26,26,...toW(0,6),.18,M.pavers);fc.rotation.z=ry;
}
buildGate(GATES[0],0,'BARUIPUR–AMTALA ROAD · TAPNA','WELCOME HOME',true);
buildGate(GATES[1],Math.PI/2,'EAST GATE · TAPNA','WELCOME HOME',false);
/* small exit gates: lower pillars, a lintel with the logo and EXIT sign, grille leaves swung open inward */
function buildExit(g){
  const cx=g.x,cz=g.z,ry=g.ry,W=WMAIN/2+1.5,ph=12;
  const L=(...a)=>lbx(a[0],cx,cz,ry,...a.slice(1));
  const toW=(x,z)=>[cx+x*Math.cos(ry)+z*Math.sin(ry),cz-x*Math.sin(ry)+z*Math.cos(ry)];
  for(const x of[-W-1.6,W+1.6]){
    L(M.cream,x-2,x+2,0,1.6,-2,2);L(M.brick,x-1.6,x+1.6,1.6,ph,-1.6,1.6);
    L(M.laterRed,x-1.9,x+1.9,ph,ph+.6,-1.9,1.9);L(M.white,x-1.2,x+1.2,ph+.6,ph+1.3,-1.2,1.2);
    L(lampMat,x-.45,x+.45,ph+1.3,ph+2.3,-.45,.45);                         /* pillar lamp */
    const[wx,wz]=toW(x,0);BLOCKERS.push([wx-2.4,wx+2.4,wz-2.4,wz+2.4]);
  }
  /* lintel beam carrying the sign */
  L(M.laterRed,-W-1.6,W+1.6,ph-1.2,ph,-1,1);
  for(const side of[1,-1]){
    const s=signBoard([{t:'EXIT',s:120},{t:'শান্তিবন সিটি · প্রস্থান',s:54,wt:600,c:'#f0a91b'}],W*1.15,2.6,0,0,0,0,{back:false,frame:false,w:1024,h:230,bg:'#1f4d2c'});
    const[x,z]=toW(0,side*1.05);s.position.set(x,ph+1.3,z);s.rotation.y=ry+(side>0?0:Math.PI);
    L(M.dark,-W*.6,W*.6,ph-.05,ph+2.7,-.35,.35);
  }
  /* two grille leaves, hinged on the pillars and swung open into the site */
  const leaf=(hx,dir,ang)=>{
    const[wx,wz]=toW(hx,-.4),len=W-.4,a=ry+ang,x0=dir>0?wx:wx-len,x1=dir>0?wx+len:wx;
    bx(grill,x0,x1,.4,.7,wz-.06,wz+.06,a,wx,wz);bx(grill,x0,x1,5.6,5.9,wz-.06,wz+.06,a,wx,wz);bx(grill,x0,x1,3,3.2,wz-.05,wz+.05,a,wx,wz);
    for(let k=.3;k<len;k+=.55){const x=dir>0?wx+k:wx-k;bx(grill,x-.05,x+.05,.4,6.4,wz-.04,wz+.04,a,wx,wz);}
  };
  leaf(-W,1,1.05);leaf(W,-1,-1.05);
  /* paved threshold and a short apron outside */
  flat(2*W+8,22,...toW(0,4),.19,M.pavers,ry);
}
EXITS.forEach(buildExit);

/* distances board outside the main gate, as given in the project information (approximate) */
{
  const t=canvasTex(1024,1024,(g,w,h)=>{
    g.fillStyle='#173d27';g.fillRect(0,0,w,h);g.strokeStyle='#f0a91b';g.lineWidth=12;g.strokeRect(14,14,w-28,h-28);
    g.fillStyle='#f0a91b';g.textAlign='left';g.font='700 46px "Anek Bangla", sans-serif';g.fillText('Approximate distances',60,100);
    g.fillStyle='#cfe0c9';g.font='500 30px "Anek Bangla", sans-serif';g.fillText('from Shantiban City',60,145);
    const rows=[['Nearest market','500 m'],['Nearest school','1.5 km'],['Nearest bus terminus','1.5 km'],['Nearest hospital','2 km'],...FAR];
    rows.forEach(([a,b],i)=>{const y=215+i*60;g.fillStyle='#fbfaf3';g.font='600 34px "Anek Bangla", sans-serif';g.fillText(a,60,y);
      g.textAlign='right';g.fillStyle='#f0a91b';g.fillText(b,w-60,y);g.textAlign='left';
      g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.beginPath();g.moveTo(60,y+22);g.lineTo(w-60,y+22);g.stroke();});
  });
  const m=new THREE.MeshStandardMaterial({map:t,roughness:.6,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:0});SIGNS.push(m);
  const bxp=CX+WMAIN/2+34,bz=MAIN_Z-MAIN_W/2-6.6;
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(9,9),m);pl.position.set(bxp,9.2,bz);scene.add(pl);
  bx(M.dark,bxp-4.8,bxp+4.8,4.4,14,bz-.5,bz-.2);
  bx(M.metal,bxp-4.4,bxp-4,0,14,bz-.4,bz-.2);bx(M.metal,bxp+4,bxp+4.4,0,14,bz-.4,bz-.2);
}

/* ---------------- park and cricket ground ---------------- */
prog(.52,'Planting the park…');await tick();
const BENCHES=[],PARK_TREES=[];
/* the cricket field (centre of the park) stays clear of lamps and loose trees */
const FIELD={x0:CRK.center.x-62,x1:CRK.center.x+62,z0:CRK.center.z-72,z1:CRK.center.z+62};
const inField=(x,z)=>x>FIELD.x0&&x<FIELD.x1&&z>FIELD.z0&&z<FIELD.z1;
function hedgeRing(P,gaps){
  /* low hedge round a rectangle, with openings: gaps = [{side:'n'|'s'|'e'|'w', at, w}] */
  const open=(side,u)=>gaps.some(g=>g.side===side&&Math.abs(u-g.at)<g.w/2);
  for(let x=P.x0+2;x<P.x1-2;x+=4){if(!open('n',x+2))bx(hedgeMat,x,x+4,0,2.6,P.z0+1,P.z0+3.5);if(!open('s',x+2))bx(hedgeMat,x,x+4,0,2.6,P.z1-3.5,P.z1-1);}
  for(let z=P.z0+4;z<P.z1-4;z+=4){if(!open('w',z+2))bx(hedgeMat,P.x0+1,P.x0+3.5,0,2.6,z,z+4);if(!open('e',z+2))bx(hedgeMat,P.x1-3.5,P.x1-1,0,2.6,z,z+4);}
}
function benchRow(P,n,inset){
  const w=P.x1-P.x0,d=P.z1-P.z0;
  for(let i=0;i<n;i++){
    const t=i/n,peri=2*(w-2*inset-16)+2*(d-2*inset-16);let s=t*peri,x,z,ry;
    const a=w-2*inset-16,b=d-2*inset-16;
    if(s<a){x=P.x0+inset+8+s;z=P.z0+inset;ry=0;}else if((s-=a)<b){x=P.x1-inset;z=P.z0+inset+8+s;ry=-Math.PI/2;}
    else if((s-=b)<a){x=P.x1-inset-8-s;z=P.z1-inset;ry=Math.PI;}else{s-=a;x=P.x0+inset;z=P.z1-inset-8-s;ry=Math.PI/2;}
    if(inField(x,z))continue;
    BENCHES.push([x,z,ry]);
  }
}
{
  const P=PARK;
  /* entries from the trunk road (east side) and the cross road (north side) */
  hedgeRing(P,[{side:'e',at:(P.z0+P.z1)/2,w:16},{side:'n',at:P.x0+30,w:14}]);
  benchRow(P,14,8);
  /* lamps on the long sides, outside the field */
  for(let z=P.z0+20;z<P.z1-10;z+=46)for(const x of[P.x0+6,P.x1-6]){bx(M.dark,x-.15,x+.15,0,9,z-.15,z+.15);bx(lampMat,x-.5,x+.5,9,10,z-.5,z+.5);}
  /* shade trees in the corners and along the north and south edges, clear of the field */
  for(let x=P.x0+14;x<P.x1-10;x+=rr(24,32)){for(const z of[P.z0+14,P.z1-14]){if(!inField(x,z))PARK_TREES.push({t:R()<.35?'coco':'mango',x,z:z+rr(-2,2),s:rr(.8,1)});}}
  signBoard([{t:'PARK',s:120},{t:'পার্ক',s:66,wt:600,c:'#f0a91b'}],8,3.4,P.x1+.3,5,(P.z0+P.z1)/2-14,Math.PI/2,{w:512,h:220});
  bx(M.dark,P.x1+.1,P.x1+.5,0,3.3,(P.z0+P.z1)/2-17.2,(P.z0+P.z1)/2-16.9);bx(M.dark,P.x1+.1,P.x1+.5,0,3.3,(P.z0+P.z1)/2-11,(P.z0+P.z1)/2-10.7);
}
/* ---------------- children's garden: gazebo, walking path, play corner ---------------- */
{
  const P=PLAY,w=P.x1-P.x0,d=P.z1-P.z0;
  const rr2=(s,x,y,W,H,r)=>{s.moveTo(x+r,y);s.lineTo(x+W-r,y);s.quadraticCurveTo(x+W,y,x+W,y+r);s.lineTo(x+W,y+H-r);s.quadraticCurveTo(x+W,y+H,x+W-r,y+H);s.lineTo(x+r,y+H);s.quadraticCurveTo(x,y+H,x,y+H-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);};
  const outer=new THREE.Shape();rr2(outer,P.x0+9,P.z0+9,w-18,d-18,26);
  const hole=new THREE.Path();rr2(hole,P.x0+15,P.z0+15,w-30,d-30,21);outer.holes.push(hole);
  const tg=new THREE.ShapeGeometry(outer,12);tg.rotateX(Math.PI/2);tg.translate(0,.16,0);
  const tm=new THREE.Mesh(tg,pbr('red_laterite_soil_stones',1/9,{side:THREE.DoubleSide,roughness:1},'trk'));tm.receiveShadow=true;scene.add(tm);
  hedgeRing(P,[{side:'n',at:(P.x0+P.x1)/2,w:14},{side:'e',at:(P.z0+P.z1)/2,w:14}]);
  /* gazebo */
  const gx=(P.x0+P.x1)/2,gz=P.z0+d*.36;
  flat(26,26,gx,gz,.2,M.pavers);
  for(let i=0;i<8;i++){const a=i/8*6.283,x=gx+Math.cos(a)*8.5,z=gz+Math.sin(a)*8.5;bx(M.white,x-.4,x+.4,.2,9.5,z-.4,z+.4);}
  const roof=new THREE.Mesh(new THREE.ConeGeometry(13,5.5,8),M.laterRed);roof.position.set(gx,12.3,gz);roof.rotation.y=Math.PI/8;roof.castShadow=true;scene.add(roof);
  bx(M.white,gx-10,gx+10,9.1,9.7,gz-10,gz+10);
  /* play corner */
  const px=gx,pz=P.z1-36;
  flat(48,34,px,pz,.19,new THREE.MeshStandardMaterial({color:'#c9a77b',roughness:1}));
  const red=new THREE.MeshStandardMaterial({color:'#c8452e',roughness:.5,metalness:.2}),blue=new THREE.MeshStandardMaterial({color:'#2f6fb0',roughness:.5,metalness:.2}),yel=new THREE.MeshStandardMaterial({color:'#e8b62c',roughness:.5,metalness:.2});
  for(const x of[px-18,px-6])bx(blue,x-.25,x+.25,0,9,pz-8,pz-7.5);
  bx(blue,px-18,px-6,8.7,9.2,pz-8,pz-7.5);
  for(const x of[px-15,px-9]){bx(M.metal,x-.04,x+.04,2.2,8.7,pz-7.8,pz-7.7);bx(yel,x-1.2,x+1.2,2,2.3,pz-8.3,pz-7.2);}
  bx(red,px+4,px+9,0,7,pz-10,pz-5);bx(yel,px+4.4,px+8.6,7,7.4,pz-9.6,pz-5.4);
  {const sl=new THREE.Mesh(UNITBOX,yel);sl.scale.set(3.6,.3,14);sl.position.set(px+6.5,3.6,pz+1.7);sl.rotation.x=-.5;sl.castShadow=true;scene.add(sl);}
  {const mg=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.5,20),red);mg.position.set(px-12,1.3,pz+8);mg.castShadow=true;scene.add(mg);bx(M.metal,px-12.2,px-11.8,1.5,5,pz+7.8,pz+8.2);}
  benchRow(P,8,6);
  for(let i=0;i<7;i++){const a=i/7*6.283,x=gx+Math.cos(a)*(w/2-24),z=(P.z0+P.z1)/2+Math.sin(a)*(d/2-24);PARK_TREES.push({t:R()<.3?'areca':'mango',x,z,s:rr(.65,.85)});}
  signBoard([{t:'CHILDREN’S GARDEN',s:90},{t:'শিশু উদ্যান',s:60,wt:600,c:'#f0a91b'}],10,3,(P.x0+P.x1)/2,5,P.z0-.3,Math.PI,{w:640,h:200});
}
BENCHES.forEach(([x,z,ry])=>{
  const B=(a,b,h0,h1,c0,c1,mat)=>{bx(mat,x+a,x+b,h0,h1,z+c0,z+c1,ry,x,z);};
  B(-3,3,1.5,1.75,-.8,.8,M.laterRed);B(-3,3,1.9,3.2,.7,.9,M.laterRed);B(-2.7,-2.4,0,1.5,-.6,.6,M.dark);B(2.4,2.7,0,1.5,-.6,.6,M.dark);
});
/* pocket greens: any spare slots become small lawns with a tree */
POCKETS.forEach(p=>{PARK_TREES.push({t:'mango',x:p.x+p.w/2,z:p.z+p.d/2,s:.8});hedgeRing({x0:p.x,x1:p.x+p.w,z0:p.z,z1:p.z+p.d},[{side:p.f,at:p.x+p.w/2,w:10}]);});
/* north-east garden by the east gate */
{
  const P=GREEN;
  for(let i=0;i<10;i++){const x=rr(P.x0+12,P.x1-12),z=rr(P.z0+12,P.z1-12);if(inSite(x,z)&&!(x>XFMR.x0-12&&x<XFMR.x1+12&&z>XFMR.z0-12&&z<XFMR.z1+12))PARK_TREES.push({t:R()<.5?'coco':'shrubby',x,z,s:rr(.7,1)});}
}

/* ---------------- generic facility building (rendered with trims, overhangs and window reveals) ---------------- */
/* local frame: front face toward -z, centred on the plot; dims from the rect; ry turns it */
function facility(r,o){
  const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,turn=o.front==='e'?Math.PI/2:o.front==='w'?-Math.PI/2:o.front==='s'?Math.PI:0;
  const ry=-turn;
  const wide=o.front==='e'||o.front==='w'?r.z1-r.z0:r.x1-r.x0,deep=o.front==='e'||o.front==='w'?r.x1-r.x0:r.z1-r.z0;
  const W=wide/2-o.side,D=deep/2,F=-D+o.setback,B=D-2;
  const L=(...a)=>lbx(a[0],cx,cz,ry,...a.slice(1));
  const toW=(x,z)=>[cx+x*Math.cos(ry)+z*Math.sin(ry),cz-x*Math.sin(ry)+z*Math.cos(ry)];
  const H=o.h;
  L(M.concrete,-W-1.5,W+1.5,0,1.6,F-1.5,B+1.5);                       /* plinth */
  L(o.wall||M.plasterW,-W,W,1.6,H,F,B);
  L(M.concrete,-W-1.4,W+1.4,H,H+.9,F-1.4,B+1.4);                       /* roof slab with overhang */
  L(M.white,-W-1.6,W+1.6,H+.9,H+1.5,F-1.6,B+1.6);                      /* parapet coping */
  L(M.laterRed,-W-.2,W+.2,1.6,2.4,F-.2,B+.2);                          /* skirting band */
  /* window reveals: glass set back from the wall face, with sill and sunshade */
  for(let x=-W+6;x<W-8;x+=o.bay){
    L(M.dark,x-.2,x+o.win+.2,3.3,H-2.4,F-.15,F+.05);
    L(M.glass,x,x+o.win,3.5,H-2.6,F+.25,F+.35);
    L(M.white,x-.5,x+o.win+.5,3.1,3.4,F-.6,F+.05);
    L(M.concrete,x-.8,x+o.win+.8,H-2.2,H-1.9,F-2.2,F);
  }
  /* entrance canopy on two columns, steps */
  L(M.white,-o.porch,o.porch,H-3,H-2.2,F-12,F);
  for(const x of[-o.porch+1.2,o.porch-1.2])L(M.white,x-.6,x+.6,1.6,H-3,F-11.4,F-10.2);
  for(let i=0;i<3;i++)L(M.concrete,-o.porch+3,o.porch-3,0,1.6-i*.53,F-1.5-(i+1)*1.6,F-1.5-i*1.6);
  const s=signBoard(o.sign,Math.min(2*W-4,o.signW||24),3.6,0,H-.5,0,0,{back:false,frame:false,w:1024,h:150,bg:o.bg||'#1f4d2c'});
  {const[x,z]=toW(0,F-12.25);s.position.set(x,H-2.6+2.1,z);s.rotation.y=ry+Math.PI;}
  {const[a,b]=toW(-W-2,F-2),[c,d]=toW(W+2,B+2);BLOCKERS.push([Math.min(a,c),Math.max(a,c),Math.min(b,d),Math.max(b,d)]);}
}
/* ---------------- shops for daily needs (face the trunk road) ---------------- */
{
  const S=SHOPS,n=4,sd=(S.z1-S.z0)/n,x0=S.x0+14,x1=Math.min(S.x1-2,x0+34);
  flat(14,S.z1-S.z0,S.x0+7,(S.z0+S.z1)/2,.19,M.pavers);
  const shutter=new THREE.MeshStandardMaterial({color:'#9ea3a6',roughness:.45,metalness:.6});
  shutter.map=canvasTex(64,256,(g,w,h)=>{g.fillStyle='#a8acae';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=6){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(0,y,w,1.5);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,y+2,w,1);}},true);
  bx(M.plasterW,x0,x1,0,13,S.z0,S.z1);bx(M.concrete,x0-.5,x1+.5,0,1,S.z0-.5,S.z1+.5);
  bx(M.concrete,x0-1.4,x1+1.4,13,14.2,S.z0-1.4,S.z1+1.4);bx(M.white,x0-1.6,x1+1.6,14.2,14.8,S.z0-1.6,S.z1+1.6);
  bx(M.laterRed,x0-7,x0,10.2,10.8,S.z0,S.z1);
  for(let i=0;i<n;i++){
    const z0=S.z0+i*sd+1.4,z1=S.z0+(i+1)*sd-1.4,open=i!==2;
    bx(M.dark,x0-.08,x0+.02,1,9,z0,z1);
    if(open){bx(shutter,x0-.3,x0-.1,7.4,9.6,z0,z1);bx(new THREE.MeshStandardMaterial({color:'#e7d7b0',emissive:'#ffcf8a',emissiveIntensity:0}),x0+.05,x0+.2,1.2,7.2,z0+.5,z1-.5);}
    else bx(shutter,x0-.3,x0-.1,1,9.6,z0,z1);
    for(let k=0;k<2;k++)bx(M.white,x0-7,x0-6.4,0,10.2,(k?z1:z0)-.3,(k?z1:z0)+.3);
    signBoard([{t:'SHOP '+(i+1),s:92},{t:'দোকান',s:52,wt:600,c:'#f0a91b'}],z1-z0-2,2.2,x0-.2,11.6,(z0+z1)/2,-Math.PI/2,{back:false,frame:false,w:768,h:170,bg:['#1f4d2c','#7a2e1f','#1d3f66','#5b3f12'][i]});
  }
  BLOCKERS.push([x0-1,x1+1,S.z0-1,S.z1+1]);
}
/* ---------------- community hall and gym (by the south gate, where the plan marks the community place) ---------------- */
facility(HALL,{front:'n',side:3,setback:12,h:16,bay:13,win:8,porch:13,sign:[{t:'COMMUNITY HALL',s:96},{t:'কমিউনিটি হল',s:56,wt:600,c:'#f0a91b'}],signW:28});
facility(GYM,{front:'n',side:3,setback:12,h:14,bay:11,win:6,porch:8,sign:[{t:'GYM',s:120},{t:'জিম',s:60,wt:600,c:'#f0a91b'}],signW:16,bg:'#1d3f66',wall:M.cream});
flat(Zf.hall.x1-Zf.hall.x0,14,(Zf.hall.x0+Zf.hall.x1)/2,Zf.hall.z0+7,.18,M.pavers);
/* ---------------- electricity transformer (north-east garden) ---------------- */
{
  const X=XFMR,cx=(X.x0+X.x1)/2,cz=(X.z0+X.z1)/2;
  flat(X.x1-X.x0,X.z1-X.z0,cx,cz,.18,new THREE.MeshStandardMaterial({color:'#8d8778',roughness:1}));
  bx(M.concrete,cx-10,cx+10,0,2.4,cz-7,cz+7);
  const grey=new THREE.MeshStandardMaterial({color:'#7d8b84',roughness:.5,metalness:.5});
  bx(grey,cx-6,cx+6,2.4,11,cz-4,cz+4);
  for(let i=-5;i<=5;i++)bx(grey,cx+i-.08,cx+i+.08,3,10,cz-5.2,cz-4);
  for(let i=-1;i<=1;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,2.6,8),new THREE.MeshStandardMaterial({color:'#6a4a35',roughness:.4}));b.position.set(cx+i*3,12.3,cz);b.castShadow=true;scene.add(b);}
  const fence=new THREE.MeshStandardMaterial({color:'#8b9196',roughness:.4,metalness:.7,transparent:true,opacity:.55});
  [[X.x0,X.z0,X.x1,X.z0],[X.x0,X.z1,X.x1,X.z1],[X.x0,X.z0,X.x0,X.z1],[X.x1,X.z0,X.x1,X.z1]].forEach(([a,b,c,d])=>{
    const ew=Math.abs(c-a)>1;
    if(ew){bx(fence,a,c,.2,8,b-.04,b+.04);for(let x=a;x<=c;x+=8)bx(M.metal,x-.12,x+.12,0,8.4,b-.12,b+.12);}
    else{bx(fence,a-.04,a+.04,.2,8,b,d);for(let z=b;z<=d;z+=8)bx(M.metal,a-.12,a+.12,0,8.4,z-.12,z+.12);}
  });
  signBoard([{t:'⚡ ELECTRICITY',s:84,c:'#1b1b1b'},{t:'বিদ্যুৎ · Keep out',s:44,wt:600,c:'#a5231a'}],7,2.4,cx,5.2,X.z1+.25,0,{back:false,frame:false,w:640,h:220,bg:'#f2c230',border:'#1b1b1b'});
  BLOCKERS.push([X.x0-1,X.x1+1,X.z0-1,X.z1+1]);
}
flushBatches(true);
