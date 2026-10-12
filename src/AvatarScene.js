import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, springStep } from './AvatarMotion';

export function createAvatar(host, section, onReady, onError) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
  catch (error) { onError(error); return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x141414, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2.5, -2.5, .1, 30);
  camera.position.set(.3, 2.5, 9);
  camera.lookAt(0, 2.18, 0);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .45;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff6e9', '#8793b5', .65));
  const key = new THREE.DirectionalLight('#fff0dc', 2.2);
  key.position.set(-3, 5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight('#d5e4ff', .7);
  fill.position.set(4, 3, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffe4a5', 1.8);
  rim.position.set(1, 4, -3); scene.add(rim);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const yaw = { value: 0, velocity: 0 }, pitch = { value: 0, velocity: 0 };
  const torso = { value: 0, velocity: 0 };
  let targetX = 0, targetY = 0, model, head, body;
  let frame = 0, last = 0, elapsed = 0, blinkAt = 4.5;
  let visible = false, disposed = false;
  const hairs = [], details = [], eyes = [], pupils = [];
  const renderOnce = () => { if (model && !disposed) renderer.render(scene, camera); };
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    const viewHeight = Math.max(4.55, 2.4 / (width / height));
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.left = -viewHeight * width / height / 2;
    camera.right = -camera.left;
    camera.updateProjectionMatrix();
    renderOnce();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function render(now) {
    frame = 0;
    if (disposed || !model || !visible || document.hidden || reduced.matches) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    elapsed += dt;
    springStep(yaw, targetX, dt);
    springStep(pitch, targetY, dt);
    springStep(torso, targetX * .16, dt);
    head.rotation.y = yaw.value;
    head.rotation.x = pitch.value;
    body.rotation.y = torso.value;
    head.rotation.z = -yaw.value * .05;

    // Velocity-driven lag, followed by a damped settle. Each curl has its own pivot.
    for (let i = 0; i < hairs.length; i++) {
      const item = hairs[i];
      const response = .025 + (i % 5) * .004;
      springStep(item.roll, clamp(-yaw.velocity * response, -.08, .08), dt, 100, 10);
      springStep(item.pitch, clamp(-pitch.velocity * .045, -.06, .06), dt, 100, 10);
      item.node.rotation.z = item.rest.z + item.roll.value;
      item.node.rotation.x = item.rest.x + item.pitch.value;
    }
    for (const item of details) {
      springStep(item.roll, clamp(-torso.velocity * .16 - yaw.velocity * .025, -.1, .1), dt, 100, 10);
      item.node.rotation.z = item.rest.z + item.roll.value;
    }
    for (const item of pupils) {
      item.node.position.x = item.rest.x + clamp(targetX - yaw.value, -.2, .2) * .05;
      item.node.position.y = item.rest.y - clamp(targetY - pitch.value, -.15, .15) * .05;
    }
    if (elapsed > blinkAt + .18) blinkAt = elapsed + 4 + Math.random() * 3;
    const blink = elapsed >= blinkAt ? Math.max(.08, Math.abs((elapsed - blinkAt) / .09 - 1)) : 1;
    eyes.forEach(eye => { eye.scale.y = Math.min(1, blink); });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  const resume = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (disposed || !model) return;
    if (reduced.matches) {
      head.rotation.set(0, 0, 0); body.rotation.set(0, 0, 0);
      eyes.forEach(eye => { eye.scale.y = 1; });
      hairs.concat(details).forEach(item => { item.node.rotation.copy(item.rest); });
      pupils.forEach(item => item.node.position.copy(item.rest));
      renderOnce();
    } else if (visible && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(render);
    }
  };
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    resume();
  }, { rootMargin: '100px' });
  visibilityObserver.observe(host);
  const point = event => {
    if (!visible || !fine.matches || reduced.matches || event.pointerType === 'touch' || document.querySelector('dialog[open]')) return;
    const bounds = host.getBoundingClientRect();
    const area = section.getBoundingClientRect();
    if (event.clientY < area.top || event.clientY > area.bottom) { targetX = 0; targetY = 0; return; }
    targetX = clamp((event.clientX - (bounds.left + bounds.width * .5)) / bounds.width * .9, -.48, .48);
    targetY = clamp((event.clientY - (bounds.top + bounds.height * .3)) / bounds.height * .5, -.2, .22);
  };
  const reset = () => { targetX = 0; targetY = 0; };
  const keydown = event => {
    if (!model || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') reset();
    else if (event.key === 'ArrowLeft') targetX = clamp(targetX - .12, -.48, .48);
    else if (event.key === 'ArrowRight') targetX = clamp(targetX + .12, -.48, .48);
    else if (event.key === 'ArrowUp') targetY = clamp(targetY - .08, -.2, .22);
    else targetY = clamp(targetY + .08, -.2, .22);
    // Keyboard changes are immediate, including with reduced motion.
    yaw.value = targetX; yaw.velocity = 0;
    pitch.value = targetY; pitch.velocity = 0;
    head.rotation.y = targetX; head.rotation.x = targetY;
    renderOnce();
  };
  document.addEventListener('pointermove', point, { passive: true });
  document.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', resume);
  host.addEventListener('keydown', keydown);
  reduced.addEventListener('change', resume);

  const disposeModel = object => {
    const geometries = new Set(), materials = new Set();
    object.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => materials.add(mat));
    });
    geometries.forEach(geo => geo.dispose());
    materials.forEach(mat => mat.dispose());
  };
  new GLTFLoader().load('/assets/nikk-avatar.glb', gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    model = gltf.scene;
    head = model.getObjectByName('HeadPivot');
    body = model.getObjectByName('BodyPivot');
    if (!head || !body) { disposeModel(model); model = null; onError(new Error('Avatar pivots missing')); return; }
    model.traverse(node => {
      if (node.name.startsWith('HairSpring_')) hairs.push({ node, rest: node.rotation.clone(), roll: { value: 0, velocity: 0 }, pitch: { value: 0, velocity: 0 } });
      if (/^(CollarSpring|ZipperSpring)/.test(node.name)) details.push({ node, rest: node.rotation.clone(), roll: { value: 0, velocity: 0 } });
      if (node.name.startsWith('EyeBlink_')) eyes.push(node);
      if (node.name.startsWith('EyeLook_')) pupils.push({ node, rest: node.position.clone() });
    });
    scene.add(model);
    renderOnce();
    onReady();
    resume();
  }, undefined, error => { if (!disposed) onError(error); });

  const lost = event => { event.preventDefault(); cancelAnimationFrame(frame); onError(new Error('WebGL context lost')); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect(); visibilityObserver.disconnect();
    document.removeEventListener('pointermove', point);
    document.removeEventListener('pointerleave', reset);
    document.removeEventListener('visibilitychange', resume);
    host.removeEventListener('keydown', keydown);
    reduced.removeEventListener('change', resume);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    if (model) disposeModel(model);
    environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
