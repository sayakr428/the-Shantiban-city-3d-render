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
  g.font='600 22px "Anek Bangla", sans-serif';g.fillText(`${p.b} · 2 katha`,w/2,h*.71);
  g.font='500 18px "Anek Bangla", sans-serif';g.fillText(`36′ × 40′`,w/2,h*.83);
});
const boardAtlas=atlas(256,146,16,(g,p,w,h)=>{
  g.fillStyle='#fbfaf3';g.fillRect(0,0,w,h);g.strokeStyle='#1f4d2c';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);
  g.strokeStyle='#a5432a';g.lineWidth=2;g.strokeRect(14,14,w-28,h-28);
  g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#6d7d70';g.font='600 17px "Anek Bangla", sans-serif';g.fillText('PLOT',w/2,31);
  g.fillStyle='#a5432a';g.font='800 64px "Anek Bangla", sans-serif';g.fillText(String(p.no),w/2,h/2+4);
  g.fillStyle='#1f4d2c';g.font='600 19px "Anek Bangla", sans-serif';g.fillText(`${p.b} · 2 katha`,w/2,h-28);
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

/* ---------------- boundary wall ---------------- */
prog(.48,'Building the boundary wall and gate…');await tick();
const WALLS=[[-1,-1,SX1+1,-1],[-1,-1,-1,SZ1+1],[SX1+1,-1,SX1+1,SZ1+1],[-1,SZ1+1,XB0-6,SZ1+1],[XB1+6,SZ1+1,SX1+1,SZ1+1]];
const BLOCKERS=[];
WALLS.forEach(([x0,z0,x1,z1])=>{
  const ew=Math.abs(x1-x0)>Math.abs(z1-z0),L=ew?x1-x0:z1-z0;
  const W=(a,b,h0,h1,t,mat)=>ew?bx(mat,a,b,h0,h1,z0-t/2,z0+t/2):bx(mat,x0-t/2,x0+t/2,h0,h1,a,b);
  const s0=ew?x0:z0;
  W(s0,s0+L,0,.9,1.1,M.concrete);
  W(s0,s0+L,.9,6.4,.75,M.cream);
  W(s0,s0+L,6.4,6.75,.95,M.white);
  for(let s=0;s<=L;s+=12){const u=s0+Math.min(s,L);W(u-.8,u+.8,0,7.4,1.5,M.brick);W(u-.95,u+.95,7.4,7.75,1.7,M.laterRed);}
  BLOCKERS.push([Math.min(x0,x1)-1.5,Math.max(x0,x1)+1.5,Math.min(z0,z1)-1.5,Math.max(z0,z1)+1.5]);
});

/* ---------------- main gate and security ---------------- */
{
  const z=SZ1+1;
  [XB0-4,XB1+4].forEach(x=>{
    bx(M.brick,x-2.6,x+2.6,0,21,z-2.6,z+2.6);bx(M.cream,x-2.9,x+2.9,0,3,z-2.9,z+2.9);
    bx(M.laterRed,x-3.1,x+3.1,21,22,z-3.1,z+3.1);bx(M.white,x-2.2,x+2.2,22,23.2,z-2.2,z+2.2);
    BLOCKERS.push([x-3.6,x+3.6,z-3.6,z+3.6]);
    /* CCTV on each pillar */
    bx(M.white,x-.3,x+.3,18,18.6,z+2.6,z+3.6);bx(M.dark,x-.2,x+.2,18.1,18.5,z+3.6,z+3.9);
  });
  bx(M.laterRed,XB0-6,XB1+6,15.2,17.4,z-1.6,z+1.6);
  bx(M.cream,XB0-5,XB1+5,17.4,24.6,z-.9,z+.9);
  /* gate sign: the logo on a white badge, then the Bengali and English names centred in the space beside it */
  const gateTex=(sub)=>canvasTex(2048,420,(g,w,h)=>{
    g.fillStyle='#1f4d2c';g.fillRect(0,0,w,h);
    g.strokeStyle='#f0a91b';g.lineWidth=14;g.strokeRect(14,14,w-28,h-28);
    g.strokeStyle='rgba(240,169,27,.45)';g.lineWidth=3;g.strokeRect(36,36,w-72,h-72);
    const b=h-112,bx0=70,by0=56;
    g.fillStyle='#ffffff';g.beginPath();g.roundRect(bx0,by0,b,b,28);g.fill();
    g.drawImage(LOGO_IMG,bx0+10,by0+10,b-20,b-20);
    drawLines(g,[{t:'শান্তিবন সিটি',s:118,wt:600,c:'#f0a91b'},{t:'SHANTIBAN CITY',s:150},{t:sub,s:50,wt:600,c:'#cfe0c9'}],bx0+b+30,40,w-60,h-40,10);
  });
  for(const[side,sub]of[[1,'TAPNA · BARUIPUR'],[-1,'WELCOME HOME']]){
    const t=gateTex(sub),m=new THREE.MeshStandardMaterial({map:t,roughness:.55,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:0});SIGNS.push(m);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(34,6.97),m);f.position.set(CX,21,z+side*1.0);f.rotation.y=side>0?0:Math.PI;f.translateZ(.12);scene.add(f);
  }
  /* sliding gate leaves, pushed open behind the wall */
  const grill=new THREE.MeshStandardMaterial({color:'#2d3134',roughness:.4,metalness:.8});
  for(const sg of[-1,1]){
    const x0=sg<0?XB0-22:XB1+6,x1=sg<0?XB0-6:XB1+22;
    bx(grill,x0,x1,.3,.6,z-1.6,z-1.3);bx(grill,x0,x1,6.7,7,z-1.6,z-1.3);
    for(let x=x0;x<=x1;x+=.8)bx(grill,x-.06,x+.06,.3,7,z-1.5,z-1.4);
  }
  /* security cabins with a boom barrier */
  const cab=(x0,x1,z0,z1)=>{
    bx(M.concrete,x0-.5,x1+.5,0,.8,z0-.5,z1+.5);bx(M.plasterW,x0,x1,.8,9.5,z0,z1);
    bx(M.laterRed,x0-1.2,x1+1.2,9.5,10.2,z0-1.2,z1+1.2);
    bx(M.glass,x0+1.2,x1-1.2,4,7.6,z0-.06,z0+.04);bx(M.glass,x0-.06,x0+.04,4,7.6,z0+1.2,z1-1.2);bx(M.glass,x1-.04,x1+.06,4,7.6,z0+1.2,z1-1.2);
    BLOCKERS.push([x0-1,x1+1,z0-1,z1+1]);
  };
  cab(XB0-19,XB0-7,SZ1-16,SZ1-5);cab(XB1+7,XB1+19,SZ1-16,SZ1-5);
  signBoard([{t:'SECURITY',s:110},{t:'নিরাপত্তা',s:60,wt:600,c:'#f0a91b'}],8,2.6,XB0-13,11.6,SZ1-16.7,Math.PI,{back:false,frame:false,w:512,h:170,bg:'#123a24'});
  signBoard([{t:'SECURITY',s:110},{t:'নিরাপত্তা',s:60,wt:600,c:'#f0a91b'}],8,2.6,XB1+13,11.6,SZ1-16.7,Math.PI,{back:false,frame:false,w:512,h:170,bg:'#123a24'});
  bx(M.white,XB0+.5,XB0+2,0,3.6,SZ1-10,SZ1-8.5);
  const boomR=new THREE.MeshStandardMaterial({color:'#d33b2c',roughness:.5}),boomW=new THREE.MeshStandardMaterial({color:'#f4f1ea',roughness:.5});
  for(let i=0;i<7;i++)bx(i%2?boomW:boomR,XB0+1.2+i*2,XB0+3.2+i*2,3.1,3.6,SZ1-9.5,SZ1-9);
  /* paved forecourt in and out of the gate */
  flat(BLVD+30,26,CX,SZ1+13,.18,M.pavers);
}

