/* =====================================================================
   PARK CRICKET. A two-over street-cricket game played on the lawn in the
   east half of the park. Bat against Bablu, bowl at Bablu, or two players
   on one keyboard or phone. Game logic runs in metres in a local frame:
   x across the pitch (+x off side), z down the pitch (+z toward the batter),
   y up. The local frame is placed and scaled into the walkthrough's feet.
   ===================================================================== */
{
const FT=3.28084;
const GRAV=9.8,RB=.13;
/* pitch geometry */
const BAT_Z=7.1,BAT_XPOS=-.5,STUMP_S=7.95,STUMP_N=-4.6,N_Z=-3.95;
const CONTACT_Z=6.85,CONTACT_X=-.15,CONTACT_T=.1,ZONE=1.1;
const WIDE_OFF=.85,WIDE_LEG=-.8;
/* the park ground: boundary rope and the hedge behind it */
const ROPE={x:16,zF:-20,zB:13.5},HEDGE={x:22.5,zB:16.6};
const GROUND={eHit:.5,eDel:.6,fr:.95,roll:1};
const TARGET=[20,28];
const MAX_BALLS=12,MAX_WK=3,RUNUP_T=1.2,RUN_SPEED=8.6;
const TAU=Math.PI*2;
const rand=(a,b)=>a+(b-a)*Math.random(),rpick=a=>a[(Math.random()*a.length)|0];
const tmpA=new V3(),tmpB=new V3(),tmpC=new V3();

/* ---------------- placement in the park ---------------- */
const root=new THREE.Group();
root.position.copy(CRK.center);root.rotation.y=0;root.scale.setScalar(FT);
scene.add(root);root.updateMatrixWorld(true);
const L2W=(v,out=new V3())=>out.copy(v).applyMatrix4(root.matrixWorld);
const W2L=(v,out=new V3())=>out.copy(v).applyMatrix4(tmpM.copy(root.matrixWorld).invert());
const tmpM=new THREE.Matrix4();
const wx2l=(x,z)=>[(x-CRK.center.x)/FT,(z-CRK.center.z)/FT];

/* ---------------- materials ---------------- */
const MC=new Map();
const mat=(c,o={})=>{const k=c+JSON.stringify(o);if(!MC.has(k)){const m=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o));csmSetup(m);MC.set(k,m);}return MC.get(k);};
const box=(w,h,d,c,x,y,z,p=root,cast=true)=>{const m=new THREE.Mesh(UNITBOX,typeof c==='string'?mat(c):c);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;p.add(m);return m;};

/* ---------------- the field (always visible as part of the park) ---------------- */
{
  /* mown stripes inside the rope */
  const stripes=canvasTex(256,1024,(g,w,h)=>{
    for(let i=0;i<16;i++){g.fillStyle=i%2?'#5f8f3e':'#6c9c47';g.fillRect(0,i*h/16,w,h/16);}
    for(let i=0;i<9000;i++){g.fillStyle=['rgba(40,70,20,.22)','rgba(150,190,90,.16)','rgba(90,120,50,.2)'][i%3];g.fillRect(RT()*w,RT()*h,1+RT()*2,1+RT()*3);}
  });
  const lawnMat=new THREE.MeshStandardMaterial({map:stripes,roughness:.95});
  const lawn=new THREE.Mesh(new THREE.PlaneGeometry(2*ROPE.x,ROPE.zB-ROPE.zF),lawnMat);
  lawn.rotation.x=-Math.PI/2;lawn.position.set(0,.02,(ROPE.zB+ROPE.zF)/2);lawn.receiveShadow=true;lawn.renderOrder=1;root.add(lawn);
  /* cut the matching hole in the walkthrough's ground (world-space, axis-aligned after the 90° turn) */
  {const a=L2W(new V3(-ROPE.x+.05,0,ROPE.zF+.05)),b=L2W(new V3(ROPE.x-.05,0,ROPE.zB-.05));
   GROUND_U.uHole.value.set(Math.min(a.x,b.x),Math.min(a.z,b.z),Math.max(a.x,b.x),Math.max(a.z,b.z));}
  /* worn pitch strip */
  const pitchMat=pbr('brown_mud_02',1/7,{color:new THREE.Color('#e2c99a'),roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1},'pitch');
  const pitch=new THREE.Mesh(new THREE.PlaneGeometry(3.05,STUMP_S-STUMP_N+3.2),pitchMat);
  pitch.rotation.x=-Math.PI/2;pitch.position.set(.05,.04,(STUMP_S+STUMP_N)/2);pitch.receiveShadow=true;pitch.renderOrder=2;root.add(pitch);
  /* chalk creases */
  const chalk=new THREE.MeshStandardMaterial({color:'#f4f1e6',roughness:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const line=(w,d,x,z)=>{const m=new THREE.Mesh(UNITPLANE,chalk);m.rotation.x=-Math.PI/2;m.scale.set(w,d,1);m.position.set(x,.06,z);m.renderOrder=3;root.add(m);};
  for(const z of[BAT_Z-.25,N_Z+.25]){line(2.6,.06,.05,z);for(const x of[-.72,.82])line(.06,1.2,x,z+(z>0?.55:-.55));}
  line(1.2,.05,.05,STUMP_S);line(1.2,.05,.05,STUMP_N);
  /* boundary rope with marker flags */
  const ropeMat=mat('#f2efe6',{roughness:.6});
  const seg=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),m=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,L,6),ropeMat);
    m.rotation.set(Math.PI/2,0,Math.atan2(x1-x0,z1-z0));m.rotation.order='YXZ';m.rotation.set(Math.PI/2,Math.atan2(x1-x0,z1-z0),0);m.position.set((x0+x1)/2,.04,(z0+z1)/2);root.add(m);};
  const c=[[-ROPE.x,ROPE.zF],[ROPE.x,ROPE.zF],[ROPE.x,ROPE.zB],[-ROPE.x,ROPE.zB]];
  for(let i=0;i<4;i++)seg(...c[i],...c[(i+1)%4]);
  const flagMat=mat('#f0a91b',{side:THREE.DoubleSide,roughness:.6}),poleM=mat('#e9e6dc');
  const flag=(x,z)=>{box(.03,.9,.03,poleM,x,.45,z);const f=new THREE.Mesh(new THREE.CircleGeometry(.22,3),flagMat);f.position.set(x,.78,z+.12);f.rotation.y=Math.PI/2;root.add(f);};
  for(let z=ROPE.zF;z<=ROPE.zB+.01;z+=(ROPE.zB-ROPE.zF)/6){flag(-ROPE.x,z);flag(ROPE.x,z);}
  for(let x=-ROPE.x+(2*ROPE.x)/5;x<ROPE.x-.1;x+=(2*ROPE.x)/5){flag(x,ROPE.zF);flag(x,ROPE.zB);}
}

/* ---------------- stumps ---------------- */
const stumpMat=mat('#e9d9b4',{roughness:.6}),bailMat=mat('#d9b06a',{roughness:.6});
function makeStumps(z){
  const g=new THREE.Group(),sticks=[];
  for(const x of[-.11,0,.11]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.71,6),stumpMat);m.position.set(x,.355,0);m.castShadow=true;g.add(m);sticks.push(m);}
  for(const x of[-.055,.055]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.11,5),bailMat);m.rotation.z=Math.PI/2;m.position.set(x,.72,0);g.add(m);sticks.push(m);}
  sticks.forEach(s=>{s.userData.home=s.position.clone();s.userData.v=new V3();s.userData.w=new V3();});
  g.position.set(.05,0,z);root.add(g);return{g,sticks,flying:false};
}
const stumpsS=makeStumps(STUMP_S),stumpsN=makeStumps(STUMP_N);
function scatterStumps(st,dir){
  st.flying=true;
  st.sticks.forEach((s,i)=>{s.userData.v.set(dir.x*rand(1,3)+rand(-1.2,1.2),rand(2,4.5),dir.z*rand(2,5));s.userData.w.set(rand(-9,9),rand(-4,4),rand(-9,9));});
}
function resetStumps(st){st.flying=false;st.sticks.forEach(s=>{s.position.copy(s.userData.home);s.rotation.set(0,0,s===st.sticks[3]||s===st.sticks[4]?Math.PI/2:0);});}
function updStumps(st,dt){
  if(!st.flying)return;
  st.sticks.forEach(s=>{const v=s.userData.v;v.y-=GRAV*dt;s.position.addScaledVector(v,dt);
    if(s.position.y<.02){s.position.y=.02;v.y=-v.y*.3;v.x*=.6;v.z*=.6;s.userData.w.multiplyScalar(.6);}
    s.rotation.x+=s.userData.w.x*dt;s.rotation.y+=s.userData.w.y*dt;s.rotation.z+=s.userData.w.z*dt;});
}

/* ---------------- people ---------------- */
const players=new THREE.Group();players.visible=false;root.add(players);
const SKIN=['#c98d64','#a8714f','#dba67e','#b97c56','#9a6646','#d29a72'];
const capG=(r,len)=>new THREE.CapsuleGeometry(r,len,3,8);
function limb(r,len,c,parent,y=0){const m=new THREE.Mesh(capG(r,len),mat(c));m.position.y=-len/2-r*.4+y;m.castShadow=true;parent.add(m);return m;}
function person(o){
  const skin=o.skin||SKIN[0],g=new THREE.Group();(o.parent||players).add(g);
  const hip=new THREE.Group();hip.position.y=.86;g.add(hip);
  const pelvis=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),mat(o.pants||'#3d4a6a'));pelvis.scale.set(1.15,.7,.85);pelvis.castShadow=true;hip.add(pelvis);
  const torso=new THREE.Group();torso.position.y=.06;hip.add(torso);
  const chest=new THREE.Mesh(capG(.15,.34),mat(o.shirt||'#e9e6dc'));chest.position.y=.27;chest.scale.set(1.1,1,.78);chest.castShadow=true;torso.add(chest);
  if(o.stripe){const s=new THREE.Mesh(new THREE.CylinderGeometry(.168,.168,.05,12),mat(o.stripe));s.position.y=.36;s.scale.set(1.1,1,.78);torso.add(s);}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.08,8),mat(skin));neck.position.y=.56;torso.add(neck);
  const head=new THREE.Group();head.position.y=.68;torso.add(head);
  const skull=new THREE.Mesh(new THREE.SphereGeometry(.115,14,12),mat(skin));skull.scale.set(.92,1.05,.98);skull.castShadow=true;head.add(skull);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10,0,TAU,0,Math.PI*.55),mat(o.hair||'#1c1412'));hair.position.y=.015;head.add(hair);
  if(o.pony){const p=new THREE.Mesh(capG(.04,.12),mat(o.hair||'#1c1412'));p.position.set(0,-.02,-.12);p.rotation.x=.5;head.add(p);}
  if(o.cap){const c=new THREE.Mesh(new THREE.CylinderGeometry(.125,.125,.06,14),mat(o.cap));c.position.y=.07;head.add(c);const v=new THREE.Mesh(new THREE.BoxGeometry(.18,.015,.12),mat(o.cap));v.position.set(0,.05,.12);head.add(v);}
  for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.014,6,6),mat('#1a1410'));e.position.set(.04*s,.02,.105);head.add(e);}
  const legs=[],arms=[],hands=[];
  for(const s of[-1,1]){
    const lg=new THREE.Group();lg.position.set(.09*s,-.02,0);hip.add(lg);
    limb(.068,.3,o.pants||'#3d4a6a',lg);
    const knee=new THREE.Group();knee.position.y=-.41;lg.add(knee);lg.userData.knee=knee;
    limb(.056,.3,o.shin||o.pants||'#3d4a6a',knee);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.22),mat(o.shoe||'#2a2a2c'));shoe.position.set(0,-.42,.04);shoe.castShadow=true;knee.add(shoe);
    legs.push(lg);
    const ar=new THREE.Group();ar.position.set(.2*s,.47,0);torso.add(ar);
    limb(.05,.22,o.shirt||'#e9e6dc',ar);
    const el=new THREE.Group();el.position.y=-.29;ar.add(el);ar.userData.elbow=el;
    limb(.042,.2,skin,el);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mat(o.gloves||skin));hand.position.y=-.3;el.add(hand);hands.push(hand);
    arms.push(ar);
  }
  if(o.scale)g.scale.setScalar(o.scale);
  return{g,hip,torso,head,legs,arms,hands,phase:Math.random()*6};
}
function joints(p,kL,kR,eL,eR){p.legs[0].userData.knee.rotation.x=kL;p.legs[1].userData.knee.rotation.x=kR;p.arms[0].userData.elbow.rotation.x=eL;p.arms[1].userData.elbow.rotation.x=eR;}
function poseStand(p,t){p.hip.position.y=.86+Math.sin(t*2+p.phase)*.004;p.torso.rotation.set(0,0,0);p.legs[0].rotation.set(0,0,-.04);p.legs[1].rotation.set(0,0,.04);
  p.arms[0].rotation.set(.05,0,-.12);p.arms[1].rotation.set(.05,0,.12);joints(p,0,0,-.15,-.15);p.head.rotation.set(0,Math.sin(t*.6+p.phase)*.15,0);}
