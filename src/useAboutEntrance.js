import { useLayoutEffect } from 'react';

export function useAboutEntrance(section, entered) {
  useLayoutEffect(() => {
    const root = section.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let revealed = root.classList.contains('about-entered');
    const show = (instant = false) => {
      if (revealed) return;
      revealed = true;
      if (instant) root.classList.add('about-entrance-instant');
      root.classList.add('about-entered');
      root.dispatchEvent(new CustomEvent('about-entrance-start', { detail: { instant } }));
    };
    if (!('IntersectionObserver' in window)) { show(true); return; }
    root.classList.add('about-reveal-ready');
    if (!entered) return;
    const photo = root.querySelector('.about-photo-frame');
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      show(reduced.matches); observer.unobserve(photo);
    }, { threshold: .04 });
    if (!revealed) observer.observe(photo);
    const sectionObserver = new IntersectionObserver(() => {
      const rect = root.getBoundingClientRect();
      // Rearm only after leaving the entire section, never while reading it.
      if (!revealed || reduced.matches || (rect.top < innerHeight && rect.bottom > 0)) return;
      revealed = false;
      root.classList.remove('about-entered', 'about-entrance-instant');
      root.dispatchEvent(new CustomEvent('about-entrance-reset'));
      observer.observe(photo);
    }, { threshold: .001 });
    sectionObserver.observe(root);
    const instant = () => { show(true); observer.unobserve(photo); };
    const focus = event => { if (event.target !== root) instant(); };
    const preference = () => { if (reduced.matches) instant(); };
    if (reduced.matches) instant();
    root.addEventListener('about-reveal-instant', instant);
    root.addEventListener('focusin', focus);
    reduced.addEventListener('change', preference);
    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      root.removeEventListener('about-reveal-instant', instant);
      root.removeEventListener('focusin', focus);
      reduced.removeEventListener('change', preference);
    };
  }, [section, entered]);
}

// A single smooth excursion, with zero velocity at either end.
export const aboutImpulse = (now, start) => start === null ? 0
  : Math.sin(Math.PI * Math.min(1, Math.max(0, (now - start) / 1000))) ** 2;
