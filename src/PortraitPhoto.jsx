import { useCallback, useEffect, useRef, useState } from 'react';
import { aboutImpulse } from './useAboutEntrance';
import { PixelImage } from './PixelImage';
import { PortraitPixelPatch } from './PortraitPixelPatch';
import { PhotoFrameLight } from './PhotoFrameLight';

export function PortraitPhoto() {
  const frame = useRef(null), portrait = useRef(null), original = useRef(null), firstHover = useRef(false);
  const pixelStarted = useRef(false);
  const entranceCycle = useRef(0);
  const [pixelGeneration, setPixelGeneration] = useState(0);
  const [pixelMode, setPixelMode] = useState('waiting');
  const [pixelActive, setPixelActive] = useState(false);
  const completePixels = useCallback(async (cycle = entranceCycle.current) => {
    const photo = original.current;
    if (!photo) return;
    // Keep the final canvas on screen until the actual DOM image is decoded.
    try { await photo.decode(); }
    catch { if (!photo.complete || !photo.naturalWidth) return; }
    if (original.current !== photo || entranceCycle.current !== cycle) return;
    setPixelMode(mode => mode === 'complete' ? mode : 'settling');
  }, []);
  const finishAssembly = useCallback(() => completePixels(pixelGeneration), [completePixels, pixelGeneration]);
  useEffect(() => {
    if (pixelMode !== 'settling') return;
    const cycle = entranceCycle.current;
    let secondFrame = 0;
    // Paint the decoded base first; retire the canvas on a subsequent paint.
    const firstFrame = requestAnimationFrame(() => {
      if (entranceCycle.current !== cycle) return;
      secondFrame = requestAnimationFrame(() => { if (entranceCycle.current === cycle) setPixelMode('complete'); });
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [pixelMode]);
  useEffect(() => {
    const host = frame.current, section = host.closest('.about-section');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const start = event => {
      if (reduced.matches || event?.detail?.instant) { completePixels(); return; }
      pixelStarted.current = true;
      setPixelMode(mode => mode === 'waiting' ? 'assembling' : mode);
    };
    const reset = () => {
      entranceCycle.current++;
      setPixelGeneration(entranceCycle.current);
      pixelStarted.current = false;
      setPixelMode('waiting');
    };
    const updateActive = () => setPixelActive(visible && !document.hidden);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateActive(); });
    observer.observe(host);
    section.addEventListener('about-entrance-start', start);
    section.addEventListener('about-entrance-reset', reset);
    const preference = () => { if (reduced.matches) completePixels(); };
    if (section.classList.contains('about-entered')) start({ detail: { instant: section.classList.contains('about-entrance-instant') } });
    document.addEventListener('visibilitychange', updateActive);
    reduced.addEventListener('change', preference);
    return () => {
      observer.disconnect();
      section.removeEventListener('about-entrance-start', start);
      section.removeEventListener('about-entrance-reset', reset);
      document.removeEventListener('visibilitychange', updateActive);
      reduced.removeEventListener('change', preference);
    };
  }, [completePixels]);
  useEffect(() => {
    const host = frame.current, image = portrait.current;
    const section = host.closest('.about-section');
    const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0, last = 0, targetX = 0, targetY = 0, x = 0, y = 0, vx = 0, vy = 0;
    let bounds, visible = false, impulseStart = null, inside = false, lastPointer;
    const enabled = () => fine.matches && !reduced.matches && visible && !document.hidden && host.dataset.pixelsReady === 'true';
    const stop = () => {
      cancelAnimationFrame(raf); raf = 0;
      x = y = vx = vy = targetX = targetY = 0; impulseStart = null;
      image.style.transform = '';
      delete host.dataset.hoverImpulse;
    };
    const render = now => {
      if (!enabled()) { stop(); return; }
      const dt = Math.min((now - last) / 1000, .032); last = now;
      const steps = Math.max(1, Math.ceil(dt / .008)), h = dt / steps;
      for (let i = 0; i < steps; i++) {
        vx += ((targetX - x) * 100 - vx * 10) * h; x += vx * h;
        vy += ((targetY - y) * 100 - vy * 10) * h; y += vy * h;
      }
      const pulse = aboutImpulse(now, impulseStart);
      const lift = pulse * host.clientHeight * .02;
      // Only the transparent portrait lifts. Its white backing never tracks the pointer.
      image.style.transform = `translate3d(${x * 7}px, ${y * 4 - lift}px, ${pulse * 16}px) rotateX(${-y * 2}deg) rotateY(${x * 3}deg) scale(${1 + pulse * .065})`;
      const pulsing = impulseStart !== null && now - impulseStart < 1000;
      if (!pulsing) delete host.dataset.hoverImpulse;
      if (pulsing || Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(vx) + Math.abs(vy) > .001) raf = requestAnimationFrame(render);
      else { raf = 0; if (!targetX && !targetY) image.style.transform = ''; }
    };
    const start = () => { if (!raf && enabled()) { last = performance.now(); raf = requestAnimationFrame(render); } };
    const surprise = event => {
      if (firstHover.current || !enabled() || event.pointerType === 'touch' || !section.classList.contains('about-entered')) return;
      // A continuous stream of patches must not starve the once-only hover.
      if (host.dataset.localPixels === 'playing') host.dispatchEvent(new CustomEvent('portrait-pixels-hover-request'));
      const photo = host.querySelector('img');
      if (!photo.complete || !photo.naturalWidth) return;
      // Let the entrance finish before the first-hover moment can be consumed.
      if (Number(getComputedStyle(host.querySelector('.about-portrait-reveal')).opacity) < .95) return;
      firstHover.current = true;
      host.dataset.firstHover = 'played';
      host.dataset.hoverImpulse = 'playing';
      impulseStart = performance.now();
      start();
    };
    const enter = event => { inside = true; lastPointer = event; bounds = host.getBoundingClientRect(); surprise(event); };
    const move = event => {
      lastPointer = event;
      if (!enabled() || event.pointerType === 'touch') return;
      surprise(event);
      bounds ||= host.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      start();
    };
    const reset = () => { targetX = targetY = 0; bounds = null; if (enabled()) start(); else stop(); };
    const leave = () => { inside = false; reset(); };
    const pixelsReady = () => { if (inside && lastPointer) move(lastPointer); };
    const visibility = () => { if (document.hidden) stop(); };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) stop();
    });
    observer.observe(host);
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointercancel', leave);
    host.addEventListener('portrait-pixels-complete', pixelsReady);
    host.addEventListener('portrait-local-pixels-complete', pixelsReady);
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', stop);
    fine.addEventListener('change', stop);
    return () => {
      stop(); observer.disconnect();
      host.removeEventListener('pointerenter', enter);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointercancel', leave);
      host.removeEventListener('portrait-pixels-complete', pixelsReady);
      host.removeEventListener('portrait-local-pixels-complete', pixelsReady);
      window.removeEventListener('scroll', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', stop);
      fine.removeEventListener('change', stop);
    };
  }, []);
  useEffect(() => {
    if (pixelMode === 'complete') frame.current.dispatchEvent(new CustomEvent('portrait-pixels-complete'));
  }, [pixelMode]);
  const baseVisible = pixelMode === 'settling' || pixelMode === 'complete';
  return <div ref={frame} className="about-photo-frame" onDragStart={event => event.preventDefault()} onContextMenu={event => event.preventDefault()} data-pixels-ready={pixelMode === 'complete'} data-pixel-phase={pixelMode}>
    <span className="about-photo-backing" aria-hidden="true" />
    <div className="about-portrait-window"><div className="about-portrait-reveal"><div ref={portrait} className="about-portrait-depth">
      <div className="about-portrait-image">
        <img ref={original} src="/assets/about-photo.png" draggable={false} alt={baseVisible ? 'Фотография Никиты Иванова' : ''} aria-hidden={!baseVisible} style={{ opacity: baseVisible ? 1 : 0 }} width="1024" height="1536" loading="eager" decoding="async" />
        {pixelStarted.current && <div className="about-pixel-layer" aria-hidden={pixelMode === 'complete'} style={{ visibility: pixelMode === 'complete' ? 'hidden' : 'visible' }}>
          <PixelImage src="/assets/about-photo.png" className="about-portrait-pixels" alt="Фотография Никиты Иванова" duration={1000} delay={160} stepped active={pixelActive && pixelMode === 'assembling'} onComplete={finishAssembly} />
        </div>}
        {pixelMode === 'complete' && <PortraitPixelPatch active={pixelActive} />}
      </div>
    </div></div></div>
    <PhotoFrameLight frame={frame} />
  </div>;
}