function poseReady(p,t){p.hip.position.y=.74;p.torso.rotation.set(.35,0,0);p.legs[0].rotation.set(-.45,0,-.18);p.legs[1].rotation.set(-.45,0,.18);
  p.arms[0].rotation.set(-.7,0,-.25);p.arms[1].rotation.set(-.7,0,.25);joints(p,.75,.75,-.6,-.6);p.head.rotation.set(-.3,0,0);}
function poseRun(p,ph,amp=.9){const s=Math.sin(ph),c=Math.cos(ph);p.hip.position.y=.84+Math.abs(c)*.05*amp;p.torso.rotation.set(.18*amp,0,0);
  p.legs[0].rotation.set(-s*.9*amp,0,0);p.legs[1].rotation.set(s*.9*amp,0,0);
  p.arms[0].rotation.set(s*.9*amp,0,-.1);p.arms[1].rotation.set(-s*.9*amp,0,.1);
  joints(p,Math.max(0,c)*1.3*amp+.15,Math.max(0,-c)*1.3*amp+.15,-1.2,-1.2);p.head.rotation.set(0,0,0);}
function poseCrouch(p,t){p.hip.position.y=.5;p.torso.rotation.set(.5,0,0);p.legs[0].rotation.set(-1.25,0,-.35);p.legs[1].rotation.set(-1.25,0,.35);
  p.arms[0].rotation.set(-1.1,0,-.15);p.arms[1].rotation.set(-1.1,0,.15);joints(p,2,2,-.5,-.5);p.head.rotation.set(-.4,0,0);}
function poseArmsUp(p){p.arms[0].rotation.set(-2.9,0,-.25);p.arms[1].rotation.set(-2.9,0,.25);p.arms[0].userData.elbow.rotation.x=-.15;p.arms[1].userData.elbow.rotation.x=-.15;}
function poseSit(p,t){p.hip.position.y=.5;p.torso.rotation.set(-.06,0,0);p.legs[0].rotation.set(-1.5,0,-.08);p.legs[1].rotation.set(-1.5,0,.08);
  p.arms[0].rotation.set(-.5,0,0);p.arms[1].rotation.set(-.5,0,0);joints(p,1.5,1.5,-.9,-.9);p.head.rotation.set(0,Math.sin(t*.7+p.phase)*.35,0);}

/* the batter holds the bat in a rig that swings about the chest */
const batter=person({shirt:'#f4f4f0',stripe:'#1f4d2c',pants:'#f4f4f0',shin:'#f4f4f0',skin:SKIN[0],cap:'#1f4d2c',shoe:'#e9e9e9'});
batter.arms.forEach(a=>a.visible=false);
const bp=new THREE.Group();bp.position.set(0,.47,0);batter.torso.add(bp);
{
  const grip=new V3(0,-.5,.32);
  for(const s of[-1,1]){
    const sh=new V3(.2*s,0,0),d=grip.clone().sub(sh),len=d.length(),q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),d.clone().normalize().negate());
    const up=new THREE.Mesh(capG(.05,len*.4),mat('#f4f4f0'));up.position.copy(sh).addScaledVector(d,.27);up.quaternion.copy(q);up.castShadow=true;bp.add(up);
    const fore=new THREE.Mesh(capG(.043,len*.38),mat(SKIN[0]));fore.position.copy(sh).addScaledVector(d,.72);fore.quaternion.copy(q);fore.castShadow=true;bp.add(fore);
    const g=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),mat('#f4f4f0'));g.position.set(grip.x+.03*s,grip.y+.05*(s+1),grip.z);bp.add(g);
  }
  const bat=new THREE.Group();bat.position.copy(grip);bp.add(bat);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.3,6),mat('#2b2b2e'));handle.position.y=-.02;bat.add(handle);
  box(.11,.6,.06,'#e4c28c',0,-.46,0,bat);box(.112,.04,.062,'#c1121f',0,-.3,0,bat,false);
}
const bowler=person({shirt:'#f08a24',pants:'#3a3f55',skin:SKIN[1]});
const keeper=person({shirt:'#2e7d4f',pants:'#4a3a2e',skin:SKIN[3],gloves:'#f2f2f2',cap:'#f2f2f2'});
const FDEF=[
  {name:'Montu',home:[-6.5,2.5],o:{shirt:'#f2c94c',pants:'#2f4f6f',skin:SKIN[2]}},
  {name:'Pinku',home:[6.5,.5],o:{shirt:'#8e5bd1',pants:'#3a3a3a',skin:SKIN[4]}},
  {name:'Rana',home:[-8,-14],o:{shirt:'#2f80c9',pants:'#c9b28a',skin:SKIN[5]}},
  {name:'Mithu',home:[8,-15],o:{shirt:'#e2557a',pants:'#2d2d50',skin:SKIN[2],pony:true}},
];
const F=[];
const mkF=(p,name,home,extra={})=>{const f=Object.assign({P:p,name,home:new V3(home[0],0,home[1]),speed:4.8,reach:.8,tried:false,stun:0,moving:false},extra);p.g.position.copy(f.home);F.push(f);return f;};
FDEF.forEach(d=>mkF(person(d.o),d.name,d.home));
const fBowler=mkF(bowler,'Bablu',[.6,-3.4],{isBowler:true});
const fKeeper=mkF(keeper,'Tublu',[.15,9.6],{isKeeper:true,speed:4.6,reach:1});

/* ---------------- park props: trunks, canopies, benches, spectators ---------------- */
const PROPS=[];
PARK_TREES.forEach(t=>{
  const[x,z]=wx2l(t.x,t.z),s=t.s||1;
  if(Math.abs(x)>32||z<ROPE.zF-10||z>HEDGE.zB+4)return;
  const tall=t.t==='coco'||t.t==='areca';
  PROPS.push({x0:x-.28,x1:x+.28,y0:0,y1:tall?11*s:3*s,z0:z-.28,z1:z+.28,e:.35,trunk:true,tall});
  if(tall)PROPS.push({x0:x-2.8*s,x1:x+2.8*s,y0:10.5*s,y1:13.5*s,z0:z-2.8*s,z1:z+2.8*s,e:.15,canopy:true});
  else PROPS.push({x0:x-3.6*s,x1:x+3.6*s,y0:3.2*s,y1:9.5*s,z0:z-3.6*s,z1:z+3.6*s,e:.15,canopy:true});
});
const benchSpots=[];
BENCHES.forEach(([bxw,bzw,ry])=>{const[x,z]=wx2l(bxw,bzw);if(Math.abs(x)<30&&z>ROPE.zF-6&&z<HEDGE.zB+2){
  const along=Math.abs(Math.cos(ry))>.5;/* benches on the north and south sides run across the field */
  PROPS.push(along?{x0:x-.95,x1:x+.95,y0:0,y1:.98,z0:z-.3,z1:z+.3,e:.4}:{x0:x-.3,x1:x+.3,y0:0,y1:.98,z0:z-.95,z1:z+.95,e:.4});
  benchSpots.push({x,z,along});}});
const sitters=[];
{
  const pickB=(fx,fz)=>benchSpots.slice().sort((a,b)=>Math.hypot(a.x-fx,a.z-fz)-Math.hypot(b.x-fx,b.z-fz))[0];
  const spots=[[0,16],[-26,-4],[26,-8]];
  const looks=[{shirt:'#f5f5f0',pants:'#3b5ba5',skin:SKIN[4],hair:'#cfcac0',name:'Ghosh kaku'},{shirt:'#ff6b6b',pants:'#2d3047',skin:SKIN[0],scale:.72},{shirt:'#4ecdc4',pants:'#5b4a3a',skin:SKIN[5],pony:true,scale:.72}];
  spots.forEach(([fx,fz],i)=>{const b=pickB(fx,fz);if(!b)return;const p=person(looks[i]);
    p.g.position.set(b.x,i?.18:.02,b.z);p.g.rotation.y=Math.atan2(-b.x,-b.z+(i?0:4));p.stand=0;p.line=looks[i].name||'';sitters.push(p);});
}

/* ---------------- ball, markers, particles ---------------- */
const ballMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(RB,2),mat('#d8262a',{roughness:.45}));ballMesh.castShadow=true;root.add(ballMesh);
{const tape=new THREE.Mesh(new THREE.TorusGeometry(RB*1.01,.022,4,14),mat('#ffe14d'));ballMesh.add(tape);}
const blob=new THREE.Mesh(new THREE.CircleGeometry(.2,12),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.22,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.renderOrder=4;root.add(blob);
const trail=[];for(let i=0;i<7;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(RB*(.85-i*.09),1),new THREE.MeshBasicMaterial({color:'#ff6a3d',transparent:true,opacity:0,depthWrite:false}));root.add(m);trail.push(m);}
const trailPts=[];
const ball={p:new V3(),v:new V3(),groundB:0,wallB:0,treeB:0,hit:false,held:null,flight:null,stopped:false,wide:false,overRope:false};
const ring=new THREE.Mesh(new THREE.RingGeometry(.22,.32,18),new THREE.MeshBasicMaterial({color:'#fbf8f1',transparent:true,opacity:0,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.09;ring.renderOrder=5;root.add(ring);
const arrow=new THREE.Group();root.add(arrow);
{const am=new THREE.MeshBasicMaterial({color:'#f3a712',transparent:true,opacity:.85,depthWrite:false});
 const sh=new THREE.Mesh(new THREE.PlaneGeometry(.16,1.6),am);sh.rotation.x=-Math.PI/2;sh.position.z=-.8;arrow.add(sh);
 const hd=new THREE.Mesh(new THREE.CircleGeometry(.34,3),am);hd.rotation.x=-Math.PI/2;hd.rotation.z=Math.PI/2;hd.position.z=-1.75;arrow.add(hd);
 arrow.userData.mat=am;arrow.position.set(CONTACT_X,.1,CONTACT_Z-.6);arrow.renderOrder=5;}
const tgt=new THREE.Group();root.add(tgt);
{const tm=new THREE.MeshBasicMaterial({color:'#46e0cf',transparent:true,opacity:.95,depthWrite:false});
 const r=new THREE.Mesh(new THREE.RingGeometry(.3,.4,22),tm);r.rotation.x=-Math.PI/2;tgt.add(r);
 for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.PlaneGeometry(.06,.22),tm);t.rotation.x=-Math.PI/2;t.rotation.z=i*Math.PI/2;t.position.set(Math.sin(i*Math.PI/2)*.52,0,Math.cos(i*Math.PI/2)*.52);tgt.add(t);}
 tgt.userData.mat=tm;tgt.visible=false;tgt.renderOrder=5;}
[ballMesh,blob,ring,arrow,tgt,...trail].forEach(m=>m.visible=false);
const bits=[];
function spawnBits(pos,color,n,sp=3,size=.06){for(let i=0;i<n;i++){const m=new THREE.Mesh(UNITBOX,mat(color));m.scale.setScalar(size*(.6+Math.random()*.8));m.position.copy(pos);root.add(m);
  bits.push({m,v:new V3(rand(-1,1)*sp,rand(.4,1.2)*sp,rand(-1,1)*sp),life:rand(.6,1.2)});}}
function updBits(dt){for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.life-=dt;b.v.y-=GRAV*dt;b.m.position.addScaledVector(b.v,dt);if(b.m.position.y<.02){b.m.position.y=.02;b.v.multiplyScalar(.5);}
  b.m.rotation.x+=dt*6;b.m.rotation.z+=dt*4;if(b.life<=0){root.remove(b.m);bits.splice(i,1);}}}

/* floodlights: four poles at the corners of the field; their pools of light go into the shared
   street-lamp light map, so the field is lit at night without adding real lights to the scene */
