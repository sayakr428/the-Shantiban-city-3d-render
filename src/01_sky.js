/* =====================================================================
   SKY: Preetham atmosphere + raymarched volumetric cumulus.
   Cloud noise follows the Nubis / Schneider recipe: a tileable
   Perlin-Worley 3D base, a Worley detail volume and a 2D weather map.
   ===================================================================== */
prog(.12,'Growing the clouds…');
await tick();
function hashF(i,j,k,s){
  let h=Math.imul(i|0,374761393)^Math.imul(j|0,668265263)^Math.imul(k|0,1440662683)^Math.imul(s|0,-1028477379);
  h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;
}
function worleyPts(f,seed){
  const P=new Float32Array(f*f*f*3);
  for(let k=0;k<f;k++)for(let j=0;j<f;j++)for(let i=0;i<f;i++){const o=((k*f+j)*f+i)*3;P[o]=hashF(i,j,k,seed);P[o+1]=hashF(i,j,k,seed+17);P[o+2]=hashF(i,j,k,seed+31);}
  return P;
}
function worley(x,y,z,f,P){
  const qx=x*f,qy=y*f,qz=z*f,cx=Math.floor(qx),cy=Math.floor(qy),cz=Math.floor(qz);let md=9;
  for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const ix=cx+dx,iy=cy+dy,iz=cz+dz,wx=(ix%f+f)%f,wy=(iy%f+f)%f,wz=(iz%f+f)%f,o=((wz*f+wy)*f+wx)*3;
    const px=ix+P[o]-qx,py=iy+P[o+1]-qy,pz=iz+P[o+2]-qz,d=px*px+py*py+pz*pz;if(d<md)md=d;
  }
  return 1-Math.min(1,Math.sqrt(md));
}
function perlinTab(f,s){
  const T=new Float32Array(f*f*f*3);
  for(let k=0;k<f;k++)for(let j=0;j<f;j++)for(let i=0;i<f;i++){
    const o=((k*f+j)*f+i)*3,th=hashF(i,j,k,s)*6.2831853,c=2*hashF(i,j,k,s+7)-1,sn=Math.sqrt(1-c*c);
    T[o]=sn*Math.cos(th);T[o+1]=sn*Math.sin(th);T[o+2]=c;
  }
  return T;
}
function perlin(x,y,z,f,T){
  const qx=x*f,qy=y*f,qz=z*f,ix=Math.floor(qx),iy=Math.floor(qy),iz=Math.floor(qz),fx=qx-ix,fy=qy-iy,fz=qz-iz;
  const fd=t=>t*t*t*(t*(t*6-15)+10),u=fd(fx),v=fd(fy),w=fd(fz);
  const gd=(a,b,c,ox,oy,oz)=>{const o=((((iz+c)%f+f)%f*f+((iy+b)%f+f)%f)*f+((ix+a)%f+f)%f)*3;return T[o]*ox+T[o+1]*oy+T[o+2]*oz;};
  const x00=lerp(gd(0,0,0,fx,fy,fz),gd(1,0,0,fx-1,fy,fz),u),x10=lerp(gd(0,1,0,fx,fy-1,fz),gd(1,1,0,fx-1,fy-1,fz),u);
  const x01=lerp(gd(0,0,1,fx,fy,fz-1),gd(1,0,1,fx-1,fy,fz-1),u),x11=lerp(gd(0,1,1,fx,fy-1,fz-1),gd(1,1,1,fx-1,fy-1,fz-1),u);
  return lerp(lerp(x00,x10,v),lerp(x01,x11,v),w);
}
function makeShape(){
  const N=64,D=new Uint8Array(N*N*N*4);
  const W4=worleyPts(4,11),W8=worleyPts(8,23),W16=worleyPts(16,37),W32=worleyPts(32,51);
  const T4=perlinTab(4,3),T8=perlinTab(8,5),T16=perlinTab(16,9);
  let o=0;
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const u=(x+.5)/N,v=(y+.5)/N,w=(z+.5)/N;
    let pn=(perlin(u,v,w,4,T4)*.5+perlin(u,v,w,8,T8)*.25+perlin(u,v,w,16,T16)*.125)/.875;
    pn=clamp(pn*.9+.5,0,1);
    const w4=worley(u,v,w,4,W4),w8=worley(u,v,w,8,W8),w16=worley(u,v,w,16,W16),w32=worley(u,v,w,32,W32);
    const wf=w4*.625+w8*.25+w16*.125;
    const pw=wf+pn*(1-wf);
    D[o++]=pw*255;D[o++]=(w8*.625+w16*.25+w32*.125)*255;D[o++]=(w16*.75+w32*.25)*255;D[o++]=w32*255;
  }
  const t=new THREE.Data3DTexture(D,N,N,N);
  t.format=THREE.RGBAFormat;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.unpackAlignment=1;t.needsUpdate=true;
  return t;
}
function makeDetail(){
  const N=32,D=new Uint8Array(N*N*N*4);
  const A=worleyPts(4,61),B=worleyPts(8,73),C=worleyPts(16,89);
  let o=0;
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const u=(x+.5)/N,v=(y+.5)/N,w=(z+.5)/N;
    D[o++]=worley(u,v,w,4,A)*255;D[o++]=worley(u,v,w,8,B)*255;D[o++]=worley(u,v,w,16,C)*255;D[o++]=255;
  }
  const t=new THREE.Data3DTexture(D,N,N,N);
  t.format=THREE.RGBAFormat;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.unpackAlignment=1;t.needsUpdate=true;
  return t;
}
function makeWeather(){
  const N=256,D=new Uint8Array(N*N*4);
  const T3=perlinTab(3,101),T6=perlinTab(6,103),T12=perlinTab(12,107),T24=perlinTab(24,109),W6=worleyPts(6,113),W12=worleyPts(12,127),T8=perlinTab(8,131);
  let o=0;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const u=(x+.5)/N,v=(y+.5)/N;
    const pn=perlin(u,v,.37,6,T6)*.55+perlin(u,v,.37,12,T12)*.3+perlin(u,v,.37,24,T24)*.15;
    const wb=worley(u,v,.41,6,W6)*.65+worley(u,v,.41,12,W12)*.35;
    const cov=clamp((pn*.9+wb*1.05-.42)*1.7,0,1);
    const typ=clamp(perlin(u,v,.53,3,T3)*1.4+.5,0,1);
    const gust=clamp(perlin(u,v,.71,8,T8)*1.3+.5,0,1);
    D[o++]=cov*255;D[o++]=typ*255;D[o++]=gust*255;D[o++]=255;
  }
  const t=new THREE.DataTexture(D,N,N);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
  return t;
}
const shapeTex=makeShape();await tick();
const detailTex=makeDetail(),weatherTex=makeWeather();
G.uGust.value=weatherTex;
prog(.2,'Lighting the sky…');await tick();

