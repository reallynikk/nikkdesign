import { useEffect, useRef } from 'react';

// Decodes an image from crisp, chunky pixel blocks into full detail.
export function PixelImage({
  src,
  className = '',
  duration = 950,
  progress = null,
  delay = 0,
  alt = '',
  fit = 'contain',
  onComplete,
  active = true,
  stepped = false,
}) {
  const ref = useRef(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let frame;
    let cancelled = false;
    let resizeObserver;
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      let w = 0;
      let h = 0;
      const source = document.createElement('canvas');
      const low = document.createElement('canvas');

      function updateDimensions() {
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width || canvas.clientWidth || 300;
        const ch = rect.height || canvas.clientHeight || 150;
        w = canvas.width = Math.max(1, Math.round(cw * dpr));
        h = canvas.height = Math.max(1, Math.round(ch * dpr));
        source.width = w;
        source.height = h;

        const imgW = image.naturalWidth || image.width || w;
        const imgH = image.naturalHeight || image.height || h;
        const scale = (fit === 'cover' ? Math.max : Math.min)(w / imgW, h / imgH);
        const dw = imgW * scale;
        const dh = imgH * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;

        const sCtx = source.getContext('2d');
        sCtx.clearRect(0, 0, w, h);
        sCtx.imageSmoothingEnabled = true;
        sCtx.drawImage(image, dx, dy, dw, dh);
      }

      updateDimensions();

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let elapsed = 0, lastTime = performance.now();
      let currentP = progressRef.current !== null ? Math.min(1, Math.max(0, progressRef.current / 100)) : 0;
      let completed = false;

      function renderFrame(now) {
        if (cancelled) return;
        if (!activeRef.current) { lastTime = null; frame = null; return; }
        if (lastTime !== null) elapsed += now - lastTime;
        lastTime = now;

        let targetP;
        if (progressRef.current !== null) {
          targetP = Math.min(1, Math.max(0, progressRef.current / 100));
          currentP += (targetP - currentP) * 0.18;
          if (Math.abs(targetP - currentP) < 0.002) currentP = targetP;
        } else {
          if (!reduced && elapsed < delay) {
            frame = requestAnimationFrame(renderFrame);
            return;
          }
          currentP = reduced ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / duration));
        }

        const p = reduced ? 1 : currentP;

        if (p >= 0.995) {
          canvas.style.imageRendering = 'auto';
          ctx.imageSmoothingEnabled = true;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(source, 0, 0, w, h);

          if (!completed) {
            completed = true;
            onComplete?.();
          }
        } else {
          canvas.style.imageRendering = 'pixelated';
          // Smooth continuous resolution scaling from chunky pixels to full crispness
          // Using an ease-in-out curve ensures quality improves progressively and smoothly
          const easeProgress = Math.pow(p, 1.8);
          const levels = [0.035, 0.05, 0.075, 0.11, 0.16, 0.24, 0.36, 0.54, 0.75, 1];
          const scale = stepped ? levels[Math.min(levels.length - 1, Math.floor(p * (levels.length - 1)))] : 0.035 + 0.965 * easeProgress;

          const lowW = Math.max(2, Math.round(w * scale));
          const lowH = Math.max(2, Math.round(h * scale));

          low.width = lowW;
          low.height = lowH;

          const lowCtx = low.getContext('2d');
          lowCtx.imageSmoothingEnabled = false;
          lowCtx.clearRect(0, 0, lowW, lowH);
          lowCtx.drawImage(source, 0, 0, lowW, lowH);

          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, w, h);
          ctx.globalAlpha = Math.min(1, p * 5 + 0.2);
          ctx.drawImage(low, 0, 0, lowW, lowH, 0, 0, w, h);
          ctx.globalAlpha = 1;
        }

        const isControlled = progressRef.current !== null;
        const isStillAnimating = isControlled
          ? Math.abs(targetP - currentP) > 0.001 || currentP < targetP
          : p < 1;

        if (isStillAnimating) {
          frame = requestAnimationFrame(renderFrame);
        } else {
          frame = null;
        }
      }

      function kickFrame() {
        if (!frame && !cancelled) {
          frame = requestAnimationFrame(renderFrame);
        }
      }

      frame = requestAnimationFrame(renderFrame);

      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
        kickFrame();
      });
      resizeObserver.observe(canvas);

      // Expose kicker for progress effect
      canvas.__kickPixelFrame = kickFrame;

    };

    image.src = src;

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      delete canvas.__kickPixelFrame;
      resizeObserver?.disconnect();
    };
  }, [src, duration, delay, fit, onComplete, stepped]);

  // Keep rendering if controlled progress updates
  useEffect(() => {
    if (progress !== null && ref.current?.__kickPixelFrame) {
      ref.current.__kickPixelFrame();
    }
  }, [progress]);
  useEffect(() => {
    if (active) ref.current?.__kickPixelFrame?.();
  }, [active]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={alt}
    />
  );
}