const floodMat=mat('#f8f4e8',{emissive:'#fff3d6',emissiveIntensity:0});
const FLOODS=[[-19.5,-22],[19.5,-22],[-19.5,14],[19.5,14]];
for(const[x,z]of FLOODS){box(.18,11,.18,'#9aa0a3',x,5.5,z);box(1.3,.5,.35,floodMat,x,11.1,z);}
{
  const g=lampCv.getContext('2d'),sx=lampCv.width/LMAP.w;g.globalCompositeOperation='lighter';
  const pool=(lx,lz,r,a)=>{const w=L2W(tmpA.set(lx,0,lz)),cx=(w.x-LMAP.x0)*sx,cy=(w.z-LMAP.z0)*sx,R=r*FT*sx;
    const gr=g.createRadialGradient(cx,cy,0,cx,cy,R);gr.addColorStop(0,`rgba(255,236,200,${a})`);gr.addColorStop(.6,`rgba(250,226,186,${a*.6})`);gr.addColorStop(1,'rgba(240,210,170,0)');
    g.fillStyle=gr;g.fillRect(cx-R,cy-R,2*R,2*R);};
  pool(0,-5,30,.5);pool(0,6,14,.35);FLOODS.forEach(([x,z])=>pool(x*.55,z*.55,18,.3));
  lampTex.needsUpdate=true;
}
TIME_HOOKS.push(on=>{floodMat.emissiveIntensity=on*3;});
/* ---------------- sound: small synthesised effects ---------------- */
let actx=null,soundOn=true;
function ac(){if(!actx){try{actx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(actx&&actx.state==='suspended')actx.resume();return actx;}
function noise({dur=.1,f=1000,q=1,type='bandpass',gain=.4,delay=0}={}){const a=actx;if(!a||!soundOn)return;const n=Math.ceil(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=a.createBufferSource();s.buffer=b;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const g=a.createGain();g.gain.value=gain;s.connect(fl).connect(g).connect(a.destination);s.start(a.currentTime+delay);}
function tone({f0=440,f1=220,dur=.1,type='sine',gain=.3,delay=0}={}){const a=actx;if(!a||!soundOn)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+delay;o.type=type;
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02);}
const sfx={
  bat:(v=1)=>{noise({dur:.08,f:1800,q:2,gain:.55*v});tone({f0:900,f1:300,dur:.09,type:'triangle',gain:.25*v});},
  bounce:v=>noise({dur:.05,f:500,q:1.5,gain:.25*v}),
  swish:()=>noise({dur:.16,f:2600,q:.8,type:'highpass',gain:.12}),
  stumps:()=>{for(let i=0;i<4;i++)tone({f0:rand(500,900),f1:rand(200,350),dur:.12,type:'square',gain:.07,delay:i*.04});noise({dur:.15,f:1200,q:2,gain:.3});},
  catch:()=>noise({dur:.06,f:300,q:1,type:'lowpass',gain:.5}),
  run:()=>noise({dur:.04,f:700,q:3,gain:.15}),
  wall:v=>noise({dur:.08,f:420,q:1.2,gain:.3*v}),
  leaves:()=>noise({dur:.35,f:3500,q:.6,type:'highpass',gain:.14}),
  cheer:(v=1)=>{for(let i=0;i<5;i++)noise({dur:.9,f:rand(900,1700),q:.7,gain:.07*v,delay:i*.05});},
  groan:()=>{tone({f0:220,f1:110,dur:.7,type:'sawtooth',gain:.05});tone({f0:180,f1:95,dur:.75,type:'sawtooth',gain:.04,delay:.05});},
};

/* ---------------- HUD (built here so the game stays self-contained) ---------------- */
const css=document.createElement('style');css.textContent=`
#pc{position:fixed;inset:0;z-index:7;pointer-events:none;font-family:"Anek Bangla",system-ui,sans-serif;color:#f3efe0}
#pc [hidden]{display:none!important}
#pc button{pointer-events:auto;font-family:inherit;cursor:pointer}
#pc .pnl{background:rgba(16,38,26,.84);border:1px solid rgba(243,239,224,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:14px}
#pcSB{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 14px}
#pcSB .row{display:flex;gap:18px}#pcSB .row div{display:flex;flex-direction:column;align-items:center;min-width:64px}
#pcSB small{font-size:11px;letter-spacing:.08em;color:#b9c3b0}#pcSB b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
#pcDots{display:flex;gap:5px}#pcDots i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;background:rgba(255,255,255,.12)}
#pcDots i.e{background:rgba(255,255,255,.06)}#pcDots i.w{background:#c0392b}#pcDots i.r4{background:#2f80c9}#pcDots i.r6{background:#f0a91b;color:#1d1606}#pcDots i.r1,#pcDots i.r2,#pcDots i.r3{background:#3d7a46}
#pcTools{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:46vw;padding:6px}
#pcTools button{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#f3efe0;border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600}
#pcTools button.on{background:#f0a91b;color:#1d1606;border-color:#f0a91b}#pcTools button.exit{background:#c0392b;border-color:#c0392b}
#pcRules{position:absolute;left:calc(10px + env(safe-area-inset-left,0px));top:calc(10px + env(safe-area-inset-top,0px));max-width:270px;padding:10px 12px;font-size:12.5px;line-height:1.45;color:#d8dccf}
#pcRules b{display:block;color:#f0a91b;font-size:12px;letter-spacing:.06em;margin-bottom:3px}
#pcNext{position:absolute;top:calc(98px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);font-size:13px;color:#e9e4d2;text-shadow:0 1px 6px rgba(0,0,0,.6);white-space:nowrap}
#pcKeys{position:absolute;left:calc(10px + env(safe-area-inset-left,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:10px 12px;font-size:12.5px;color:#cfd5c6}
#pcKeys kbd{font-family:inherit;font-weight:700;color:#fff;background:rgba(255,255,255,.12);border-radius:5px;padding:0 6px;text-align:center}
#pcPop{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;opacity:0;pointer-events:none}
#pcPop.anim{animation:pcPop 2.2s ease forwards}
@keyframes pcPop{0%{opacity:0;transform:translate(-50%,-40%) scale(.8)}10%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}18%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-56%)}}
#pcPop .big{font-size:clamp(34px,6vw,64px);font-weight:800;font-stretch:118%;letter-spacing:.02em;text-shadow:0 3px 22px rgba(0,0,0,.6)}
#pcPop .big.gold{color:#f0a91b}#pcPop .big.out{color:#ff6b5b}#pcPop .sub{font-size:clamp(14px,1.8vw,19px);color:#f6e7c4;margin-top:4px;text-shadow:0 1px 10px rgba(0,0,0,.7)}
#pcTiming{position:absolute;transform:translate(-50%,-100%);font-weight:800;font-size:18px;color:#f0a91b;text-shadow:0 2px 10px rgba(0,0,0,.6);opacity:0;pointer-events:none}
#pcTiming.show{animation:pcTime 1s ease forwards}#pcTiming.perfect{color:#7CFFB2}#pcTiming.bad{color:#ff6b5b}
@keyframes pcTime{0%{opacity:0;margin-top:6px}15%{opacity:1;margin-top:0}75%{opacity:1}100%{opacity:0;margin-top:-14px}}
.pcBubble{position:absolute;transform:translate(-50%,-100%);background:#fbfaf3;color:#1d1606;font-weight:700;font-size:13px;padding:5px 9px;border-radius:9px;white-space:nowrap;opacity:0;pointer-events:none}
.pcBubble.show{opacity:1}
#pcHint{position:absolute;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:14px;font-weight:700;letter-spacing:.05em;background:rgba(16,38,26,.8);padding:7px 14px;border-radius:999px;opacity:0;transition:opacity .25s;white-space:nowrap}
#pcHint.show{opacity:1}
#pcBowl{position:absolute;left:50%;bottom:calc(64px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:10px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:auto;min-width:min(440px,92vw)}
#pcTypes{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}#pcTypes button{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#f3efe0;border-radius:8px;padding:6px 10px;font-size:12.5px;font-weight:700}
#pcTypes button.on{background:#f0a91b;color:#1d1606;border-color:#f0a91b}
.pcMeter{position:relative;width:min(360px,80vw);height:14px;border-radius:7px;background:linear-gradient(90deg,#c0392b 0,#e8a33a 27%,#3fb26b 41.8%,#3fb26b 58.2%,#e8a33a 73%,#c0392b 100%)}
#pcNeedle{position:absolute;top:-5px;width:4px;height:24px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 0 1.5px #1d1606}
#pcRead{font-size:13px;font-weight:700;letter-spacing:.06em;color:#e9e4d2}
#pcBowlBtn{appearance:none;border:0;background:#f0a91b;color:#1d1606;font-weight:800;border-radius:10px;padding:8px 22px;font-size:15px}
#pcAct{position:absolute;right:calc(24px + env(safe-area-inset-right,0px));bottom:calc(24px + env(safe-area-inset-bottom,0px));width:104px;height:104px;border-radius:50%;border:3px solid rgba(255,255,255,.5);background:rgba(240,169,27,.92);color:#1d1606;font-weight:800;font-size:17px;letter-spacing:.04em}
#pcAct.run{background:rgba(63,178,107,.95)}#pcAct.bowl{background:rgba(70,224,207,.92)}#pcAct.idle{opacity:.45}
#pcAim{position:absolute;right:calc(140px + env(safe-area-inset-right,0px));bottom:calc(34px + env(safe-area-inset-bottom,0px));display:flex;gap:6px}
#pcAim button{appearance:none;border:1px solid rgba(255,255,255,.25);background:rgba(16,38,26,.75);color:#f3efe0;border-radius:10px;padding:9px 11px;font-size:13px;font-weight:700}
#pcAim button.on{background:#f0a91b;color:#1d1606}
#pcStickZone{position:absolute;left:0;top:30%;bottom:0;width:45%;pointer-events:auto;touch-action:none}
#pcStick{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,25,16,.28);pointer-events:none}
#pcStick .knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(240,169,27,.85)}
#pcStick .lb{position:absolute;font-size:10px;font-weight:800;color:rgba(255,255,255,.7)}#pcStick .lb.on{color:#f0a91b}
#pcOverlay{position:absolute;inset:0;display:grid;place-items:center;padding:18px;background:radial-gradient(ellipse at 50% 45%,rgba(10,24,16,.25),rgba(10,24,16,.85));pointer-events:auto;overflow:auto}
#pcCard{max-width:640px;width:100%;background:rgba(16,38,26,.92);border:1px solid rgba(243,239,224,.18);border-radius:18px;padding:20px 22px;max-height:calc(100vh - 36px);overflow:auto}
#pcCard h2{margin:0 0 4px;font-size:32px;font-weight:800;font-stretch:118%}#pcCard h2 span{color:#f0a91b}
#pcCard .bn{color:#f0a91b;font-weight:600;font-size:16px}
#pcCard .lede{margin:6px 0 12px;color:#dfe3d6;font-size:15px}
#pcCard h3{margin:14px 0 6px;font-size:12px;letter-spacing:.1em;color:#f0a91b}
#pcCard ul{margin:0;padding-left:18px;font-size:14px;line-height:1.5;color:#dfe3d6}
#pcCard .modes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#pcCard .go{appearance:none;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#f3efe0;border-radius:12px;padding:12px;text-align:left;display:flex;flex-direction:column;gap:3px;font-size:13px}
#pcCard .go b{font-size:17px;font-weight:800}#pcCard .go small{color:#f0a91b;font-size:11.5px}
#pcCard .go:hover,#pcCard .go:focus-visible{border-color:#f0a91b;outline:none}#pcCard .go.primary{background:#f0a91b;color:#1d1606;border-color:#f0a91b;text-align:center;align-items:center}
#pcCard .row2{display:flex;gap:8px;margin-top:14px}#pcCard .row2 .go{flex:1;align-items:center;text-align:center}
#pcCard .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}#pcCard .stats div{background:rgba(255,255,255,.06);border-radius:10px;padding:10px;text-align:center}
#pcCard .stats b{display:block;font-size:22px}#pcCard .stats span{font-size:12px;color:#b9c3b0}
#pcRotate{position:absolute;inset:0;display:grid;place-items:center;text-align:center;background:rgba(10,24,16,.94);pointer-events:auto;padding:24px}
#pcRotate .ph{font-size:46px;display:inline-block;animation:pcRot 2s ease-in-out infinite}@keyframes pcRot{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
#pcRotate button{appearance:none;border:0;border-radius:10px;padding:11px 18px;font-weight:800;margin:6px;background:#f0a91b;color:#1d1606}#pcRotate button.alt{background:rgba(255,255,255,.12);color:#f3efe0}
body.pc-pixel canvas#scene{image-rendering:pixelated}
@media (pointer:coarse){#pcKeys,#pcAim{display:none!important}}
@media (pointer:fine){#pcStickZone,#pcStick,#pcAct{display:none}}
@media (max-height:520px){#pcSB{left:calc(10px + env(safe-area-inset-left,0px));transform:none;padding:5px 10px;gap:3px}#pcNext{left:calc(14px + env(safe-area-inset-left,0px));transform:none}#pcTools [data-t=pixel],#pcTools [data-t=restart]{display:none}#pcSB b{font-size:16px}#pcSB .row{gap:10px}#pcDots i{width:17px;height:17px;font-size:10px}#pcRules{display:none}
  #pcNext{top:calc(66px + env(safe-area-inset-top,0px))}#pcTools{max-width:36vw}#pcTools button{padding:5px 8px;font-size:12px}#pcAct{width:86px;height:86px}#pcBowl{bottom:calc(10px + env(safe-area-inset-bottom,0px));padding:6px 8px;gap:5px}}
@media (max-width:760px){#pcRules{display:none}#pcTools{max-width:60vw}}
`;document.head.appendChild(css);
const hud=document.createElement('div');hud.id='pc';hud.hidden=true;hud.innerHTML=`
<div id="pcSB" class="pnl"><div class="row"><div><small id="pcLT">TARGET</small><b id="pcT">0</b></div><div><small>SCORE</small><b id="pcS">0/0</b></div><div><small>OVERS</small><b id="pcO">0.0 / 2 OV</b></div><div><small id="pcLN">NEED</small><b id="pcN">0</b></div></div><div id="pcDots"></div></div>
<div id="pcRules" class="pnl"></div>
<div id="pcTools" class="pnl"><button data-t="cam">Camera</button><button data-t="time">Time</button><button data-t="sound" class="on">Sound</button><button data-t="pixel">Pixel</button><button data-t="pause">Pause</button><button data-t="restart">Restart</button><button data-t="exit" class="exit">Exit</button></div>
<div id="pcNext"></div>
<div id="pcKeys" class="pnl"></div>
<div id="pcPop"></div><div id="pcTiming"></div><div id="pcBubble" class="pcBubble"></div>
<div id="pcHint"></div>
<div id="pcBowl" class="pnl" hidden><div id="pcTypes"></div><div class="pcMeter"><i id="pcNeedle"></i></div><div id="pcRead"></div><button id="pcBowlBtn">BOWL</button></div>
<div id="pcStickZone"></div><div id="pcStick"><i class="knob"></i><span class="lb" style="left:7px;top:44px">LEG</span><span class="lb" style="left:73px;top:44px">OFF</span><span class="lb" style="left:38px;top:5px">LOFT</span></div>
<div id="pcAim"><button id="pcAimL">◀ LEG</button><button id="pcLoft">▲ LOFT</button><button id="pcAimR">OFF ▶</button></div>
<button id="pcAct">SWING</button>
<div id="pcOverlay"><div id="pcCard"></div></div>
<div id="pcRotate" hidden><div><div class="ph">📱</div><p style="font-size:17px;margin:14px 0 8px">Turn your phone sideways to play</p><p style="color:#b9c3b0;font-size:14px;margin:0 0 12px">The game is laid out for landscape.</p><button id="pcRotBtn">Go landscape</button><button id="pcRotAnyway" class="alt">Play in portrait</button></div></div>`;
document.body.appendChild(hud);
const $p=id=>document.getElementById(id);

/* ---------------- game state ---------------- */
let state='intro',stateT=0,paused=false,clock=0;
const score={runs:0,wk:0,balls:0,target:22,log:[],fours:0,sixes:0,trees:0,best:0};
let thisBall={runs:0};
const swing={active:false,t:0,checked:false,phi:.15,aim:0,loft:false};
const run={at:'S',running:false,to:'N',prog:0,endAfter:false};
let delivery=null,ai=null,gm='bat',lastMode='bat',innings=1,inn1=null,camMode=0,pixelOn=false,portraitOK=false;
const input={left:false,right:false,up:false,tAim:0,tLoft:false};
const stick={on:false,id:null,x:0,y:0,cx:0,cy:0};
const bowlT={x:.1,z:3.6,type:0,locked:false,err:.85,lockM:.5,lockText:''};
const bowlKeys={up:false,down:false,left:false,right:false};
const humanBats=()=>gm!=='bowl',humanBowls=()=>gm!=='bat';
const setState=s=>{state=s;stateT=0;};
const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=Math.random();return(u-3)/Math.SQRT1_2;};
const lengthName=z=>z<2.2?'SHORT':z<4.6?'GOOD LENGTH':z<5.6?'FULL':'YORKER';
const lineName=x=>x>.48?'WIDE OF OFF':x>.18?'OUTSIDE OFF':x>-.2?'AT THE STUMPS':'DOWN LEG';
const DELIVS=[
  {n:'PACE',s:'PACE',sp:[14,16.5],w:3},{n:'MEDIUM',s:'MEDIUM',sp:[11.5,13],w:3},
  {n:'SLOWER BALL',s:'SLOWER',sp:[8.6,9.6],w:1.4},{n:'OFF SPIN',s:'OFF SPIN',sp:[9.2,10.6],w:1.6,spin:1},{n:'LEG SPIN',s:'LEG SPIN',sp:[9.2,10.6],w:1.6,spin:-1}
];
const RULES=['Past the rope: 4 along the grass, 6 in the air.','Over the park hedge on the full: out, and you go and fetch it.','Caught off a tree is still out. The trees by the rope are in play.'];
const SHORT_RULES='Past the rope: 4 along the grass, 6 in the air. Over the hedge on the full: out. Caught off a tree: still out.';

function aimVal(){if(stick.on)return stick.x<-.4?-1:stick.x>.4?1:0;return input.left&&!input.right?-1:input.right&&!input.left?1:input.left&&input.right?0:input.tAim;}
function loftVal(){return input.up||input.tLoft||(stick.on&&stick.y<-.45);}
function meterVal(){const u=(stateT/.55)%2;return u<1?u:2-u;}
function humanDelivery(){
  const d=DELIVS[bowlT.type],e=(bowlT.locked?bowlT.err:.85)*(d.sp[0]>13?1.15:1);
  const zb=clamp(bowlT.z+rand(-1,1)*1.3*e,.5,6.4);
  return Object.assign({},d,{speed:rand(...d.sp),xb:clamp(bowlT.x+rand(-1,1)*.4*e,-.95,1.05),zb,len:lengthName(zb)});
}
function moveTarget(dt){
  if(stick.on){const f=tmpA;camera.getWorldDirection(f);W2L(f.add(camera.position),tmpB);W2L(camera.position,tmpC);tmpB.sub(tmpC);tmpB.y=0;tmpB.normalize();
    const mx=-tmpB.z*stick.x-tmpB.x*stick.y,mz=tmpB.x*stick.x-tmpB.z*stick.y;
    bowlT.x=clamp(bowlT.x+mx*1.5*dt,-.9,1);bowlT.z=clamp(bowlT.z+mz*3.6*dt,.5,6.4);}
  const k=bowlKeys;
  bowlT.z=clamp(bowlT.z+((k.left?1:0)-(k.right?1:0))*3.2*dt,.5,6.4);
  bowlT.x=clamp(bowlT.x+((k.down?1:0)-(k.up?1:0))*1.3*dt,-.9,1);
}
function setType(i){if(state!=='aim'&&state!=='ready')return;bowlT.type=(i+DELIVS.length)%DELIVS.length;renderTypes();updNext();}
function renderTypes(){$p('pcTypes').innerHTML=DELIVS.map((d,i)=>`<button data-i="${i}" class="${i===bowlT.type?'on':''}">${d.s}</button>`).join('');}
function updNext(){
  const t=humanBowls()?DELIVS[bowlT.type].n:delivery?delivery.n:'';
  $p('pcNext').textContent=gm==='bat'?`Bablu runs in · ${t}`:gm==='bowl'?`You bowl to Bablu · ${t}`:innings===1?`P1 bats · P2 bowls · ${t}`:`P2 bats · P1 bowls · ${t}`;
}
function updKeys(){
  const rows=gm==='bat'?[['SPACE','swing, then run'],['← →','aim leg / off side'],['↑ hold','loft it'],['C · T','camera · time of day']]
    :gm==='bowl'?[['ARROWS','move the target'],['Q · E','change the ball'],['SPACE','run in, then lock'],['C · T','camera · time of day']]
    :[['← → ↑','batter aims and lofts'],['SPACE','batter swings, runs'],['WASD · Q/E','bowler aims, picks ball'],['F','bowler runs in, locks']];
  $p('pcKeys').innerHTML=rows.map(([k,v])=>`<kbd>${k}</kbd><span>${v}</span>`).join('')+'<kbd>ESC</kbd><span>pause</span>';
}
/* AI batter: reads the delivery, then times the swing with an error that grows with ball quality */
function planAI(){
  const d=delivery;let diff=0;
  if(d.zb<2.2)diff-=.1;else if(d.zb<4.6)diff+=.25;else if(d.zb<5.6)diff+=.08;else diff+=.4;
  if(Math.abs(d.xb-.05)<.22)diff+=.15;else if(d.xb>.55||d.xb<-.45)diff-=.15;
  if(d.speed>14)diff+=.15;if(d.spin)diff+=.12;
  const sigma=clamp(.38+diff*.6,.2,.95)*ZONE;
  const rr2=(score.target-score.runs)/Math.max(1,MAX_BALLS-score.balls);
  let aim=d.xb>.25?1:d.xb<-.1?-1:0;if(Math.random()<.3)aim=rpick([-1,0,1]);
  const loft=Math.random()<clamp(.15+(rr2-1.4)*.3,.08,.65);
  if(loft&&Math.random()<.35)aim=rpick([-1,1]);else if(loft)aim=0;
  ai={offset:gauss()*sigma,leave:d.xb>.55&&Math.random()<.5,aim,loft,swung:false,check:0};
}
function aiRun(dt){
  if(!ai||run.running||ball.held||ball.flight||!ball.hit||thisBall.runs>=3)return;
  ai.check-=dt;if(ai.check>0)return;ai.check=.1;
  const dest=run.at==='S'?N_Z:BAT_Z;let best=9;
  for(const f of F){if(f.stun>.3)continue;const ic=intercept(f);best=Math.min(best,ic.t+.38+Math.hypot(ic.x,ic.z-dest)/16.5);}
  if(best>(BAT_Z-N_Z)/RUN_SPEED*.85+.4)tryRun();
}
function chooseDelivery(){
  const tot=DELIVS.reduce((a,d)=>a+d.w,0);let r=Math.random()*tot,d=DELIVS[0];
  for(const x of DELIVS){if((r-=x.w)<=0){d=x;break;}}
  const lr=Math.random(),zb=lr<.22?rand(.8,2.2):lr<.8?rand(2.6,4.6):rand(4.8,5.8);
  return Object.assign({},d,{speed:rand(...d.sp),xb:rand(-.42,.5),zb,len:lr<.22?'short':lr<.8?'good length':'full'});
}
function newMatch(keepTarget){
  Object.assign(score,{runs:0,wk:0,balls:0,log:[],fours:0,sixes:0,trees:0,best:0});
  if(!keepTarget)score.target=gm==='pvp'?0:TARGET[0]+((Math.random()*(TARGET[1]-TARGET[0]+1))|0);
  updHUD();updKeys();nextBall();
  if(gm==='pvp')pop(innings===1?'P1 BATS':'P2 BATS',innings===1?'P2 bowls. Set a total.':`Target ${score.target}`,'gold');
  else pop(`TARGET ${score.target}`,gm==='bat'?`Bablu's side made ${score.target-1}`:`Stop Bablu getting ${score.target}`,'gold');
}
function nextBall(){
  Object.assign(ball,{hit:false,held:fBowler,flight:null,groundB:0,wallB:0,treeB:0,stopped:false,wide:false,overRope:false});
  swing.active=false;swing.checked=false;run.running=false;run.endAfter=false;thisBall={runs:0};
  F.forEach(f=>{f.tried=false;f.stun=0;});
  resetStumps(stumpsS);resetStumps(stumpsN);
  delivery=humanBowls()?null:chooseDelivery();bowlT.locked=false;ai=null;
  updNext();setState('ready');
}
const handLocal=(f,i,out)=>{f.P.hands[i].getWorldPosition(out);return W2L(out,out);};
/* ---------- delivery ---------- */
function releaseBall(){
  if(humanBowls())delivery=humanDelivery();
  const d=delivery;handLocal(fBowler,0,ball.p);ball.p.y=Math.max(ball.p.y,1.9);
  const x0=ball.p.x,y0=ball.p.y,z0=ball.p.z,t1=(d.zb-z0)/d.speed;
  ball.v.set((d.xb-x0)/t1,(.5*GRAV*t1*t1-(y0-RB))/t1,d.speed);
  ball.held=null;
  ring.position.set(d.xb,.09,d.zb);ring.material.opacity=.9;ring.scale.setScalar(1.6);
  setState('delivery');
  if(!humanBats())planAI();
}
function trySwing(aim=aimVal(),loft=loftVal()){
  if(state!=='delivery'||swing.active)return;
  sfx.swish();Object.assign(swing,{active:true,t:0,checked:false,aim,loft});
}
function contactCheck(){
  swing.checked=true;
  if(state!=='delivery'||ball.hit)return;
  const back=swing.t-CONTACT_T,bz=ball.p.z-ball.v.z*back,bx=ball.p.x,by=ball.p.y,dz=bz-CONTACT_Z;
  if(Math.abs(dz)>ZONE||Math.abs(bx-CONTACT_X)>1||by>1.85||ball.groundB===0&&bz<3)return;
  doHit(dz/ZONE);
}
function doHit(q){
  const aq=Math.abs(q),aim=swing.aim,loft=swing.loft;let label,cls='';
  if(aq<.28){label='PERFECT';cls='perfect';}else if(aq<.62)label=q<0?'EARLY':'LATE';else{label=q<0?'TOO EARLY':'EDGED';cls='bad';}
  let a,speed,vy;
  if(aq>.86&&q>0){a=Math.PI+rand(-.7,.7);speed=rand(6,9);vy=rand(1.5,3.5);}
  else if(aq>.86){a=rand(-1.1,1.1);speed=rand(4,6);vy=rand(7,9.5);}
  else{const power=1-.6*q*q;a=aim*.5+q*.45+rand(-.06,.06);
    if(loft){speed=9+9.5*power;vy=6.2+3.8*power;}else{speed=11+12*power;vy=rand(-1.6,.2);}}
  ball.v.set(Math.sin(a)*speed,vy,-Math.cos(a)*speed);
  ball.p.z=Math.min(ball.p.z,CONTACT_Z+.4);ball.p.y=Math.max(ball.p.y,.3);
  ball.hit=true;ball.groundB=0;ball.wallB=0;ball.treeB=0;
  F.forEach(f=>{f.stun=f.isKeeper?.15:.32;});
  sfx.bat(aq<.28?1.2:.8);buzz(aq<.28?25:12);showTiming(label,cls);ring.material.opacity=0;
  setState('live');
}
/* ---------- running ---------- */
function tryRun(){if(state!=='live'||!ball.hit||run.running)return;run.running=true;run.to=run.at==='S'?'N':'S';run.prog=0;sfx.run();}
function updRun(dt){
  if(!run.running)return;
  run.prog+=RUN_SPEED*dt/(BAT_Z-N_Z);
  if(run.prog>=1){run.prog=1;run.running=false;run.at=run.to;if(state==='live'){thisBall.runs++;floatText('+1');sfx.run();}if(run.endAfter)endBall({kind:'runs'});}
}
const creaseZ=e=>e==='S'?BAT_Z:N_Z;
function batterPos(){if(!run.running)return creaseZ(run.at);return lerp(creaseZ(run.to==='N'?'S':'N'),creaseZ(run.to),run.prog);}
/* ---------- outcomes ---------- */
const MSG={
  four:[['FOUR!','Along the grass, over the rope'],['CHAAR!','Raced away to the rope']],
  six:[['SIX!','Clean over the rope'],['CHHOKKA!','Up and over, into the evening walkers']],
  bowled:[['BOWLED!','Stumps everywhere'],['BOWLED!','Straight through the gate']],
  caught:[['CAUGHT!','%n holds on'],['CAUGHT!','Safe hands from %n']],
  tree:[['TREE CATCH!','Off the branches into %n\'s hands. Out.']],
  hedge:[['OVER THE HEDGE!','On the full into the lane. Out, and you fetch it.'],['HEDGE PAAR!','Out. Mali kaku wants a word.']],
  runout:[['RUN OUT!','%n breaks the stumps']],
  dot:[['DOT BALL','Beaten!'],['DOT BALL','Tublu gathers it']],
  wide:[['WIDE','One run, and bowl it again'],['WIDE','Too far. Extra ball']],
};
function endBall(o){
  if(state==='dead'||state==='over')return;
  setState('dead');
  let runs=o.runs??thisBall.runs;const out=!!o.out;if(out&&o.kind!=='runout')runs=0;
  const legal=o.kind!=='wide';
  score.runs+=runs;if(legal)score.balls++;if(out)score.wk++;
  if(o.kind==='four')score.fours++;if(o.kind==='six')score.sixes++;score.best=Math.max(score.best,runs);
  if(legal)score.log.push(out?'W':String(runs));
  const pickM=k=>rpick(MSG[k]).map(s=>s.replace('%n',o.name||''));
  let big,sub;const mk=o.msg||o.kind;
  if(mk&&MSG[mk])[big,sub]=pickM(mk);
  else{big=runs===0?'NO RUN':runs===1?'1 RUN':`${runs} RUNS`;sub=runs===0?rpick(['Fielded','Straight to Montu','Good stop']):rpick(runs===1?['Ekta run, quick!','Quick single','Pushed and run']:['Daurao! Daurao!','Good running','Hard running between the wickets']);}
  if(o.kind==='dot'&&swing.active)sub='Played and missed';else if(o.kind==='dot'&&ai&&ai.leave)sub='Left alone';
  const cls=out?'out':(o.kind==='four'||o.kind==='six')?'gold':'';
  pop(big,sub,cls);window.__pcLast=big+' | '+sub;
  if(out){buzz([40,50,40]);gm==='bat'?sfx.groan():sfx.cheer(.9);F.forEach(f=>f.celebrate=1.4);}
  else if(o.kind==='four'||o.kind==='six'){gm==='bowl'?sfx.groan():sfx.cheer(o.kind==='six'?1.3:1);batter.celebrate=1.6;}
  updHUD();
}
function caught(f){ball.held=f;ball.v.set(0,0,0);sfx.catch();endBall({out:true,kind:ball.treeB>0?'tree':'caught',name:f.name});}
/* ---------- physics ---------- */
function physStep(dt){
  if(ball.held){handLocal(ball.held,ball.held.isBowler&&state!=='live'?0:1,ball.p);return;}
  if(ball.flight){const fl=ball.flight;fl.t+=dt;const u=Math.min(1,fl.t/fl.T);ball.p.lerpVectors(fl.from,fl.to,u);ball.p.y+=Math.sin(u*Math.PI)*fl.arc;if(u>=1)throwArrived();return;}
  const prevZ=ball.p.z;
  ball.v.y-=GRAV*dt;ball.p.addScaledVector(ball.v,dt);
  if(ball.p.y<RB){
    ball.p.y=RB;
    if(ball.v.y<-1.1){
      const imp=-ball.v.y;ball.v.y=imp*(ball.hit?GROUND.eHit:GROUND.eDel);
      const fr=(ball.hit?(imp<4?.93:.84):.9)*GROUND.fr;ball.v.x*=fr;ball.v.z*=fr;
      if(!ball.hit&&state==='delivery'&&ball.groundB===0&&delivery.spin)ball.v.x+=delivery.spin*rand(.8,1.5);
      ball.groundB++;sfx.bounce(Math.min(1,imp/8));
    }else{
      ball.v.y=0;const k=Math.max(0,1-GROUND.roll*dt);ball.v.x*=k;ball.v.z*=k;
      if(Math.hypot(ball.v.x,ball.v.z)<.25){ball.v.x=ball.v.z=0;ball.stopped=true;}
    }
  }
  if(!ball.hit){
    if(prevZ<STUMP_S&&ball.p.z>=STUMP_S&&Math.abs(ball.p.x)<.34&&ball.p.y<.86&&state==='delivery'){
      scatterStumps(stumpsS,new V3(ball.v.x*.1,0,1));sfx.stumps();ball.v.multiplyScalar(.3);endBall({out:true,kind:'bowled'});
    }
    return;
  }
  parkCollide(state==='live');
}
function collideBoxes(list,rules){
  const p=ball.p,v=ball.v;
  for(const b of list){
    if(p.x<b.x0-RB||p.x>b.x1+RB||p.y<b.y0-RB||p.y>b.y1+RB||p.z<b.z0-RB||p.z>b.z1+RB)continue;
    const c=[[p.x-(b.x0-RB),'x',-1],[(b.x1+RB)-p.x,'x',1],[p.y-(b.y0-RB),'y',-1],[(b.y1+RB)-p.y,'y',1],[p.z-(b.z0-RB),'z',-1],[(b.z1+RB)-p.z,'z',1]].sort((m,n)=>m[0]-n[0])[0];
    const[d,ax,sgn]=c;p[ax]+=d*sgn;
    if(v[ax]*sgn<0){
      const sp=Math.abs(v[ax]);v[ax]=sp*sgn*(b.e??.45);
      if(b.canopy){v.multiplyScalar(.55);}
      if(sp>1.5&&ball.hit){
        if(b.canopy||b.trunk){ball.treeB++;score.trees+=rules&&ball.treeB===1?1:0;b.canopy?sfx.leaves():sfx.wall(Math.min(1,sp/10));spawnBits(p.clone(),'#4f7f31',b.canopy?10:4,1.6,.07);
          if(rules&&ball.treeB===1)nearbySay(rpick(['Gaachh! Mind the tree!','Amar aam gaachh!','Ki shot re!']));}
        else{sfx.wall(Math.min(1,sp/10));if(rules)nearbySay(rpick(['Aste! Aste!','Bench-e lagbe!','Oi, dekhe!']));}
        ball.wallB++;
      }
    }
  }
}
/* the park: rope, hedge, trees and benches */
function parkCollide(rules){
  const p=ball.p;
  collideBoxes(PROPS,rules);
  if(!rules||state!=='live'||!ball.hit||ball.flight||ball.held)return;
  const beyond=Math.abs(p.x)>ROPE.x||p.z<ROPE.zF||p.z>ROPE.zB;
  if(!ball.overRope&&beyond){
    if(ball.groundB>0){boundaryBits();endBall({runs:4,kind:'four'});return;}
    ball.overRope=true;ball.ropeB=ball.groundB;
  }
  if(ball.overRope){
    if(ball.groundB>ball.ropeB){
      if(beyond){boundaryBits();endBall({runs:6,kind:'six'});return;}
      ball.overRope=false; /* came back in off a tree: play on */
    }else if(Math.abs(p.x)>HEDGE.x||p.z>HEDGE.zB){
      spawnBits(p.clone(),'#3f6a2a',12,2,.07);sfx.leaves();endBall({out:true,kind:'hedge'});
      say(rpick(['Ball nei! Gone!','Amar phool gaachh!','Ke anbe ebar?']),sitters[0]?sitters[0].g.position.clone().setY(2.4):p.clone(),2.2);return;
    }
  }
}
function boundaryBits(){spawnBits(ball.p.clone().setY(.2),'#f3a712',14,2.2);}
/* ---------- fielding ---------- */
const FB={x0:-ROPE.x,x1:ROPE.x,z0:ROPE.zF,z1:ROPE.zB};
function intercept(f){
  const P0=f.P.g.position;let px=ball.p.x,pz=ball.p.z,vx=ball.v.x,vz=ball.v.z,py=ball.p.y,vy=ball.v.y;
  for(let t=0;t<3.5;t+=.05){
    px+=vx*.05;pz+=vz*.05;vy-=GRAV*.05;py+=vy*.05;
    if(py<0){py=0;vy=-vy*.5;vx*=.85;vz*=.85;}
    if(py<.3){vx*=.97;vz*=.97;}
    if(py<2.2&&(Math.hypot(px-P0.x,pz-P0.z)-.4)/f.speed<=t+.05)return{x:px,z:pz,t};
  }
  return{x:px,z:pz,t:3.5};
}
function walkTo(f,x,z,speed,dt){
  x=clamp(x,FB.x0+.35,FB.x1-.35);z=clamp(z,FB.z0+.2,FB.z1-.4);
  const p=f.P.g.position,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
  if(d<.06){f.moving=false;return 0;}
  const s=Math.min(d,speed*dt);p.x+=dx/d*s;p.z+=dz/d*s;
  f.P.g.rotation.y=lerpAngle(f.P.g.rotation.y,Math.atan2(dx,dz),.25);
  f.moving=s/dt>.4;f.P.phase+=dt*speed*2.3;return d;
}
function returnHome(dt){for(const f of F)if(!f.isBowler&&!f.isKeeper)walkTo(f,f.home.x,f.home.z,6.5,dt);fKeeper.P.g.position.lerp(fKeeper.home,1-Math.exp(-dt*4));}
function faceBall(f,k=.15){const p=f.P.g.position;f.P.g.rotation.y=lerpAngle(f.P.g.rotation.y,Math.atan2(ball.p.x-p.x,ball.p.z-p.z),k);}
function fieldLive(dt){
  if(ball.held||ball.flight)return;
  const cand=F.filter(f=>f.stun<=0&&(!f.isKeeper||ball.p.z>4||ball.v.z>0)).map(f=>Object.assign({f},intercept(f))).sort((a,b)=>a.t-b.t),chasers=cand.slice(0,2);
  for(const f of F){
    f.stun-=dt;const c=chasers.find(c=>c.f===f);
    if(c)walkTo(f,c.x,c.z,f.speed,dt);
    else if(f.isKeeper)walkTo(f,.4,STUMP_S+.45,f.speed,dt);
    else if(f.isBowler)walkTo(f,.45,STUMP_N-.45,f.speed,dt);
    else{f.moving=false;faceBall(f);}
  }
  for(const f of F){
    if(f.stun>0)continue;
    const hp=f.P.g.position,d=Math.hypot(ball.p.x-hp.x,ball.p.z-hp.z);
    if(ball.groundB===0&&!f.tried&&d<f.reach&&ball.p.y>.32&&ball.p.y<2.35){
      f.tried=true;f.reachUp=.4;
      const chance=clamp(1-ball.v.length()/22,.25,.85);
      if(Math.random()<chance){caught(f);return;}
      ball.v.set(-ball.v.x*.25+rand(-1,1),Math.abs(ball.v.y)*.3+1,-ball.v.z*.2);ball.groundB=1;f.stun=.5;sfx.catch();floatText('DROPPED!',true);continue;
    }
    if(ball.groundB>0&&d<.5&&ball.p.y<1){
      const sp=Math.hypot(ball.v.x,ball.v.z);
      if(sp>7.5&&Math.random()<Math.min(.6,(sp-7.5)/12)){ball.v.multiplyScalar(.6);ball.v.x+=rand(-2.5,2.5);f.stun=.6;floatText('MISFIELD');continue;}
      ball.held=f;f.holdT=0;ball.v.set(0,0,0);sfx.catch();return;
    }
  }
}
function updHolder(dt){
  const f=ball.held;if(!f||state!=='live')return;
  f.holdT+=dt;f.moving=false;if(f.holdT<.38)return;
  const end=run.running?run.to:(Math.abs(f.P.g.position.z-STUMP_S)<Math.abs(f.P.g.position.z-STUMP_N)?'S':'N');
  const to=new V3(.05,.75,end==='S'?STUMP_S:STUMP_N),from=handLocal(f,1,new V3()),dist=from.distanceTo(to);
  ball.held=null;ball.flight={from,to,T:Math.max(.25,dist/16.5),arc:Math.min(1.6,dist*.07),t:0,end,thrower:f};f.throwAnim=.35;
}
function throwArrived(){
  const fl=ball.flight;ball.flight=null;
  const rec=fl.end==='S'?fKeeper:fBowler,recNear=rec.P.g.position.distanceTo(tmpA.set(0,0,fl.end==='S'?STUMP_S:STUMP_N))<1.4;
  if(recNear){ball.held=rec;sfx.catch();}else{ball.v.set(0,0,0);ball.p.y=RB;}
  if(state!=='live')return;
  if(run.running&&run.to===fl.end&&run.prog>=.85){run.prog=1;run.running=false;run.at=run.to;thisBall.runs++;floatText('DIVES! SAFE');sfx.cheer(.5);endBall({kind:'runs'});}
  else if(run.running&&run.to===fl.end){scatterStumps(fl.end==='S'?stumpsS:stumpsN,new V3(0,0,fl.end==='S'?1:-1));sfx.stumps();endBall({out:true,kind:'runout',name:recNear?rec.name:fl.thrower.name});}
  else if(run.running)run.endAfter=true;else endBall({kind:'runs'});
}

/* ---------------- HUD ---------------- */
function updHUD(){
  $p('pcLT').textContent=score.target?'TARGET':'INNINGS';$p('pcT').textContent=score.target||`${innings} / 2`;
  $p('pcS').textContent=`${score.runs}/${score.wk}`;$p('pcO').textContent=`${Math.floor(score.balls/6)}.${score.balls%6} / 2 OV`;
  const need=Math.max(0,score.target-score.runs),left=MAX_BALLS-score.balls;
  $p('pcLN').textContent=score.target?'NEED':'BALLS LEFT';
  $p('pcN').textContent=!score.target?left:need?`${need} off ${left}`:(gm==='bowl'?'LOST':'WON');
  const start=Math.floor(Math.max(0,score.balls-1)/6)*6,cur=score.log.slice(score.balls===0?0:start,start+6);let h='';
  for(let i=0;i<6;i++){const v=cur[i];h+=v===undefined?'<i class="e"></i>':`<i class="${v==='W'?'w':'r'+v}">${v==='0'?'•':v}</i>`;}
  $p('pcDots').innerHTML=h;
}
function pop(big,sub,cls){const el=$p('pcPop');el.innerHTML=`<div class="big ${cls||''}">${big}</div>${sub?`<div class="sub">${sub}</div>`:''}`;el.classList.remove('anim');void el.offsetWidth;el.classList.add('anim');}
function project(local){L2W(local,tmpC);tmpC.project(camera);return[(tmpC.x+1)/2*innerWidth,(1-tmpC.y)/2*innerHeight,tmpC.z<1];}
function showTiming(label,cls){const el=$p('pcTiming');el.textContent=label;el.className=cls||'';const[x,y]=project(tmpA.set(BAT_XPOS,2.3,BAT_Z));el.style.left=x+'px';el.style.top=y+'px';void el.offsetWidth;el.classList.add('show');}
const floaters=[];
function floatText(t,bad){const el=document.createElement('div');el.className='pcBubble show';el.style.background=bad?'#c0392b':'#f0a91b';el.style.color=bad?'#fbfaf3':'#1d1606';el.textContent=t;hud.appendChild(el);
  const anchor=(bad?ball.p:batter.g.position).clone();anchor.y+=2.4;floaters.push({el,anchor,life:1.1});}
let bubble={life:0,pos:new V3()};
function say(text,pos,life=2){const el=$p('pcBubble');el.textContent=text;el.classList.add('show');bubble={life,pos:pos.clone()};}
function nearbySay(text){if(!sitters.length)return;const s=sitters.slice().sort((a,b)=>a.g.position.distanceTo(ball.p)-b.g.position.distanceTo(ball.p))[0];
  if(s.g.position.distanceTo(ball.p)<14){s.stand=1.8;say(text,s.g.position.clone().setY(2.3),1.8);}}
function actLabel(){
  if(humanBowls()&&state==='aim')return'BOWL';if(humanBowls()&&state==='runup'&&!bowlT.locked)return'LOCK';
  if(humanBats()&&state==='live')return'RUN';return humanBats()?'SWING':'BOWL';
}
function updOverlay(dt){
  if(bubble.life>0){bubble.life-=dt;const[x,y]=project(bubble.pos);const el=$p('pcBubble');el.style.left=x+'px';el.style.top=y+'px';if(bubble.life<=0)el.classList.remove('show');}
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.life-=dt;f.anchor.y+=dt*.8;const[x,y]=project(f.anchor);f.el.style.left=x+'px';f.el.style.top=y+'px';f.el.style.opacity=Math.min(1,f.life*3);if(f.life<=0){f.el.remove();floaters.splice(i,1);}}
  const PL=gm==='pvp'?(innings===1?['P1','P2']:['P2','P1']):null;let txt='',always=false;
  if(humanBowls()&&state==='aim'){txt=coarse?'LEFT STICK AIMS · TAP BOWL':gm==='pvp'?`${PL[1]}: WASD AIM · Q/E BALL · F BOWLS`:'ARROWS AIM · Q/E BALL · SPACE BOWLS';always=true;}
  else if(humanBowls()&&state==='runup'&&!bowlT.locked){txt=coarse?'TAP LOCK IN THE GREEN':`${gm==='pvp'?'F':'SPACE'} IN THE GREEN`;always=true;}
  else if(humanBats()&&state==='live'&&ball.hit&&!run.running)txt=(PL?PL[0]+': ':'')+(coarse?'TAP RUN TO TAKE A RUN':'SPACE = RUN');
  else if(humanBats()&&(state==='runup'||state==='ready'||state==='delivery')&&!swing.active)txt=(PL?PL[0]+': ':'')+(coarse?'TAP SWING AS THE BALL ARRIVES':'SPACE TO SWING');
  const h=$p('pcHint');h.textContent=txt;h.classList.toggle('show',!!txt&&(always||state==='live'||score.balls<2||(gm==='pvp'&&state==='delivery')));
  const canAct=(humanBowls()&&(state==='aim'||(state==='runup'&&!bowlT.locked)))||(humanBats()&&((state==='delivery'&&!swing.active)||state==='runup'||(state==='live'&&ball.hit&&!run.running)));
  const act=$p('pcAct'),lab=actLabel();act.textContent=lab;act.classList.toggle('idle',!canAct);act.classList.toggle('run',lab==='RUN');act.classList.toggle('bowl',lab==='BOWL'||lab==='LOCK');
  const bowling=humanBowls()&&(state==='aim'||state==='runup');
  $p('pcBowl').hidden=!bowling;$p('pcAim').hidden=bowling||!humanBats();
  if(bowling){$p('pcNeedle').style.left=(state==='runup'?(bowlT.locked?bowlT.lockM:meterVal()):.5)*100+'%';
    $p('pcRead').textContent=bowlT.locked?bowlT.lockText:`${lengthName(bowlT.z)} · ${lineName(bowlT.x)}`;$p('pcBowlBtn').textContent=state==='aim'?'BOWL':'LOCK';}
  const av=aimVal();$p('pcAimL').classList.toggle('on',av===-1);$p('pcAimR').classList.toggle('on',av===1);$p('pcLoft').classList.toggle('on',loftVal());
  const lb=document.querySelectorAll('#pcStick .lb');lb[0].classList.toggle('on',av===-1);lb[1].classList.toggle('on',av===1);lb[2].classList.toggle('on',loftVal());
}

