/* =====================================================================
   PLAYER, MODES, UI, LOOP
   ===================================================================== */
prog(.9,'Final touches…');await tick();
function insideSite(x,z){return x>SITE.x0&&x<SITE.x1&&z>SITE.z0&&z<SITE.z1;}
function plotAt(x,z){
  if(!insideSite(x,z))return null;
  const k=ROWZ.findIndex(z0=>z>=z0&&z<=z0+2*PD);if(k<0)return null;
  let i;if(x>=XW0&&x<XW1)i=Math.floor((x-XW0)/PW);else if(x>=XE0&&x<XE1)i=Math.floor((x-XE0)/PW)+100;else return null;
  return plots.find(p=>x>=p.x&&x<=p.x+p.w&&z>=p.z&&z<=p.z+p.d)||null;
}
function groundAt(x,z){return plotAt(x,z)?PLOT_H:.17;}
function lerpAngle(a,b,t){const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t;}
/* collision: walls and facilities, villas, and every town building through a coarse grid */
const HG=64,HGRID=new Map();
HOUSES.forEach(h=>{
  const c=Math.abs(Math.cos(h.ry)),s=Math.abs(Math.sin(h.ry)),ex=(h.w*c+h.d*s)/2+.8,ez=(h.w*s+h.d*c)/2+.8;
  const b=[h.x-ex,h.x+ex,h.z-ez,h.z+ez];
  for(let i=Math.floor(b[0]/HG);i<=Math.floor(b[1]/HG);i++)for(let j=Math.floor(b[2]/HG);j<=Math.floor(b[3]/HG);j++){const k=i+','+j;if(!HGRID.has(k))HGRID.set(k,[]);HGRID.get(k).push(b);}
});
function blockedAt(x,z){
  for(const b of BLOCKERS)if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])return true;
  for(const b of HOUSE_BLOCK)if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])return true;
  const L=HGRID.get(Math.floor(x/HG)+','+Math.floor(z/HG));if(L)for(const b of L)if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])return true;
  return false;
}

const player={x:CX,z:SZ1+45,y:EYE,yaw:0,pitch:-.02};
const plan={x:SITE_C.x,z:SITE_C.z,h:780};
let mode='intro',trans=null,introA=-.7;
const eul=new THREE.Euler(0,0,0,'YXZ');
function eyePose(){return{p:new V3(player.x,player.y,player.z),q:new THREE.Quaternion().setFromEuler(eul.set(player.pitch,player.yaw,0,'YXZ'))};}
function walkPose(){player.y=groundAt(player.x,player.z)+EYE;return eyePose();}
function planPose(){return{p:new V3(plan.x,plan.h,plan.z),q:new THREE.Quaternion().setFromEuler(eul.set(-Math.PI/2,0,0,'YXZ'))};}
function startTrans(pose,dur,done){trans={p0:camera.position.clone(),q0:camera.quaternion.clone(),p1:pose.p,q1:pose.q,t:0,dur:reduceMotion?.01:dur,done};}

/* guided walk along the internal roads */
const RC=k=>RROW[k].z0+ROWRD/2;
const TOUR_PTS=[[CX-6,SZ1+45],[CX-6,SZ1-25],[CX-6,620],[CX-6,RC(4)+4],[CX-20,RC(4)],[500,RC(4)],[830,RC(4)],[SX1-10,RC(4)-12],[SX1-10,RC(3)+10],[SX1-10,RC(1)],[SX1-10,24],[830,10],[500,10],[CX-20,10],[200,10],[30,10],[10,30],[10,RC(1)-10],[24,RC(2)],[200,RC(2)],[CX-20,RC(2)],[CX-6,RC(2)+14],[CX-6,RC(3)],[CX-6,RC(4)-6],[CX-16,RC(4)],[205,RC(4)],[196,560],[196,600],[205,640]];
const tourCurve=new THREE.CatmullRomCurve3(TOUR_PTS.map(([x,z])=>new V3(x,0,z)),false,'centripetal');
const tour={u:0,len:tourCurve.getLength()};
function tourYawAt(u){const a=tourCurve.getPointAt(u),b=tourCurve.getPointAt(Math.min(u+.01,1));return Math.atan2(-(b.x-a.x),-(b.z-a.z));}

/* cinematic drone film: key positions and look targets in feet, with captions */
const CINE=[
  {t:0,p:[2300,1250,2700],l:[431,0,380],c:['SHANTIBAN CITY','Tapna, Baruipur · South 24 Parganas']},
  {t:9,p:[1500,600,1750],l:[431,0,520]},
  {t:17,p:[560,90,1080],l:[431,20,760],c:['A gated community','with security at the main gate']},
  {t:24,p:[431,11,815],l:[431,9,700]},
  {t:30,p:[431,10,680],l:[431,8,540],c:['30 ft central boulevard','wide internal roads, street lights and covered drains']},
  {t:37,p:[431,55,470],l:[260,0,380]},
  {t:45,p:[150,210,300],l:[431,0,280],c:['220 plots in five blocks','each plot 36 ft × 40 ft, about 2 katha']},
  {t:53,p:[90,150,830],l:[212,0,653],c:['A park to walk, sit and play','with a walking track and a children’s corner']},
  {t:60,p:[720,95,850],l:[669,10,627],c:['Community hall and shops','for everyday needs, inside the gate']},
  {t:68,p:[6400,4300,4600],l:[-900,0,-500],c:['Close to daily life','market ~500 m · school ~1.5 km · bus terminus ~1.5 km · hospital ~2 km · Koyal More ~1.5 km']},
  {t:78,p:[2600,2100,-1700],l:[431,0,380],c:['About 20 km from Kolkata','Baruipur ~4.5 km · Garia Metro ~14 km · Joka Metro ~15 km']},
  {t:86,p:[2300,1250,2700],l:[431,0,380]}
];
const cineP=new THREE.CatmullRomCurve3(CINE.map(k=>new V3(...k.p)),false,'catmullrom',.5);
const cineL=new THREE.CatmullRomCurve3(CINE.map(k=>new V3(...k.l)),false,'catmullrom',.5);
const cine={t:0,cap:-1};
function cineU(t){let i=0;while(i<CINE.length-2&&t>CINE[i+1].t)i++;const f=clamp((t-CINE[i].t)/(CINE[i+1].t-CINE[i].t),0,1);return(i+f)/(CINE.length-1);}