/* distances board by the gate, as given in the project information (approximate) */
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
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(9,9),m);pl.position.set(XB1+28,9.2,MAIN_Z-MAIN_W/2-6.6);scene.add(pl);
  bx(M.dark,XB1+23.2,XB1+32.8,4.4,14,MAIN_Z-MAIN_W/2-7.1,MAIN_Z-MAIN_W/2-6.8);
  bx(M.metal,XB1+23.6,XB1+24,0,14,MAIN_Z-MAIN_W/2-7,MAIN_Z-MAIN_W/2-6.8);bx(M.metal,XB1+32,XB1+32.4,0,14,MAIN_Z-MAIN_W/2-7,MAIN_Z-MAIN_W/2-6.8);
}

/* ---------------- park ---------------- */
prog(.52,'Planting the park…');await tick();
const BENCHES=[],PARK_TREES=[];
{
  const P=PARK,w=P.x1-P.x0,d=P.z1-P.z0;
  /* walking track */
  const sh=new THREE.Shape();sh.moveTo(0,0);
  const rr2=(s,x,y,W,H,r)=>{s.moveTo(x+r,y);s.lineTo(x+W-r,y);s.quadraticCurveTo(x+W,y,x+W,y+r);s.lineTo(x+W,y+H-r);s.quadraticCurveTo(x+W,y+H,x+W-r,y+H);s.lineTo(x+r,y+H);s.quadraticCurveTo(x,y+H,x,y+H-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);};
  const outer=new THREE.Shape();rr2(outer,P.x0+12,P.z0+12,w-24,d-24,38);
  const hole=new THREE.Path();rr2(hole,P.x0+19,P.z0+19,w-38,d-38,31);outer.holes.push(hole);
  const tg=new THREE.ShapeGeometry(outer,12);tg.rotateX(Math.PI/2);tg.translate(0,.16,0);
  const tm=new THREE.Mesh(tg,pbr('red_laterite_soil_stones',1/9,{side:THREE.DoubleSide,roughness:1},'trk'));tm.receiveShadow=true;scene.add(tm);
  /* hedge along the park edge, with openings onto the boulevard and the road */
  for(let x=P.x0+2;x<P.x1-2;x+=4){if(x>180&&x<210)continue;bx(hedgeMat,x,x+4,0,2.6,P.z0+1,P.z0+3.5);bx(hedgeMat,x,x+4,0,2.6,P.z1-3.5,P.z1-1);}
  for(let z=P.z0+4;z<P.z1-4;z+=4){bx(hedgeMat,P.x0+1,P.x0+3.5,0,2.6,z,z+4);if(z>640&&z<668)continue;bx(hedgeMat,P.x1-3.5,P.x1-1,0,2.6,z,z+4);}
  /* gazebo in the middle */
  const gx=(P.x0+P.x1)/2,gz=(P.z0+P.z1)/2;
  flat(30,30,gx,gz,.2,M.pavers);
  for(let i=0;i<8;i++){const a=i/8*6.283,x=gx+Math.cos(a)*10,z=gz+Math.sin(a)*10;bx(M.white,x-.45,x+.45,.2,10,z-.45,z+.45);}
  const roof=new THREE.Mesh(new THREE.ConeGeometry(15,6,8),M.laterRed);roof.position.set(gx,13,gz);roof.rotation.y=Math.PI/8;roof.castShadow=true;scene.add(roof);
  bx(M.white,gx-11.5,gx+11.5,9.6,10.2,gz-11.5,gz+11.5);
  /* children's play corner */
  const px=P.x0+60,pz=P.z0+55;
  flat(56,46,px,pz,.19,new THREE.MeshStandardMaterial({color:'#c9a77b',roughness:1}));
  const red=new THREE.MeshStandardMaterial({color:'#c8452e',roughness:.5,metalness:.2}),blue=new THREE.MeshStandardMaterial({color:'#2f6fb0',roughness:.5,metalness:.2}),yel=new THREE.MeshStandardMaterial({color:'#e8b62c',roughness:.5,metalness:.2});
  for(const x of[px-18,px-6])bx(blue,x-.25,x+.25,0,9,pz-12,pz-11.5);
  bx(blue,px-18,px-6,8.7,9.2,pz-12,pz-11.5);
  for(const x of[px-15,px-9]){bx(M.metal,x-.04,x+.04,2.2,8.7,pz-11.8,pz-11.7);bx(yel,x-1.2,x+1.2,2,2.3,pz-12.3,pz-11.2);}
  bx(red,px+4,px+9,0,7,pz-14,pz-9);bx(yel,px+4.4,px+8.6,7,7.4,pz-13.6,pz-9.4);
  { const sl=new THREE.Mesh(UNITBOX,yel);sl.scale.set(3.6,.3,14);sl.position.set(px+6.5,3.6,pz-2.3);sl.rotation.x=-.5;sl.castShadow=true;scene.add(sl);}
  bx(red,px-12,px-11,0,1.8,pz+10,pz+11);{const s=new THREE.Mesh(UNITBOX,blue);s.scale.set(1,.35,14);s.position.set(px-11.5,2,pz+10.5);s.rotation.x=.12;s.castShadow=true;scene.add(s);}
  { const mg=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.5,20),red);mg.position.set(px+12,1.3,pz+11);mg.castShadow=true;scene.add(mg);bx(M.metal,px+11.8,px+12.2,1.5,5,pz+10.8,pz+11.2);}
  /* benches along the track */
  for(let i=0;i<18;i++){
    const t=i/18,peri=2*(w-48)+2*(d-48);let s=t*peri,x,z,ry;
    if(s<w-48){x=P.x0+24+s;z=P.z0+8;ry=0;}else if((s-=w-48)<d-48){x=P.x1-8;z=P.z0+24+s;ry=-Math.PI/2;}
    else if((s-=d-48)<w-48){x=P.x1-24-s;z=P.z1-8;ry=Math.PI;}else{s-=w-48;x=P.x0+8;z=P.z1-24-s;ry=Math.PI/2;}
    BENCHES.push([x,z,ry]);
  }
  BENCHES.forEach(([x,z,ry])=>{
    const c=Math.cos(ry),sn=Math.sin(ry);
    const B=(a,b,h0,h1,c0,c1,mat)=>{bx(mat,x+a,x+b,h0,h1,z+c0,z+c1,ry,x,z);};
    B(-3,3,1.5,1.75,-.8,.8,M.laterRed);B(-3,3,1.9,3.2,.7,.9,M.laterRed);B(-2.7,-2.4,0,1.5,-.6,.6,M.dark);B(2.4,2.7,0,1.5,-.6,.6,M.dark);
  });
  /* garden lamps */
  for(let i=0;i<14;i++){const a=i/14*6.283,x=gx+Math.cos(a)*(w/2-30),z=gz+Math.sin(a)*(d/2-30);bx(M.dark,x-.15,x+.15,0,9,z-.15,z+.15);bx(lampMat,x-.5,x+.5,9,10,z-.5,z+.5);}
  /* trees inside the park */
  for(let x=P.x0+30;x<P.x1-20;x+=rr(26,36)){PARK_TREES.push({t:R()<.4?'coco':'mango',x,z:P.z0+28+rr(-3,3),s:rr(.9,1.1)});PARK_TREES.push({t:R()<.4?'coco':'mango',x,z:P.z1-28+rr(-3,3),s:rr(.9,1.1)});}
  for(let i=0;i<16;i++){const a=rr(0,6.283),r=rr(32,62);PARK_TREES.push({t:R()<.3?'areca':'mango',x:gx+Math.cos(a)*r*1.6,z:gz+Math.sin(a)*r*.7,s:rr(.7,1)});}
  signBoard([{t:'PARK',s:120},{t:'পার্ক',s:66,wt:600,c:'#f0a91b'}],8,3.4,P.x1+.3,5,P.z0+32,Math.PI/2,{w:512,h:220});
  bx(M.dark,P.x1+.1,P.x1+.5,0,3.3,P.z0+28.8,P.z0+29.1);bx(M.dark,P.x1+.1,P.x1+.5,0,3.3,P.z0+35,P.z0+35.3);
}
/* ---------------- shops for daily needs ---------------- */
{
  const S=SHOPS,n=6,sd=(S.z1-S.z0)/n,x0=S.x0+16,x1=S.x1-2;
  flat(16,S.z1-S.z0,S.x0+8,(S.z0+S.z1)/2,.19,M.pavers);
  const shutter=new THREE.MeshStandardMaterial({color:'#9ea3a6',roughness:.45,metalness:.6});
  const shutterTex=canvasTex(64,256,(g,w,h)=>{g.fillStyle='#a8acae';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=6){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(0,y,w,1.5);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,y+2,w,1);}},true);
  shutter.map=shutterTex;
  bx(M.plasterW,x0,x1,0,13,S.z0,S.z1);bx(M.concrete,x0-.5,x1+.5,0,1,S.z0-.5,S.z1+.5);
  bx(M.concrete,x0-.4,x1+.4,13,14.2,S.z0-.4,S.z1+.4);
  bx(M.laterRed,x0-7,x0,10.2,10.8,S.z0,S.z1);
  for(let i=0;i<n;i++){
    const z0=S.z0+i*sd+1.4,z1=S.z0+(i+1)*sd-1.4,open=i%3!==1;
    bx(M.dark,x0-.08,x0+.02,1,9,z0,z1);
    if(open){bx(shutter,x0-.3,x0-.1,7.4,9.6,z0,z1);bx(new THREE.MeshStandardMaterial({color:'#e7d7b0',emissive:'#ffcf8a',emissiveIntensity:0}),x0+.05,x0+.2,1.2,7.2,z0+.5,z1-.5);}
    else bx(shutter,x0-.3,x0-.1,1,9.6,z0,z1);
    for(let k=0;k<2;k++)bx(M.white,x0-7,x0-6.4,0,10.2,(k?z1:z0)-.3,(k?z1:z0)+.3);
    signBoard([{t:'SHOP '+(i+1),s:92},{t:'দোকান',s:52,wt:600,c:'#f0a91b'}],z1-z0-2,2.2,x0-.2,11.6,(z0+z1)/2,-Math.PI/2,{back:false,frame:false,w:768,h:170,bg:['#1f4d2c','#7a2e1f','#1d3f66','#5b3f12','#2c5249','#5a1f43'][i]});
  }
  BLOCKERS.push([x0-1,x1+1,S.z0-1,S.z1+1]);
}
/* ---------------- community hall ---------------- */
{
  const H=HALL,cx=(H.x0+H.x1)/2;
  bx(M.concrete,H.x0-2,H.x1+2,0,1.6,H.z0-2,H.z1+2);
  bx(M.plasterW,H.x0,H.x1,1.6,14,H.z0,H.z1);
  bx(M.plasterW,H.x0+10,H.x1-10,14,27,H.z0+8,H.z1);
  bx(M.concrete,H.x0-1,H.x1+1,13.6,14.6,H.z0-1,H.z1+1);bx(M.concrete,H.x0+9,H.x1-9,26.6,28,H.z0+7,H.z1+1);
  const wood=pbr('bark_brown_02',1/6,{color:new THREE.Color('#c98d5a'),roughness:.6},'wood');
  bx(wood,H.x0+10,H.x0+40,14,27,H.z0+7.6,H.z0+8.1);bx(wood,H.x1-40,H.x1-10,14,27,H.z0+7.6,H.z0+8.1);
  for(let x=H.x0+8;x<H.x1-12;x+=14){bx(M.glass,x,x+10,3.5,12.4,H.z0-.08,H.z0+.04);bx(M.dark,x-.25,x,3.2,12.7,H.z0-.15,H.z0+.05);}
  for(let x=H.x0+44;x<H.x1-48;x+=12){bx(M.glass,x,x+9,16,25,H.z0+7.92,H.z0+8.02);}
  bx(M.white,cx-26,cx+26,12,13,H.z0-18,H.z0);
  for(const x of[cx-24,cx+24])bx(M.white,x-.6,x+.6,1.6,12,H.z0-17,H.z0-15.8);
  for(let i=0;i<3;i++)bx(M.concrete,cx-14,cx+14,0,1.6-i*.53,H.z0-2-i*1.6-1.6,H.z0-2-i*1.6);
  signBoard([{t:'COMMUNITY HALL',s:96},{t:'কমিউনিটি হল',s:56,wt:600,c:'#f0a91b'}],30,4.2,cx,15.9,H.z0-18.2,Math.PI,{back:false,frame:false,w:1024,h:150});
  BLOCKERS.push([H.x0-3,H.x1+3,H.z0-3,H.z1+3]);
  flat(PARKING.x1-PARKING.x0,PARKING.z1-PARKING.z0,(PARKING.x0+PARKING.x1)/2,(PARKING.z0+PARKING.z1)/2,.19,M.pavers);
  for(let x=PARKING.x0+6;x<PARKING.x1;x+=10)flat(.35,16,x,PARKING.z0+10,.22,M.mark);
  flat(PARKING.x1-PARKING.x0,22,(PARKING.x0+PARKING.x1)/2,(HALL.z1+PARKING.z0)/2,.18,M.pavers);
}
/* ---------------- electricity transformer ---------------- */
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
  signBoard([{t:'⚡ ELECTRICITY',s:84,c:'#1b1b1b'},{t:'বিদ্যুৎ · Keep out',s:44,wt:600,c:'#a5231a'}],7,2.4,cx,5.2,X.z0-.25,Math.PI,{back:false,frame:false,w:640,h:220,bg:'#f2c230',border:'#1b1b1b'});
  BLOCKERS.push([X.x0-1,X.x1+1,X.z0-1,X.z1+1]);
}
flushBatches(true);