/* ---------------- overlay cards ---------------- */
const REC_KEY='shantiban-park-cricket-record';
function loadRec(){try{return JSON.parse(localStorage.getItem(REC_KEY))||{};}catch(e){return{};}}
function saveRec(r){try{localStorage.setItem(REC_KEY,JSON.stringify(r));}catch(e){}}
function recLine(m){const r=loadRec()[m];return r?`Won ${r.w} · Lost ${r.l}${r.t?` · Tied ${r.t}`:''}`:'';}
function card(html){$p('pcCard').innerHTML=html;$p('pcOverlay').hidden=false;}
function showIntro(){
  setState('intro');
  card(`<div class="bn" lang="bn">শান্তিবন সিটি · পার্কে ক্রিকেট</div><h2>PARK <span>CRICKET</span></h2>
    <p class="lede">Two overs, three wickets, on the lawn in the Shantiban City park. Pick a side.</p>
    <h3>PLAY AS</h3>
    <div class="modes">
      <button class="go mode" data-m="bat"><b>BAT</b><span>Chase Bablu's score</span>${recLine('bat')?`<small>${recLine('bat')}</small>`:''}</button>
      <button class="go mode" data-m="bowl"><b>BOWL</b><span>Defend your total against Bablu</span>${recLine('bowl')?`<small>${recLine('bowl')}</small>`:''}</button>
      <button class="go mode" data-m="pvp"><b>2 PLAYERS</b><span>${coarse?'Pass and play on one screen':'One bats, one bowls, then swap'}</span></button>
    </div>
    <h3>BATTING</h3><ul>
      <li>${coarse?'Tap <b>SWING</b>':'Press <b>Space</b>'} as the ball reaches the bat. Early goes leg side, late goes off side.</li>
      <li>${coarse?'Hold the left stick: left for leg side, right for off side, up to loft':'Hold <b>←</b> or <b>→</b> to aim, hold <b>↑</b> to loft'}. ${coarse?'Tap <b>RUN</b>':'Press <b>Space</b> again'} to run.</li></ul>
    <h3>BOWLING</h3><ul>
      <li>${coarse?'Steer the target with the left stick (or tap the pitch), and tap a ball type to change the delivery':'Move the target with the arrows (<b>WASD</b> in 2 players) and pick a ball with <b>Q</b>/<b>E</b> or <b>1–5</b>'}.</li>
      <li>${coarse?'Tap <b>BOWL</b>, then <b>LOCK</b>':'Press <b>Space</b> (<b>F</b> in 2 players) to run in, and again to lock'} while the needle is in the green. Miss the green and the ball strays.</li></ul>
    <h3>PARK RULES</h3><ul>${RULES.map(r=>`<li>${r}</li>`).join('')}</ul>
    <div class="row2"><button class="go" id="pcBack">← BACK TO THE WALKTHROUGH</button></div>`);
  document.querySelectorAll('#pcCard .mode').forEach(b=>b.onclick=()=>startGame(b.dataset.m));
  $p('pcBack').onclick=()=>close();
  (document.querySelector(`#pcCard .mode[data-m="${lastMode}"]`)||document.querySelector('#pcCard .mode')).focus();
}
function showBreak(){
  inn1={runs:score.runs,wk:score.wk,trees:score.trees};
  card(`<h2>INNINGS <span>BREAK</span></h2><p class="lede">P1 made <b>${inn1.runs}/${inn1.wk}</b>. P2 needs <b>${inn1.runs+1}</b> off 2 overs.</p>
    <h3>SWAP SEATS</h3><ul><li>P2 bats: ${coarse?'left stick to aim, SWING and RUN on the right':'← → ↑ and Space'}.</li><li>P1 bowls: ${coarse?'left stick to aim, then BOWL and LOCK':'WASD to aim, Q/E for the ball, F to bowl'}.</li></ul>
    <div class="row2"><button class="go primary" id="pcGo">START INNINGS 2</button></div>`);
  $p('pcGo').onclick=()=>{$p('pcOverlay').hidden=true;innings=2;score.target=inn1.runs+1;newMatch(true);};$p('pcGo').focus();
}
function showOver(){
  const chased=score.runs>=score.target,tied=!chased&&score.runs===score.target-1,wl=MAX_WK-score.wk,bl=MAX_BALLS-score.balls,gap=score.target-score.runs;
  const n=(k,w)=>`${k} ${w}${k===1?'':'s'}`;let head,line;
  if(gm==='bat'){head=chased?'YOU <span>WON</span>':tied?'MATCH <span>TIED</span>':'BABLU <span>WINS</span>';
    line=chased?`Chased ${score.target} with ${n(wl,'wicket')} and ${n(bl,'ball')} to spare.`:tied?'Scores level. Cha break, then a rematch.':`Short by ${n(gap-1,'run')}. ${score.wk>=MAX_WK?'All out.':'Overs done.'}`;}
  else if(gm==='bowl'){head=chased?'BABLU <span>WINS</span>':tied?'MATCH <span>TIED</span>':'YOU <span>DEFENDED</span>';
    line=chased?`Bablu got there with ${n(bl,'ball')} to spare.`:tied?'Scores level. Bablu wants a rematch.':`Bablu finished on ${score.runs}/${score.wk}, ${n(gap,'run')} short.`;}
  else{head=chased?'P2 <span>WINS</span>':tied?'MATCH <span>TIED</span>':'P1 <span>WINS</span>';line=`P1 made ${inn1.runs}/${inn1.wk}. P2 made ${score.runs}/${score.wk}${chased?` with ${n(bl,'ball')} to spare`:''}.`;}
  if(gm!=='pvp'){const rec=loadRec(),r=rec[gm]||{w:0,l:0,t:0},won=gm==='bat'?chased:!chased&&!tied;if(tied)r.t++;else if(won)r.w++;else r.l++;rec[gm]=r;saveRec(rec);}
  const stats=gm==='pvp'?`<div><b>${inn1.runs}/${inn1.wk}</b><span>P1</span></div><div><b>${score.runs}/${score.wk}</b><span>P2</span></div><div><b>${inn1.trees+score.trees}</b><span>trees hit</span></div>`
    :`<div><b>${score.runs}/${score.wk}</b><span>${gm==='bowl'?"Bablu's score":'your score'}</span></div><div><b>${score.fours}·${score.sixes}</b><span>fours · sixes</span></div><div><b>${score.trees}</b><span>trees hit</span></div>`;
  card(`<h2>${head}</h2><p class="lede">${line}</p><div class="stats">${stats}</div>
    <div class="row2"><button class="go primary" id="pcGo">REMATCH</button><button class="go" id="pcMode">CHANGE MODE</button><button class="go" id="pcQuit">EXIT</button></div>`);
  $p('pcGo').onclick=()=>startGame(gm);$p('pcMode').onclick=showIntro;$p('pcQuit').onclick=()=>close();$p('pcGo').focus();
}
function startGame(m){
  ac();goLandscape();$p('pcOverlay').hidden=true;
  gm=m||lastMode;lastMode=gm;innings=1;inn1=null;
  renderTypes();newMatch();
}