const insp=$('#insp');
let inspPlot=null,inspPinned=false,hiPlot=null;
const HI=new THREE.Color('#ffb340'),WHITE=new THREE.Color(1,1,1);
function setMode(m){
  if(trans)return;
  const prev=mode;mode=m;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m)));
  $('#zoom').hidden=m!=='plan';
  document.body.classList.toggle('cine',m==='cine');
  inspPinned=false;inspPlot=null;insp.hidden=true;showInsp(null);
  skyReset=true;
  if(m==='walk'){player.pitch=clamp(player.pitch,-.5,.4);startTrans(walkPose(),prev==='plan'?1.4:1);}
  else if(m==='drone'){player.y=Math.max(player.y+90,120);player.pitch=-.42;startTrans(eyePose(),1.2);}
  else if(m==='plan'){plan.x=clamp(player.x,-200,1100);plan.z=clamp(player.z,-200,1000);startTrans(planPose(),1.3);}
  else if(m==='tour'){tour.u=0;const a=tourCurve.getPointAt(0);player.x=a.x;player.z=a.z;player.yaw=tourYawAt(0);player.pitch=-.04;startTrans(walkPose(),1.4);toast('Guided walk started. Hold Shift to speed up, or press any move key to take over.');}
  else if(m==='cine'){cine.t=0;cine.cap=-1;const p=cineP.getPoint(0);camera.position.copy(p);camera.lookAt(cineL.getPoint(0));if(lampsOn>.6)setTimeUI(PRESETS.morning);}
  if(m!=='cine'){$('#cap').classList.remove('on');}
  updateKeys();
}
function updateKeys(){
  const k=$('#keys');
  k.innerHTML=mode==='plan'?'<b>Drag</b> to pan, <b>scroll</b> to zoom. Click a plot to see its details.'
    :mode==='drone'?'<b>Drag</b> to look, <b>W A S D</b> to fly, <b>E</b>/<b>Q</b> up and down, <b>Shift</b> to hurry.'
    :mode==='tour'?'Sit back. <b>Shift</b> speeds it up; any move key hands control back to you.'
    :mode==='cine'?'Sit back and watch. <b>Esc</b> or any mode button ends the film.'
    :'<b>Drag</b> to look, <b>W A S D</b> or arrows to walk, <b>Shift</b> to hurry. <b>Click a plot</b> to see its details.';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);b.blur();}));
document.querySelectorAll('[data-tod]').forEach(b=>b.addEventListener('click',()=>{setTimeUI(PRESETS[b.dataset.tod]);b.blur();}));
function toggleAllHomes(){
  const all=built.size>=plots.length;
  plots.forEach(p=>setVilla(p,!all,true));rebuildHouses();inspPlot=null;if(!insp.hidden&&hiPlot)showInsp(hiPlot,inspPinned);
  $('#allVillas2').textContent=all?'Sample homes on all plots':'Clear sample homes';
  toast(all?'Sample homes removed. The plots are empty again.':`A sample home is shown on all ${plots.length} plots, to picture the finished neighbourhood.`);
}
$('#allVillas').addEventListener('click',toggleAllHomes);
$('#allVillas2').addEventListener('click',()=>{toggleAllHomes();$('#settings').hidden=true;});

function standPoint(p){
  const cx=p.x+p.w/2,sz=p.f==='n'?p.z-9:p.z+p.d+9;
  return{x:cx,z:sz,yaw:Math.atan2(0,-(p.z+p.d/2-sz))};
}
function goToPlot(p){
  const s=standPoint(p);player.x=s.x;player.z=s.z;player.yaw=s.yaw;player.pitch=-.2;
  if(mode==='walk'){startTrans(walkPose(),.9);}else{mode='x';setMode('walk');}
  showInsp(p,true);
}
const FACE={n:'North',s:'South'};
function setHi(p){
  if(hiPlot&&hiPlot!==p){plotIM.setColorAt(hiPlot.idx,WHITE);plotIM.instanceColor.needsUpdate=true;hiPlot=null;}
  if(p&&p!==hiPlot){plotIM.setColorAt(p.idx,HI);plotIM.instanceColor.needsUpdate=true;hiPlot=p;}
}
function showInsp(p,pin){
  if(!p){setHi(null);if(!inspPinned){insp.hidden=true;inspPlot=null;}return;}
  if(pin)inspPinned=true;
  setHi(p);
  if(p===inspPlot&&!insp.hidden)return;
  inspPlot=p;insp.hidden=false;
  const far=Math.hypot(player.x-(p.x+p.w/2),player.z-(p.z+p.d/2))>70;
  insp.innerHTML=`<button class="insp-x" id="inspX" aria-label="Close">×</button><div class="insp-no">Plot ${p.no}</div>
    <div class="insp-area">2 katha <small>${p.sqft.toLocaleString('en-IN')} sq ft</small></div>
    <dl><dt>Size</dt><dd>36′ × 40′</dd><dt>Block</dt><dd>${p.b}</dd><dt>Faces</dt><dd>${FACE[p.f]}, onto the ${p.road.n.replace(/^\d+ ft /,m=>m)}</dd>
    ${p.corner?`<dt>Corner</dt><dd>Also borders ${p.cornerRoad}</dd>`:''}</dl>
    <p class="insp-design">${built.has(p)?'Shown with the sample rooftop-terrace home, fitted to this plot.':'Empty plot. You can preview a sample home on it.'}</p>
    <div class="insp-actions">
      <button class="btn ${built.has(p)?'btn-ghost':'btn-primary'}" id="inspBuild">${built.has(p)?'Remove the sample home':'Preview a home here'}</button>
      ${mode!=='walk'||far?`<button class="btn btn-ghost" id="inspGo">${mode==='plan'?'Walk to this plot':'Stand in front of it'}</button>`:''}
    </div>
    <p class="insp-note">Illustrative layout. Please confirm the final plot size and position with the project office.</p>`;
  const b=$('#inspGo');if(b)b.onclick=()=>goToPlot(p);
  $('#inspX').onclick=()=>{inspPinned=false;showInsp(null);};
  $('#inspBuild').onclick=()=>{const on=!built.has(p);setVilla(p,on);inspPlot=null;showInsp(p,true);
    toast(on?`Sample home shown on Plot ${p.no}, scaled to the plot and facing its road.`:`Sample home removed from Plot ${p.no}.`);};
}

