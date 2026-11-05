import { useEffect, useRef, useState } from 'react';

export function AboutLogo({ onReady }) {
  const host = useRef(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let cancelled = false, dispose;
    import('./CrystalScene').then(({ createCrystal }) => {
        if (cancelled) return;
        dispose = createCrystal(host.current, () => 0,
          () => { if (!cancelled) { setStatus('ready'); onReady('about'); } },
          () => { if (!cancelled) { setStatus('failed'); onReady('about'); } }, { miniature: true });
    }).catch(() => { if (!cancelled) { setStatus('failed'); onReady('about'); } });
    return () => { cancelled = true; dispose?.(); };
  }, [onReady]);
  return <div className="about-logo-wrap">
    <div ref={host} className="about-logo" role="button" tabIndex={0}
      aria-label="Интерактивный 3D-логотип: нажмите, чтобы разбить; тяните для вращения. Стрелки — вращение, Enter — разлом, Home — сброс поворота."
      data-status={status}>
      {status !== 'ready' && <img src="/assets/logo-mark.svg" alt="" className="about-logo-fallback" />}
    </div>
  </div>;
}