/* ---------------- camera: three views, all perspective so the sky stays real ---------------- */
const camT=new V3(0,0,.5),camGoal=new V3(),pLook=new V3(0,.6,0),pPos=new V3(.9,3.6,14),isoDir=new V3(1,1.75,.45).normalize();
let zoom=1,zoomGoal=1;
/* what the camera follows: the ball (or its holder), held inside the field plus a small margin,
   so a big hit eases to a boundary view instead of chasing the ball into the treeline */
const FOCUS_M=2,_fp=new V3();
function focusPt(){const b=ball.held?ball.held.P.g.position:ball.p;
  return _fp.set(clamp(b.x,-ROPE.x-FOCUS_M,ROPE.x+FOCUS_M),clamp(b.y,0,8),clamp(b.z,ROPE.zF-FOCUS_M,ROPE.zB+FOCUS_M));}
/* keep the camera at least TREE_CLEAR from every trunk sideways, or above the canopy */
const TREE_CLEAR=7;
function clearOfTrees(c){
  for(const t of PROPS){if(!t.trunk)continue;const tx=(t.x0+t.x1)/2,tz=(t.z0+t.z1)/2,dx=c.x-tx,dz=c.z-tz,d=Math.hypot(dx,dz);
    if(d<TREE_CLEAR){const top=t.y1+(t.tall?4:7.5);if(c.y<top){const k=TREE_CLEAR/Math.max(d,.01);c.x=tx+dx*k;c.z=tz+dz*k;}}}
  c.y=Math.max(c.y,2.2);return c;
}
function updCamera(dt){
  const k=1-Math.exp(-dt*3.2),portrait=innerWidth/innerHeight<.8;
  if(state==='aim'||state==='runup'||state==='delivery'){camGoal.set(0,.5,2.6);zoomGoal=1.45;}
  else if(state==='live'||(state==='dead'&&ball.hit)){const b=focusPt();camGoal.set(lerp(-.4,b.x,.55),.5,lerp(BAT_Z,b.z,.6));zoomGoal=1;}
  else if(state==='intro'||state==='over'){camGoal.set(0,0,-4);zoomGoal=.62;}
  else{camGoal.set(0,0,.5);zoomGoal=.9;}
  camT.lerp(camGoal,k);zoom=lerp(zoom,zoomGoal,k);
  let pos,look,fov;
  if(camMode===0){fov=portrait?36:24;const D=(portrait?44:58)/zoom;pos=tmpA.copy(camT).addScaledVector(isoDir,D);look=camT;
    if(state==='intro'||state==='over'){const a=clock*.05;pos=tmpA.set(camT.x+Math.cos(a)*D*.75,D*.62,camT.z+Math.sin(a)*D*.75);}}
  else if(camMode===1){fov=portrait?52:42;const live=state==='live';pLook.lerp(live?tmpB.set(ball.p.x*.6,.6,Math.min(ball.p.z,4)):tmpB.set(-.3,.5,-.5),k);pPos.lerp(tmpC.set(2.3,4.3,13.4),k);pos=pPos;look=pLook;}
  else{fov=portrait?52:42;const t=focusPt(),follow=state==='live'||state==='delivery';
    const goal=follow?tmpC.set(t.x+5.5,Math.max(t.y,0)+6,t.z+8):tmpC.set(5,4.5,13);
    clearOfTrees(goal);pLook.lerp(follow?t:tmpB.set(0,.8,2),k);pPos.lerp(goal,k*.8);pos=pPos;look=pLook;}
  if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
  L2W(pos,camera.position);camera.lookAt(L2W(look,tmpB));G.uFocus.value.copy(tmpB);
}
function setCam(m){camMode=m;}

