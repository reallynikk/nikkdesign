import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function AboutAward({ onOpen }) {
  const host = useRef(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const node = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true }); }
    catch { setStatus('failed'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.transmissionResolutionScale = .5;
    node.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-.72, .72, .72, -.72, .01, 10);
    camera.position.set(0, .05, 3);
    camera.lookAt(0, 0, 0);
    const model = new THREE.Group(); scene.add(model);
    const resources = new Set();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x626875, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(3, 1, -2); scene.add(rim);
    // Studio reflections make the original transparent glass legible.
    const studio = new THREE.Scene(); studio.background = new THREE.Color('#737780');
    [[-3,2,3],[3,1,2],[0,4,-2]].forEach(position => {
      const geometry = new THREE.PlaneGeometry(2, 5);
      const material = new THREE.MeshBasicMaterial({ color:new THREE.Color(4,4,4) });
      const card = new THREE.Mesh(geometry, material);
      card.position.set(...position); card.lookAt(0,0,0); studio.add(card);
      resources.add(geometry); resources.add(material);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .04);
    scene.environment = environment.texture;
    resources.add(environment); pmrem.dispose();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, visible = false, ready = false, raf = 0, elapsed = 0, last = 0;
    const render = now => {
      raf = 0;
      if (disposed || !ready || !visible || document.hidden) { last = 0; return; }
      if (last) elapsed += Math.min(now - last, 50);
      last = now;
      model.rotation.y = -.18 + (reduced.matches ? 0 : elapsed / 18000 * Math.PI * 2);
      model.rotation.x = -.04;
      renderer.render(scene, camera);
      if (!reduced.matches) raf = requestAnimationFrame(render);
    };
    const update = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      if (ready && visible && !document.hidden) raf = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    observer.observe(node);
    const resize = new ResizeObserver(() => {
      renderer.setSize(node.clientWidth, node.clientHeight); update();
    });
    resize.observe(node);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    new GLTFLoader().load('/assets/award.glb', gltf => {
      gltf.scene.traverse(object => {
        if (!object.isMesh) return;
        resources.add(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          resources.add(material);
          Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
        });
      });
      if (disposed) { resources.forEach(resource => resource.dispose()); return; }
      gltf.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 1.12 / Math.max(size.x, size.y, size.z);
      const centered = new THREE.Group();
      centered.position.copy(center).multiplyScalar(-scale);
      centered.scale.setScalar(scale);
      centered.add(gltf.scene); model.add(centered);
      ready = true; setStatus('ready'); update();
    }, undefined, () => { if (!disposed) setStatus('failed'); });
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect();
      document.removeEventListener('visibilitychange', update); reduced.removeEventListener('change', update);
      resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <button className="about-award" onClick={onOpen} aria-label="Открыть проект «Движение Первых» — наградная статуэтка">
    <span ref={host} className="about-award-view" aria-hidden="true" />
    {status !== 'ready' && <span className="about-award-fallback">{status === 'failed' ? 'Премия Первых' : 'Загрузка…'}</span>}
    <span className="about-award-arrow" aria-hidden="true">↗</span>
  </button>;
}