const SKYU={
  uSun:{value:new V3(0,1,0)},uRay:{value:2},uTurb:{value:6},uMie:{value:.005},uMieG:{value:.8},
  uGain:{value:.5},uNight:{value:0},uMoon:{value:new V3(-.45,.6,.55).normalize()}
};
const SKY_COMMON=`
uniform vec3 uSun;uniform float uRay,uTurb,uMie,uMieG,uGain,uNight;uniform vec3 uMoon;
const float PI=3.141592653589793;
const vec3 totalRayleigh=vec3(5.804542996261093E-6,1.3562911419845635E-5,3.0265902468824876E-5);
const vec3 MieConst=vec3(1.8399918514433978E14,2.7798023919660528E14,4.0790479543861094E14);
float sunIntensity(float c){c=clamp(c,-1.,1.);return 1000.*max(0.,1.-exp(-((1.6110731556870734-acos(c))/1.5)));}
float rayleighPhase(float c){return 0.05968310365946075*(1.+c*c);}
float hgPhase(float c,float g){float g2=g*g;return 0.07957747154594767*(1.-g2)/pow(max(1.-2.*g*c+g2,1e-4),1.5);}
float h31(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
vec3 skyColor(vec3 dir,bool disk){
  vec3 up=vec3(0.,1.,0.);vec3 sd=normalize(uSun);
  float sunE=sunIntensity(dot(sd,up));
  float sunfade=1.-clamp(1.-exp(sd.y/450000.),0.,1.);
  vec3 betaR=totalRayleigh*(uRay-(1.-sunfade));
  vec3 betaM=0.434*(0.2*uTurb)*10E-18*MieConst*uMie;
  vec3 d=dir;d.y=max(d.y,0.);d=normalize(d+vec3(0.,.0008,0.));
  float zen=acos(max(0.,dot(up,d)));
  float inv=1./(cos(zen)+0.15*pow(93.885-(zen*180./PI),-1.253));
  vec3 Fex=exp(-(betaR*8.4E3*inv+betaM*1.25E3*inv));
  float ct=dot(d,sd);
  vec3 bRT=betaR*rayleighPhase(ct*.5+.5),bMT=betaM*hgPhase(ct,uMieG);
  vec3 Lin=pow(sunE*((bRT+bMT)/(betaR+betaM))*(1.-Fex),vec3(1.5));
  Lin*=mix(vec3(1.),pow(sunE*((bRT+bMT)/(betaR+betaM))*Fex,vec3(.5)),clamp(pow(1.-dot(up,sd),5.),0.,1.));
  vec3 L0=vec3(.1)*Fex;
  if(disk)L0+=(sunE*19000.*Fex)*smoothstep(0.99995667,0.99997667,ct);
  vec3 c=(Lin+L0)*.04+vec3(0.,.0003,.00075);
  c=pow(c,vec3(1./(1.2+1.2*sunfade)));
  c*=1.-.97*uNight;
  float hz=max(dir.y,0.);
  c+=uNight*mix(vec3(.02,.03,.06),vec3(.006,.011,.03),pow(hz,.5));
  if(disk){
    vec3 sc=floor(dir*460.);
    c+=uNight*step(.9988,h31(sc))*smoothstep(.03,.3,dir.y)*vec3(.85,.9,1.)*(.35+.65*h31(sc+3.1));
    float md=dot(dir,uMoon);
    c+=uNight*(smoothstep(.99985,.99993,md)*vec3(1.6,1.55,1.4)+pow(max(md,0.),400.)*vec3(.05,.06,.08));
  }
  c+=uNight*pow(max(dot(dir,uMoon),0.),20.)*vec3(.006,.008,.012);
  return c*uGain;
}`;

