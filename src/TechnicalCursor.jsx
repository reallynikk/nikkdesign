import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor="interactive"]';

export function TechnicalCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let x = 0, y = 0, moved = false;
    const enabled = () => finePointer.matches && !reduced.matches;
    const syncPreference = () => {
      document.documentElement.dataset.quietCursor = String(enabled());
      if (!enabled()) cursor.dataset.visible = 'false';
    };
    const stateFromTarget = element => {
      // Dialogs use the system cursor; avoid drawing two pointers over them.
      cursor.dataset.visible = String(enabled() && moved && !element?.closest('dialog'));
      cursor.dataset.state = element?.closest('[data-cursor="drag"]') ? 'drag'
        : element?.closest(INTERACTIVE_SELECTOR) ? 'interactive' : 'idle';
    };
    const move = event => {
      if (!enabled() || event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      moved = true;
      // Direct tracking: no trailing animation or continuous rendering loop.
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      stateFromTarget(event.target);
    };
    const refresh = () => stateFromTarget(document.elementFromPoint(x, y));
    const hide = () => { cursor.dataset.visible = 'false'; moved = false; };
    const leave = event => { if (!event.relatedTarget) hide(); };
    const press = () => { cursor.dataset.pressed = 'true'; };
    const release = () => { cursor.dataset.pressed = 'false'; };
    syncPreference();
    finePointer.addEventListener('change', syncPreference);
    reduced.addEventListener('change', syncPreference);
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    document.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    document.addEventListener('scroll', refresh, { passive: true });
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', hide);
    return () => {
      delete document.documentElement.dataset.quietCursor;
      finePointer.removeEventListener('change', syncPreference);
      reduced.removeEventListener('change', syncPreference);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('pointerdown', press);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      document.removeEventListener('scroll', refresh);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', hide);
    };
  }, []);

  return <div ref={cursorRef} className="quiet-cursor" data-state="idle" data-visible="false" data-pressed="false" aria-hidden="true">
    <span className="quiet-cursor__dot" />
  </div>;
}
