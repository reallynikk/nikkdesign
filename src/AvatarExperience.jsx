import { useEffect, useRef, useState } from 'react';

export function AvatarExperience() {
  const host = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false, cleanup;
    const element = host.current;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      import('./AvatarScene').then(({ createAvatar }) => {
        if (disposed) return;
        cleanup = createAvatar(element, element.closest('section'), () => setReady(true), () => setFailed(true));
      }).catch(() => { if (!disposed) setFailed(true); });
    }, { rootMargin: '350px' });
    observer.observe(element);
    return () => { disposed = true; observer.disconnect(); cleanup?.(); };
  }, []);
  return <div className={`about-avatar ${ready && !failed ? 'avatar-ready' : ''}`} data-reveal>
    <div className="avatar-halo" aria-hidden="true" />
    <img className="avatar-poster" src="/assets/nikk-avatar-poster.png" alt="" aria-hidden="true" loading="lazy" />
    <div ref={host} className="avatar-canvas" tabIndex={0} role="group" aria-label="Мультяшный 3D-портрет Никиты Иванова. Двигайте курсор или используйте стрелки для поворота головы." />
  </div>;
}