/* environment sky (no clouds) used for image-based light and fog colour */
const envSkyMat=new THREE.ShaderMaterial({
  uniforms:SKYU,side:THREE.BackSide,depthWrite:false,
  vertexShader:`varying vec3 vWP;void main(){vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
  fragmentShader:SKY_COMMON+`varying vec3 vWP;uniform float uCloudDim;void main(){vec3 d=normalize(vWP-cameraPosition);vec3 c=skyColor(d,false);
    float hz=clamp(d.y,0.,1.);c=mix(c,vec3(dot(c,vec3(.3,.5,.2)))*1.15,uCloudDim*smoothstep(0.,.5,hz)*.5);gl_FragColor=vec4(c,1.);}`
});
envSkyMat.uniforms.uCloudDim={value:.4};
const envScene=new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50,48,24),envSkyMat));
{ /* dark ground below the horizon so reflections are not lit from below */
  const gm=new THREE.Mesh(new THREE.CircleGeometry(49,32),new THREE.MeshBasicMaterial({color:0x1d2414}));gm.rotation.x=-Math.PI/2;gm.position.y=-2;envScene.add(gm);
  var envGround=gm.material;
}

/* volumetric sky, rendered at reduced resolution with temporal reprojection */
const SKY_VS=`out vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
const SKY_FS=`precision highp float;precision highp sampler3D;
in vec2 vUv;out vec4 outColor;
uniform mat4 uInvProj,uCamRot,uPrevVP;uniform vec3 uCamPos;uniform sampler2D uHist;uniform float uHistW;
uniform sampler3D uShape,uDetail;uniform sampler2D uWeather;
uniform float uTime,uCover,uSunK,uFrame,uDens;uniform vec3 uSunCol,uAmbTop,uAmbBot,uLightDir;uniform vec2 uWindM;uniform int uSteps;
${SKY_COMMON}
const float RE=6371000.,CB=1500.,CT=4300.;
float remap(float v,float a,float b,float c,float d){return c+(v-a)/(b-a)*(d-c);}
vec2 sph(vec3 ro,vec3 rd,float r){vec3 oc=ro+vec3(0.,RE,0.);float b=dot(oc,rd);float c=dot(oc,oc)-r*r;float h=b*b-c;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
float dens(vec3 p,bool hi,out float hf){
  hf=(length(p+vec3(0.,RE,0.))-RE-CB)/(CT-CB);
  if(hf<0.||hf>1.)return 0.;
  vec2 off=uWindM*uTime;
  vec3 w=texture(uWeather,(p.xz+off*.6)/52000.).rgb;
  float cov=clamp(w.r*1.1+uCover-.68,0.,1.)*smoothstep(0.,.25,uCover);
  if(cov<.02)return 0.;
  float top=mix(.32,1.,w.g);
  float grad=smoothstep(0.,.08,hf)*(1.-smoothstep(top*.45,top,hf));
  vec3 sp=vec3(p.x+off.x,p.y,p.z+off.y)/9500.;
  vec4 n=texture(uShape,sp);
  float lf=n.g*.625+n.b*.25+n.a*.125;
  float base=remap(n.r,lf-1.,1.,0.,1.);
  base=remap(base*grad,1.-cov,1.,0.,1.)*cov;
  if(base<=0.)return 0.;
  if(hi){
    vec3 dn=texture(uDetail,sp*6.1+vec3(uTime*.0011,0.,uTime*.0007)).rgb;
    float df=dn.r*.625+dn.g*.25+dn.b*.125;
    float hm=mix(df,1.-df,clamp(hf*4.,0.,1.));
    base=remap(base,hm*.36,1.,0.,1.);
  }
  return clamp(base,0.,1.)*uDens;
}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  vec4 v=uInvProj*vec4(vUv*2.-1.,1.,1.);
  vec3 rd=normalize(mat3(uCamRot)*normalize(v.xyz/v.w));
  vec3 sky=skyColor(rd,true);
  vec3 col=sky;
  vec3 ro=uCamPos*.3048;
  if(rd.y>-.03&&uDens>0.){
    float camH=length(ro+vec3(0.,RE,0.))-RE;
    vec2 ib=sph(ro,rd,RE+CB),ot=sph(ro,rd,RE+CT);
    float t0=0.,t1=0.;
    if(camH<CB){t0=ib.y;t1=ot.y;}
    else if(camH<CT){t0=0.;t1=ib.x>0.?ib.x:ot.y;}
    else{t0=ot.x;t1=ib.x>0.?ib.x:ot.y;}
    t1=min(t1,t0+42000.);
    if(t1>t0&&t0>=0.){
      float span=t1-t0;
      int N=uSteps;
      float dt=span/float(N);
      float jit=fract(ign(gl_FragCoord.xy)+uFrame*.618034);
      float t=t0+dt*jit;
      float T=1.;vec3 L=vec3(0.);float tw=0.,ww=0.;
      float ct=dot(rd,uLightDir);
      float ph=mix(hgPhase(ct,.72),hgPhase(ct,-.22),.32)+.02;
      for(int i=0;i<128;i++){
        if(i>=N)break;
        vec3 p=ro+rd*t;float hf;
        float d=dens(p,true,hf);
        if(d>.002){
          float od=0.,ls=70.;vec3 lp=p;
          for(int j=0;j<6;j++){lp+=uLightDir*ls;float h2;od+=dens(lp,j<2,h2)*ls;ls*=1.75;}
          float sig=d*.045;
          float ex=od*.045;
          float lightT=max(exp(-ex),exp(-ex*.25)*.7)+exp(-ex*.05)*.18;
          float powder=1.-exp(-d*14.);
          vec3 amb=mix(uAmbBot,uAmbTop,clamp(hf*1.2,0.,1.))*(.8+.5*hf);
          vec3 S=uSunCol*lightT*ph*uSunK*mix(.45,1.,powder)+amb;
          float tr=exp(-sig*dt);
          L+=T*S*(1.-tr);
          tw+=t*T*(1.-tr);ww+=T*(1.-tr);
          T*=tr;
          if(T<.012)break;
        }
        t+=dt;
      }
      float dist=ww>0.?tw/ww:t0;
      float fade=exp(-max(dist-5000.,0.)/17000.)*smoothstep(-.03,.06,rd.y);
      col=sky*mix(1.,T,fade)+L*fade;
    }
  }
  vec4 pc=uPrevVP*vec4(rd,0.);
  if(pc.w>0.){vec2 puv=pc.xy/pc.w*.5+.5;
    if(puv.x>0.&&puv.y>0.&&puv.x<1.&&puv.y<1.)col=mix(col,texture(uHist,puv).rgb,uHistW);}
  outColor=vec4(max(col,vec3(0.)),1.);
}`;
const skyU=Object.assign({},SKYU,{
  uInvProj:{value:new THREE.Matrix4()},uCamRot:{value:new THREE.Matrix4()},uPrevVP:{value:new THREE.Matrix4()},
  uCamPos:{value:new V3()},uHist:{value:null},uHistW:{value:0},
  uShape:{value:shapeTex},uDetail:{value:detailTex},uWeather:{value:weatherTex},
  uTime:{value:0},uCover:{value:.55},uSunK:{value:14},uFrame:{value:0},uDens:{value:1},
  uSunCol:{value:new THREE.Color(1,1,1)},uAmbTop:{value:new THREE.Color(.3,.4,.55)},uAmbBot:{value:new THREE.Color(.25,.27,.3)},
  uLightDir:{value:new V3(0,1,0)},uWindM:{value:new THREE.Vector2(24,10)},uSteps:{value:Q.steps}
});
const skyQuadMat=new THREE.ShaderMaterial({uniforms:skyU,vertexShader:SKY_VS,fragmentShader:SKY_FS,glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false});
const skyQuadScene=new THREE.Scene();
{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
 const m=new THREE.Mesh(g,skyQuadMat);m.frustumCulled=false;skyQuadScene.add(m);}
const orthoCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
let skyRT=[],skyCur=0,skyReset=true;
const prevVP=new THREE.Matrix4(),_rot=new THREE.Matrix4(),_rotInv=new THREE.Matrix4();
function sizeSky(){
  skyRT.forEach(r=>r.dispose());
  const w=Math.max(2,Math.ceil(innerWidth*Q.pr*Q.sky)),h=Math.max(2,Math.ceil(innerHeight*Q.pr*Q.sky));
  skyRT=[0,1].map(()=>new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}));
  skyReset=true;
}
sizeSky();
function renderSky(){
  camera.updateMatrixWorld();
  _rot.extractRotation(camera.matrixWorld);
  skyU.uInvProj.value.copy(camera.projectionMatrixInverse);
  skyU.uCamRot.value.copy(_rot);
  skyU.uCamPos.value.copy(camera.position);
  skyU.uHist.value=skyRT[skyCur^1].texture;
  skyU.uPrevVP.value.copy(prevVP);
  skyU.uHistW.value=skyReset?0:.8;
  skyU.uFrame.value=(skyU.uFrame.value+1)%1000;
  renderer.setRenderTarget(skyRT[skyCur]);renderer.render(skyQuadScene,orthoCam);renderer.setRenderTarget(null);
  scene.background=skyRT[skyCur].texture;
  _rotInv.copy(_rot).invert();prevVP.multiplyMatrices(camera.projectionMatrix,_rotInv);
  skyCur^=1;skyReset=false;
}

