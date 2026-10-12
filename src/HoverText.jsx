import { useEffect, useRef, useState } from 'react';

export function HoverText({ children }) {
  const original = String(children), [label, setLabel] = useState(original);
  const timers = useRef([]);
  const animate = () => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timers.current.forEach(clearTimeout);
    const reversed = [...original].reverse();
    setLabel(reversed.join(''));
    timers.current = [...original].map((_, index) => setTimeout(() => {
      reversed[index] = original[index];
      setLabel(reversed.join(''));
    }, 22.5 * (index + 1)));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return <span className="hover-text" onPointerEnter={animate} aria-label={original}><span aria-hidden="true">{label}</span></span>;
}

