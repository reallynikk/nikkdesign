import { useEffect, useRef } from 'react';

const SVG = 'http://www.w3.org/2000/svg';

export function PhotoFrameLight({ frame }) {
  const svg = useRef(null), glow = useRef(null);
  useEffect(() => {
    const host = frame.current, surface = svg.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const guide = document.createElementNS(SVG, 'path');
    guide.setAttribute('fill', 'none');
    surface.append(guide);
    let path = '', length = 0, raf = 0, visible = false;
    const particles = new Set();
    const clear = () => {
      cancelAnimationFrame(raf); raf = 0;
      particles.forEach(particle => particle.group.remove()); particles.clear();
      host.dataset.activeOrbits = '0';
    };
    const resize = () => {
      clear();
      const width = host.clientWidth, height = host.clientHeight;
      surface.setAttribute('viewBox', `0 0 ${width + 56} ${height + 56}`);
      // SVG starts 28px outside the frame; path starts at 15px: a 13px orbit.
      const x = 15, y = 15, w = width + 26, h = height + 26, r = 9;
      path = `M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
      guide.setAttribute('d', path); length = guide.getTotalLength();
    };
    const render = now => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) { clear(); return; }
      particles.forEach(particle => {
        particle.started ??= now;
        const p = Math.min(1, (now - particle.started) / 1900);
        if (p >= 1) { particle.group.remove(); particles.delete(particle); return; }
        const travelled = p * length;
        const head = (particle.start + travelled) % length;
        const point = guide.getPointAtLength(head);
        particle.dot.style.transform = `translate(${point.x}px, ${point.y}px)`;
        particle.group.style.opacity = String(Math.min(1, p * 20, (1 - p) * 16));
        particle.tail.forEach((segment, index) => {
          // Short overlapping dash segments form a tapered continuous light trail.
          const behind = (index + 1) * particle.segment;
          segment.style.strokeDashoffset = String(-(head - behind));
          segment.style.opacity = travelled >= behind ? String((1 - index / 12) ** 2 * .7) : '0';
        });
      });
      host.dataset.activeOrbits = String(particles.size);
      if (particles.size) raf = requestAnimationFrame(render);
    };
    const click = event => {
      if (!visible || document.hidden || !length) return;
      if (reduced.matches || event.detail === 0) {
        glow.current.animate([{ opacity:.6 }, { opacity:1 }, { opacity:.6 }], { duration:200, easing:'ease' });
        return;
      }
      const group = document.createElementNS(SVG, 'g');
      const segmentLength = Math.min(7, length / 140);
      const tail = Array.from({ length:12 }, (_, index) => {
        const segment = document.createElementNS(SVG, 'path');
        segment.setAttribute('d', path);
        segment.setAttribute('fill', 'none');
        segment.setAttribute('stroke', '#fff');
        segment.setAttribute('stroke-width', String(2.6 - index * .18));
        segment.setAttribute('stroke-linecap', 'round');
        segment.setAttribute('stroke-dasharray', `${segmentLength+1} ${length-segmentLength-1}`);
        group.append(segment);
        return segment;
      });
      const dot = document.createElementNS(SVG, 'circle');
      dot.setAttribute('r', '3.5'); dot.setAttribute('fill', '#fff');
      group.append(dot); group.style.opacity = '0';
      const start = Math.random() * length;
      group.dataset.orbitStart = start.toFixed(2);
      surface.append(group);
      particles.add({ group, tail, dot, start, segment:segmentLength, started:null });
      host.dataset.activeOrbits = String(particles.size);
      if (!raf) raf = requestAnimationFrame(render);
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) clear();
    });
    observer.observe(host);
    const visibility = () => { if (document.hidden) clear(); };
    host.addEventListener('click', click);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', clear);
    resize();
    return () => {
      clear(); resizeObserver.disconnect(); observer.disconnect(); guide.remove();
      host.removeEventListener('click', click);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', clear);
    };
  }, [frame]);
  return <>
    <div ref={glow} className="about-frame-glow" aria-hidden="true" />
    <svg ref={svg} className="about-frame-orbits" aria-hidden="true" />
    <button className="about-frame-trigger" aria-label="Запустить световую точку вокруг фотографии" />
  </>;
}