/* ---------------- lights ---------------- */
const hemi=new THREE.HemisphereLight(0xbfd4e6,0x3a4528,.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,8);
sun.castShadow=true;sun.shadow.mapSize.set(Q.shadow,Q.shadow);sun.shadow.bias=-.00025;sun.shadow.normalBias=.35;
sun.shadow.camera.near=10;sun.shadow.camera.far=4000;scene.add(sun,sun.target);
const sunVec=new V3(0,1,0);

const pmrem=new THREE.PMREMGenerator(renderer);
let envRT=null;
const probeRT=new THREE.WebGLRenderTarget(8,8,{type:THREE.FloatType});
const probeCam=new THREE.PerspectiveCamera(40,1,.1,100),probePx=new Float32Array(8*8*4);
function probe(dx,dy,dz){
  probeCam.position.set(0,0,0);probeCam.lookAt(dx,dy,dz);
  renderer.setRenderTarget(probeRT);renderer.render(envScene,probeCam);renderer.readRenderTargetPixels(probeRT,0,0,8,8,probePx);
  let r=0,g=0,b=0;for(let i=0;i<probePx.length;i+=4){r+=probePx[i];g+=probePx[i+1];b+=probePx[i+2];}
  const n=probePx.length/4;return new THREE.Color(r/n,g/n,b/n);
}
function updateEnv(){
  const rt=pmrem.fromScene(envScene,0,.1,100);if(envRT)envRT.dispose();envRT=rt;scene.environment=rt.texture;
  const sd=SKYU.uSun.value,az=Math.atan2(sd.x,sd.z);
  const f=new THREE.Color(0,0,0);
  for(const a of[az,az+Math.PI,az+Math.PI/2,az-Math.PI/2]){f.add(probe(Math.sin(a),.025,Math.cos(a)));}
  f.multiplyScalar(.25);
  renderer.setRenderTarget(null);
  scene.fog.color.copy(f);
  const zen=probe(0,1,0.001);
  renderer.setRenderTarget(null);
  skyU.uAmbTop.value.copy(zen).multiplyScalar(1.25);
  skyU.uAmbBot.value.copy(f).multiplyScalar(.9);
  skyReset=true;
}
let envTimer=0;function scheduleEnv(){clearTimeout(envTimer);envTimer=setTimeout(updateEnv,100);}

