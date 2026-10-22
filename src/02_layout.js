/* =====================================================================
   LAYOUT. 220 plots in five blocks of 44. Each block is two back-to-back
   rows split by the central boulevard; numbers run clockwise inside a
   block, so Block A is 1-44, B 45-88, C 89-132, D 133-176, E 177-220.
   ===================================================================== */
prog(.26,'Laying out 220 plots…');await tick();
const PW=36,PD=40,NPR=11,LANE=20,BLVD=30,ROWRD=25;
const XW0=LANE,XW1=XW0+NPR*PW,XB0=XW1,XB1=XB0+BLVD,XE0=XB1,XE1=XE0+NPR*PW,SX1=XE1+LANE;
const CX=(XB0+XB1)/2;
const BLOCKS='ABCDE',ROWZ=[];
{let z=LANE;for(let k=0;k<5;k++){ROWZ.push(z);z+=2*PD+ROWRD;}}
const ZAM0=ROWZ[4]+2*PD+ROWRD,SZ1=ZAM0+215;
const SITE={x0:0,x1:SX1,z0:0,z1:SZ1};
const SITE_C=new V3((SITE.x0+SITE.x1)/2,0,(SITE.z0+SITE.z1)/2);
const KATHA=720;

const IROADS=[];
const addIR=(x0,x1,z0,z1,n)=>{const r={x0,x1,z0,z1,n};IROADS.push(r);return r;};
const RD0=addIR(0,SX1,0,LANE,'20 ft internal road');
const RROW=ROWZ.map(z=>addIR(0,SX1,z+2*PD,z+2*PD+ROWRD,'25 ft internal road'));
addIR(0,LANE,0,ZAM0,'20 ft internal road');
addIR(XE1,SX1,0,ZAM0,'20 ft internal road');
const BOULEVARD=addIR(XB0,XB1,0,SZ1,'30 ft central boulevard');

const plots=[];
for(let k=0;k<5;k++){
  const base=k*44,z0=ROWZ[k],blk='Block '+BLOCKS[k];
  const nRoad=k===0?RD0:RROW[k-1],sRoad=RROW[k];
  const mk=(no,x,z,f,road,i,side)=>plots.push({no,id:'Plot '+no,b:blk,k,x,z,w:PW,d:PD,f,road,
    corner:(side==='w'&&i===0)||(side==='w'&&i===NPR-1)||(side==='e'&&i===0)||(side==='e'&&i===NPR-1),
    cornerRoad:side==='w'?(i===0?'the 20 ft side road':'the 30 ft central boulevard'):(i===0?'the 30 ft central boulevard':'the 20 ft side road')});
  for(let i=0;i<NPR;i++)mk(base+1+i,XW0+i*PW,z0,'n',nRoad,i,'w');
  for(let i=0;i<NPR;i++)mk(base+12+i,XE0+i*PW,z0,'n',nRoad,i,'e');
  for(let i=NPR-1;i>=0;i--)mk(base+23+(NPR-1-i),XE0+i*PW,z0+PD,'s',sRoad,i,'e');
  for(let i=NPR-1;i>=0;i--)mk(base+34+(NPR-1-i),XW0+i*PW,z0+PD,'s',sRoad,i,'w');
}
plots.sort((a,b)=>a.no-b.no);
{ /* the numbering must be exactly 1..220 with no gaps or repeats */
  const ok=plots.length===220&&plots.every((p,i)=>p.no===i+1);
  if(!ok)throw new Error('Plot numbering check failed');
}
plots.forEach(p=>{p.sqft=p.w*p.d;p.katha=p.sqft/KATHA;});

/* community facilities inside the gate */
const PARK={x0:20,x1:404,z0:562,z1:744};
const SHOPS={x0:452,x1:512,z0:556,z1:746};
const HALL={x0:566,x1:772,z0:568,z1:686};
const PARKING={x0:566,x1:842,z0:704,z1:748};
const XFMR={x0:796,x1:846,z0:578,z1:634};
const GATE={x:CX,z:SZ1};

/* outer roads: the site has road access on three sides (south, west, east) */
const MAIN_Z=806,MAIN_W=34,WEST_X=-58,EAST_X=917,KOYAL_Z=5200;
const OROADS=[
  {n:'Main road',ax:-14000,az:MAIN_Z,bx:14000,bz:MAIN_Z,w:MAIN_W,big:1},
  {n:'Road along the west side',ax:WEST_X,az:-14000,bx:WEST_X,bz:MAIN_Z-MAIN_W/2,w:24},
  {n:'Road along the east side',ax:EAST_X,az:-14000,bx:EAST_X,bz:14000,w:24},
  {n:'Koyal More crossing road',ax:-6500,az:KOYAL_Z,bx:9000,bz:KOYAL_Z,w:24}
];
const GATELINK={x0:XB0,x1:XB1,z0:SZ1,z1:MAIN_Z-MAIN_W/2};