/* ---------------- main update ---------------- */
function update(dt){
  clock+=dt;stateT+=dt;const tNow=clock;
  if(swing.active){const prev=swing.t;swing.t+=dt;if(!swing.checked&&prev<CONTACT_T&&swing.t>=CONTACT_T)contactCheck();}
  switch(state){
    case'ready':{ball.held=fBowler;walkTo(fBowler,.35,-9.6,6,dt);fKeeper.P.g.position.lerp(fKeeper.home,1-Math.exp(-dt*4));returnHome(dt);
      if(run.at==='N'||run.running){run.running=true;run.to='S';run.prog=clamp(run.prog+dt*9/(BAT_Z-N_Z),0,1);if(run.prog>=1){run.running=false;run.at='S';}}
      if(stateT>1.25&&Math.abs(bowler.g.position.z+9.6)<.1&&!run.running)setState(humanBowls()?'aim':'runup');break;}
    case'aim':{ball.held=fBowler;moveTarget(dt);returnHome(dt);break;}
    case'runup':{returnHome(dt);const u=stateT/RUNUP_T;bowler.g.position.set(.35,0,lerp(-9.6,-4.5,u));bowler.g.rotation.y=0;if(stateT>=RUNUP_T-.18)releaseBall();break;}
    case'delivery':{
      if(!humanBats()&&ai&&!ai.swung&&!ai.leave&&!ball.held&&(ball.groundB>0||ball.p.z>3)&&ball.p.z+ball.v.z*CONTACT_T>=CONTACT_Z+ai.offset){ai.swung=true;trySwing(ai.aim,ai.loft);}
      const fu=Math.min(1,stateT/.8);bowler.g.position.z=lerp(-4.5,-3.4,1-(1-fu)*(1-fu));
      fKeeper.P.g.position.x=lerp(fKeeper.P.g.position.x,clamp(ball.p.x,-1.2,1.4),1-Math.exp(-dt*5));
      if(!ball.hit&&!ball.wide&&humanBowls()&&ball.p.z>=CONTACT_Z+.5&&(ball.p.x>WIDE_OFF||ball.p.x<WIDE_LEG))ball.wide=true;
      if(!ball.held&&ball.p.z>=fKeeper.P.g.position.z-.35&&Math.abs(ball.p.x-fKeeper.P.g.position.x)<1.3&&ball.p.y<2){ball.held=fKeeper;sfx.catch();endBall(ball.wide?{kind:'wide',runs:1}:{kind:'dot'});}
      if(stateT>2.6)endBall(ball.wide?{kind:'wide',runs:1}:{kind:'dot'});break;}
    case'live':{if(!humanBats())aiRun(dt);fieldLive(dt);updHolder(dt);updRun(dt);if(stateT>14){if(run.running)run.endAfter=true;else endBall({kind:'runs'});}break;}
    case'dead':{if(run.running)updRun(dt);for(const f of F)if(f.moving&&f!==ball.held)walkTo(f,f.P.g.position.x,f.P.g.position.z,0,dt);
      if(stateT>2.3){if((score.target&&score.runs>=score.target)||score.wk>=MAX_WK||score.balls>=MAX_BALLS){setState('over');if(gm==='pvp'&&innings===1)showBreak();else showOver();}else nextBall();}break;}
  }
  if(state!=='ready'&&state!=='aim'&&state!=='runup'&&state!=='intro'){for(let i=0;i<4;i++)physStep(dt/4);}else physStep(0);
  if(ball.held&&state==='dead')physStep(0);
  /* batter */
  const bz=batterPos();batter.g.position.set(run.running?-.9:BAT_XPOS,0,bz);
  if(run.running){batter.g.rotation.y=run.to==='N'?Math.PI:0;batter.phase+=dt*15;poseRun(batter,batter.phase,1);swing.phi=lerp(swing.phi,1.2,.2);}
  else{
    batter.g.rotation.y=lerpAngle(batter.g.rotation.y,Math.PI/2,.3);poseStand(batter,tNow);
    batter.hip.position.y=.8;batter.legs[0].rotation.set(-.15,0,-.18);batter.legs[1].rotation.set(.1,0,.18);
    let phi=.15,tw=0;
    if(swing.active){const t=swing.t;
      if(t<CONTACT_T){const u=t/CONTACT_T;phi=lerp(-1.9,.25,u*u);tw=lerp(.3,0,u);}
      else if(t<.32){const u=(t-CONTACT_T)/.22;phi=lerp(.25,2.5,1-(1-u)*(1-u));tw=lerp(0,-.6+swing.aim*.25,u);}
      else if(t<.9){phi=2.5;tw=-.6+swing.aim*.25;}
      else{const u=Math.min(1,(t-.9)/.4);phi=lerp(2.5,.15,u);tw=lerp(-.6,0,u);}}
    else if(state==='runup'||state==='delivery'){const u=state==='delivery'?1:clamp((stateT-(RUNUP_T-.7))/.5,0,1);phi=lerp(.15,-1.9,u*u*(3-2*u));tw=.3*u;}
    if(batter.celebrate>0){batter.celebrate-=dt;phi=3+Math.sin(tNow*12)*.2;}
    swing.phi=phi;batter.torso.rotation.y=tw;
  }
  bp.rotation.z=swing.phi;
  /* bowler */
  if(state==='runup'){bowler.phase+=dt*13;poseRun(bowler,bowler.phase,.8);const armU=clamp((stateT-(RUNUP_T-.42))/.42,0,1);if(armU>0){bowler.arms[0].rotation.set(armU*TAU,0,0);bowler.arms[0].userData.elbow.rotation.x=0;}}
  else if(state==='delivery'&&stateT<.5){bowler.phase+=dt*8;poseRun(bowler,bowler.phase,.5*(1-stateT*2));bowler.arms[0].rotation.set(lerp(Math.PI+.4,TAU,Math.min(1,stateT*3)),0,0);}
  /* fielders */
  for(const f of F){
    if(f===fBowler&&(state==='runup'||(state==='delivery'&&stateT<.5)))continue;
    const p=f.P;
    if(f.celebrate>0){f.celebrate-=dt;poseStand(p,tNow);poseArmsUp(p);p.hip.position.y=.86+Math.abs(Math.sin(tNow*9+p.phase))*.25;continue;}
    if(f.moving)poseRun(p,p.phase);
    else if(f.isKeeper&&(state==='runup'||state==='delivery'||state==='ready'||state==='aim')){poseCrouch(p,tNow);p.g.rotation.y=Math.PI;}
    else if(state==='runup'||state==='delivery'||state==='aim'){poseReady(p,tNow);faceBall(f,.1);}
    else{poseStand(p,tNow);if(!f.moving&&state!=='ready')faceBall(f,.08);}
    if(f.reachUp>0){f.reachUp-=dt;poseArmsUp(p);}
    if(f.throwAnim>0){f.throwAnim-=dt;p.arms[1].rotation.set(-Math.PI*(1-f.throwAnim/.35)*1.4,0,0);}
    if(ball.held===f&&state!=='ready'&&!(f.throwAnim>0))p.arms[1].rotation.set(-1,0,0);
  }
  if(state==='ready'||state==='aim'||state==='intro'||state==='over'){fBowler.P.g.rotation.y=lerpAngle(fBowler.P.g.rotation.y,0,.1);if(!fBowler.moving)poseStand(bowler,tNow);bowler.arms[0].rotation.set(-.6,0,0);}
  for(const s of sitters){if(s.stand>0){s.stand-=dt;poseStand(s,tNow);s.arms[0].rotation.set(-2.4+Math.sin(tNow*16)*.4,0,0);}else poseSit(s,tNow);}
  /* ball visuals */
  ballMesh.position.copy(ball.p);
  trailPts.unshift(ball.p.clone());if(trailPts.length>16)trailPts.pop();
  const fast=!ball.held&&ball.v.length()>6;
  trail.forEach((m,i)=>{const q=trailPts[(i+1)*2];m.visible=fast&&!!q;if(q){m.position.copy(q);m.material.opacity=.42*(1-i/trail.length);}});
  ballMesh.rotation.x+=ball.v.z*dt*3;ballMesh.rotation.z-=ball.v.x*dt*3;
  blob.position.set(ball.p.x,.08,ball.p.z);const bh=ball.p.y;blob.scale.setScalar(clamp(1.1-bh*.12,.4,1));blob.material.opacity=clamp(.28-bh*.02,.06,.28);
  ring.material.opacity=Math.max(0,ring.material.opacity-dt*.9);ring.scale.setScalar(lerp(ring.scale.x,1,.12));
  const showArrow=humanBats()&&(state==='ready'||state==='aim'||state==='runup'||(state==='delivery'&&!swing.active));
  tgt.visible=humanBowls()&&(state==='aim'||state==='runup');
  if(tgt.visible){tgt.position.set(bowlT.x,.1,bowlT.z);tgt.rotation.y+=dt*1.5;tgt.userData.mat.color.set(bowlT.locked?'#f3a712':'#46e0cf');}
  arrow.visible=showArrow;if(showArrow){arrow.rotation.y=-aimVal()*.6;arrow.userData.mat.color.set(loftVal()?'#d6402b':'#f3a712');arrow.scale.setScalar(loftVal()?1.35:1);}
  updStumps(stumpsS,dt);updStumps(stumpsN,dt);updBits(dt);
}