function dayOfYear(d){return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);}
const DOY=dayOfYear(new Date());
const LAT=22.3658,LON=88.3377;
function sunAt(hour){
  const lat=LAT*D2R,B=2*Math.PI*(DOY-81)/364;
  const eot=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B);
  const decl=23.44*D2R*Math.sin(2*Math.PI*(284+DOY)/365);
  const solar=hour+(LON-82.5)/15+eot/60,HA=(solar-12)*15*D2R;
  const el=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(HA));
  const az=Math.atan2(Math.sin(HA),Math.cos(HA)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI;
  return{el,dir:new V3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el))};
}
function crossing(a,b,rising){for(let i=0;i<40;i++){const m=(a+b)/2;if((sunAt(m).el>0)===rising)b=m;else a=m;}return(a+b)/2;}
const SUNRISE=crossing(3,10,true),SUNSET=crossing(14,21,false);
const PRESETS={dawn:SUNRISE+.25,morning:SUNRISE+2.6,noon:12.1,golden:SUNSET-.38,night:SUNSET+2.4};
const TIME_HOOKS=[];
let lampsOn=0,curHour=8;
function fmtTime(h){const hh=Math.floor(h),mm=Math.round((h-hh)*60)%60;return `${((hh+11)%12)+1}:${String(mm).padStart(2,'0')} ${hh>=12?'pm':'am'}`;}
function setTime(h){
  curHour=h;
  const s=sunAt(h),e=s.el/D2R,U=SKYU;
  const day=clamp((e+1)/16,0,1),night=clamp((-e-2)/9,0,1),gold=clamp(1-Math.abs(e-3)/10,0,1)*(1-night);
  U.uSun.value.copy(s.dir);U.uNight.value=night;G.uNight.value=night;
  U.uRay.value=2.0+1.0*gold;U.uTurb.value=4.5+4*gold;U.uMie.value=.004+.004*gold;
  const warm=new THREE.Color(1.5,.66,.32),white=new THREE.Color(1.12,1.08,1.0),sunVis=clamp((e+4)/6,0,1);
  if(sunVis>.03){skyU.uLightDir.value.copy(s.dir);if(skyU.uLightDir.value.y<.02)skyU.uLightDir.value.y=.02;skyU.uLightDir.value.normalize();
    skyU.uSunCol.value.copy(white).lerp(warm,clamp(1-(e-1)/14,0,1)).multiplyScalar(sunVis);}
  else{skyU.uLightDir.value.copy(U.uMoon.value);skyU.uSunCol.value.setRGB(.035,.04,.055);}
  if(e>-1.5){const k=clamp((e+1.5)/9,0,1);
    sun.color.setRGB(1,.96,.9).lerp(new THREE.Color(1,.5,.22),Math.pow(clamp(1-(e-1)/14,0,1),1.4));sun.intensity=9.5*Math.pow(k,1.2);
    sunVec.copy(s.dir);if(sunVec.y<.04)sunVec.y=.04;sunVec.normalize();}
  else{sun.color.setRGB(.6,.7,.95);sun.intensity=.55*night+.08;sunVec.copy(U.uMoon.value);}
  hemi.color.setRGB(.55,.65,.85);hemi.groundColor.setRGB(.2,.22,.15);hemi.intensity=(.25+.5*day)*(1-night*.7);
  renderer.toneMappingExposure=.62+.5*night+.18*(1-day)*(1-night);
  envGround.color.setRGB(.05+.06*day,.06+.07*day,.04+.04*day);
  lampsOn=clamp((6-e)/6,0,1);
  SIGNS.forEach(m=>m.emissiveIntensity=lampsOn*.55);
  TIME_HOOKS.forEach(f=>f(lampsOn,night,day));
  const to=$('#timeOut');if(to)to.textContent=fmtTime(h);
  document.querySelectorAll('[data-tod]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(PRESETS[b.dataset.tod]-h)<.1)));
  scheduleEnv();
}