/* nearby places, at the approximate distances in the project information */
const MARKET={x0:1860,x1:2330,z0:836,z1:1060};
const BUS={x0:-4700,x1:-4100,z0:836,z1:1120};
const SCHOOL={x0:-470,x1:-82,z0:-4720,z1:-4240};
const HOSPITAL={x0:941,x1:1400,z0:-6320,z1:-5820};
const KOYAL={x:EAST_X,z:KOYAL_Z};
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
  {key:'gate',n:'Main gate and security',p:new V3(CX,0,SZ1)},
  {key:'boulevard',n:'30 ft central boulevard',p:new V3(CX,0,300)},
  {key:'park',n:'Park',p:rc(PARK)},
  {key:'hall',n:'Community hall',p:rc(HALL)},
  {key:'shops',n:'Shops for daily needs',p:rc(SHOPS)},
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
occMark(SITE.x0-55,SITE.z0-70,SITE.x1+40,SITE.z1+10,O_RES);
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
const CLUSTERS_ALL=[
  {x0:-2900,x1:880,z0:850,z1:2600,lane:150,ponds:12},
  {x0:960,x1:1840,z0:850,z1:2800,lane:140,ponds:4},
  {x0:2360,x1:3700,z0:850,z1:2700,lane:155,ponds:6},
  {x0:-40,x1:880,z0:-1500,z1:-80,lane:150,ponds:4},
  {x0:960,x1:3600,z0:-2700,z1:760,lane:150,ponds:10},
  {x0:-3300,x1:-110,z0:-2900,z1:760,lane:150,ponds:12},
  {x0:-1900,x1:-110,z0:-5600,z1:-3500,lane:170,ponds:5},
  {x0:960,x1:2600,z0:-7200,z1:-5100,lane:170,ponds:5},
  {x0:-700,x1:2600,z0:4700,z1:5800,lane:160,ponds:4},
  {x0:-5600,x1:-3000,z0:850,z1:2000,lane:170,ponds:4},
  {x0:300,x1:880,z0:2700,z1:4650,lane:190,ponds:3},
  {x0:960,x1:1600,z0:2850,z1:4650,lane:190,ponds:3}
];
/* main-road frontage: shops below, homes above, the way the Baruipur roads look */
const CLUSTERS=CLUSTERS_ALL.filter(c=>Math.hypot((c.x0+c.x1)/2-431,(c.z0+c.z1)/2-380)<1800+8000*Q.world);
for(const side of[1,-1]){
  frontage(-WR,MAIN_Z,WR,MAIN_Z,MAIN_W,side,{main:1,smin:4,smax:9,gmin:1,gmax:6,skip:.03});
}
frontage(WEST_X,-WR,WEST_X,MAIN_Z-60,24,1,{main:1,smin:4,smax:10});
frontage(WEST_X,-WR,WEST_X,MAIN_Z-60,24,-1,{main:1,smin:4,smax:10});
frontage(EAST_X,-WR,EAST_X,WR,24,1,{main:1,smin:4,smax:10});
frontage(EAST_X,-WR,EAST_X,WR,24,-1,{main:1,smin:4,smax:10});
frontage(-6000,KOYAL_Z,8500,KOYAL_Z,24,1,{main:1,smin:4,smax:10});
frontage(-6000,KOYAL_Z,8500,KOYAL_Z,24,-1,{main:1,smin:4,smax:10});
await tick();
for(const c of CLUSTERS){
  for(let z=c.z0+60;z<c.z1-50;z+=c.lane*rr(.85,1.15)){
    LANES.push({x0:c.x0,x1:c.x1,z0:z,z1:z+12});
    occMark(c.x0,z,c.x1,z+12,O_ROAD);
  }
  for(let x=c.x0+rr(120,300);x<c.x1-80;x+=rr(380,520)){
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
  if(Math.abs(x-431)<1400&&Math.abs(z-380)<1300)continue;
  if(!occFree(x-40,z-40,x+40,z+40))continue;
  const n=1+(R()*4|0);
  for(let k=0;k<n;k++){const hx=x+rr(-30,30),hz=z+rr(-30,30),w=rr(16,26),d=rr(18,28);
    if(occFree(hx-w/2-2,hz-d/2-2,hx+w/2+2,hz+d/2+2)){occMark(hx-w/2,hz-d/2,hx+w/2,hz+d/2,O_HOUSE);addHouse(hx,hz,w,d,R()*6.28,0,R()<.6?1:2);}}
  for(let k=0;k<6+R()*8;k++){const tx=x+rr(-60,60),tz=z+rr(-60,60);if(!occAt(tx,tz)){const r=R();TREES.push({t:r<.5?'coco':r<.7?'banana':r<.9?'mango':'areca',x:tx,z:tz,s:rr(.85,1.2)});}}
  if(R()<.6)HAY.push({x:x+rr(-25,25),z:z+rr(-25,25),s:rr(.8,1.3)});
}
for(let i=0;i<140*Q.world;i++){ /* tree lines along field bunds */
  const x=rr(-11000,11000),z=rr(-11000,11000),ang=R()<.5?0:Math.PI/2,L=rr(150,600);
  if(Math.abs(x-431)<1000&&Math.abs(z-380)<900)continue;
  for(let s=0;s<L;s+=rr(14,30)){const tx=x+Math.cos(ang)*s,tz=z+Math.sin(ang)*s;if(!occAt(tx,tz))TREES.push({t:R()<.7?'coco':'areca',x:tx,z:tz,s:rr(.85,1.2)});}
}
/* verges around the site: a green buffer between the wall and the outer roads */
for(let z=-50;z<SZ1;z+=rr(18,30)){TREES.push({t:R()<.6?'coco':'mango',x:rr(-36,-14),z,s:rr(.9,1.15)});TREES.push({t:R()<.6?'coco':'mango',x:rr(SX1+12,SX1+30),z,s:rr(.9,1.15)});}
for(let x=-30;x<SX1+30;x+=rr(18,30))TREES.push({t:R()<.5?'coco':'mango',x,z:rr(-55,-15),s:rr(.9,1.2)});
for(let x=-30;x<SX1+20;x+=rr(22,34)){if(Math.abs(x-CX)<40)continue;TREES.push({t:'areca',x,z:SZ1+rr(7,13),s:rr(.9,1.1)});}
HOUSES.forEach(h=>{if(R()<.05)HAY.push({x:h.x+rr(-30,30),z:h.z+rr(-30,30),s:rr(.7,1.1)});});
prog(.34,`Town laid out: ${HOUSES.length.toLocaleString('en-IN')} buildings…`);await tick();