/* ---------------- input ---------------- */
function primary(){ac();if(paused)return;if(state==='intro'||state==='over'||!humanBats())return;if(state==='live')tryRun();else trySwing();}
function bowlerAction(){
  ac();if(paused||!humanBowls())return;
  if(state==='aim'){setState('runup');bowlT.locked=false;sfx.run();}
  else if(state==='runup'&&!bowlT.locked){bowlT.lockM=meterVal();bowlT.err=Math.min(1,Math.abs(bowlT.lockM-.5)*2.2);bowlT.locked=true;bowlT.lockText=bowlT.err<.18?'SPOT ON':bowlT.err<.5?'CLOSE ENOUGH':'WAYWARD';sfx.run();}
}
function dirKey(code,down){
  const arrows={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'},wasd={KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'};
  let dir,toBowler;
  if(arrows[code]){dir=arrows[code];toBowler=gm==='bowl';}else if(wasd[code]){dir=wasd[code];toBowler=gm!=='bat';}else return false;
  if(toBowler)bowlKeys[dir]=down;else if(dir!=='down')input[dir]=down;return true;
}
const TOD=['dawn','morning','noon','golden','night'];let todI=1;
function cycleTime(){todI=(todI+1)%TOD.length;setTimeUI(PRESETS[TOD[todI]]);toolOn('time',false);}
function togglePixel(){pixelOn=!pixelOn;document.body.classList.toggle('pc-pixel',pixelOn);renderer.setPixelRatio(pixelOn?Math.max(.3,Q.pr*.42):Q.pr);onResize();toolOn('pixel',pixelOn);}
function toggleSound(){soundOn=!soundOn;toolOn('sound',soundOn);}
function toolOn(t,on){const b=document.querySelector(`#pcTools [data-t="${t}"]`);if(b)b.classList.toggle('on',on);}
function setPaused(v){paused=v;toolOn('pause',v);document.querySelector('#pcTools [data-t="pause"]').textContent=v?'Resume':'Pause';if(v)pop('PAUSED',coarse?'Tap Resume to carry on':'Press Esc to carry on','');else $p('pcPop').classList.remove('anim');}
function restart(){$p('pcOverlay').hidden=true;showIntro();}
addEventListener('keydown',e=>{
  if(!CRK.on)return;
  const k=e.code;
  if(!$p('pcOverlay').hidden){if(k==='Escape'){e.preventDefault();close();}else if((k==='Space'||k==='Enter')&&e.target.tagName!=='BUTTON'){e.preventDefault();const g=document.querySelector('#pcCard .go');if(g)g.click();}return;}
  if(e.target.tagName==='BUTTON'&&(k==='Space'||k==='Enter'))e.preventDefault();
  if(k==='Escape'){setPaused(!paused);return;}
  if(dirKey(k,true)){e.preventDefault();return;}
  if(k==='Space'){e.preventDefault();if(e.repeat)return;if(gm==='bowl')bowlerAction();else primary();}
  else if(k==='KeyF'){if(gm==='pvp'&&!e.repeat)bowlerAction();}
  else if(k==='KeyQ'||k==='KeyE'){if(humanBowls())setType(bowlT.type+(k==='KeyE'?1:-1));}
  else if(/^Digit[1-5]$/.test(k)&&humanBowls())setType(+k.slice(5)-1);
  else if(k==='KeyC')setCam((camMode+1)%3);
  else if(k==='KeyT')cycleTime();
  else if(k==='KeyP')togglePixel();
  else if(k==='KeyM')toggleSound();
  else if(k==='KeyR')restart();
});
addEventListener('keyup',e=>{if(CRK.on)dirKey(e.code,false);});
const ray=new THREE.Raycaster(),gp=new THREE.Plane(new V3(0,1,0),0),ndc=new THREE.Vector2();let aiming=false;
function aimFromPointer(e){ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  if(ray.ray.intersectPlane(gp,tmpA)){W2L(tmpA,tmpB);bowlT.x=clamp(tmpB.x,-.9,1);bowlT.z=clamp(tmpB.z,.5,6.4);}}
canvas.addEventListener('pointerdown',e=>{
  if(!CRK.on||!$p('pcOverlay').hidden)return;e.preventDefault();ac();
  if(humanBowls()&&state==='aim'){aiming=true;aimFromPointer(e);return;}
  if(humanBowls()&&state==='runup'&&!bowlT.locked){bowlerAction();return;}
  if(coarse&&actLabel()==='BOWL')return;
  primary();
});
canvas.addEventListener('pointermove',e=>{if(CRK.on&&aiming&&state==='aim')aimFromPointer(e);});
addEventListener('pointerup',()=>{aiming=false;});
$p('pcAct').addEventListener('pointerdown',e=>{e.preventDefault();ac();const l=actLabel();if(l==='BOWL'||l==='LOCK')bowlerAction();else primary();});
$p('pcTypes').onclick=e=>{const b=e.target.closest('button');if(b)setType(+b.dataset.i);};
$p('pcBowlBtn').onclick=()=>bowlerAction();
$p('pcAimL').onclick=()=>{input.tAim=input.tAim===-1?0:-1;};
$p('pcAimR').onclick=()=>{input.tAim=input.tAim===1?0:1;};
$p('pcLoft').onclick=()=>{input.tLoft=!input.tLoft;};
$p('pcTools').onclick=e=>{const b=e.target.closest('button');if(!b)return;ac();const t=b.dataset.t;
  if(t==='cam')setCam((camMode+1)%3);else if(t==='time')cycleTime();else if(t==='sound')toggleSound();else if(t==='pixel')togglePixel();
  else if(t==='pause')setPaused(!paused);else if(t==='restart')restart();else if(t==='exit')close();b.blur();};
