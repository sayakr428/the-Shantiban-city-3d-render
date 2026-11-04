/* =====================================================================
   SITE PLAN. The site outline is traced from the surveyed master plan
   (reference/master-plan.png, pixel coordinates u,v) and scaled so that it
   holds exactly 220 plots of 2.5 katha (36 ft x 50 ft = 1,800 sq ft).
   Main roads are 23 ft, bylanes 13 ft. Pure data: no three.js in here,
   so the same code can be checked from Node (tools/plan-preview.mjs).
   ===================================================================== */
/*PLAN-BEGIN*/
function planSite(S){
  const PW=36,PD=50,WM=23,WB=13,TARGET=220;
  const U0=48,V0=92;
  const X=u=>(u-U0)*S,Z=v=>(v-V0)*S;
  /* outline, clockwise from the north-west corner of the north block (plan pixels) */
  const OUT=[[344,92],[547,115],[557,117],[677,175],[681,188],[660,196],[644,247],[644,440],[640,625],
    [348,628],[347,695],[300,700],[300,752],[281,752],[281,692],[240,692],[240,668],[195,668],[193,640],
    [193,620],[116,620],[114,588],[48,580],[50,532],[110,522],[108,482],[98,470],[98,395],[197,405],
    [197,372],[200,250],[255,250],[255,180],[337,180]];
  const POLY=OUT.map(([u,v])=>[X(u),Z(v)]);
  const inPoly=(x,z)=>{let c=false;for(let i=0,j=POLY.length-1;i<POLY.length;j=i++){const[xi,zi]=POLY[i],[xj,zj]=POLY[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;};
  const rectIn=(x0,z0,x1,z1)=>{
    for(const[x,z]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1],[(x0+x1)/2,z0],[(x0+x1)/2,z1],[x0,(z0+z1)/2],[x1,(z0+z1)/2]])
      if(!inPoly(x,z))return false;
    for(const[x,z]of POLY)if(x>x0+.01&&x<x1-.01&&z>z0+.01&&z<z1-.01)return false;
    return true;};
  const overlap=(a,b)=>a.x0<b.x1-.01&&a.x1>b.x0+.01&&a.z0<b.z1-.01&&a.z1>b.z0+.01;

  /* ---- main roads (23 ft) ---- */
  const XT=X(290),ZN=Z(188),ZM=Z(527),ZG=Z(752);
  const roads=[];
  const road=(x0,x1,z0,z1,n,w,extra)=>{const r=Object.assign({x0,x1,z0,z1,n,w},extra||{});roads.push(r);return r;};
  const trunk=road(XT-WM/2,XT+WM/2,ZN-WM/2,ZG+4,'23 ft main road (to the Baruipur–Amtala road gate)',WM,{main:1,trunk:1});
  const north=road(X(255),X(681)+4,ZN-WM/2,ZN+WM/2,'23 ft main road (to the east gate)',WM,{main:1});
  /* the middle main road runs across both halves of the site at the plan's wide cross road */
  let mx0=1e9,mx1=-1e9;for(let x=0;x<X(700);x+=1)if(inPoly(x,ZM-WM/2+.5)&&inPoly(x,ZM+WM/2-.5)){mx0=Math.min(mx0,x);mx1=Math.max(mx1,x);}
  const mid=road(mx0,mx1,ZM-WM/2,ZM+WM/2,'23 ft main road (cross road)',WM,{main:1});
  /* 13 ft north–south bylanes that break the long rows of the east block */
  const XE_MID=(XT+WM/2+X(644))/2;
  const nsE1=road(XE_MID-WB/2,XE_MID+WB/2,ZN+WM/2,Z(628),'13 ft bylane',WB,{bylane:1,ns:1});

  /* ---- reserved areas for the facilities (plan: community place by the south gate) ---- */
  const zones={
    hall:{x0:X(196),x1:XT-WM/2-1,z0:Z(652),z1:Z(691),n:'Community hall and gym'},
    shops:{x0:XT+WM/2+1,x1:X(346),z0:Z(630),z1:Z(694),n:'Shops for daily needs'},
    park:{x0:X(193),x1:XT-WM/2-1,z0:ZM+WM/2+1,z1:Z(650),n:'Park'},
    play:{x0:X(117),x1:X(193),z0:ZM+WM/2+1,z1:Z(619),n:'Children’s garden'},
    green:{x0:X(548),x1:X(676),z0:Z(118),z1:ZN-WM/2-1,n:'Garden and transformer'}
  };
  const blockers=[...roads,...Object.values(zones)];

  /* ---- stack double rows of plots away from a road: front row, back row, 13 ft bylane, repeat ---- */
  const rows=[],lanes=[];
  function stack(block,zStart,dir,zEnd,xMin,xMax,trunkSide){
    let p=zStart;
    for(let pair=0;pair<20;pair++){
      const rem=(zEnd-p)*dir;if(rem<PD-.01)break;
      const rA={block,z0:Math.min(p,p+dir*PD),z1:Math.max(p,p+dir*PD),f:dir>0?'n':'s',xMin,xMax,trunkSide};
      rows.push(rA);
      if(rem<2*PD-.01)break;
      const rB={block,z0:Math.min(p+dir*PD,p+dir*2*PD),z1:Math.max(p+dir*PD,p+dir*2*PD),xMin,xMax,trunkSide};
      const endRoad=rem<2*PD+WB+PD-.01;          /* no room for another pair: the back row faces the far road */
      rB.f=dir>0?'s':'n';rB.needLane=!endRoad;rows.push(rB);
      if(endRoad)break;
      const lz0=Math.min(p+dir*2*PD,p+dir*(2*PD+WB)),lz1=Math.max(p+dir*2*PD,p+dir*(2*PD+WB));
      rB.lane={z0:lz0,z1:lz1};
      p+=dir*(2*PD+WB);
    }
  }
  const zMidTop=ZM-WM/2,zMidBot=ZM+WM/2,zNTop=ZN-WM/2,zNBot=ZN+WM/2;
  const xL=0,xR=X(700);
  stack('A',zMidBot,1,Z(760),xL,XT-WM/2,'e');      /* west of the trunk, south of the cross road */
  stack('B',zMidTop,-1,zNBot,xL,XT-WM/2,'e');       /* west of the trunk, north of the cross road */
  stack('C',zNTop,-1,Z(80),xL,xR,'w');               /* north block */
  stack('D',zNBot,1,zMidTop,XT+WM/2,xR,'w');        /* east of the trunk, north of the cross road */
  stack('E',zMidBot,1,Z(760),XT+WM/2,xR,'w');       /* east of the trunk, south of the cross road */

  /* ---- fill each row with 36 ft plots inside the outline, clear of roads and facilities ---- */
  const cand=[];
  for(const r of rows){
    const ivs=[];let s=null;
    for(let x=r.xMin;x<=r.xMax+1;x+=1){
      const ok=x<=r.xMax&&inPoly(x,r.z0+.5)&&inPoly(x,r.z1-.5)&&inPoly(x,(r.z0+r.z1)/2)&&(!r.lane||inPoly(x,(r.lane.z0+r.lane.z1)/2))
        &&!blockers.some(b=>x>=b.x0&&x<=b.x1&&r.z0<b.z1-.01&&r.z1>b.z0+.01);
      if(ok&&s===null)s=x;if(!ok&&s!==null){ivs.push([s,x-1]);s=null;}
    }
    r.plots=[];
    for(const[a,b]of ivs){
      const n=Math.floor((b-a)/PW+1e-6);if(n<1)continue;
      /* align to the side nearest the trunk so plot lines continue across bylanes */
      for(let i=0;i<n;i++){const x0=r.trunkSide==='e'?b-(i+1)*PW:a+i*PW;
        const P={x:x0,z:r.z0,w:PW,d:PD,f:r.f,block:r.block,row:r};
        if(rectIn(P.x,P.z,P.x+PW,P.z+PD))r.plots.push(P);}
    }
    r.plots.sort((p,q)=>p.x-q.x);
    cand.push(...r.plots);
  }
  /* ---- bylanes: under every back row that needs one, across the plots it serves ---- */
  for(const r of rows){
    if(!r.lane||!r.plots.length)continue;
    const next=rows.find(q=>q!==r&&q.block===r.block&&Math.abs((r.f==='s'?q.z0:q.z1)-(r.f==='s'?r.lane.z1:r.lane.z0))<.5);
    const xs=[...r.plots,...(next?next.plots:[])].flatMap(p=>[p.x,p.x+p.w]);
    let x0=Math.min(...xs),x1=Math.max(...xs);
    /* reach the main road or bylane nearest each end */
    const ends=roads.filter(q=>q.ns||q.trunk);
    for(const q of ends){if(q.x1<=x0+.5&&x0-q.x1<45)x0=q.x1;if(q.x0>=x1-.5&&q.x0-x1<45)x1=q.x0;}
    lanes.push({x0,x1,z0:r.lane.z0,z1:r.lane.z1,n:'13 ft bylane',w:WB,bylane:1});
  }
  /* north block: a bylane along its west edge joins its rows to the main road */
  {
    const cRows=rows.filter(r=>r.block==='C'&&r.plots.length);
    if(cRows.length){const x0=Math.min(...cRows.flatMap(r=>r.plots.map(p=>p.x)));
      lanes.push({x0:x0-WB,x1:x0,z0:Math.min(...cRows.map(r=>r.z0)),z1:zNTop,n:'13 ft bylane',w:WB,bylane:1,ns:1});}
  }

  /* ---- exactly 220 plots: extra slots in the smallest leftover rows become pocket greens ---- */
  const greens=[];
  let extra=cand.length-TARGET;
  if(extra>0){
    const byRow=rows.filter(r=>r.plots.length).sort((a,b)=>a.plots.length-b.plots.length||Math.abs(b.z0-Z(700))-Math.abs(a.z0-Z(700)));
    for(const r of byRow){
      while(extra>0&&r.plots.length){const p=r.trunkSide==='e'?r.plots.shift():r.plots.pop();greens.push(p);extra--;}
      if(extra<=0)break;
    }
  }
  /* ---- number them: block by block, row by row, serpentine, 1..N ---- */
  const BL=['A','B','C','D','E'],plots=[];
  for(const bl of BL){
    const rs=rows.filter(r=>r.block===bl&&r.plots.length).sort((a,b)=>bl==='A'||bl==='E'||bl==='D'?a.z0-b.z0:b.z0-a.z0);
    rs.forEach((r,i)=>{const ps=i%2?r.plots.slice().reverse():r.plots;ps.forEach(p=>plots.push(p));});
  }
  plots.forEach((p,i)=>{p.no=i+1;delete p.row;});
  greens.forEach(g=>delete g.row);
  return{S,PW,PD,WM,WB,POLY,roads,lanes,zones,plots,greens,count:cand.length,
    XT,ZN,ZM,ZG,gates:[{key:'south',x:XT,z:ZG,n:'Main gate on the Baruipur–Amtala road',dir:'s'},{key:'east',x:X(681),z:ZN,n:'East gate',dir:'e'}]};
}
/* the smallest scale that still holds 220 plots, so the site keeps the plan's shape and no more */
function fitPlan(){
  let lo=1.2,hi=3.2;
  for(let i=0;i<26;i++){const m=(lo+hi)/2;if(planSite(m).count>=220)hi=m;else lo=m;}
  return planSite(hi);
}
/*PLAN-END*/
