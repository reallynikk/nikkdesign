import { useEffect, useRef } from 'react';

// Replace one small opaque region only; never pixelate the alpha silhouette.
export function PortraitPixelPatch({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, host = canvas.closest('.about-photo-frame');
    const ctx = canvas.getContext('2d', { alpha: true });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    const source = document.createElement('canvas'), low = document.createElement('canvas');
    let timer = 0, frame = 0, cancelled = false, alpha, w = 0, h = 0;
    let patches = [];
    const enabled = () => active && !document.hidden && !reduced.matches && !cancelled;
    const clear = () => {
      clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = 0;
      patches = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      delete host.dataset.localPixels;
      host.dataset.localPixelCount = '0';
    };
    const schedule = () => {
      if (enabled()) timer = setTimeout(play, 250);
    };
    const dimensions = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    const choosePatch = () => {
      const sw = image.naturalWidth, sh = image.naturalHeight;
      for (let attempt = 0; attempt < 16; attempt++) {
        const pw = Math.round(sw * (.07 + Math.random() * .04));
        const ph = Math.round(sh * (.045 + Math.random() * .025));
        const sx = Math.round(sw * (.35 + Math.random() * .28));
        const sy = Math.round(sh * (.31 + Math.random() * .37));
        let opaque = true;
        for (let y = sy; y < sy + ph && opaque; y++) {
          for (let x = sx; x < sx + pw; x++) {
            if (alpha[(y * sw + x) * 4 + 3] < 254) { opaque = false; break; }
          }
        }
        if (opaque) return { sx, sy, pw, ph, dx: sx / sw * w, dy: sy / sh * h, dw: pw / sw * w, dh: ph / sh * h };
      }
      return null;
    };
    function play() {
      timer = 0;
      if (!enabled()) return;
      // Launch cadence is independent of each patch's one-second lifetime.
      if (host.dataset.hoverImpulse === 'playing') { schedule(); return; }
      const patch = choosePatch();
      if (!patch) { schedule(); return; }
      patches.push({ ...patch, started:performance.now() });
      host.dataset.localPixels = 'playing';
      host.dataset.localPixelCount = String(patches.length);
      if (!frame) frame = requestAnimationFrame(render);
      schedule();
    }
    function render() {
      frame = 0;
      if (!enabled()) { clear(); return; }
      const now = performance.now();
      const finished = patches.filter(patch => now - patch.started >= 1000).length;
      patches = patches.filter(patch => now - patch.started < 1000);
      // Clear the overlay once, then composite every live patch. Retiring one
      // patch never clears the other patches or the permanently visible photo.
      ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
      patches.forEach(patch => {
        const p = Math.max(0, (now - patch.started) / 1000);
        const cells = [20, 14, 10, 6, 3, 1];
        const cell = cells[Math.min(cells.length - 1, Math.floor(p * cells.length))];
        low.width = Math.max(2, Math.ceil(patch.dw / cell));
        low.height = Math.max(2, Math.ceil(patch.dh / cell));
        const lowCtx = low.getContext('2d');
        lowCtx.imageSmoothingEnabled = false;
        lowCtx.drawImage(image, patch.sx, patch.sy, patch.pw, patch.ph, 0, 0, low.width, low.height);
        ctx.drawImage(low, 0, 0, low.width, low.height, patch.dx, patch.dy, patch.dw, patch.dh);
      });
      host.dataset.localPixelCount = String(patches.length);
      if (!patches.length) delete host.dataset.localPixels;
      for (let i = 0; i < finished; i++) host.dispatchEvent(new CustomEvent('portrait-local-pixels-complete'));
      if (patches.length) frame = requestAnimationFrame(render);
    }
    const preference = () => { clear(); if (alpha) schedule(); };
    const resize = new ResizeObserver(() => { clear(); if (alpha) schedule(); });
    resize.observe(canvas);
    reduced.addEventListener('change', preference);
    host.addEventListener('portrait-pixels-hover-request', preference);
    image.onload = () => {
      if (cancelled) return;
      source.width = image.naturalWidth; source.height = image.naturalHeight;
      const sourceCtx = source.getContext('2d', { willReadFrequently: true });
      sourceCtx.drawImage(image, 0, 0);
      alpha = sourceCtx.getImageData(0, 0, source.width, source.height).data;
      dimensions(); schedule();
    };
    image.src = '/assets/about-photo.png';
    return () => {
      cancelled = true; clear(); resize.disconnect();
      reduced.removeEventListener('change', preference);
      host.removeEventListener('portrait-pixels-hover-request', preference);
    };
  }, [active]);
  return <canvas ref={ref} className="about-portrait-patch" aria-hidden="true" />;
}
