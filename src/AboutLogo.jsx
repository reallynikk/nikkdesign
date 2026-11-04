import { useEffect, useRef, useState } from 'react';

export function AboutLogo() {
  const host = useRef(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let cancelled = false, started = false, dispose;
    const observer = new IntersectionObserver(entries => {
      if (started || !entries.some(entry => entry.isIntersecting)) return;
      started = true;
      observer.disconnect();
      import('./CrystalScene').then(({ createCrystal }) => {
        if (cancelled) return;
        dispose = createCrystal(host.current, () => 0,
          () => { if (!cancelled) setStatus('ready'); },
          () => { if (!cancelled) setStatus('failed'); }, { miniature: true });
      }).catch(() => { if (!cancelled) setStatus('failed'); });
    }, { rootMargin: '150px' });
    observer.observe(host.current);
    return () => { cancelled = true; observer.disconnect(); dispose?.(); };
  }, []);
  return <div className="about-logo-wrap">
    <div ref={host} className="about-logo" role="button" tabIndex={0}
      aria-label="Интерактивный 3D-логотип: нажмите, чтобы разбить; тяните для вращения. Стрелки — вращение, Enter — разлом, Home — сброс поворота."
      data-status={status}>
      {status !== 'ready' && <img src="/assets/logo-mark.svg" alt="" className="about-logo-fallback" />}
    </div>
  </div>;
}
