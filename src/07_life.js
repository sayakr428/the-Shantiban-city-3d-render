/* =====================================================================
   LIFE: cattle, stray dogs and birds (people and traffic were removed to keep it light)
   ===================================================================== */
prog(.74,'Bringing in cattle and birds…');await tick();
const gltfLoader=new GLTFLoader();gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const parseGLB=async id=>gltfLoader.parseAsync((await bytes('mdl_'+id)).buffer,'');
const[gCow,gBull,gDog,gStork,gParrot]=await Promise.all(['Cow','Bull','ShibaInu','Stork','Parrot'].map(parseGLB));
const AGENTS=[];
/* measure from bind-pose geometry: skinned bounds computed before the first skeleton update collapse to zero */
function geoBox(root){root.updateMatrixWorld(true);const b=new THREE.Box3(),t=new THREE.Box3();
  root.traverse(c=>{if(c.isSkinnedMesh){c.skeleton.update();c.computeBoundingBox();t.copy(c.boundingBox).applyMatrix4(c.matrixWorld);b.union(t);}else if(c.isMesh){c.geometry.computeBoundingBox();t.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld);b.union(t);}});return b;}
function fitScale(obj,axis,size){const b=geoBox(obj),s=new V3();b.getSize(s);return size/(axis==='y'?s.y:Math.max(s.x,s.z));}
function prepShadows(o){o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;c.frustumCulled=false;}});}
const NA=k=>Math.max(1,Math.round(k*Q.life));

function animalKind(g,len){
  const s=fitScale(g.scene,'xz',len);
  const clips={};g.animations.forEach(a=>clips[a.name]=a);
  return{g,s,clips};
}
const COW=animalKind(gCow,7.2),BULL=animalKind(gBull,7.8),DOG=animalKind(gDog,2.9);
const dogTint=[null,'#8a6a4a','#d9c7a8','#4a3a2e'];
function animal(K,x,z,{radius=40,speed=1.8,tint=null,clipWalk='Walk',clipIdle=['Eating','Idle','Idle_2']}={}){
  const o=SkeletonUtils.clone(K.g.scene);o.scale.setScalar(K.s);prepShadows(o);
  if(tint)o.traverse(c=>{if(c.isMesh){c.material=c.material.clone();c.material.color=new THREE.Color(tint);}});
  o.position.set(x,0,z);o.rotation.y=R()*6.28;scene.add(o);
  const mixer=new THREE.AnimationMixer(o);
  const acts={};Object.keys(K.clips).forEach(n=>acts[n]=mixer.clipAction(K.clips[n]));
  const idles=clipIdle.filter(n=>acts[n]);
  const a={o,mixer,acts,walk:acts[clipWalk],idles,cur:null,hx:x,hz:z,radius,speed,state:'idle',t:R()*6,tx:x,tz:z};
  setAct(a,pick(idles));AGENTS.push(a);return a;
}
function setAct(a,name){const n=a.acts[name]||a.walk;if(a.cur===n)return;if(a.cur)a.cur.fadeOut(.4);n.reset().fadeIn(.4).play();a.cur=n;}
const fieldSpot=(x0,x1,z0,z1)=>{for(let i=0;i<40;i++){const x=rr(x0,x1),z=rr(z0,z1);if(!occAt(x,z))return[x,z];}return[x0,z0];};
for(let k=0;k<NA(10);k++){const[x,z]=k<4?fieldSpot(-600,-120,-700,700):k<7?fieldSpot(1000,1800,-900,600):fieldSpot(-300,1200,900,1500);animal(k%5===4?BULL:COW,x,z,{radius:50});}
[[-24,240],[-30,520],[SX1+26,160],[SX1+22,600]].slice(0,NA(4)).forEach(([x,z],k)=>animal(k%2?COW:BULL,x,z,{radius:20,speed:1.4}));
for(let k=0;k<NA(8);k++){
  const spots=[[CX+rr(-200,200),MAIN_Z+rr(-14,14)],[MARKET.x0+rr(10,400),MARKET.z0+rr(10,200)],[EAST_X+rr(-12,12),rr(-500,800)],[WEST_X+rr(-12,12),rr(-900,600)],[KOYAL.x+rr(-60,60),KOYAL.z+rr(-60,60)]];
  const[x,z]=spots[k%spots.length];
  animal(DOG,x,z,{radius:60,speed:3.4,tint:dogTint[k%dogTint.length],clipIdle:['Idle','Idle_2','Idle_2_HeadLow','Eating']});
}

/* ---------- birds circling the fields ---------- */
const FLOCKS=[];
function flock(g,n,cx,cz,R0,alt,size,speed){
  const s0=fitScale(g.scene,'xz',size),birds=[];
  for(let i=0;i<n;i++){
    const o=g.scene.clone();o.scale.setScalar(s0*(.85+R()*.3));scene.add(o);
    const m=new THREE.AnimationMixer(o);const act=m.clipAction(g.animations[0]);act.play();act.time=R()*act.getClip().duration;act.timeScale=.9+R()*.3;
    o.traverse(c=>{if(c.isMesh){c.frustumCulled=false;if(c.material){c.material=c.material.clone();c.material.metalness=0;c.material.roughness=.8;}}});
    birds.push({o,m,ph:i/n*1.2+R()*.2,dr:rr(-10,10),dy:rr(-6,6)});
  }
  FLOCKS.push({birds,cx,cz,R0,alt,speed,a:R()*6.28});
}
flock(gStork,NA(8),-300,200,260,95,4.2,.11);
flock(gStork,NA(6),1500,-300,340,140,4.2,.09);
flock(gParrot,NA(7),300,-60,120,55,1.2,.28);

/* ---------- per-frame update ---------- */
function updateLife(dt){
  const cam=camera.position;
  for(const a of AGENTS){
    const o=a.o,d2=(o.position.x-cam.x)**2+(o.position.z-cam.z)**2,vis=d2<900*900;o.visible=vis;if(!vis)continue;
    a.t-=dt;
    if(a.state==='idle'&&a.t<0){a.state='walk';a.tx=a.hx+rr(-a.radius,a.radius);a.tz=a.hz+rr(-a.radius,a.radius);setAct(a,'Walk');}
    if(a.state==='walk'){const dx=a.tx-o.position.x,dz=a.tz-o.position.z,L=Math.hypot(dx,dz);
      if(L<1){a.state='idle';a.t=rr(5,16);setAct(a,pick(a.idles));}
      else{const sp=a.speed*dt;o.position.x+=dx/L*Math.min(sp,L);o.position.z+=dz/L*Math.min(sp,L);o.rotation.y=lerpAngle(o.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*2.5));}}
    a.mixer.update(dt);
  }
  for(const f of FLOCKS){
    f.a+=f.speed*dt;
    for(const b of f.birds){
      const a=f.a+b.ph,r=f.R0+b.dr,x=f.cx+Math.cos(a)*r,z=f.cz+Math.sin(a)*r*.7,y=f.alt+b.dy+Math.sin(a*2.3+b.ph*5)*6;
      b.o.position.set(x,y,z);
      b.o.rotation.set(0,Math.atan2(-Math.sin(a),Math.cos(a)*.7),0);b.o.rotateZ(-.25);
      const d2=(x-cam.x)**2+(z-cam.z)**2;b.o.visible=d2<2500*2500;if(b.o.visible)b.m.update(dt);
    }
  }
}
