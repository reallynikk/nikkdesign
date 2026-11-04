import * as THREE from 'three';

const images = ['preview-0.png', 'card-front.jpg', 'preview-2.png', 'sticker-one.jpg', 'preview-4.png', 'bag-front.jpg', 'preview-1.png', 'sticker-two.jpg', 'preview-3.png', 'stickers-front.jpg', 'award.png', 'card-back.jpg'];
const tau = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };

// Screen-space Archimedean conveyors, bowed image planes and travelling light.
// Shares the emblem's renderer and frame loop, including offscreen pausing.
export function createPortfolioGalaxy(onTextureReady) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 3000);
  camera.position.z = 1000;
  const guides = new THREE.Group();
  scene.add(guides);
  const loader = new THREE.TextureLoader();
  let disposed = false;
  const textures = images.map(name => {
    const texture = loader.load(`/assets/${name}`, loaded => {
      if (disposed) loaded.dispose();
      else onTextureReady?.();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  });
  const plane = new THREE.PlaneGeometry(1, 1, 12, 12);
  const cards = [];
  let width = 1, height = 1, arms = 6, slots = 4, pitch = 1, birth = 0, exit = 1, cap = 160;
  let elapsed = 0, spin = 0, intro = 0, conveyor = 0, hold = 0, target = -1;

  const cardVertex = `
    uniform vec2 size;
    uniform vec2 mouse;
    uniform float warp;
    uniform float focus;
    varying vec2 vUv;
    void main() {
      vUv=uv;
      vec4 p=modelMatrix*vec4(position,1.);
      vec2 delta=(position.xy-mouse)*size;
      float radius=max(size.x,size.y)*.6;
      p.z+=32.*(1.-focus*.7)*max(0.,.5-2.*dot(position.xy,position.xy));
      p.z+=warp*exp(-dot(delta,delta)/(radius*radius));
      gl_Position=projectionMatrix*viewMatrix*p;
    }`;
  const cardFragment = `
    uniform sampler2D artwork;
    uniform vec2 size;
    uniform vec2 crop;
    uniform float alpha;
    uniform float softness;
    uniform float time;
    uniform float seed;
    uniform float dispersion;
    uniform vec2 mouse;
    uniform float focus;
    varying vec2 vUv;
    vec3 sampleArt(vec2 uv) { return texture2D(artwork,clamp(uv,vec2(.002),vec2(.998))).rgb; }
    void main() {
      vec2 d=vUv-.5;
      float breathe=1.035+.025*sin(time*.5+seed);
      vec2 uv=d*crop/breathe+.5;
      uv.y+=.008*sin(time*.4+seed);
      vec2 lens=vUv-(mouse+.5);
      float pressure=exp(-dot(lens,lens)*9.);
      uv-=lens*pressure*focus*.16;
      vec2 shift=d*dot(d,d)*4.*dispersion;
      vec3 col=vec3(sampleArt(uv+shift).r,sampleArt(uv).g,sampleArt(uv-shift).b);
      if(softness>.001) {
        vec3 blurred=col;
        for(int i=0;i<8;i++) {
          float a=float(i)*2.39996;
          blurred+=sampleArt(uv+vec2(cos(a),sin(a))*softness*.6);
        }
        col=blurred/9.;
      }
      vec2 q=abs(d*size)-size*.5+vec2(9.);
      float edge=length(max(q,0.))+min(max(q.x,q.y),0.)-9.;
      float frame=(1.-smoothstep(.5,1.5,abs(edge+1.)))*.15;
      col=mix(col,vec3(.28),frame);
      gl_FragColor=vec4(col,alpha*(1.-smoothstep(-.8,.8,edge)));
      #include <colorspace_fragment>
    }`;

  const ribbonMaterial = new THREE.ShaderMaterial({
    transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide,
    uniforms:{ time:{value:0} },
    vertexShader:`
      attribute vec2 normal2;
      attribute float side;
      attribute float progress;
      attribute float arm;
      uniform float time;
      varying float glow;
      varying float tint;
      varying float across;
      void main() {
        float d=fract(progress*3.-time*.19+arm*.618)-.5;
        float sigma=d<0.?.085:.0275;
        glow=exp(-.5*d*d/(sigma*sigma))*smoothstep(.04,.14,progress);
        tint=arm;
        across=side;
        vec3 p=position;
        p.xy+=normal2*side*(.55+glow*1.75);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`
      varying float glow;
      varying float tint;
      varying float across;
      void main() {
        vec3 spectral=.5+.5*cos(vec3(0.,2.1,4.2)+tint*1.6);
        vec3 color=mix(vec3(.35),spectral,glow);
        float a=(.09+glow*.65)*(1.-smoothstep(.4,1.,abs(across)));
        gl_FragColor=vec4(color,a);
        #include <colorspace_fragment>
      }`,
  });
  const lineMaterial = new THREE.LineBasicMaterial({ color:0x8c8984, transparent:true, opacity:.18, depthTest:false, depthWrite:false });

  function clearLayout() {
    for (const card of cards) { scene.remove(card.mesh); card.mesh.material.dispose(); }
    cards.length = 0;
    target=-1; hold=0;
    for (const object of [...guides.children]) { guides.remove(object); object.geometry.dispose(); }
  }

  function resize(w, h) {
    width=w; height=h;
    // At z=0 one world unit equals one CSS pixel; positive z bows toward us.
    camera.aspect=w/h;
    camera.fov=2*Math.atan(h/2000)*180/Math.PI;
    camera.updateProjectionMatrix();
    clearLayout();
    const mobile=w*h<600000;
    arms=mobile?3:6;
    const count=mobile?12:Math.max(18,Math.min(36,Math.round(64*w*h/1650000)));
    slots=Math.ceil(count/arms);
    const diagonal=Math.hypot(w,h)/2;
    const outer=diagonal*(mobile?.8:.7);
    const turns=(mobile?.7:1.05)*tau;
    pitch=outer/turns;
    birth=turns*.08;
    cap=Math.min(250,Math.max(70,h*(mobile?.23:.25)));
    exit=(diagonal+cap*1.5)/pitch;

    for (let arm=0;arm<arms;arm++) {
      const vertices=[], normals=[], sides=[], progress=[], armIds=[], indices=[];
      for(let step=0;step<=200;step++) {
        const t=step/200;
        const theta=birth*.3+(exit-birth*.3)*t;
        const radius=pitch*theta, angle=theta+arm*tau/arms;
        const dx=pitch*Math.cos(angle)-radius*Math.sin(angle);
        const dy=pitch*Math.sin(angle)+radius*Math.cos(angle);
        const length=Math.hypot(dx,dy);
        for(const side of [-1,1]) {
          vertices.push(radius*Math.cos(angle),radius*Math.sin(angle),-30);
          normals.push(-dy/length,dx/length); sides.push(side); progress.push(t); armIds.push(arm);
        }
        if(step<200) {const i=step*2; indices.push(i,i+1,i+2,i+1,i+3,i+2);}
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geometry.setAttribute('normal2',new THREE.Float32BufferAttribute(normals,2));
      geometry.setAttribute('side',new THREE.Float32BufferAttribute(sides,1));
      geometry.setAttribute('progress',new THREE.Float32BufferAttribute(progress,1));
      geometry.setAttribute('arm',new THREE.Float32BufferAttribute(armIds,1));
      geometry.setIndex(indices);
      guides.add(new THREE.Mesh(geometry,ribbonMaterial));
    }
    const ticks=[];
    for(let arm=0;arm<arms;arm++) for(let i=0;i<16;i++) {
      const theta=turns*(.45+.55*(i+.5)/16), radius=pitch*theta, angle=theta+arm*tau/arms;
      for(const delta of [-5,5]) ticks.push((radius+delta)*Math.cos(angle),(radius+delta)*Math.sin(angle),-29);
    }
    for(let i=0;i<100;i++) for(const t of [i/100*tau,(i+.4)/100*tau]) ticks.push(Math.cos(t)*outer*.56,Math.sin(t)*outer*.56,-29);
    const tickGeometry=new THREE.BufferGeometry();
    tickGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ticks,3));
    guides.add(new THREE.LineSegments(tickGeometry,lineMaterial));
    for(let index=0;index<count;index++) {
      const material=new THREE.ShaderMaterial({
        transparent:true,depthTest:false,depthWrite:false,
        uniforms:{ artwork:{value:textures[(index*5+Math.floor(index/arms))%textures.length]}, size:{value:new THREE.Vector2(160,100)}, crop:{value:new THREE.Vector2(1,1)}, mouse:{value:new THREE.Vector2(0,0)}, warp:{value:0}, focus:{value:0}, alpha:{value:0}, softness:{value:0}, time:{value:0}, seed:{value:index*2.399}, dispersion:{value:.009} },
        vertexShader:cardVertex,fragmentShader:cardFragment,
      });
      const mesh=new THREE.Mesh(plane,material);
      mesh.frustumCulled=false;
      scene.add(mesh);
      cards.push({mesh,index,arm:index%arms,slot:Math.floor(index/arms),x:0,y:0,screenX:0,screenY:0,screenScale:1,p:0,size:0,hover:0,offset:0,warp:0});
    }
  }

  function render(renderer,dt,reduced,pointer,entered) {
    const mx=pointer?pointer.x*width/2:10000, my=pointer?pointer.y*height/2:10000;
    // The held card brakes first; the rest of the field comes gently to rest.
    let nextTarget=-1, front=-1;
    if(pointer && !reduced) for(const card of cards) {
      const padding=target===card.index?14:0;
      if(card.mesh.visible && card.p>.12 && card.size>30
        && Math.abs(mx-card.screenX)<card.size*.7*card.screenScale+padding && Math.abs(my-card.screenY)<card.size*.5*card.screenScale+padding && card.p>front) {
        nextTarget=card.index; front=card.p;
      }
    }
    target=nextTarget;
    hold+=((target>=0?1:0)-hold)*(1-Math.exp(-dt));
    const step=reduced||!entered?0:dt*.57/60*(1-hold);
    conveyor+=step;
    if(!reduced && entered) { elapsed+=dt; spin-=dt*50*Math.PI/180/60*(1-hold); intro=Math.min(1,intro+dt/4); }
    const reveal=reduced?1:smooth(intro);
    const journey=conveyor+(reduced?0:window.scrollY*.2/1000);
    guides.rotation.z=spin;
    guides.visible=reveal>.05;
    ribbonMaterial.uniforms.time.value=elapsed;
    for(const card of cards) {
      card.hover=reduced?0:card.hover+((target===card.index?1:0)-card.hover)*(1-Math.exp(-dt/.12));
      card.offset-=step*card.hover;
      const p=((card.slot+.5+card.arm*.76)/slots+journey+card.offset)%1;
      const theta=birth+p*(exit-birth), radius=pitch*theta, angle=theta+card.arm*tau/arms+spin;
      card.p=p;
      card.x=radius*Math.cos(angle)+(reduced?0:Math.sin(elapsed*tau*.25+card.index*2.399)*6*(1-card.hover));
      card.y=radius*Math.sin(angle)+(reduced?0:Math.cos(elapsed*tau*.175+card.index*1.713)*4*(1-card.hover));
    }
    for(const card of cards) {
      let gap=Infinity;
      for(const other of cards) if(other!==card) gap=Math.min(gap,Math.max(Math.abs(other.x-card.x)/1.4,Math.abs(other.y-card.y)));
      const size=Math.max(1,Math.min(cap*(.45+.55*card.p),gap*.82));
      card.size=size;
      const aspect=1+.4*smooth(card.p/.3);
      const u=card.mesh.material.uniforms;
      card.mesh.position.set(card.x,card.y,0);
      card.mesh.scale.set(size*aspect,size,1);
      card.mesh.renderOrder=10+Math.round(card.p*100)+Math.round(card.hover*200);
      u.size.value.set(size*aspect,size);
      const image=u.artwork.value.image;
      const sourceAspect=image?.width/image?.height||1.4;
      u.crop.value.set(sourceAspect>aspect?aspect/sourceAspect:1,sourceAspect>aspect?1:sourceAspect/aspect);
      u.time.value=reduced?0:elapsed;
      u.softness.value=.06*(1-smooth(card.p/.18));
      const wave=clamp((reveal*(Math.hypot(width,height)/2+cap*1.5)-Math.hypot(card.x,card.y))/220);
      u.alpha.value=smooth(card.p/.15)*wave*.92;
      card.mesh.visible=u.alpha.value>.002 && entered;
      const dx=mx-card.x;
      const dy=my-card.y;
      const field=reduced?0:Math.exp(-(dx*dx+dy*dy)/(320*320));
      const follow=1-Math.exp(-dt/.12);
      u.mouse.value.x+=(dx/(size*aspect)-u.mouse.value.x)*follow;
      u.mouse.value.y+=(dy/size-u.mouse.value.y)*follow;
      card.warp=reduced?0:card.warp+(field*(130+card.hover*80)-card.warp)*(1-Math.exp(-dt/.15));
      u.warp.value=card.warp;
      u.focus.value=card.hover;
      u.dispersion.value=.009+field*.018-card.hover*.012;
      card.mesh.rotation.x+=(Math.max(-.09,Math.min(.09,-dy/size*.08))*field-card.mesh.rotation.x)*(1-Math.exp(-dt/.15));
      card.mesh.rotation.y+=(Math.max(-.12,Math.min(.12,dx/size*.1))*field-card.mesh.rotation.y)*(1-Math.exp(-dt/.15));
      if(reduced) card.mesh.rotation.set(0,0,0);
      const centreZ=16*(1-card.hover*.7)+card.warp*Math.exp(-(u.mouse.value.x**2+u.mouse.value.y**2)/.36);
      card.screenScale=1000/(1000-centreZ);
      card.screenX=card.x*card.screenScale;
      card.screenY=card.y*card.screenScale;
    }
    renderer.render(scene,camera);
  }

  return { resize,render,dispose() {
    disposed=true; clearLayout(); plane.dispose(); ribbonMaterial.dispose(); lineMaterial.dispose(); textures.forEach(texture=>texture.dispose());
  } };
}
