import { useCallback, useEffect, useRef, useState } from 'react';
import { CrystalExperience } from './DoorExperience';
import { PixelImage } from './PixelImage';
import { TechnicalCursor } from './TechnicalCursor';

const telegram = 'https://t.me/reallynikk';

export function App() {
  const dialog = useRef(null);
  const [ready, setReady] = useState(false);
  const sceneReady = useCallback(() => {
    document.fonts.load('700 100px Golos').catch(() => {}).then(() => setReady(true));
  }, []);
  const [entered, setEntered] = useState(false);
  const [panel, setPanel] = useState(null);
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

  useEffect(() => {
    if (panel) {
      dialog.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.current?.close();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [panel]);

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

      <CrystalExperience entered={entered} setPanel={setPanel} onReady={sceneReady} />

      <dialog
        ref={dialog}
        className="detail-dialog"
        onCancel={() => setPanel(null)}
        onClick={e => {
          if (e.target === dialog.current) setPanel(null);
        }}
      >
        <div className="dialog-inner">
          <button className="close" onClick={() => setPanel(null)}>
            Закрыть <span aria-hidden="true">×</span>
          </button>

          {panel === 'about' && (
            <>
              <span className="eyebrow">ОБО МНЕ</span>
              <h2>Никита Иванов</h2>
              <p>
                Графический дизайнер.<br />
                Превращаю идеи в выразительную визуальную систему.
              </p>
              <a className="project-link" href={telegram} target="_blank" rel="noreferrer">
                Обсудить проект ↗
              </a>
            </>
          )}

          {panel === 'contact' && (
            <>
              <span className="eyebrow">КОНТАКТЫ</span>
              <h2>
                Давайте сделаем<br />
                что-то вместе.
              </h2>
              <a className="project-link" href={telegram} target="_blank" rel="noreferrer">
                Написать в Телеграм ↗
              </a>
            </>
          )}


        </div>
      </dialog>
    </>
  );
}