/* ---------------- input ---------------- */
const keys={};
const typing=()=>document.activeElement&&document.activeElement.tagName==='INPUT'&&document.activeElement.type!=='range';
addEventListener('keydown',e=>{
  if(typing()||mode==='intro')return;
  const k=e.key.toLowerCase();keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='1')setMode('walk');else if(k==='2')setMode('drone');else if(k==='3'||k==='m')setMode('plan');else if(k==='4'||k==='t')setMode('tour');else if(k==='5'||k==='c')setMode('cine');
  if(k==='escape'){if(mode==='cine'){mode='x';setMode('drone');}inspPinned=false;showInsp(null);$('#near').hidden=true;$('#settings').hidden=true;}
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const ptrs=new Map(),joy={x:0,y:0,id:null};
let pinchD=0,planMoved=false;
canvas.addEventListener('pointerdown',e=>{
  if(mode==='intro')return;
  if(mode==='cine'){mode='x';setMode('drone');return;}
  canvas.setPointerCapture(e.pointerId);
  const role=(e.pointerType==='touch'&&mode!=='plan'&&e.clientX<innerWidth*.45&&joy.id===null)?'joy':'look';
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,role,t0:performance.now(),moved:false});
  if(role==='joy'){joy.id=e.pointerId;const j=$('#joy');j.style.left=e.clientX+'px';j.style.top=e.clientY+'px';j.hidden=false;}
  else canvas.classList.add('dragging');
  planMoved=false;
  if(ptrs.size===2&&mode==='plan'){const[a,b]=[...ptrs.values()];pinchD=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
  const pt=ptrs.get(e.pointerId);
  if(!pt){if(e.pointerType==='mouse')hoverQueued=[e.clientX,e.clientY];return;}
  const dx=e.clientX-pt.x,dy=e.clientY-pt.y;pt.x=e.clientX;pt.y=e.clientY;
  if(Math.hypot(pt.x-pt.sx,pt.y-pt.sy)>(e.pointerType==='touch'?10:5)){planMoved=true;pt.moved=true;}
  if(pt.role==='joy'){const jx=pt.x-pt.sx,jy=pt.y-pt.sy,L=Math.hypot(jx,jy),m=Math.min(L,50)/50;
    joy.x=L?jx/L*m:0;joy.y=L?jy/L*m:0;$('#knob').style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;return;}
  if(mode==='plan'){
    if(ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchD)plan.h=clamp(plan.h*pinchD/d,60,2600);pinchD=d;return;}
    const sc=2*plan.h*Math.tan(camera.fov*D2R/2)/innerHeight;
    plan.x=clamp(plan.x-dx*sc,-3000,4000);plan.z=clamp(plan.z-dy*sc,-3000,4000);return;
  }
  const s=e.pointerType==='touch'?.0055:.0032;
  player.yaw-=dx*s;player.pitch=clamp(player.pitch-dy*s,-1.45,1.4);
});
function endPtr(e){
  const pt=ptrs.get(e.pointerId);if(!pt)return;ptrs.delete(e.pointerId);
  if(pt.role==='joy'){joy.id=null;joy.x=joy.y=0;$('#joy').hidden=true;$('#knob').style.transform='';}
  if(ptrs.size===0)canvas.classList.remove('dragging');
  if(ptrs.size<2)pinchD=0;
  /* a tap or click (no drag) on a plot opens its details; on empty ground it closes them */
  if(!pt.moved&&performance.now()-pt.t0<450&&mode!=='intro'&&mode!=='cine'&&!trans){
    const p=pickAt(e.clientX,e.clientY);inspPinned=false;
    if(p)showInsp(p,true);else showInsp(null);
  }
}
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',e=>{if(mode!=='plan')return;e.preventDefault();plan.h=clamp(plan.h*Math.exp(e.deltaY*.0012),60,2600);},{passive:false});
$('#zin').onclick=()=>{plan.h=clamp(plan.h/1.3,60,2600);};
$('#zout').onclick=()=>{plan.h=clamp(plan.h*1.3,60,2600);};
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pickNDC(nx,ny,far){ndc.set(nx,ny);ray.setFromCamera(ndc,camera);ray.far=far;const h=ray.intersectObject(plotIM,false)[0];return h?plots[h.instanceId]:null;}
function pickAt(cx,cy){return pickNDC(cx/innerWidth*2-1,-(cy/innerHeight)*2+1,9000);}
let hoverQueued=null;

[['#goto','#gotoIn'],['#goto2','#gotoIn2']].forEach(([f,i])=>$(f).addEventListener('submit',e=>{
  e.preventDefault();const raw=$(i).value.trim().replace(/[^0-9]/g,'');
  if(!raw){toast('Type a plot number from 1 to 220.');return;}
  const n=+raw,p=plots[n-1];
  if(!p){toast(`There’s no plot ${n}. Plots are numbered 1 to 220.`);return;}
  $(i).blur();$('#settings').hidden=true;goToPlot(p);
}));
let toastT=0;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),4200);}
$('#time').addEventListener('input',e=>setTime(+e.target.value));
function setTimeUI(h){$('#time').value=h;setTime(h);}

