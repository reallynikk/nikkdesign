import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { CrystalExperience } from './DoorExperience';
import { PixelImage } from './PixelImage';
import { TechnicalCursor } from './TechnicalCursor';

const Portfolio = memo(CrystalExperience);

export function App() {
  const [ready, setReady] = useState(false);
  const sceneReady = useCallback(() => {
    Promise.all([
      document.fonts.load('400 48px "Manrope"', 'Никита Иванов'),
      document.fonts.load('500 18px "Manrope"', 'Мои работы'),
    ]).catch(() => {}).then(() => setReady(true));
  }, []);
  const [entered, setEntered] = useState(false);
  const [visualProgress, setVisualProgress] = useState(0);
  const readyRef = useRef(false);
  readyRef.current = ready;

  useEffect(() => {
    let frame;
    let current = 0;
    const startTime = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function step(now) {
      if (reduced) {
        setVisualProgress(100);
        return;
      }
      const elapsed = now - startTime;
      const naturalProgress = Math.min(92, elapsed / 16);
      const target = readyRef.current ? 100 : naturalProgress;

      const diff = target - current;
      if (diff > 0.04) {
        current += Math.max(0.35, diff * 0.11);
        if (current > target) current = target;
      } else if (readyRef.current) {
        current = 100;
      }
      current = Math.min(100, Math.max(0, current));
      setVisualProgress(current);

      if (current < 100 || !readyRef.current) {
        frame = requestAnimationFrame(step);
      }
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready || visualProgress < 99.5) return;
    const id = setTimeout(() => {
      setEntered(true);
    }, 400);
    return () => clearTimeout(id);
  }, [ready, visualProgress]);

  return (
    <>
      <TechnicalCursor />
      <div className={`loader ${entered ? 'loader--done' : ''}`} aria-hidden={entered}>
        <div className="loader-centre">
          <PixelImage
            src="/assets/logo-white.svg"
            className="loader-logo"
            alt="nikk"
            progress={visualProgress}
            duration={1200}
          />
          <div
            className="loader-track"
            role="progressbar"
            aria-label="Загрузка работ"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(visualProgress)}
          >
            <span style={{ transform: `scaleX(${visualProgress / 100})` }} />
          </div>
        </div>
      </div>

      <Portfolio entered={entered} onReady={sceneReady} />


    </>
  );
}
