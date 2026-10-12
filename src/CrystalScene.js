import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFracture } from './CrystalFracture';
import { phase, smooth } from './JourneyMotion';

export function createCrystal(host, getProgress, onReady, onError) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (error) { onError(error); return () => { }; }
  // Refraction does not need the full-resolution offscreen buffer.
  renderer.transmissionResolutionScale = .5;
  renderer.setClearColor(0xffffff, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .85;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 120);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#25252c');
  // Broad studio lights and narrow spectral strips reflected in each bevel.
  const cards = [];
  function lightCard(color, intensity, size, position) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.material.color.multiplyScalar(intensity);
    mesh.position.set(...position); mesh.lookAt(0, 0, 0); studio.add(mesh); cards.push(mesh);
  }
  lightCard('#ffffff', 6, [5, 8], [-5, 3, 4]);
  lightCard('#ffffff', 4, [3, 7], [5, 0, 2]);
  lightCard('#fff4db', 5, [8, 2], [0, 6, -2]);
  lightCard('#ffffff', 3, [7, 1], [0, -4, 4]);
  ['#ff7948', '#ffe5a0', '#7fffee', '#43bfff', '#8b6cff', '#ff9bd9'].forEach((color, i) => {
    lightCard(color, 4, [.32, 8], [-3 + i * .42, 0, -4]);
    lightCard(color, 3, [.24, 6], [1.8 + i * .4, 1, 4]);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .025, .1, 50);
  scene.environment = environment.texture;
  cards.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
  pmrem.dispose();
  const filmData = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    const thickness = 128 + 120 * Math.sin(x * .11 + y * .07 + Math.sin(y * .13) * 2);
    filmData[i] = filmData[i + 1] = filmData[i + 2] = thickness; filmData[i + 3] = 255;
  }
  const film = new THREE.DataTexture(filmData, 128, 128);
  film.wrapS = film.wrapT = THREE.RepeatWrapping;
  film.magFilter = film.minFilter = THREE.LinearFilter; film.needsUpdate = true;
  const material = new THREE.MeshPhysicalMaterial({
    color: '#cfdef4', metalness: .62, roughness: .035,
    transmission: .22, thickness: .5, ior: 1.8, dispersion: 1,
    iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [180, 750], iridescenceThicknessMap: film,
    clearcoat: 1, clearcoatRoughness: .025, envMapIntensity: .9,
  });
  // Fine spectral reflections make the bevels readable on a white backdrop.
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCrystalLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrystalLocal = position * 34.0;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCrystalLocal;')
      .replace('#include <opaque_fragment>', `
        vec3 reflectedCrystal = reflect(-normalize(vViewPosition), normal);
        float prismPhase = reflectedCrystal.x * 9.0 + reflectedCrystal.y * 6.0 + vCrystalLocal.x * 3.0 + vCrystalLocal.y * 2.0;
        vec3 spectralCrystal = 0.5 + 0.5 * cos(prismPhase + vec3(0.0, 2.1, 4.2));
        float prismBand = pow(0.5 + 0.5 * sin(prismPhase * 2.7), 12.0);
        float prismGlint = pow(0.5 + 0.5 * sin(prismPhase * 2.7 + 0.45), 60.0);
        outgoingLight = outgoingLight * (0.48 + 0.52 * prismBand) + spectralCrystal * prismBand * 1.1 + vec3(prismGlint * 1.8);
        #include <opaque_fragment>
      `);
  };
  const crystal = new THREE.Group();
  let fracture, hitModel;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerInside = false, downX = 0, downY = 0, moved = false;
  const hitPoint = new THREE.Vector3(), hoverHit = new THREE.Vector3();
  const intersections = [];
  let nextPick = 0, cachedHover = false;
  function pick() {
    if (!hitModel || getProgress() > .15) return null;
    crystal.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    intersections.length = 0;
    const hit = raycaster.intersectObject(hitModel, true, intersections)[0];
    return hit ? crystal.worldToLocal(hitPoint.copy(hit.point)) : null;
  }
  function track(e) {
    const rect = host.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    pointerInside = e.pointerType !== 'touch';
    wake();
  }
  scene.add(crystal);
  function disposeModel(root) {
    const materials = new Set();
    root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); for (const m of (Array.isArray(o.material) ? o.material : [o.material])) materials.add(m); } });
    for (const m of materials) if (m !== material) m.dispose();
  }
  scene.add(new THREE.HemisphereLight('#ffffff', '#6484c0', .6));
  const key = new THREE.DirectionalLight('#ffffff', 1); key.position.set(3, 5, 5); scene.add(key);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = performance.now(), auto = 0, dragging = false, px = 0, py = 0;
  let rx = -.13, ry = -.23, targetX = rx, targetY = ry, vx = 0, vy = 0;
  let visible = true, disposed = false;
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35, Math.sqrt(2400000 / (width * height))));
    renderer.setSize(width, height); camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 7 / camera.aspect : 7.8;
    camera.updateProjectionMatrix();
    wake();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const down = e => {
    if (getProgress() > .15 || e.button !== 0) return;
    track(e); if (!pick()) return;
    dragging = true; moved = false;
    downX = px = e.clientX; downY = py = e.clientY;
    host.setPointerCapture(e.pointerId); host.classList.add('dragging');
  };
  const move = e => {
    track(e); if (!dragging) return;
    moved ||= Math.hypot(e.clientX - downX, e.clientY - downY) > 6;
    if (moved) { targetY += (e.clientX - px) * .008; targetX += (e.clientY - py) * .008; }
    px = e.clientX; py = e.clientY;
  };
  const up = e => {
    if (dragging && !moved && e.type === 'pointerup' && !reduced.matches) {
      track(e); const point = pick(); if (point) fracture?.burst(point);
    }
    dragging = false; host.classList.remove('dragging');
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
  };
  const leave = () => { pointerInside = false; fracture?.hover(null); };
  const keydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Home') { targetX = -.13; targetY = -.23; auto = 0; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') targetY += e.key === 'ArrowLeft' ? -.2 : .2;
    else targetX += e.key === 'ArrowUp' ? -.2 : .2;
    rx = targetX; ry = targetY; vx = vy = 0;
    wake();
  };
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave); host.addEventListener('lostpointercapture', leave);
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('keydown', keydown);
  function wake() {
    if (!disposed && hitModel && visible && !frame) { last = performance.now(); frame = requestAnimationFrame(render); }
  }
  const aboutSection = host.closest('main')?.querySelector('#about');
  const visibility = () => {
    // Home is sticky: intersection alone cannot detect the opaque About overlay.
    visible = !document.hidden && host.getBoundingClientRect().bottom > 0 && (!aboutSection || aboutSection.getBoundingClientRect().top > 0);
    if (!visible) { cancelAnimationFrame(frame); frame = 0; pointerInside = false; fracture?.hover(null); }
    else wake();
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('scroll', visibility, { passive: true });
  reduced.addEventListener('change', wake);
  function render(now) {
    frame = 0;
    if (disposed || !visible) return;
    if (!reduced.matches) frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000, .1); last = now;
    const p = getProgress();
    // Keep the emblem at its original size and slide it below the viewport.
    const exit = reduced.matches ? (p > .16 ? 1 : 0) : smooth(phase(p, 0, .17));
    const homeDistance = camera.aspect < 1 ? 7 / camera.aspect : 7.8;
    camera.position.z = homeDistance;

    const viewHeight = 2 * homeDistance * Math.tan(THREE.MathUtils.degToRad(17));
    crystal.scale.setScalar(1);
    crystal.position.set(0, -(viewHeight / 2 + 2.5) * exit, 0);
    crystal.visible = exit < 1;
    if (!visible) return;
    if (exit >= 1) { renderer.clear(); return; }
    if (!(dragging && moved) && !reduced.matches) auto += dt * .19;
    // Damped physical response preserves velocity when a drag is interrupted.
    const steps = Math.max(1, Math.ceil(dt / .008)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      vx += ((targetX - rx) * 100 - vx * 10) * h; rx += vx * h;
      vy += ((targetY - ry) * 100 - vy * 10) * h; ry += vy * h;
    }
    crystal.rotation.set(rx, ry + auto, .10);
    if (pointerInside && !dragging && fine.matches && !reduced.matches) {
      if (now >= nextPick) {
        const point = pick(); cachedHover = !!point;
        if (point) hoverHit.copy(point);
        nextPick = now + 1000 / 30;
      }
    } else cachedHover = false;
    fracture?.hover(cachedHover ? hoverHit : null);
    const shake = fracture?.update(dt, reduced.matches) ?? 0;
    crystal.position.x += shake;
    crystal.position.y += shake * .5;
    crystal.rotation.z += shake * .35;
    renderer.render(scene, camera);
  }
  new GLTFLoader().load('/assets/crystal-emblem.glb', gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    gltf.scene.scale.setScalar(34);
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.name.startsWith('Glass')) { o.material.dispose(); o.material = material; }
      else { o.material.envMapIntensity = .08; o.material.roughness = .65; }
    });
    fracture = createFracture(gltf.scene, crystal);
    hitModel = gltf.scene;
    hitModel.visible = false;
    crystal.add(hitModel);
    try { renderer.render(scene, camera); onReady(); visibility(); }
    catch (error) { onError(error); }
  }, undefined, error => { if (!disposed) onError(error); });
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    fracture?.dispose();
    host.removeEventListener('pointerleave', leave); host.removeEventListener('lostpointercapture', leave);
    host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); host.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('scroll', visibility);
    reduced.removeEventListener('change', wake);
    disposeModel(crystal); material.dispose(); film.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}

