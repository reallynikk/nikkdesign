import { useCallback, useEffect, useRef, useState } from 'react';
import { PixelImage } from './PixelImage';
import { PortraitPixelPatch } from './PortraitPixelPatch';
import { PhotoFrameLight } from './PhotoFrameLight';

export function PortraitPhoto() {
  const frame = useRef(null), original = useRef(null);
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
    if (pixelMode === 'complete') frame.current.dispatchEvent(new CustomEvent('portrait-pixels-complete'));
  }, [pixelMode]);
  const baseVisible = pixelMode === 'settling' || pixelMode === 'complete';
  return <div ref={frame} className="about-photo-frame" onDragStart={event => event.preventDefault()} onContextMenu={event => event.preventDefault()} data-pixels-ready={pixelMode === 'complete'} data-pixel-phase={pixelMode}>
    <span className="about-photo-backing" aria-hidden="true" />
    <div className="about-portrait-window"><div className="about-portrait-reveal"><div className="about-portrait-depth">
      <div className="about-portrait-image">
        <img ref={original} src="/assets/about-photo.webp" draggable={false} alt={baseVisible ? 'Фотография Никиты Иванова' : ''} aria-hidden={!baseVisible} style={{ opacity: baseVisible ? 1 : 0 }} width="1024" height="1536" loading="eager" decoding="async" />
        {pixelStarted.current && <div className="about-pixel-layer" aria-hidden={pixelMode === 'complete'} style={{ visibility: pixelMode === 'complete' ? 'hidden' : 'visible' }}>
          <PixelImage src="/assets/about-photo.webp" className="about-portrait-pixels" alt="Фотография Никиты Иванова" duration={1000} delay={160} stepped active={pixelActive && pixelMode === 'assembling'} onComplete={finishAssembly} />
        </div>}
        {pixelMode === 'complete' && <PortraitPixelPatch active={pixelActive} />}
      </div>
    </div></div></div>
    <PhotoFrameLight frame={frame} />
  </div>;
}
