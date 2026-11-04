/* =====================================================================
   LAYOUT. The site is the surveyed master-plan outline (02_siteplan.js):
   220 plots of 2.5 katha (36 ft x 50 ft) in five blocks, 23 ft main roads,
   13 ft bylanes, two gates (Baruipur–Amtala road and the east gate).
   ===================================================================== */
prog(.26,'Laying out 220 plots…');await tick();
const PLAN=fitPlan();
const PW=PLAN.PW,PD=PLAN.PD,WMAIN=PLAN.WM,WBY=PLAN.WB,KATHA=720;
const SITE_POLY=PLAN.POLY;
const SITE={x0:Math.min(...SITE_POLY.map(p=>p[0])),x1:Math.max(...SITE_POLY.map(p=>p[0])),z0:Math.min(...SITE_POLY.map(p=>p[1])),z1:Math.max(...SITE_POLY.map(p=>p[1]))};
function inSite(x,z){let c=false;for(let i=0,j=SITE_POLY.length-1;i<SITE_POLY.length;j=i++){const[xi,zi]=SITE_POLY[i],[xj,zj]=SITE_POLY[j];
  if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;}
/* internal roads: 23 ft main roads and 13 ft bylanes, all axis-aligned rectangles */
const IROADS=[...PLAN.roads,...PLAN.lanes];
const TRUNK=PLAN.roads.find(r=>r.trunk),NROAD=PLAN.roads[1],XROAD=PLAN.roads[2];
const CX=PLAN.XT;                       /* centre line of the trunk road */
const SZ1=PLAN.ZG;                      /* the south gate, on the Baruipur–Amtala road */
const GATES=PLAN.gates;
/* small exit gates wherever a main road runs into the boundary wall away from the two entry gates */
const EXITS=[];
for(const r of PLAN.roads.filter(r=>r.main)){
  const ew=(r.x1-r.x0)>(r.z1-r.z0),zc=(r.z0+r.z1)/2,xc=(r.x0+r.x1)/2;
  for(const[x,z,dx,dz]of ew?[[r.x0,zc,-1,0],[r.x1,zc,1,0]]:[[xc,r.z0,0,-1],[xc,r.z1,0,1]]){
    if(inSite(x+dx*1.5,z+dz*1.5))continue;
    if(GATES.some(g=>Math.hypot(g.x-x,g.z-z)<30))continue;
    EXITS.push({x,z,ry:dx>0?Math.PI/2:dx<0?-Math.PI/2:dz>0?0:Math.PI,n:'Exit gate'});
  }
}
const BLOCKS='ABCDE';
/* the site centre for camera framing: middle of the plots */
const SITE_C=new V3((Math.min(...PLAN.plots.map(p=>p.x))+Math.max(...PLAN.plots.map(p=>p.x+p.w)))/2,0,(Math.min(...PLAN.plots.map(p=>p.z))+Math.max(...PLAN.plots.map(p=>p.z+p.d)))/2);

const plots=PLAN.plots.map(p=>{
  const face=p.f==='n'?p.z:p.z+p.d;
  const road=IROADS.find(r=>Math.abs((p.f==='n'?r.z1:r.z0)-face)<1&&r.x0<p.x+p.w-1&&r.x1>p.x+1)||{n:'13 ft bylane'};
  const side=IROADS.find(r=>(Math.abs(r.x1-p.x)<1.5||Math.abs(r.x0-(p.x+p.w))<1.5)&&r.z0<p.z+p.d-1&&r.z1>p.z+1);
  return{no:p.no,id:'Plot '+p.no,b:'Block '+p.block,k:BLOCKS.indexOf(p.block),x:p.x,z:p.z,w:p.w,d:p.d,f:p.f,road,
    corner:!!side,cornerRoad:side?side.n.replace(/\s*\(.*\)$/,''):''};
});
{ /* the numbering must be exactly 1..220 with no gaps or repeats */
  const ok=plots.length===220&&plots.every((p,i)=>p.no===i+1);
  if(!ok)throw new Error('Plot numbering check failed');
}
plots.forEach(p=>{p.sqft=p.w*p.d;p.katha=p.sqft/KATHA;});
const POCKETS=PLAN.greens;

/* community facilities */
const Zf=PLAN.zones;
const PARK=Zf.park,PLAY=Zf.play,SHOPS=Zf.shops,GREEN=Zf.green;
const HALL={x0:Zf.hall.x0,x1:Zf.hall.x1-58,z0:Zf.hall.z0,z1:Zf.hall.z1};
const GYM={x0:Zf.hall.x1-54,x1:Zf.hall.x1,z0:Zf.hall.z0,z1:Zf.hall.z1};
const XFMR={x0:GREEN.x0+16,x1:GREEN.x0+64,z0:GREEN.z1-52,z1:GREEN.z1-6};
const PARKING={x0:Zf.hall.x0,x1:Zf.hall.x1,z0:Zf.hall.z1,z1:Zf.hall.z1};   /* none: kept so older checks stay harmless */
const GATE={x:CX,z:SZ1};
/* the cricket field sits in the park, pitch running north–south */
CRK.center.set((PARK.x0+PARK.x1)/2,0,PARK.z1-2.25-16.6*3.28084);   /* the game's back hedge is the park's south hedge */

/* outer roads: the Baruipur–Amtala road along the south, an approach road from the east gate,
   and village roads to the west and east (three-way road connectivity) */
const MAIN_W=34,MAIN_Z=SZ1+10+MAIN_W/2;
const EG=GATES[1],EAST_X=EG.x+190,WEST_X=SITE.x0-70;
const OROADS=[
  {n:'Baruipur–Amtala road',ax:-14000,az:MAIN_Z,bx:14000,bz:MAIN_Z,w:MAIN_W,big:1},
  {n:'Road to the east gate',ax:EG.x-2,az:EG.z,bx:EAST_X,bz:EG.z,w:WMAIN},
  {n:'Village road (west)',ax:WEST_X,az:-14000,bx:WEST_X,bz:MAIN_Z-MAIN_W/2,w:24},
  {n:'Village road (east)',ax:EAST_X,az:-14000,bx:EAST_X,bz:14000,w:24}
];
const GATELINK={x0:CX-WMAIN/2,x1:CX+WMAIN/2,z0:SZ1,z1:MAIN_Z-MAIN_W/2};

/* nearby places, at the approximate distances in the project information */
const MARKET={x0:SITE_C.x+1350,x1:SITE_C.x+1820,z0:MAIN_Z+30,z1:MAIN_Z+254};
const BUS={x0:SITE_C.x-5230,x1:SITE_C.x-4630,z0:MAIN_Z+30,z1:MAIN_Z+314};
const SCHOOL={x0:WEST_X-412,x1:WEST_X-24,z0:SITE_C.z-5100,z1:SITE_C.z-4620};
const HOSPITAL={x0:EAST_X+24,x1:EAST_X+483,z0:SITE_C.z-6700,z1:SITE_C.z-6200};
const KOYAL_Z=SITE_C.z+4820,KOYAL={x:EAST_X,z:KOYAL_Z};
OROADS.push({n:'Koyal More crossing road',ax:-6500,az:KOYAL_Z,bx:9000,bz:KOYAL_Z,w:24});
const rc=r=>new V3((r.x0+r.x1)/2,0,(r.z0+r.z1)/2);
const AMEN=[
  {key:'market',n:'Market',bn:'বাজার',d:'about 500 m',p:rc(MARKET),near:1},
  {key:'school',n:'School',bn:'স্কুল',d:'about 1.5 km',p:rc(SCHOOL),near:1},
  {key:'hospital',n:'Hospital',bn:'হাসপাতাল',d:'about 2 km',p:rc(HOSPITAL),near:1},
  {key:'bus',n:'Bus terminus',bn:'বাস টার্মিনাস',d:'about 1.5 km',p:rc(BUS),near:1},
  {key:'koyal',n:'Koyal More',bn:'কোয়াল মোড়',d:'about 1.5 km',p:new V3(KOYAL.x,0,KOYAL.z),near:1}
];
AMEN.forEach(a=>{a.m=Math.round(a.p.distanceTo(SITE_C)*.3048);});
const FAR=[
  ['Baruipur District HQ','4.5 km'],['Baruipur Happy Valley','4 km'],['Koyal More','1.5 km'],['Amtala More','8 km'],
  ['Baruipur Bypass','7 km'],['Garia Metro','14 km'],['Joka Metro','15 km'],['Kolkata city','20 km']
];
const INSIDE=[
  {key:'gate',n:'Main gate (Baruipur–Amtala road)',p:new V3(CX,0,SZ1)},
  {key:'egate',n:'East gate',p:new V3(EG.x,0,EG.z)},
  {key:'park',n:'Park and cricket ground',p:rc(PARK)},
  {key:'hall',n:'Community hall',p:rc(HALL)},
  {key:'gym',n:'Gym',p:rc(GYM)},
  {key:'shops',n:'Shops for daily needs',p:rc(SHOPS)},
  {key:'play',n:'Children’s garden',p:rc(PLAY)},
  {key:'power',n:'Electricity transformer',p:rc(XFMR)}
];

/* ---------------- occupancy grid for placing the town ---------------- */
const OC=8,OW=14000,ON=Math.ceil(2*OW/OC),OCC=new Uint8Array(ON*ON);
const oi=x=>clamp(Math.floor((x+OW)/OC),0,ON-1);
function occMark(x0,z0,x1,z1,v=1){
  const a=oi(Math.min(x0,x1)),b=oi(Math.max(x0,x1)),c=oi(Math.min(z0,z1)),d=oi(Math.max(z0,z1));
  for(let j=c;j<=d;j++){const r=j*ON;for(let i=a;i<=b;i++)if(OCC[r+i]<v)OCC[r+i]=v;}
}
function occFree(x0,z0,x1,z1){
  const a=oi(Math.min(x0,x1)),b=oi(Math.max(x0,x1)),c=oi(Math.min(z0,z1)),d=oi(Math.max(z0,z1));
  for(let j=c;j<=d;j++){const r=j*ON;for(let i=a;i<=b;i++)if(OCC[r+i])return false;}
  return true;
}
const occAt=(x,z)=>OCC[oi(z)*ON+oi(x)];
const O_ROAD=1,O_HOUSE=2,O_WATER=3,O_RES=4,O_TREE=5;
/* reserve the site's real outline plus a 45 ft verge, so the village fills in around its irregular shape */
for(let z=SITE.z0-60;z<=SITE.z1+60;z+=OC)for(let x=SITE.x0-60;x<=SITE.x1+60;x+=OC){
  let hit=inSite(x,z);
  for(let k=0;k<8&&!hit;k++){const a=k*Math.PI/4;hit=inSite(x+Math.cos(a)*45,z+Math.sin(a)*45);}
  if(hit)occMark(x,z,x+OC-1,z+OC-1,O_RES);
}
OROADS.forEach(r=>{const h=r.w/2+6;occMark(Math.min(r.ax,r.bx)-h,Math.min(r.az,r.bz)-h,Math.max(r.ax,r.bx)+h,Math.max(r.az,r.bz)+h,O_ROAD);});
[MARKET,BUS,SCHOOL,HOSPITAL].forEach(r=>occMark(r.x0-10,r.z0-10,r.x1+10,r.z1+10,O_RES));
occMark(KOYAL.x-70,KOYAL.z-70,KOYAL.x+70,KOYAL.z+70,O_RES);
occMark(CX-70,MAIN_Z+MAIN_W/2,CX+70,MAIN_Z+MAIN_W/2+90,O_RES);

/* ---------------- town generation (data only; meshes are built later) ---------------- */
const HOUSES=[],LANES=[],PONDS=[],TREES=[],HAY=[];
const PAINT=['#eadcbc','#f0e2c2','#dccaa6','#e8bcae','#bfd5ca','#abc9d9','#f2d68e','#e9ad94','#d8d8d1','#cbbbd9','#f6f2e7','#bacb9d','#e4cba3','#f1caa9','#e6e2d6','#c8d2d6','#f3e7c6','#d9b7b7'];
function floorsPick(main){const r=R();if(main)return r<.18?1:r<.5?2:r<.8?3:r<.95?4:5;return r<.36?1:r<.72?2:r<.92?3:4;}
function addHouse(x,z,w,d,ry,main,fl){
  const floors=fl||floorsPick(main);
  const c=R()<.08?'#b6aea0':pick(PAINT);
  HOUSES.push({x,z,w,d,ry,floors,h:floors*10+1.6,c,shop:main&&R()<.7?1:0,seed:R()*1000,tank:floors>1&&R()<.7,stair:floors>1&&R()<.55});
}
/* houses along a straight road or lane: side = +1 left of travel direction, -1 right */
function frontage(ax,az,bx,bz,roadW,side,o={}){
  const L=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/L,uz=(bz-az)/L,nx=-uz*side,nz=ux*side;
  const ry=Math.atan2(-nx,-nz);
  let s=o.start||0;
  while(s<L-10){
    const w=rr(o.wmin||17,o.wmax||32),d=rr(o.dmin||24,o.dmax||42),set=rr(o.smin||3,o.smax||11);
    const along=s+w/2,off=roadW/2+set+d/2;
    const x=ax+ux*along+nx*off,z=az+uz*along+nz*off;
    const ex=Math.abs(ux)*w/2+Math.abs(nx)*d/2+2,ez=Math.abs(uz)*w/2+Math.abs(nz)*d/2+2;
    if(R()>(o.skip||.06)&&occFree(x-ex,z-ez,x+ex,z+ez)){
      occMark(x-ex+2,z-ez+2,x+ex-2,z+ez-2,O_HOUSE);
      addHouse(x,z,w,d,ry,o.main,o.floors);
    }
    s+=w+rr(o.gmin||1.5,o.gmax||5)+(R()<(o.bigGap||.05)?rr(16,36):0);
  }
}
function addPond(x,z,rx,rz){
  if(!occFree(x-rx-12,z-rz-12,x+rx+12,z+rz+12))return false;
  occMark(x-rx-6,z-rz-6,x+rx+6,z+rz+6,O_WATER);
  PONDS.push({x,z,rx,rz,rot:R()*Math.PI});
  const n=Math.round((rx+rz)/14);
  for(let i=0;i<n;i++){const a=i/n*6.283+R()*.3;TREES.push({t:R()<.75?'coco':'mango',x:x+Math.cos(a)*(rx+10+R()*8),z:z+Math.sin(a)*(rz+10+R()*8),s:rr(.85,1.15)});}
  return true;
}
/* lighter tiers build less of the far town: frontage reach and density scale with Q.world */
const WR=Math.round(2500+10000*Q.world);
/* village clusters laid out around the site and its roads (MZ = first row south of the main road) */
const MZ=MAIN_Z+MAIN_W/2+45,EX=EAST_X+40,WX=WEST_X-50;
const CLUSTERS_ALL=[
  {x0:-2900,x1:EAST_X-60,z0:MZ,z1:MZ+1750,lane:150,ponds:12},
  {x0:EX,x1:EX+880,z0:MZ,z1:MZ+1950,lane:140,ponds:4},
  {x0:EX+1400,x1:EX+2740,z0:MZ,z1:MZ+1850,lane:155,ponds:6},
  {x0:WEST_X+40,x1:EAST_X-60,z0:-1500,z1:SITE.z0-110,lane:150,ponds:4},
  {x0:EX,x1:EX+2640,z0:-2700,z1:MAIN_Z-MAIN_W/2-45,lane:150,ponds:10},
  {x0:-3300,x1:WX,z0:-2900,z1:MAIN_Z-MAIN_W/2-45,lane:150,ponds:12},
  {x0:-1900,x1:WX,z0:-5600,z1:-3500,lane:170,ponds:5},
  {x0:EX,x1:EX+1640,z0:-7200,z1:-5100,lane:170,ponds:5},
  {x0:-700,x1:EX+1640,z0:KOYAL_Z-500,z1:KOYAL_Z+600,lane:160,ponds:4},
  {x0:-5600,x1:-3000,z0:MZ,z1:MZ+1150,lane:170,ponds:4},
  {x0:300,x1:EAST_X-60,z0:MZ+1850,z1:KOYAL_Z-550,lane:190,ponds:3},
  {x0:EX,x1:EX+640,z0:MZ+2000,z1:KOYAL_Z-550,lane:190,ponds:3},
  /* pockets between the irregular site outline and the roads: homes and trees, no through lanes */
  {x0:WEST_X+20,x1:EAST_X-20,z0:SITE.z0-100,z1:MAIN_Z-MAIN_W/2-14,lane:0,ponds:2,pocket:1}
];
/* main-road frontage: shops below, homes above, the way the Baruipur roads look */
const CLUSTERS=CLUSTERS_ALL.filter(c=>c.pocket||Math.hypot((c.x0+c.x1)/2-SITE_C.x,(c.z0+c.z1)/2-SITE_C.z)<1800+8000*Q.world);
for(const side of[1,-1]){
  frontage(-WR,MAIN_Z,WR,MAIN_Z,MAIN_W,side,{main:1,smin:4,smax:9,gmin:1,gmax:6,skip:.03});
}
frontage(WEST_X,-WR,WEST_X,MAIN_Z-60,24,1,{main:1,smin:4,smax:10});
frontage(EG.x+30,EG.z,EAST_X-20,EG.z,WMAIN,1,{main:1,smin:4,smax:9});frontage(EG.x+30,EG.z,EAST_X-20,EG.z,WMAIN,-1,{main:1,smin:4,smax:9});
frontage(WEST_X,-WR,WEST_X,MAIN_Z-60,24,-1,{main:1,smin:4,smax:10});
frontage(EAST_X,-WR,EAST_X,WR,24,1,{main:1,smin:4,smax:10});
frontage(EAST_X,-WR,EAST_X,WR,24,-1,{main:1,smin:4,smax:10});
frontage(-6000,KOYAL_Z,8500,KOYAL_Z,24,1,{main:1,smin:4,smax:10});
frontage(-6000,KOYAL_Z,8500,KOYAL_Z,24,-1,{main:1,smin:4,smax:10});
await tick();
for(const c of CLUSTERS){
  for(let z=c.z0+60;c.lane&&z<c.z1-50;z+=c.lane*rr(.85,1.15)){
    LANES.push({x0:c.x0,x1:c.x1,z0:z,z1:z+12});
    occMark(c.x0,z,c.x1,z+12,O_ROAD);
  }
  for(let x=c.x0+rr(120,300);c.lane&&x<c.x1-80;x+=rr(380,520)){
    LANES.push({x0:x,x1:x+12,z0:c.z0+40,z1:c.z1-30});
    occMark(x,c.z0+40,x+12,c.z1-30,O_ROAD);
  }
  for(let i=0,n=0;i<c.ponds*4&&n<c.ponds;i++){
    const rx=rr(30,80),rz=rr(26,60);if(addPond(rr(c.x0+rx,c.x1-rx),rr(c.z0+rz,c.z1-rz),rx,rz))n++;
  }
}
for(const c of CLUSTERS){
  LANES.filter(l=>l.x0>=c.x0-1&&l.x1<=c.x1+1&&l.z0>=c.z0-1&&l.z1<=c.z1+1).forEach(l=>{
    const ew=(l.x1-l.x0)>(l.z1-l.z0);
    if(ew){const zc=(l.z0+l.z1)/2;frontage(l.x0,zc,l.x1,zc,12,1,{dmin:22,dmax:38,smin:3,smax:8,skip:.03});frontage(l.x0,zc,l.x1,zc,12,-1,{dmin:22,dmax:38,smin:3,smax:8,skip:.03});}
    else{const xc=(l.x0+l.x1)/2;frontage(xc,l.z0,xc,l.z1,12,1,{dmin:22,dmax:38,smin:3,smax:8,skip:.03});frontage(xc,l.z0,xc,l.z1,12,-1,{dmin:22,dmax:38,smin:3,smax:8,skip:.03});}
  });
  /* back-lots between lanes: more homes, trees and courtyards */
  const n=Math.round((c.x1-c.x0)*(c.z1-c.z0)/1200*Q.world);
  for(let i=0;i<n;i++){
    const x=rr(c.x0,c.x1),z=rr(c.z0,c.z1),w=rr(16,32),d=rr(20,38);
    if(occFree(x-w/2-3,z-d/2-3,x+w/2+3,z+d/2+3)){occMark(x-w/2,z-d/2,x+w/2,z+d/2,O_HOUSE);addHouse(x,z,w,d,(R()<.5?0:Math.PI/2)+(R()-.5)*.06,0);}
  }
  const nt=Math.round((c.x1-c.x0)*(c.z1-c.z0)/5200*(.5+.5*Q.world));
  for(let i=0;i<nt;i++){
    const x=rr(c.x0,c.x1),z=rr(c.z0,c.z1);
    if(occAt(x,z))continue;
    if(!occFree(x-3,z-3,x+3,z+3))continue;
    const r=R();TREES.push({t:r<.42?'coco':r<.64?'banana':r<.88?'mango':'areca',x,z,s:rr(.8,1.2)});
    occMark(x-2,z-2,x+2,z+2,O_TREE);
  }
  await tick();
}
/* open country between the paras: paddy, ponds, tree lines along the bunds, scattered homesteads */
for(let i=0;i<70*Q.world;i++){const rx=rr(40,110),rz=rr(30,80);addPond(rr(-11000,11000),rr(-11000,11000),rx,rz);}
for(let i=0;i<900*Q.world;i++){
  const x=rr(-12000,12000),z=rr(-12000,12000);
  if(Math.abs(x-SITE_C.x)<1400&&Math.abs(z-SITE_C.z)<1300)continue;
  if(!occFree(x-40,z-40,x+40,z+40))continue;
  const n=1+(R()*4|0);
  for(let k=0;k<n;k++){const hx=x+rr(-30,30),hz=z+rr(-30,30),w=rr(16,26),d=rr(18,28);
    if(occFree(hx-w/2-2,hz-d/2-2,hx+w/2+2,hz+d/2+2)){occMark(hx-w/2,hz-d/2,hx+w/2,hz+d/2,O_HOUSE);addHouse(hx,hz,w,d,R()*6.28,0,R()<.6?1:2);}}
  for(let k=0;k<6+R()*8;k++){const tx=x+rr(-60,60),tz=z+rr(-60,60);if(!occAt(tx,tz)){const r=R();TREES.push({t:r<.5?'coco':r<.7?'banana':r<.9?'mango':'areca',x:tx,z:tz,s:rr(.85,1.2)});}}
  if(R()<.6)HAY.push({x:x+rr(-25,25),z:z+rr(-25,25),s:rr(.8,1.3)});
}
for(let i=0;i<140*Q.world;i++){ /* tree lines along field bunds */
  const x=rr(-11000,11000),z=rr(-11000,11000),ang=R()<.5?0:Math.PI/2,L=rr(150,600);
  if(Math.abs(x-SITE_C.x)<1000&&Math.abs(z-SITE_C.z)<900)continue;
  for(let s=0;s<L;s+=rr(14,30)){const tx=x+Math.cos(ang)*s,tz=z+Math.sin(ang)*s;if(!occAt(tx,tz))TREES.push({t:R()<.7?'coco':'areca',x:tx,z:tz,s:rr(.85,1.2)});}
}
/* verges around the site: a green buffer between the wall and the outer roads */
/* a ring of coconut and mango trees just outside the boundary wall, following the real outline */
for(let i=0;i<SITE_POLY.length;i++){
  const[ax,az]=SITE_POLY[i],[bx2,bz2]=SITE_POLY[(i+1)%SITE_POLY.length],L=Math.hypot(bx2-ax,bz2-az);
  const ux=(bx2-ax)/L,uz=(bz2-az)/L;let nx=-uz,nz=ux;
  const mx=(ax+bx2)/2,mz=(az+bz2)/2;if(inSite(mx+nx*3,mz+nz*3)){nx=-nx;nz=-nz;}
  for(let s=8;s<L-8;s+=rr(20,32)){const off=rr(14,30),x=ax+ux*s+nx*off,z=az+uz*s+nz*off;
    if(inSite(x,z)||OROADS.some(r=>Math.abs(r.az-r.bz)<1?Math.abs(z-r.az)<r.w/2+6&&x>Math.min(r.ax,r.bx)-6&&x<Math.max(r.ax,r.bx)+6:Math.abs(x-r.ax)<r.w/2+6&&z>Math.min(r.az,r.bz)-6&&z<Math.max(r.az,r.bz)+6))continue;
    if(GATES.some(g=>Math.hypot(x-g.x,z-g.z)<45))continue;
    TREES.push({t:R()<.55?'coco':'mango',x,z,s:rr(.9,1.15)});}
}
HOUSES.forEach(h=>{if(R()<.05)HAY.push({x:h.x+rr(-30,30),z:h.z+rr(-30,30),s:rr(.7,1.1)});});
prog(.34,`Town laid out: ${HOUSES.length.toLocaleString('en-IN')} buildings…`);await tick();