/* nearby panel */
function flyTo(p,dist,alt){
  const d=p.clone().sub(SITE_C).setY(0);if(d.lengthSq()<1)d.set(0,0,1);d.normalize();
  player.x=p.x+d.x*dist;player.z=p.z+d.z*dist;player.y=alt;
  player.yaw=Math.atan2(-(p.x-player.x),-(p.z-player.z));player.pitch=-Math.atan2(alt-10,dist)*.9;
  if(mode!=='drone'){mode='x';const keepY=player.y;setMode('drone');player.y=keepY;trans&&(trans.p1=eyePose().p,trans.q1=eyePose().q);}
  else startTrans(eyePose(),1.6);
  skyReset=true;
}
{
  const L=$('#nearList');
  const row=(title,sub,fn)=>{const b=document.createElement('button');b.className='near-row';b.innerHTML=`<span>${title}</span><b>${sub}</b>`;b.onclick=()=>{fn();$('#near').hidden=true;};L.appendChild(b);};
  const h=t=>{const e=document.createElement('div');e.className='near-h';e.textContent=t;L.appendChild(e);};
  h('Nearby (approximate distance)');
  AMEN.forEach(a=>row(a.n,a.d,()=>flyTo(a.p,a.key==='hospital'?420:340,a.key==='hospital'?220:170)));
  h('Inside Shantiban City');
  INSIDE.forEach(a=>row(a.n,'',()=>{
    if(a.key==='gate'){player.x=CX;player.z=SZ1+45;player.yaw=0;player.pitch=0;mode='x';setMode('walk');return;}
    flyTo(a.p,140,90);}));
  h('Further away');
  FAR.forEach(([n,d])=>{const e=document.createElement('div');e.className='near-row static';e.innerHTML=`<span>${n}</span><b>${d}</b>`;L.appendChild(e);});
  const p=document.createElement('p');p.className='near-note';p.textContent='Distances are approximate, as provided in the project information. Buildings outside the boundary are illustrative.';L.appendChild(p);
}
$('#nearBtn').onclick=()=>{$('#near').hidden=!$('#near').hidden;$('#settings').hidden=true;};
$('#setBtn').onclick=()=>{$('#settings').hidden=!$('#settings').hidden;$('#near').hidden=true;};
document.querySelectorAll('[data-cloud]').forEach(b=>b.onclick=()=>{const v=+b.dataset.cloud;skyU.uCover.value=v;skyU.uDens.value=v<.3?.7:1;envSkyMat.uniforms.uCloudDim.value=v;
  document.querySelectorAll('[data-cloud]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));skyReset=true;scheduleEnv();});
document.querySelectorAll('[data-wind]').forEach(b=>b.onclick=()=>{G.uWindStr.value=+b.dataset.wind;document.querySelectorAll('[data-wind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('[data-q]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.q===QK));b.onclick=()=>{try{localStorage.setItem('sb-q3',b.dataset.q);}catch(e){}location.reload();};});
let labelsOn=true;
$('#labelsBtn').onclick=()=>{labelsOn=!labelsOn;$('#labelsBtn').setAttribute('aria-pressed',String(labelsOn));};

/* ---------------- map: Site view (plots and facilities) and Area view (nearby places with distances) ---------------- */
const mini=$('#mini');
const dpr=Math.min(devicePixelRatio||1,2);
const miniStatic=document.createElement('canvas');
let mapView='site';
const MAPB={site:{x0:-40,x1:SX1+40,z0:-50,z1:SZ1+90}};
{ /* area bounds: the site and every nearby place, with a margin */
  let x0=SITE.x0,x1=SITE.x1,z0=SITE.z0,z1=SITE.z1;
  AMEN.forEach(a=>{x0=Math.min(x0,a.p.x);x1=Math.max(x1,a.p.x);z0=Math.min(z0,a.p.z);z1=Math.max(z1,a.p.z);});
  const m=900;MAPB.area={x0:x0-m*1.6,x1:x1+m*1.6,z0:z0-m,z1:z1+m};
}
let MB=MAPB.site,mScale=1,mOx=0,mOy=0;
function fitMap(){ /* uniform scale, centred in the canvas */
  const b=MAPB[mapView],sx=mini.width/(b.x1-b.x0),sz=mini.height/(b.z1-b.z0);mScale=Math.min(sx,sz);
  mOx=(mini.width-(b.x1-b.x0)*mScale)/2-b.x0*mScale;mOy=(mini.height-(b.z1-b.z0)*mScale)/2-b.z0*mScale;MB=b;
}
function m2(x,z){return[x*mScale+mOx,z*mScale+mOy];}
function un2(px,py){return[(px-mOx)/mScale,(py-mOy)/mScale];}
function sizeMini(){const r=mini.getBoundingClientRect();if(!r.width)return;mini.width=Math.round(r.width*dpr);mini.height=Math.round(r.height*dpr);fitMap();drawMiniStatic();}
const AMEN_STYLE={market:['#d9822b','M'],school:['#2f6fb0','S'],hospital:['#d03a2f','H'],bus:['#6b4fa0','B'],koyal:['#2e8a6a','K']};
/* labels try right, left, above and below their marker, and take the first spot that stays on the map and clear of others */
let LBOX=[];
function mapLabel(g,text,sub,x,y,color){
  const fs=11*dpr,fs2=9.5*dpr;g.font=`700 ${fs}px "Anek Bangla", sans-serif`;const w1=g.measureText(text).width;
  g.font=`600 ${fs2}px "Anek Bangla", sans-serif`;const w2=sub?g.measureText(sub).width:0;
  const w=Math.max(w1,w2)+10*dpr,h=(sub?28:17)*dpr,o=11*dpr;
  const cand=[[x+o,y-h/2],[x-w-o,y-h/2],[x-w/2,y-h-o],[x-w/2,y+o],[x+o,y-h-o*.4],[x-w-o,y+o*.4],[x+o,y+o*.4],[x-w-o,y-h-o*.4]];
  const fits=([lx,ly])=>lx>=2&&ly>=2&&lx+w<=mini.width-2&&ly+h<=mini.height-2&&!LBOX.some(b=>lx<b[2]&&lx+w>b[0]&&ly<b[3]&&ly+h>b[1]);
  const onMap=([a,b])=>a>=2&&b>=2&&a+w<=mini.width-2&&b+h<=mini.height-2;
  const cover=([a,b])=>LBOX.reduce((t,q)=>t+Math.max(0,Math.min(a+w,q[2])-Math.max(a,q[0]))*Math.max(0,Math.min(b+h,q[3])-Math.max(b,q[1])),0);
  let[lx,ly]=cand.find(fits)||cand.filter(onMap).sort((a,b)=>cover(a)-cover(b))[0]||cand[0];
  LBOX.push([lx-2,ly-2,lx+w+2,ly+h+2]);
  g.fillStyle='rgba(12,28,19,.84)';g.beginPath();g.roundRect(lx,ly,w,h,5*dpr);g.fill();
  g.textAlign='left';g.textBaseline='top';g.fillStyle='#fbfaf3';g.font=`700 ${fs}px "Anek Bangla", sans-serif`;g.fillText(text,lx+5*dpr,ly+3*dpr);
  if(sub){g.fillStyle=color||'#f0a91b';g.font=`600 ${fs2}px "Anek Bangla", sans-serif`;g.fillText(sub,lx+5*dpr,ly+15*dpr);}
}
function drawMiniStatic(){
  miniStatic.width=mini.width;miniStatic.height=mini.height;const g=miniStatic.getContext('2d');
  const R2=(r,c)=>{const[a,b]=m2(r.x0,r.z0),[c2,d]=m2(r.x1,r.z1);g.fillStyle=c;g.fillRect(a,b,c2-a,d-b);};
  const road=(r,c,minW)=>{const[a,b]=m2(r.ax,r.az),[c2,d]=m2(r.bx,r.bz);g.strokeStyle=c;g.lineWidth=Math.max(minW*dpr,r.w*mScale);g.beginPath();g.moveTo(a,b);g.lineTo(c2,d);g.stroke();};
  g.fillStyle='#5f8a3e';g.fillRect(0,0,mini.width,mini.height);LBOX=[[mini.width-28*dpr,0,mini.width,30*dpr]];
  if(mapView==='site'){
    R2({x0:-2000,x1:3000,z0:-2000,z1:3000},'#4f7a36');
    OROADS.forEach(r=>road(r,'#7a7f82',3));
    R2(SITE,'#6f9a52');
    IROADS.forEach(r=>R2(r,'#8a8f92'));R2(GATELINK,'#8a8f92');
    R2(PARK,'#3f8f3c');R2(HALL,'#f1ece0');R2(SHOPS,'#e2cfa6');R2(PARKING,'#a8a196');R2(XFMR,'#d9b22e');
    plots.forEach(p=>R2({x0:p.x+.7,x1:p.x+p.w-.7,z0:p.z+.7,z1:p.z+p.d-.7},'#c47a52'));
    g.textAlign='center';g.textBaseline='middle';
    for(let k=0;k<5;k++){const[x,y]=m2(CX,ROWZ[k]+PD);g.font=`800 ${10*dpr}px "Anek Bangla", sans-serif`;
      g.fillStyle='rgba(12,28,19,.85)';g.beginPath();g.arc(x,y,7.5*dpr,0,6.3);g.fill();g.fillStyle='#f0a91b';g.fillText(BLOCKS[k],x,y+.5*dpr);}
    const lbl=(r,t)=>{const[x,y]=m2((r.x0+r.x1)/2,(r.z0+r.z1)/2);g.font=`700 ${9*dpr}px "Anek Bangla", sans-serif`;g.fillStyle='rgba(12,28,19,.9)';g.fillText(t,x,y);};
    lbl(PARK,'Park');lbl(HALL,'Hall');
    {const[x,y]=m2((SHOPS.x0+SHOPS.x1)/2,(SHOPS.z0+SHOPS.z1)/2);g.save();g.translate(x,y);g.rotate(-Math.PI/2);g.font=`700 ${8.5*dpr}px "Anek Bangla", sans-serif`;g.fillStyle='rgba(12,28,19,.9)';g.fillText('Shops',0,0);g.restore();}
    const[gx,gz]=m2(CX,SZ1);g.fillStyle='#f0a91b';g.fillRect(gx-7*dpr,gz-2*dpr,14*dpr,4*dpr);
    g.font=`700 ${9*dpr}px "Anek Bangla", sans-serif`;g.fillStyle='#fbfaf3';g.fillText('Main gate',gx,gz+9*dpr);
    {const[mx,my]=m2(CX+300,MAIN_Z);g.fillStyle='rgba(255,255,255,.92)';g.font=`600 ${8.5*dpr}px "Anek Bangla", sans-serif`;g.fillText('Main road',mx,my);}
  }else{
    CLUSTERS_ALL.forEach(c=>R2(c,'#b9a98a'));
    OROADS.forEach(r=>road(r,'#e9e4d6',2.2));
    /* reserve every marker first so no label covers one */
    AMEN.forEach(a=>{const[x,y]=m2(a.p.x,a.p.z),r=10*dpr;LBOX.push([x-r,y-r,x+r,y+r]);});
    {const[a,b]=m2(SITE.x0-60,SITE.z0-60),[c,d]=m2(SITE.x1+60,SITE.z1+60),cx=(a+c)/2,cy=(b+d)/2,r=9*dpr;LBOX.push([cx-r,cy-r,cx+r,cy+r]);}
    AMEN.forEach(a=>{
      const[x,y]=m2(a.p.x,a.p.z),[c,l]=AMEN_STYLE[a.key];
      g.fillStyle=c;g.strokeStyle='#ffffff';g.lineWidth=2*dpr;g.beginPath();g.arc(x,y,8*dpr,0,6.3);g.fill();g.stroke();
      g.fillStyle='#fff';g.font=`800 ${9*dpr}px "Anek Bangla", sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(l,x,y+.5*dpr);
      mapLabel(g,a.n,a.d,x,y,'#f0a91b');
    });
    {const[a,b]=m2(SITE.x0-60,SITE.z0-60),[c,d]=m2(SITE.x1+60,SITE.z1+60);g.fillStyle='#1f4d2c';g.strokeStyle='#f0a91b';g.lineWidth=2*dpr;
      const w=Math.max(c-a,14*dpr),h=Math.max(d-b,14*dpr),cx=(a+c)/2,cy=(b+d)/2;g.beginPath();g.roundRect(cx-w/2,cy-h/2,w,h,3*dpr);g.fill();g.stroke();
      mapLabel(g,'Shantiban City','220 plots',cx,cy,'#f0a91b');}
    /* scale bar: 1 km */
    const L=3280.84*mScale,bx=10*dpr,by=mini.height-12*dpr;
    g.strokeStyle='#fbfaf3';g.lineWidth=2*dpr;g.beginPath();g.moveTo(bx,by-4*dpr);g.lineTo(bx,by);g.lineTo(bx+L,by);g.lineTo(bx+L,by-4*dpr);g.stroke();
    g.fillStyle='#fbfaf3';g.font=`700 ${9*dpr}px "Anek Bangla", sans-serif`;g.textAlign='left';g.textBaseline='bottom';g.fillText('1 km',bx+3*dpr,by-4*dpr);
  }
  /* north arrow */
  const nx=mini.width-14*dpr,ny=16*dpr;g.fillStyle='rgba(12,28,19,.8)';g.beginPath();g.arc(nx,ny,10*dpr,0,6.3);g.fill();
  g.fillStyle='#f0a91b';g.beginPath();g.moveTo(nx,ny-7*dpr);g.lineTo(nx+4*dpr,ny+3*dpr);g.lineTo(nx-4*dpr,ny+3*dpr);g.closePath();g.fill();
  g.fillStyle='#fbfaf3';g.font=`800 ${7*dpr}px "Anek Bangla", sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('N',nx,ny+6.5*dpr);
}
function drawMini(){
  if(!miniStatic.width||$('#mapwrap').hidden)return;const g=mini.getContext('2d');g.drawImage(miniStatic,0,0);
  if(inspPlot&&mapView==='site'){const p=inspPlot,[x0,z0]=m2(p.x,p.z),[x1,z1]=m2(p.x+p.w,p.z+p.d);g.fillStyle='rgba(255,190,60,.95)';g.fillRect(x0,z0,x1-x0,z1-z0);}
  const cam=mode==='cine'||mode==='plan';
  const px=cam?camera.position.x:player.x,pz=cam?camera.position.z:player.z,yaw=mode==='cine'?camera.rotation.y:player.yaw;
  if(mode==='plan'&&mapView==='site'){const hh=plan.h*Math.tan(camera.fov*D2R/2),hw=hh*camera.aspect,[x0,z0]=m2(plan.x-hw,plan.z-hh),[x1,z1]=m2(plan.x+hw,plan.z+hh);
    g.strokeStyle='#f0a91b';g.lineWidth=1.5*dpr;g.strokeRect(x0,z0,x1-x0,z1-z0);}
  else{
    let[mx,mz]=m2(px,pz);mx=clamp(mx,6*dpr,mini.width-6*dpr);mz=clamp(mz,6*dpr,mini.height-6*dpr);
    g.save();g.translate(mx,mz);g.rotate(-yaw);
    g.fillStyle='rgba(240,169,27,.3)';g.beginPath();g.moveTo(0,0);g.arc(0,0,28*dpr,-Math.PI/2-.55,-Math.PI/2+.55);g.closePath();g.fill();
    g.fillStyle='#f0a91b';g.strokeStyle='#1d1606';g.lineWidth=1.3*dpr;g.beginPath();g.moveTo(0,-8*dpr);g.lineTo(5.5*dpr,5.5*dpr);g.lineTo(0,2.5*dpr);g.lineTo(-5.5*dpr,5.5*dpr);g.closePath();g.fill();g.stroke();
    g.restore();
  }
  $('#mapYou').textContent='You: '+placeName(px,pz);
}
function setMapView(v){mapView=v;document.querySelectorAll('[data-map]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.map===v)));fitMap();drawMiniStatic();drawMini();
  $('#mapHint').textContent=v==='area'?'Tap a place to fly there':'Tap the map to go there';}
document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>setMapView(b.dataset.map));
mini.addEventListener('click',e=>{
  const r=mini.getBoundingClientRect(),cx=(e.clientX-r.left)*dpr,cy=(e.clientY-r.top)*dpr,[x,z]=un2(cx,cy);
  if(trans||mode==='cine')return;
  const closeOnPhone=()=>{if(innerWidth<=760)$('#mapwrap').hidden=true;};
  if(mapView==='area'){
    let best=null,bd=1e9;AMEN.forEach(a=>{const[ax,ay]=m2(a.p.x,a.p.z),d=Math.hypot(ax-cx,ay-cy);if(d<bd){bd=d;best=a;}});
    if(best&&bd<28*dpr){flyTo(best.p,best.key==='hospital'?420:340,best.key==='hospital'?220:170);toast(`${best.n}: ${best.d} from Shantiban City (approximate).`);closeOnPhone();return;}
    const[sx,sy]=m2(SITE_C.x,SITE_C.z);if(Math.hypot(sx-cx,sy-cy)<30*dpr){setMapView('site');flyTo(SITE_C,700,420);closeOnPhone();}
    return;
  }
  if(mode==='plan'){plan.x=x;plan.z=z;return;}
  if(blockedAt(x,z))return;
  player.x=x;player.z=z;
  if(mode==='tour'){mode='x';setMode('walk');}else if(mode==='walk')startTrans(walkPose(),.7);else startTrans(eyePose(),.7);
  closeOnPhone();
});
/* minimise / expand the map; on phones minimising simply closes it */
function setMapMin(on){
  const w=$('#mapwrap');
  if(innerWidth<=760&&on){w.hidden=true;w.classList.remove('min');return;}
  w.classList.toggle('min',on);$('#mapTitle').setAttribute('aria-expanded',String(!on));
  $('#mapMin').setAttribute('aria-label',on?'Expand map':'Minimise map');$('#mapMin').title=on?'Expand map':'Minimise map';$('#mapMin').textContent=on?'+':'–';
  try{localStorage.setItem('sb-mapmin',on?'1':'0');}catch(e){}
  if(!on)requestAnimationFrame(sizeMini);
}
$('#mapMin').onclick=()=>setMapMin(!$('#mapwrap').classList.contains('min'));
$('#mapTitle').onclick=()=>{if($('#mapwrap').classList.contains('min'))setMapMin(false);};
$('#mapBtn').onclick=()=>{const w=$('#mapwrap');w.hidden=!w.hidden;$('#near').hidden=$('#settings').hidden=true;if(!w.hidden)sizeMini();};

/* ---------------- HUD text ---------------- */
const DIRS=['N','NE','E','SE','S','SW','W','NW'];
const inR=(r,x,z,m=0)=>x>r.x0-m&&x<r.x1+m&&z>r.z0-m&&z<r.z1+m;
function placeName(x,z){
  const p=plotAt(x,z);if(p)return `Plot ${p.no} · ${p.b}`;
  if(insideSite(x,z)){
    for(const r of IROADS)if(inR(r,x,z)){if(r===BOULEVARD)return r.n;const k=RROW.indexOf(r);return k>=0?`${r.n}, between ${BLOCKS[k]} and ${k<4?BLOCKS[k+1]:'the park'}`:r.n;}
    if(inR(PARK,x,z))return 'Park';if(inR(HALL,x,z,20))return 'Community hall';if(inR(SHOPS,x,z,4))return 'Shops for daily needs';if(inR(PARKING,x,z))return 'Parking';if(inR(XFMR,x,z,4))return 'Electricity transformer';
    if(z>SZ1-22&&Math.abs(x-CX)<30)return 'Main gate';
    return 'Inside Shantiban City';
  }
  if(Math.abs(z-MAIN_Z)<MAIN_W/2+4)return 'Main road';
  if(inR(GATELINK,x,z,6))return 'Outside the main gate';
  if(inR(MARKET,x,z,30))return 'Market (about 500 m)';if(inR(BUS,x,z,30))return 'Bus terminus (about 1.5 km)';
  if(inR(SCHOOL,x,z,30))return 'School (about 1.5 km)';if(inR(HOSPITAL,x,z,30))return 'Hospital (about 2 km)';
  if(Math.hypot(x-KOYAL.x,z-KOYAL.z)<160)return 'Koyal More (about 1.5 km)';
  const d=Math.round(Math.hypot(x-SITE_C.x,z-SITE_C.z)*.3048);
  return d<1000?`${d} m from Shantiban City`:`${(d/1000).toFixed(1)} km from Shantiban City`;
}
let hudT=0;
function updateHud(){
  if(mode==='plan'){$('#heading').textContent='Plan';$('#place').textContent='North is up. Drag to move.';return;}
  const yaw=mode==='cine'?camera.rotation.y:player.yaw;
  const b=Math.round((((-yaw/D2R)%360)+360)%360);
  $('#heading').textContent=`${DIRS[Math.round(b/45)%8]} ${b}°`;
  const px=mode==='cine'?camera.position.x:player.x,pz=mode==='cine'?camera.position.z:player.z;
  $('#place').textContent=mode==='drone'||mode==='cine'?`${Math.round(camera.position.y)} ft up · ${placeName(px,pz)}`:placeName(px,pz);
}

/* ---------------- movement ---------------- */
const LIM={x0:-12000,x1:12000,z0:-12000,z1:12000};
let bob=0;
function moveInput(){let f=0,s=0;if(keys.w||keys.arrowup)f+=1;if(keys.s||keys.arrowdown)f-=1;if(keys.d)s+=1;if(keys.a)s-=1;f-=joy.y;s+=joy.x;return[f,s];}
const _la=new V3();
function update(dt,raw){
  if(trans){
    trans.t+=Math.min(raw,.25)/trans.dur;const k=trans.t>=1?1:(1-Math.cos(Math.PI*trans.t))/2;
    camera.position.lerpVectors(trans.p0,trans.p1,k);camera.quaternion.copy(trans.q0).slerp(trans.q1,k);
    if(trans.t>=1){const d=trans.done;trans=null;if(d)d();}
    return;
  }
  if(mode==='intro'){
    if(!reduceMotion)introA+=dt*.03;
    camera.position.set(SITE_C.x+Math.cos(introA)*1500,520,SITE_C.z+Math.sin(introA)*1500);camera.lookAt(SITE_C.x,0,SITE_C.z);return;
  }
  if(mode==='cine'){
    cine.t+=dt*(keys.shift?3:1);
    const end=CINE[CINE.length-1].t;
    if(cine.t>=end){player.x=camera.position.x;player.z=camera.position.z;player.y=camera.position.y;player.yaw=camera.rotation.y;player.pitch=-.4;mode='x';setMode('drone');toast('That’s the film. You’re flying now; switch to Walk to explore on foot.');return;}
    const u=cineU(cine.t);
    camera.position.copy(cineP.getPoint(u));_la.copy(cineL.getPoint(u));camera.lookAt(_la);
    let ci=-1;for(let i=0;i<CINE.length;i++)if(CINE[i].c&&cine.t>=CINE[i].t)ci=i;
    if(ci!==cine.cap){cine.cap=ci;const c=$('#cap');c.classList.remove('on');if(ci>=0){setTimeout(()=>{c.querySelector('b').textContent=CINE[ci].c[0];c.querySelector('span').textContent=CINE[ci].c[1];c.classList.add('on');},350);}}
    const nextT=CINE.slice(ci+1).find(k=>k.c);if(ci>=0&&nextT&&nextT.t-cine.t<1.2)$('#cap').classList.remove('on');
    return;
  }
  if(keys.arrowleft)player.yaw+=dt*1.8;if(keys.arrowright)player.yaw-=dt*1.8;
  let[f,s]=moveInput();
  if(mode==='tour'&&(Math.abs(f)>.01||Math.abs(s)>.01)){mode='x';setMode('walk');toast('You’re walking on your own now.');return;}
  if(mode==='plan'){
    const sp=plan.h*.9*dt;plan.x=clamp(plan.x+s*sp,-3000,4000);plan.z=clamp(plan.z-f*sp,-3000,4000);
    const pp=planPose();camera.position.copy(pp.p);camera.quaternion.copy(pp.q);return;
  }
  if(mode==='tour'){
    tour.u+=(keys.shift?40:12)*dt/tour.len;
    if(tour.u>=1){tour.u=1;mode='x';setMode('walk');toast('That’s the whole route. Explore on your own from here.');return;}
    const p=tourCurve.getPointAt(tour.u);player.x=p.x;player.z=p.z;
    if(!ptrs.size){player.yaw=lerpAngle(player.yaw,tourYawAt(tour.u),1-Math.exp(-dt*2.5));player.pitch+=(-.05-player.pitch)*(1-Math.exp(-dt*2));}
    player.y=groundAt(p.x,p.z)+EYE;
  }else{
    const L=Math.hypot(f,s);if(L>1){f/=L;s/=L;}
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
    const sp=mode==='drone'?(keys.shift?260:70)*clamp(player.y/150,1,6):(keys.shift?24:9);
    const mx=(fx*f+rx*s)*sp*dt,mz=(fz*f+rz*s)*sp*dt;
    if(mode==='walk'){
      if(!blockedAt(player.x+mx,player.z))player.x+=mx;if(!blockedAt(player.x,player.z+mz))player.z+=mz;
      player.x=clamp(player.x,LIM.x0,LIM.x1);player.z=clamp(player.z,LIM.z0,LIM.z1);
      const tgt=groundAt(player.x,player.z)+EYE;player.y+=(tgt-player.y)*Math.min(1,dt*10);
      if(!reduceMotion&&L>.05)bob+=dt*sp*.9;else bob*=.9;
    }else{
      player.x=clamp(player.x+mx,LIM.x0,LIM.x1);player.z=clamp(player.z+mz,LIM.z0,LIM.z1);
      let v=0;if(keys.e||keys[' '])v+=1;if(keys.q||keys.c)v-=1;
      player.y=clamp(player.y+v*sp*.7*dt,14,6000);
    }
  }
  const by=mode==='walk'&&!reduceMotion?Math.sin(bob)*.05:0;
  camera.position.set(player.x,player.y+by,player.z);
  camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
}
function updateShadow(){
  const p=camera.position;let half;
  if(mode==='walk'||mode==='tour')half=260;
  else if(mode==='plan')half=clamp(plan.h*.75,300,1300);
  else half=clamp(p.y*1.6,280,1300);
  const fw=new V3();camera.getWorldDirection(fw);fw.y=0;if(fw.lengthSq()>1e-4)fw.normalize();
  const cx=p.x+fw.x*half*.45,cz=p.z+fw.z*half*.45;
  const c=sun.shadow.camera;if(c.right!==half){c.left=-half;c.right=half;c.top=half;c.bottom=-half;c.updateProjectionMatrix();}
  sun.target.position.set(cx,0,cz);sun.position.set(cx+sunVec.x*1800,sunVec.y*1800,cz+sunVec.z*1800);sun.target.updateMatrixWorld();
}

/* ---------------- post-processing ---------------- */
const rtMain=new THREE.WebGLRenderTarget(innerWidth*Q.pr,innerHeight*Q.pr,{type:THREE.HalfFloatType,samples:Q.msaa});
const composer=new EffectComposer(renderer,rtMain);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.32,.55,1.25);composer.addPass(bloom);
TIME_HOOKS.push((on,night)=>{bloom.threshold=lerp(4,1.1,on);bloom.strength=lerp(.22,.4,on);bloom.enabled=on>.15;});setTime(curHour);
composer.addPass(new OutputPass());
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uVig:{value:.22},uSat:{value:1.06}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uVig,uSat;varying vec2 vUv;
    void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));c.rgb=mix(vec3(l),c.rgb,uSat);
    vec2 d=vUv-.5;c.rgb*=1.-uVig*dot(d,d)*2.2;
    c.rgb+=(fract(sin(dot(vUv*913.7,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=c;}`});
composer.addPass(grade);

/* ---------------- loop ---------------- */
let last=performance.now(),pickT=0,fpsN=0,fpsT=0,slowT=0,adapted=false,lastDraw=0,frameN=0,unfocused=false;
addEventListener('blur',()=>{unfocused=true;});addEventListener('focus',()=>{unfocused=false;});
function frame(now){
  requestAnimationFrame(frame);
  /* frame cap: draw only as often as needed; idle and background windows get very few frames */
  if(document.hidden)return;
  const cap=unfocused?6:mode==='intro'?20:Q.fps;
  if(now-lastDraw<1000/cap-3)return;
  lastDraw=now;frameN++;
  const raw=Math.min((now-last)/1000,.5),dt=Math.min(.05,raw);last=now;fpsN++;fpsT+=raw;
  G.uTime.value+=reduceMotion?dt*.25:dt;
  skyU.uTime.value=G.uTime.value;
  update(dt,raw);
  updateLife(dt);
  GRASS.u.uCam.value.set(camera.position.x,camera.position.z);
  GRASS.mesh.visible=camera.position.y<260;
  updateShadow();
  const showPins=labelsOn&&mode!=='intro';
  /* place labels float over the 3D view only from high up (Fly, Plan, the film's aerial shots); on foot the map shows them */
  const high=camera.position.y>320,inFilm=mode==='cine'&&cine.t>64&&cine.t<84;
  PINS.forEach(p=>{p.s.visible=showPins&&(mode==='plan'?(p.kind==='in'?plan.h<1300:plan.h>1300):((mode==='drone'&&high)||inFilm)&&p.kind!=='in');});
  ARCS.visible=labelsOn&&(mode==='plan'||mode==='drone'&&camera.position.y>300||mode==='cine'&&cine.t>64&&cine.t<84||mode==='intro');
  pickT+=dt;
  if(pickT>.12&&!trans&&mode!=='intro'&&mode!=='cine'){
    pickT=0;
    /* mouse hover: highlight the plot under the cursor and preview its details */
    if(hoverQueued&&!ptrs.size){const p=pickAt(hoverQueued[0],hoverQueued[1]);canvas.classList.toggle('over-plot',!!p);if(!inspPinned)showInsp(p,false);}
    hoverQueued=null;
  }
  hudT+=dt;if(hudT>.15&&mode!=='intro'){hudT=0;updateHud();drawMini();}
  if(frameN%Q.shadowEvery===0)renderer.shadowMap.needsUpdate=true;
  renderSky();
  composer.render();
  /* adaptive quality: if the scene runs slowly for a while, lighten the sky and resolution */
  if(fpsT>2){const fps=fpsN/fpsT;fpsN=0;fpsT=0;if(fps<Q.fps*.8&&!unfocused&&!adapted&&mode!=='intro'){slowT++;if(slowT>2){adapted=true;skyU.uSteps.value=Math.min(skyU.uSteps.value,24);renderer.setPixelRatio(1);onResize();toast('Lowered the detail a little to keep it smooth.');}}else slowT=0;window.__fps=fps;}
}
function onResize(){
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();sizeSky();
  if(!$('#mapwrap').hidden)sizeMini();
}
addEventListener('resize',onResize);

/* ---------------- start ---------------- */
setTimeUI(PRESETS.morning);updateEnv();
rebuildHouses();
camera.position.set(SITE_C.x+Math.cos(introA)*1500,520,SITE_C.z+Math.sin(introA)*1500);camera.lookAt(SITE_C.x,0,SITE_C.z);
prog(.96,'Preparing the graphics…');await tick();
/* street-lamp light on every lit surface (skinned animals excluded), including materials used later by the sample homes */
scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(addLampLight);});
Object.values(HMAT).forEach(addLampLight);Object.values(M).forEach(addLampLight);
try{await renderer.compileAsync(scene,camera);}catch(e){}
prog(1,'Ready.');
window.__ready=true;
requestAnimationFrame(frame);
function enter(m){
  $('#start').hidden=true;
  ['#logoBadge','#where','#bar','#side'].forEach(s=>$(s).hidden=false);
  $('#mapwrap').hidden=innerWidth<=760;
  try{if(innerWidth>760&&localStorage.getItem('sb-mapmin')==='1')setMapMin(true);}catch(e){}
  if(!coarse)$('#keys').hidden=false;
  setTimeout(()=>toast(coarse?'Tap any plot to see its details and preview a home on it.':'Click any plot to see its details and preview a home on it.'),m==='cine'?90000:1800);
  sizeMini();
  if(m==='walk'){player.x=CX;player.z=SZ1+45;player.yaw=0;player.pitch=.02;}
  mode='x';setMode(m);
}
const ew=$('#enterWalk');ew.disabled=false;ew.textContent='Walk in from the main gate';
['#enterCine','#enterPlan'].forEach(s=>$(s).disabled=false);
$('#enterCine').textContent='Watch the drone film';
ew.onclick=()=>enter('walk');$('#enterPlan').onclick=()=>enter('plan');$('#enterCine').onclick=()=>enter('cine');
$('.prog').hidden=true;$('#loadMsg').hidden=true;
window.__shantiban={AGENTS,bloom,composer,renderer,scene,sun,ground,P:PRESETS,setMode,setTime:setTimeUI,player,plan,goToPlot,plots,enter,camera,skyU,G,cine,flyTo,AMEN,houses:HOUSES.length,trees:TREES.length};