/* floating stick: appears wherever the left thumb lands */
{
  const zone=$p('pcStickZone'),el=$p('pcStick'),knob=el.querySelector('.knob'),RS=52;
  const rest=()=>{el.style.left='calc(88px + env(safe-area-inset-left,0px))';el.style.top='calc(100% - 96px - env(safe-area-inset-bottom,0px))';knob.style.transform='';};rest();
  const move=e=>{let dx=e.clientX-stick.cx,dy=e.clientY-stick.cy;const d=Math.hypot(dx,dy);if(d>RS){dx*=RS/d;dy*=RS/d;}stick.x=dx/RS;stick.y=dy/RS;knob.style.transform=`translate(${dx}px,${dy}px)`;};
  zone.addEventListener('pointerdown',e=>{e.preventDefault();ac();if(stick.id!==null)return;stick.id=e.pointerId;stick.on=true;stick.cx=e.clientX;stick.cy=e.clientY;try{zone.setPointerCapture(e.pointerId);}catch(err){}el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';move(e);});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)move(e);});
  const up=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.on=false;stick.x=stick.y=0;rest();};
  zone.addEventListener('pointerup',up);zone.addEventListener('pointercancel',up);
}
function buzz(p){try{if(coarse&&navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function goLandscape(){if(!coarse)return;const el=document.documentElement,rq=el.requestFullscreen||el.webkitRequestFullscreen;
  try{const pr=rq&&!document.fullscreenElement?rq.call(el,{navigationUI:'hide'}):null;Promise.resolve(pr).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')).catch(()=>{});}catch(e){}}
$p('pcRotBtn').onclick=()=>goLandscape();
$p('pcRotAnyway').onclick=()=>{portraitOK=true;};
document.addEventListener('visibilitychange',()=>{if(CRK.on&&document.hidden&&!paused&&$p('pcOverlay').hidden&&state!=='intro'&&state!=='over')setPaused(true);});

/* the game's own materials also receive the street-lamp / floodlight light map */
root.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(addLampLight);});
csmSweep(root);
/* ---------------- open / close: hand the screen over from the walkthrough ---------------- */
const WT_UI=['#logoBadge','#where','#bar','#side','#mapwrap','#keys','#insp','#near','#settings','#pcEnter','#zoom'];
let saved=null,seeT=0,warmed=false;
/* every material the game can create mid-play (particle colours, popups) exists from load, and all
   game shaders are compiled once when the game opens, so nothing compiles on the bowl or hit frame */
const BIT_COLS=['#f3a712','#4f7f31','#3f6a2a','#cfc6b4','#e8dccb'];
function prewarm(){
  if(warmed)return;warmed=true;
  const tmp=BIT_COLS.map(c=>{const m=new THREE.Mesh(UNITBOX,mat(c));m.position.set(0,-50,0);root.add(m);return m;});
  const vis=[ring,arrow,tgt,...trail].map(m=>[m,m.visible]);vis.forEach(([m])=>m.visible=true);
  csmSweep();try{renderer.compile(scene,camera);}catch(e){}
  vis.forEach(([m,v])=>m.visible=v);tmp.forEach(m=>root.remove(m));
}
function open(){
  if(CRK.on)return;
  saved={ui:WT_UI.map(s=>[s,$(s)?$(s).hidden:true]),fov:camera.fov,gm};
  WT_UI.forEach(s=>{if($(s))$(s).hidden=true;});
  $('#start').hidden=true;$('#toast').classList.remove('on');
  document.body.classList.remove('cine');$('#cap').classList.remove('on');
  hud.hidden=false;players.visible=true;[ballMesh,blob].forEach(m=>m.visible=true);
  $p('pcRules').innerHTML=`<b>PARK RULES</b>${SHORT_RULES}`;
  CRK.on=true;skyReset=true;seeT=1;
  camera.near=3;camera.far=20000;camera.updateProjectionMatrix();
  /* compile every game shader now, not on the first ball or hit */
  prewarm();
  ball.held=fBowler;ball.p.set(0,1,-3);
  for(const f of F)f.P.g.position.copy(f.home);
  showIntro();renderTypes();updKeys();updHUD();
}
function close(){
  if(!CRK.on)return;
  CRK.on=false;paused=false;hud.hidden=true;players.visible=false;
  [ballMesh,blob,ring,arrow,tgt,...trail].forEach(m=>m.visible=false);
  if(pixelOn)togglePixel();
  camera.fov=saved?saved.fov:58;camera.near=1;camera.far=42000;camera.updateProjectionMatrix();seeT=0;G.uSee.value=0;
  if(saved)saved.ui.forEach(([s,h])=>{if($(s))$(s).hidden=h;});
  if($('#logoBadge').hidden&&$('#bar').hidden){['#logoBadge','#where','#bar','#side'].forEach(s=>$(s).hidden=false);$('#mapwrap').hidden=innerWidth<=760;}
  /* stand at the edge of the field, looking at the pitch */
  const edge=L2W(new V3(ROPE.x+3,0,0)),mid=L2W(new V3(0,0,1.5));
  player.x=edge.x;player.z=edge.z;player.yaw=Math.atan2(-(mid.x-edge.x),-(mid.z-edge.z));player.pitch=-.12;
  skyReset=true;trans=null;setMode('walk');
}
CRK.open=open;CRK.close=close;
CRK.frame=dt=>{
  const portraitBlock=coarse&&innerHeight>innerWidth&&!portraitOK;
  $p('pcRotate').hidden=!portraitBlock||!$p('pcOverlay').hidden;
  if(!paused&&!(portraitBlock&&$p('pcOverlay').hidden))update(dt);
  else if(state==='intro'||state==='over'){clock+=dt;}
  G.uSee.value+=(seeT-G.uSee.value)*Math.min(1,dt*3);
  updCamera(paused?0:dt);
  updOverlay(paused?0:dt);
  const t=$('#toast');if(t.classList.contains('on'))t.classList.remove('on');
};
/* entry points */
$('#pcEnter').onclick=()=>open();
{const b=$('#enterCricket');if(b){b.disabled=false;b.onclick=()=>{enter('walk');open();};}}
window.__pc={open,close,get state(){return state;},get gm(){return gm;},score,ball,bowlT,startGame,bowlerAction,primary,input,setCam,setType};
}
