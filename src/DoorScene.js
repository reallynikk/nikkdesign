import * as THREE from 'three';
import { journey } from './JourneyMotion';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createDoor(host, getProgress, onError) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
  catch (error) { onError(error); return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .01, 100);
  scene.add(new THREE.HemisphereLight('#fffaf2', '#88817a', 2));
  const key = new THREE.DirectionalLight('#ffffff', 3); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#d3d9ff', 1.4); rim.position.set(3, 2, -1); scene.add(rim);
  let hinge, disposed = false, frame;
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  new GLTFLoader().load('/assets/about-door.glb', gltf => {
    if (disposed) { dispose(gltf.scene); return; }
    hinge = gltf.scene.getObjectByName('DoorHinge'); scene.add(gltf.scene);
  }, undefined, onError);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function render() {
    frame = requestAnimationFrame(render);
    const p = getProgress();
    if (document.hidden || p > .78) return;
    const { cameraZ, opening } = journey(p);
    const near = camera.aspect < 1 ? 5.6 : 4.7;
    camera.position.set(0, 1.28, cameraZ);
    camera.lookAt(0, 1.28, cameraZ - 1);
    if (hinge) hinge.rotation.y = -opening * Math.PI * .58;
    if (reduced.matches) {
      camera.position.set(0,1.28,p < .18 ? 56 : near);
      camera.lookAt(0,1.28,-1);
      if (hinge) hinge.rotation.y=p>.44?-Math.PI*.58:0;
    }
    renderer.render(scene,camera);
  }
  render();
  function dispose(root) { root.traverse(o => { if(o.isMesh){o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());} }); }
  return () => { disposed=true;cancelAnimationFrame(frame);observer.disconnect();dispose(scene);renderer.dispose();renderer.domElement.remove(); };
}

