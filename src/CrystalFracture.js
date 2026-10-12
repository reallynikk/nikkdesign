import * as THREE from 'three';

// Shared Voronoi cells cut through every material layer of the original emblem.
// Four GPU batches retain the glass lighting without a draw call per fragment.
export function createFracture(source, parent) {
  source.updateMatrixWorld(true);
  const seeds = [];
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const i = seeds.length;
    seeds.push(new THREE.Vector3((x + .2 + random(i) * .6) * .46 - 1.84, (y + .2 + random(i + 71) * .6) * .46 - 1.84, 0));
  }
  const motion = seeds.map(() => new THREE.Vector4(0, 0, 0, 0));
  const velocities = seeds.map(() => new THREE.Vector4(0, 0, 0, 0));
  const depth = seeds.map((_, i) => .3 + random(i + 400) * .5);
  const travel = seeds.map((_, i) => .5 + random(i + 500) * .35);
  const spin = seeds.map((_, i) => (random(i + 600) - .5) * 2.5);
  const targets = new Float64Array(4);
  const meshes = [], materials = [];
  const planes = seeds.map((seed, i) => seeds.flatMap((other, j) => i === j ? [] : [{
    x: other.x - seed.x, y: other.y - seed.y, d: (other.lengthSq() - seed.lengthSq()) * .5,
  }]));
  const clip = (polygon, plane) => {
    const result = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = a[0] * plane.x + a[1] * plane.y - plane.d;
      const db = b[0] * plane.x + b[1] * plane.y - plane.d;
      if (da <= 1e-8) result.push(a);
      if ((da < 0) !== (db < 0)) {
        const t = da / (da - db);
        result.push(a.map((v, k) => v + (b[k] - v) * t));
      }
    }
    return result;
  };
  source.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    const pos = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv, indices = geometry.index;
    const positions = [], normals = [], uvs = [], ids = [], pivots = [], axes = [];
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const axis = new THREE.Vector3(random(i + 110) - .5, random(i + 210) - .5, random(i + 310) - .5).normalize();
      for (let t = 0; t < (indices?.count ?? pos.count); t += 3) {
        let polygon = [0, 1, 2].map(k => {
          const v = indices ? indices.getX(t + k) : t + k;
          return [pos.getX(v), pos.getY(v), pos.getZ(v), normal.getX(v), normal.getY(v), normal.getZ(v), uv?.getX(v) ?? 0, uv?.getY(v) ?? 0];
        });
        for (const plane of planes[i]) { polygon = clip(polygon, plane); if (polygon.length < 3) break; }
        for (let k = 1; k < polygon.length - 1; k++) for (const v of [polygon[0], polygon[k], polygon[k + 1]]) {
          positions.push(...v.slice(0, 3)); normals.push(...v.slice(3, 6)); uvs.push(...v.slice(6)); ids.push(i);
          pivots.push(seed.x, seed.y, 0); axes.push(axis.x, axis.y, axis.z);
        }
      }
    }
    geometry.dispose();
    const shards = new THREE.BufferGeometry();
    for (const [name, data, size] of [['position', positions, 3], ['normal', normals, 3], ['uv', uvs, 2], ['aShard', ids, 1], ['aPivot', pivots, 3], ['aAxis', axes, 3]]) shards.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
    const mat = node.material.clone();
    mat.side = THREE.DoubleSide;
    const previous = node.material.onBeforeCompile;
    mat.onBeforeCompile = shader => {
      previous.call(mat, shader);
      shader.uniforms.uShardMotion = { value: motion };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
        attribute float aShard;
        attribute vec3 aPivot;
        attribute vec3 aAxis;
        uniform vec4 uShardMotion[64];
        vec3 shardRotate(vec3 p, float angle) {
          return p * cos(angle) + cross(aAxis, p) * sin(angle) + aAxis * dot(aAxis, p) * (1.0 - cos(angle));
        }
      `).replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = shardRotate(objectNormal, uShardMotion[int(aShard)].w);
      `).replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 shard = uShardMotion[int(aShard)];
        transformed = shardRotate(position - aPivot, shard.w) + aPivot + shard.xyz;
      `).replace('vCrystalLocal = position * 34.0;', 'vCrystalLocal = position;');
    };
    mat.customProgramCacheKey = () => 'crystal-voronoi-v1';
    const mesh = new THREE.Mesh(shards, mat);
    mesh.frustumCulled = false;
    parent.add(mesh); meshes.push(mesh); materials.push(mat);
  });
  let burstAge = 10, hovering = false, settled = true;
  const hit = new THREE.Vector3(), impact = new THREE.Vector3(), direction = new THREE.Vector3();
  return {
    hover(point) { hovering = !!point; if (point) { hit.copy(point); settled = false; } },
    burst(point) { impact.copy(point); burstAge = 0; settled = false; },
    update(dt, reduced) {
      burstAge += dt;
      if (settled && !hovering && burstAge > 2) return 0;
      settled = true;
      const steps = Math.max(1, Math.ceil(dt / .008)), h = dt / steps;
      for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i], state = motion[i], velocity = velocities[i];
        const local = hovering ? Math.pow(Math.max(0, 1 - seed.distanceTo(hit) / .85), 2) : 0;
        const age = burstAge - seed.distanceTo(impact) * .065;
        const target = reduced ? 0 : Math.max(burstAge > 2 ? local * .65 : 0, age > 0 && age < .48 ? 1 : 0);
        direction.copy(seed).sub(burstAge < 2 ? impact : hit);
        direction.z = depth[i];
        direction.normalize().multiplyScalar(target * travel[i]);
        targets[0] = direction.x; targets[1] = direction.y; targets[2] = direction.z; targets[3] = target * spin[i];
        // Mass 1, stiffness 100, damping 10; retain velocity on interruption.
        for (let step = 0; step < steps; step++) {
          for (let k = 0; k < 4; k++) {
            const v = velocity.getComponent(k) + ((targets[k] - state.getComponent(k)) * 100 - velocity.getComponent(k) * 10) * h;
            velocity.setComponent(k, v);
            state.setComponent(k, state.getComponent(k) + v * h);
          }
        }
        if (reduced || (target === 0 && state.length() + velocity.length() < .0001)) { state.set(0, 0, 0, 0); velocity.set(0, 0, 0, 0); }
        else settled = false;
      }
      return reduced ? 0 : Math.exp(-burstAge * 13) * Math.sin(burstAge * 95) * .045;
    },
    dispose() { meshes.forEach(mesh => { parent.remove(mesh); mesh.geometry.dispose(); }); materials.forEach(mat => mat.dispose()); },
  };
}

