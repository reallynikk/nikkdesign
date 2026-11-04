import { useLayoutEffect, useRef } from 'react';
import { ButtonIcon } from './ButtonIcon';
import './GlassNavigation.css';

const refractionMaps = new Map();

// A shallow lens at the perimeter; the centre stays optically quiet.
function refractionMap(width, height) {
  width = Math.max(1, Math.round(width)); height = Math.max(1, Math.round(height));
  const key = `${width}x${height}`;
  if (refractionMaps.has(key)) return refractionMaps.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width); canvas.height = Math.round(height);
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  const radius = height / 2;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const px = x - width / 2, py = y - height / 2;
    const qx = Math.abs(px) - (width / 2 - radius), qy = Math.abs(py);
    const ox = Math.max(0, qx), oy = qy;
    const length = Math.hypot(ox, oy) || 1;
    const distance = length - radius;
    const strength = Math.exp(-Math.abs(distance) / 7);
    const i = (y * canvas.width + x) * 4;
    image.data[i] = 128 + Math.sign(px) * ox / length * strength * 110;
    image.data[i + 1] = 128 + Math.sign(py) * oy / length * strength * 110;
    image.data[i + 2] = 128; image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL();
  if (refractionMaps.size >= 6) refractionMaps.delete(refractionMaps.keys().next().value);
  refractionMaps.set(key, url);
  return url;
}

export function GlassNavigation({ active, navigate, onContact }) {
  const header = useRef(null), marker = useRef(null), map = useRef(null);
  useLayoutEffect(() => {
    const root = header.current;
    const update = () => {
      const nav = root.querySelector('nav');
      const selected = nav.querySelector(`[data-destination="${active}"]`);
      const bounds = nav.getBoundingClientRect();
      marker.current.style.opacity = selected ? '1' : '0';
      if (selected) {
        const rect = selected.getBoundingClientRect();
        marker.current.style.width = `${rect.width}px`;
        marker.current.style.height = `${rect.height}px`;
        marker.current.style.transform = `translate3d(${rect.left - bounds.left - nav.clientLeft}px,${rect.top - bounds.top - nav.clientTop}px,0)`;
      }
      map.current.setAttribute('href', refractionMap(bounds.width, bounds.height));
    };
    const resize = new ResizeObserver(update);
    resize.observe(root.querySelector('nav'));
    document.fonts.ready.then(() => { if (header.current) update(); });
    update();
    return () => resize.disconnect();
  }, [active]);

  const go = (destination, event) => {
    header.current.classList.toggle('keyboard-navigation', event.detail === 0);
    navigate(destination, event);
  };
  const light = event => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const rect = header.current.getBoundingClientRect();
    header.current.style.setProperty('--glass-light-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
  };

  return <header ref={header} className="header page-header glass-header" data-theme="dark" onPointerMove={light} onPointerDown={() => header.current.classList.remove('keyboard-navigation')}>
    <svg className="glass-filter" aria-hidden="true"><defs>
      <filter id="liquid-nav-refraction" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage ref={map} width="100%" height="100%" preserveAspectRatio="none" result="lens" />
        <feDisplacementMap in="SourceGraphic" in2="lens" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs></svg>
    <a className="brand glass-home" data-destination="home" aria-current={active === 'home' ? 'page' : undefined} href="#home" aria-label="nikk — на главную" onClick={event => { event.preventDefault(); go('home', event); }}><img src="/assets/logo-mark.svg" alt="Знак nikk" /></a>
    <nav className="glass-links" aria-label="Основная навигация">
      <span ref={marker} className="glass-selection" aria-hidden="true" />
      <button data-destination="about" aria-current={active === 'about' ? 'page' : undefined} onClick={event => go('about', event)}><ButtonIcon name="user-round" /><span>Обо мне</span></button>
      <button data-destination="works" aria-current={active === 'works' ? 'page' : undefined} onClick={event => go('works', event)}><ButtonIcon name="layout-grid" /><span>Мои работы</span></button>
      <button data-destination="contact" aria-current={active === 'contact' ? 'page' : undefined} onClick={onContact}><ButtonIcon name="message-circle" /><span>Контакты</span></button>
    </nav>
    <a className="telegram glass-telegram" aria-label="Телеграм — написать Никите" href="https://t.me/reallynikk" target="_blank" rel="noreferrer"><ButtonIcon name="send" /><span>Телеграм</span></a>
  </header>;
}
