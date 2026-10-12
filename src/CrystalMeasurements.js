import * as THREE from 'three';

// Decorative screen-space drafting marks; never intercept the model's gestures.
export function createMeasurements(host, model, camera) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'crystal-measurements');
  const paths = Array.from({ length: 3 }, () => {
    const path = document.createElementNS(ns, 'path');
    svg.appendChild(path);
    return path;
  });
  host.appendChild(svg);
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const corners = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const point = new THREE.Vector3();
  let elapsed = 0, opacity = 0;
  const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  return {
    update(dt, progress, dragging, reduced) {
      elapsed += dt;
      opacity += ((progress < .025 && !dragging ? 1 : 0) - opacity) * (1 - Math.exp(-dt * 8));
      svg.style.opacity = opacity.toFixed(3);
      if (opacity < .005) return;
      const w = host.clientWidth, h = host.clientHeight;
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const corner of corners) {
        point.copy(corner).applyMatrix4(model.matrixWorld).project(camera);
        const x = (point.x + 1) * w / 2, y = (1 - point.y) * h / 2;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      // Reserve breathing room for navigation and identity, also on narrow screens.
      const l = Math.max(24, left - 16), r = Math.min(w - 24, right + 16);
      const t = Math.max(112, top - 16), b = Math.min(h - 112, bottom + 16);
      if (b - t < 60 || r - l < 40) { svg.style.opacity = '0'; return; }
      const s = 13, y = t + (b - t) * .34, x = r - (r - l) * .28;
      paths[0].setAttribute('d', `M${l},${t+s}V${t}H${l+s} M${r-s},${t}H${r}V${t+s} M${r},${b-s}V${b}H${r-s} M${l+s},${b}H${l}V${b-s}`);
      paths[1].setAttribute('d', `M${l-9},${t}H${l-3} M${l-6},${t}V${b} M${l-9},${b}H${l-3} M${l-10},${y}H${l-2}`);
      paths[2].setAttribute('d', `M${x},${b+5}V${b+13} M${x},${b+9}H${r} M${r},${b+5}V${b+13} M${x},${b-6}V${b-2}`);
      paths.forEach((path, index) => {
        const phase = (elapsed + 12 - index * 2) % 12;
        const pulse = smooth(phase / 1.4) * (1 - smooth((phase - 4.4) / 1.6));
        path.style.opacity = (reduced ? (index === 0 ? .24 : 0) : pulse * (index === 0 ? .3 : .22)).toFixed(3);
      });
    },
    dispose() { svg.remove(); },
  };
}
