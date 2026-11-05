import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { CrystalExperience } from './DoorExperience';
import { preparePortfolioMedia } from './portfolioMedia';
import { TechnicalCursor } from './TechnicalCursor';

const Portfolio = memo(CrystalExperience);

export function App() {
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [complete, setComplete] = useState(false);
  const stages = useRef(new Set());
  const mediaProgress = useRef(0);
  const sceneReady = useCallback(stage => {
    stages.current.add(stage);
    const done = mediaProgress.current === 1 && stages.current.size === 3;
    setProgress(done ? 100 : Math.min(99, Math.round(mediaProgress.current * 85 + stages.current.size * 5)));
    if (done) setComplete(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    preparePortfolioMedia(value => {
      if (cancelled) return;
      mediaProgress.current = value;
      const done = value === 1 && stages.current.size === 3;
      setProgress(done ? 100 : Math.min(99, Math.round(value * 85 + stages.current.size * 5)));
      if (done) setComplete(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!complete) return;
    // Paint the completed progress transition before revealing the prepared page.
    const timer = setTimeout(() => setEntered(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    return () => clearTimeout(timer);
  }, [complete]);

  useEffect(() => {
    if (entered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [entered]);

  return <>
    <TechnicalCursor />
    <div className={`loader ${entered ? 'loader--done' : ''}`} aria-hidden={entered}>
      <div className="loader-centre">
        <img src="/assets/logo-white.svg" className="loader-logo" alt="nikk" />
        <div className="loader-track" role="progressbar" aria-label="Загрузка сайта"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        {error && <div className="loader-error" role="alert">
          <p>Не удалось загрузить материалы сайта. Проверьте соединение.</p>
          <button onClick={() => location.reload()}>Попробовать снова</button>
        </div>}
      </div>
    </div>
    <Portfolio entered={entered} onReady={sceneReady} />
  </>;
}
