import * as THREE from 'three';
import { observeSceneVisibility } from './observeSceneVisibility';
import { cardVertex, cardFragment, pulseVertex, pulseFragment } from './ArtcraftShaders';

const media = ['preview-0.webp','card-front.jpg','preview-2.webp','sticker-one.jpg','preview-4.webp','bag-front.jpg','preview-1.webp','sticker-two.jpg','preview-3.webp','stickers-front.jpg','preview-4.webp','card-back.jpg'];
const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t*t*(3-2*t); };
const ease = x => 1-Math.pow(1-clamp(x),3);
const wrap = x => (x%1+1)%1;

// Reconstructed from ArtCraft's published galaxy layout/motion/pointer tunables.
// Original shaders are kept separately; source measurements live in qa/artcraft-reverse.
export function createArtcraftScene(host, onReady, onError, { cover = null } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
  catch { onError(); return () => {}; }
  renderer.setClearColor(0x121316,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene=new THREE.Scene(), guides=new THREE.Group();
  scene.add(guides);
  const camera=new THREE.PerspectiveCamera(30,1,1,4000);
  const plane=new THREE.PlaneGeometry(1,1,12,12);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
  const root=host.closest('main');
  const loader=new THREE.TextureLoader();
  let disposed=false,visible=true,frame=0,last=0,width=1,height=1,distance=1000;
  let arms=6,slots=6,pitch=1,birth=0,exit=1,cap=200,mobile=false;
  let elapsed=0,idle=0,spin=0,intro=0,holdTarget=0,holdRest=0,fieldK=1,target=-1,boostCard=-1,boostOn=false,boost=0;
  const pointer={x:10000,y:10000,active:false};
  const ripples=[],punches=[],cards=[];
  const textureCache = new Map();
  const textures=media.map(name=>{
    if (textureCache.has(name)) return textureCache.get(name);
    const texture=loader.load(`/assets/${name}`,()=>{if(!disposed) wake();});
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearFilter;
    texture.generateMipmaps=false;
    textureCache.set(name, texture);
    return texture;
  });
  const lineMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.1,depthTest:false,depthWrite:false});
  const tickMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.22,depthTest:false,depthWrite:false});
  const ribbonMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:pulseVertex,fragmentShader:pulseFragment,
    uniforms:{uTime:{value:0},uColor:{value:new THREE.Color('#ffffff')},uAlpha:{value:.1},uPulseColor:{value:new THREE.Color('#ffffff')},uPulseAlpha:{value:.72},uSpeed:{value:.19},uWidth:{value:.05},uCount:{value:3},uHue:{value:0},uBaseW:{value:2},uPulseW:{value:3.5},uWaveR:{value:0},uWaveBand:{value:220}}
  });

  function clearLayout(){
    for(const card of cards){scene.remove(card.mesh);card.mesh.material.dispose();}
    cards.length=0;
    for(const child of [...guides.children]){guides.remove(child);child.geometry.dispose();}
  }
  function resize(){
    width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(width,height);
    distance=height/2/Math.tan(Math.PI/12);camera.aspect=width/height;camera.position.z=distance;camera.near=Math.max(1,distance-1200);camera.far=distance+1200;camera.updateProjectionMatrix();
    clearLayout();mobile=width*height<600000;arms=mobile?3:6;
    const count=mobile?14:Math.max(6,Math.min(64,Math.round(64*width*height/1650000)));
    slots=Math.ceil(count/arms);
    const diagonal=Math.hypot(width,height)/2,outer=diagonal*(mobile?.8:.7),turns=(mobile?.7:1.05)*TAU;
    pitch=outer/turns;birth=turns*.08;cap=Math.min(340,Math.max(70,height*(mobile?.3:.25)));exit=(diagonal+cap*1.5)/pitch;
    for(let arm=0;arm<arms;arm++){
      const vertices=[],normals=[],sides=[],progress=[],armIds=[],indices=[];
      for(let step=0;step<=200;step++){
        const t=step/200,theta=birth*.3+(exit-birth*.3)*t,r=pitch*theta,a=theta+arm*TAU/arms;
        const dx=pitch*Math.cos(a)-r*Math.sin(a),dy=pitch*Math.sin(a)+r*Math.cos(a),len=Math.hypot(dx,dy)||1;
        for(const side of [-1,1]){vertices.push(r*Math.cos(a),r*Math.sin(a),-2);normals.push(-dy/len,dx/len);sides.push(side);progress.push(t);armIds.push(arm);}
        if(step<200){const i=step*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
      }
      const geom=new THREE.BufferGeometry();
      geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.setAttribute('aN',new THREE.Float32BufferAttribute(normals,2));geom.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));geom.setAttribute('aT',new THREE.Float32BufferAttribute(progress,1));geom.setAttribute('aArm',new THREE.Float32BufferAttribute(armIds,1));geom.setIndex(indices);guides.add(new THREE.Mesh(geom,ribbonMaterial));
    }
    const ticks=[],circle=[];
    for(let arm=0;arm<arms;arm++)for(let i=0;i<16;i++){
      const theta=turns*(.45+.55*(i+.5)/16),r=pitch*theta,a=theta+arm*TAU/arms;
      for(const delta of [-6,6])ticks.push((r+delta)*Math.cos(a),(r+delta)*Math.sin(a),-2);
    }
    const segments=Math.max(8,Math.round(Math.PI*outer*.56/14));
    for(let i=0;i<segments;i++)for(const angle of [i/segments*TAU,i/segments*TAU+Math.PI/segments])circle.push(outer*.56*Math.cos(angle),outer*.56*Math.sin(angle),-2);
    for(const [vertices,material] of [[ticks,tickMaterial],[circle,lineMaterial]]){const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));guides.add(new THREE.LineSegments(geom,material));}
    for(let i=0;i<count;i++){
      const material=new THREE.ShaderMaterial({vertexShader:cardVertex,fragmentShader:cardFragment,transparent:true,depthTest:false,depthWrite:false,
        uniforms:{uMap:{value:textures[i%textures.length]},uRepeat:{value:new THREE.Vector2(1,1)},uOffset:{value:new THREE.Vector2()},uBg:{value:new THREE.Vector3(18/255,19/255,22/255)},uBlur:{value:0},uTexA:{value:1},uAlpha:{value:0},uAber:{value:.019},uCurve:{value:32},uSize:{value:new THREE.Vector2(160,90)},uMouse:{value:new THREE.Vector2()},uWarp:{value:0},uClick:{value:Array.from({length:4},()=>new THREE.Vector4())},uClickW:{value:20},uRadius:{value:10},uFrameCol:{value:new THREE.Vector3(.45,.45,.45)},uFrameA:{value:.22}}
      });
      const mesh=new THREE.Mesh(plane,material);mesh.frustumCulled=false;scene.add(mesh);
      cards.push({mesh,index:i,arm:i%arms,slot:Math.floor(i/arms),offset:0,p:0,lastP:NaN,x:0,y:0,screenX:0,screenY:0,h:0,hover:0,clear:0,flare:0,clip:i%textures.length});
    }
    wake();
  }
  function wake(){if(!disposed&&visible&&!document.hidden&&!frame){last=performance.now();frame=requestAnimationFrame(render);}}
  function render(now){
    frame=0;if(disposed||!visible||document.hidden)return;
    const dt=Math.min((now-last)/1000,.05);last=now;
    const entered=!root.inert,quiet=reduced.matches;
    if(entered&&!quiet){elapsed+=dt;intro=Math.min(1,intro+dt/4);}
    const reveal=quiet?1:ease(intro),waveR=reveal*pitch*exit;
    const step=quiet||!entered?0:dt*.57/60*(1+2*(1-ease(elapsed/2.5)));
    idle+=step;
    holdTarget+=((target>=0?1:0)-holdTarget)*(1-Math.exp(-dt/.15));
    holdRest+=((target>=0?1:0)-holdRest)*(1-Math.exp(-dt));
    fieldK+=((target<0?1:0)-fieldK)*(1-Math.exp(-dt/.12));
    if(!quiet&&entered)spin-=dt*50*Math.PI/180/60*(1-holdRest);
    const cos=Math.cos(spin),sin=Math.sin(spin),journey=idle+(quiet?0:scrollY*.2/1000);
    guides.rotation.z=spin;
    for(const card of cards){
      card.offset-=step*(target===card.index?Math.max(holdTarget,holdRest):holdRest);
      card.p=Math.max(0,wrap((card.slot+.5+card.arm*.76)/slots+journey+card.offset)-.12*(1-reveal));
      if(intro>=1&&Math.abs(card.p-card.lastP)>.5){card.clip=(card.clip+5)%textures.length;card.mesh.material.uniforms.uMap.value=textures[card.clip];}
      card.lastP=card.p;
      const theta=birth+card.p*(exit-birth),r=pitch*theta,a=theta+card.arm*TAU/arms;
      const wobble=quiet?0:6*(1+.2*holdRest)*(1-card.hover),m=Math.sin(elapsed*.25*TAU+2.399*card.index),p=Math.cos(elapsed*.175*TAU+1.713*card.index);
      card.x=r*Math.cos(a)+wobble*(-m*Math.sin(a)+.6*p*Math.cos(a));card.y=r*Math.sin(a)+wobble*(m*Math.cos(a)+.6*p*Math.sin(a));
      let sx=cos*card.x-sin*card.y,sy=sin*card.x+cos*card.y;
      if(pointer.active&&fieldK>.001&&!quiet){const dx=pointer.x-sx,dy=pointer.y-sy,field=Math.exp(-(dx*dx+dy*dy)/(320*320));const tug=8*field*fieldK*(1-card.hover)/Math.max(1,Math.hypot(dx,dy));card.x+=(cos*dx+sin*dy)*tug;card.y+=(-sin*dx+cos*dy)*tug;}
      card.screenX=cos*card.x-sin*card.y;card.screenY=sin*card.x+cos*card.y;
    }
    let next=-1,front=-1;
    if(pointer.active&&!quiet)for(const card of cards){const boostScale=card.index===boostCard?1+2*boost:1;if(card.p>.04&&card.h>8&&Math.abs(pointer.x-card.screenX)<card.h*8/9*boostScale+8&&Math.abs(pointer.y-card.screenY)<card.h/2*boostScale+8&&(card.index===target||card.p>front)){next=card.index;front=card.p;if(card.index===target)break;}}
    target=next;if(target!==boostCard)boostOn=false;boost+=((boostOn?1:0)-boost)*(1-Math.exp(-dt/.18));
    for(let i=ripples.length-1;i>=0;i--)if(elapsed-ripples[i].start>1.8)ripples.splice(i,1);
    for(let i=punches.length-1;i>=0;i--)if(elapsed-punches[i].start>.75)punches.splice(i,1);
    for(const card of cards){
      card.hover+=((target===card.index?1:0)-card.hover)*(1-Math.exp(-dt/.25));card.clear+=((target===card.index?1:0)-card.clear)*(1-Math.exp(-dt/.12));
      let gap=Infinity,pinned=Infinity;
      for(const other of cards)if(other!==card){const d=Math.max(9*Math.abs(other.x-card.x)/16,Math.abs(other.y-card.y));if(other.index===target&&other.hover>.3)pinned=Math.min(pinned,.98*Math.max(0,2*d-other.h));else gap=Math.min(gap,d);}
      const size=Math.min(cap*(.45+.55*card.p),.82*(mobile?1.15:1)*gap,pinned);
      if(card.hover>.3)card.h+=(size-card.h)*(1-Math.exp(-6*dt));else card.h=size<card.h?size:card.h+(size-card.h)*(1-Math.exp(-3*dt));
      if(quiet)card.h=size;
      const h=Math.max(.001,card.h)*(card.index===boostCard?1+2*boost:1),aspect=1+(16/9-1)*smooth(card.p/.3),w=h*aspect;
      const u=card.mesh.material.uniforms;
      const image=u.uMap.value.image,sourceAspect=image?.width/image?.height||16/9;
      if(sourceAspect>aspect){u.uRepeat.value.set(aspect/sourceAspect,1);u.uOffset.value.set((1-aspect/sourceAspect)/2,0);}else{u.uRepeat.value.set(1,sourceAspect/aspect);u.uOffset.value.set(0,(1-sourceAspect/aspect)/2);}
      const q=quiet?1:clamp((waveR-pitch*(birth+card.p*(exit-birth)))/220);
      const dx=pointer.x-card.screenX,dy=pointer.y-card.screenY;
      const field=pointer.active&&!quiet?Math.exp(-(dx*dx+dy*dy)/(320*320))*fieldK:0;
      card.flare=Math.max(card.flare*Math.exp(-3*dt),.032*field);
      let ripple=0;for(const r of ripples){const age=elapsed-r.start,d=(Math.hypot(card.screenX-r.x,card.screenY-r.y)-age*900)/140;ripple+=.016*Math.exp(-d*d)*(1-age/1.8);}
      u.uBlur.value=Math.max(.12*(1-smooth(card.p/.18))*(1-card.clear),(1-q)*.12);
      u.uAber.value=(.019+card.flare+ripple)*(1-card.clear);
      u.uCurve.value=(32+22*Math.min(2,ripple/.016))*(1-card.clear);u.uWarp.value=200*field*(1-card.clear);
      u.uMouse.value.set(dx/Math.max(1,w),dy/Math.max(1,h));u.uSize.value.set(w,h);u.uRadius.value=Math.min(10,.49*h);
      u.uAlpha.value=entered?smooth(card.p/.15)*q:0;
      let clickSlot=0;for(const punch of punches){if(punch.card!==card.index||clickSlot>=4)continue;const age=(elapsed-punch.start)/.75;u.uClick.value[clickSlot++].set(punch.u,punch.v,.85*age*Math.max(w,h),20*(1-age));}for(;clickSlot<4;clickSlot++)u.uClick.value[clickSlot].w=0;
      u.uClickW.value=.14*Math.max(w,h);
      card.mesh.position.set(card.screenX,card.screenY,0);card.mesh.scale.set(w,h,1);card.mesh.renderOrder=10+Math.round(card.p*100)+Math.round(card.hover*500);card.mesh.visible=u.uAlpha.value>.002;
    }
    const ru=ribbonMaterial.uniforms;ru.uTime.value=elapsed;ru.uWaveR.value=quiet?100000:waveR;guides.visible=entered;
    renderer.render(scene,camera);
    if(!quiet&&entered)frame=requestAnimationFrame(render);
  }
  function track(event){const r=host.getBoundingClientRect();pointer.x=event.clientX-r.left-r.width/2;pointer.y=-(event.clientY-r.top-r.height/2);pointer.active=event.pointerType!=='touch'&&fine.matches;wake();}
  function leave(){pointer.active=false;target=-1;boostOn=false;wake();}
  function click(event){if(reduced.matches||root.inert)return;track(event);ripples.push({x:pointer.x,y:pointer.y,start:elapsed});if(ripples.length>8)ripples.shift();if(target>=0){const card=cards[target];punches.push({card:target,u:.5+(pointer.x-card.screenX)/Math.max(1,card.h*16/9),v:.5+(pointer.y-card.screenY)/Math.max(1,card.h),start:elapsed});boostOn=boostCard===target?!boostOn:true;boostCard=target;}wake();}
  const stopVisibility = observeSceneVisibility(host, active => {
    visible = active;
    host.dataset.sceneVisible = String(active);
    if (!active) { cancelAnimationFrame(frame); frame=0; pointer.active=false; target=-1; boostOn=false; }
    else wake();
  }, { cover });
  function lost(event){event.preventDefault();onError();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const entrance=new MutationObserver(wake);entrance.observe(root,{attributes:true,attributeFilter:['inert']});
  host.addEventListener('pointermove',track);host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',click);renderer.domElement.addEventListener('webglcontextlost',lost);
  reduced.addEventListener('change',wake);
  resize();onReady();
  return ()=>{disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();entrance.disconnect();host.removeEventListener('pointermove',track);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',click);renderer.domElement.removeEventListener('webglcontextlost',lost);stopVisibility();reduced.removeEventListener('change',wake);clearLayout();textureCache.forEach(t=>t.dispose());plane.dispose();lineMaterial.dispose();tickMaterial.dispose();ribbonMaterial.dispose();renderer.dispose();renderer.domElement.remove();};
}
