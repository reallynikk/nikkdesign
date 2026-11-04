import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFracture } from '../src/CrystalFracture.js';

test('fracture preserves the actual GLB surface and settles after interrupted interactions', async () => {
  const bytes = await readFile(new URL('../public/assets/crystal-emblem.glb', import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.scale.setScalar(34);
  const parent = new THREE.Group();
  const fracture = createFracture(scene, parent);
  const area = geometry => {
    const p = geometry.attributes.position, index = geometry.index;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let sum = 0;
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
      a.fromBufferAttribute(p, index ? index.getX(i) : i);
      b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
      c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
      sum += b.sub(a).cross(c.sub(a)).length() / 2;
    }
    return sum;
  };
  let originalArea = 0;
  scene.traverse(node => {
    if (!node.isMesh) return;
    const geo = node.geometry.clone().applyMatrix4(node.matrixWorld);
    originalArea += area(geo); geo.dispose();
  });
  const cutArea = parent.children.reduce((sum, mesh) => sum + area(mesh.geometry), 0);
  assert.ok(Math.abs(cutArea - originalArea) / originalArea < .00001, 'cuts must neither lose nor duplicate the original surface');
  assert.equal(parent.children.length, 4, 'four material batches');
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>' };
  parent.children[0].material.onBeforeCompile(shader);
  const motion = shader.uniforms.uShardMotion.value;
  fracture.hover(new THREE.Vector3(.2, .2, .1));
  for (let i = 0; i < 60; i++) fracture.update(1 / 60, false);
  assert.ok(motion.some(v => v.length() > .02));
  assert.ok(motion.filter(v => v.length() === 0).length > 40, 'hover stays local');
  fracture.burst(new THREE.Vector3(.2, .2, .1));
  for (let i = 0; i < 20; i++) fracture.update(1 / 60, false);
  const before = motion.map(v => v.clone());
  fracture.burst(new THREE.Vector3(-1, 1, .1));
  fracture.update(.001, false);
  assert.ok(motion.every((v, i) => v.clone().sub(before[i]).length() < .03), 'repeat clicks retain continuity');
  fracture.hover(null);
  for (let i = 0; i < 600; i++) fracture.update(1 / 60, false);
  assert.ok(motion.every(v => v.length() === 0), 'exact rest pose restored');
  fracture.burst(new THREE.Vector3());
  fracture.update(.1, false);
  assert.equal(fracture.update(.016, true), 0);
  assert.ok(motion.every(v => v.length() === 0), 'reduced motion immediately restores the emblem');
  fracture.dispose();
  assert.equal(parent.children.length, 0);
});
