import { useEffect, useRef, useState } from 'react';
import { createCrystal } from './CrystalScene';

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

const groups = [
  { name: 'Движение Первых', type: 'Айдентика · Полиграфия · Предметный дизайн', image: '/assets/preview-4.png', number: '01' },
  { name: 'Кураторы ИГЭУ', type: 'Визуальная коммуникация', number: '02' },
  { name: 'Другие проекты', type: 'Графика · Эксперименты', image: '/assets/preview-2.png', number: '03' },
];

export function CrystalExperience({ entered, setPanel, onReady }) {
  const track = useRef(null), host = useRef(null), progress = useRef(0), backdrop = useRef(null), footer = useRef(null);
  const laptop = useRef(null), lid = useRef(null), base = useRef(null), dimmer = useRef(null), frame = useRef(null);
  const scrollAnimation = useRef(null), navigateRef = useRef(null), isTransitioning = useRef(false);
  const [dark, setDark] = useState(false), [works, setWorks] = useState(false), [failed, setFailed] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const projectDialog = useRef(null);
  useEffect(() => {
    let scheduled;
    const update = () => {
      scheduled = null;
      const node = track.current;
      const p = Math.max(0, Math.min(1, -node.getBoundingClientRect().top / (node.offsetHeight - innerHeight)));
      progress.current = p;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const phase = (from, to) => Math.max(0, Math.min(1, (p - from) / (to - from)));
      const reveal = phase(.08, .38), close = phase(.4, .72), leave = phase(.76, .96);
      const width = node.clientWidth, height = innerHeight;
      const finalScaleX = width < 700 ? .72 : .56;
      const finalScaleY = Math.min(.5, finalScaleX * width / (1.6 * height));
      backdrop.current.style.opacity = String(phase(0, .18));
      dimmer.current.style.opacity = String(phase(0, .2) * .48);
      frame.current.style.opacity = String(phase(.08, .25));
      base.current.style.opacity = String(phase(.15, .32));
      laptop.current.style.transform = reduce ? 'none' :
        `translate3d(0, ${-height * .18 * reveal + height * 1.55 * leave}px, 0) scale3d(${1 - reveal * (1 - finalScaleX)}, ${1 - reveal * (1 - finalScaleY)}, ${1 - reveal * (1 - finalScaleX)})`;
      lid.current.style.transform = reduce ? 'none' : `rotateX(${-135 * close}deg)`;
      laptop.current.style.opacity = String(reduce ? 1 - phase(.1, .7) : 1 - phase(.90, .97));
      laptop.current.style.visibility = p >= .98 ? 'hidden' : 'visible';
      laptop.current.inert = p > .03;
      setDark(p > .12); setWorks(p > .94);

    };
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); update();
    const wheel = event => {
      if (isTransitioning.current) { event.preventDefault(); return; }
      const node = track.current;
      const end = node.offsetTop + node.offsetHeight - innerHeight;
      const nearStart = scrollY <= node.offsetTop + 12;
      const nearEnd = scrollY >= end - 12;
      if ((event.deltaY > 0 && nearStart) || (event.deltaY < 0 && nearEnd)) {
        event.preventDefault();
        navigateRef.current?.(event.deltaY > 0);
      }
    };
    addEventListener('wheel', wheel, { passive: false });
    return () => { cancelAnimationFrame(scrollAnimation.current); cancelAnimationFrame(scheduled); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); removeEventListener('wheel', wheel); };
  }, []);
  useEffect(() => createCrystal(host.current, () => progress.current, onReady, () => { setFailed(true); onReady(); }), [onReady]);
  useEffect(() => {
    if (activeProject) projectDialog.current.showModal();
    else projectDialog.current.close();
  }, [activeProject]);
  function navigate(toWorks) {
    const top = track.current.offsetTop + (toWorks ? track.current.offsetHeight - innerHeight : 0);
    if (isTransitioning.current) return;
    cancelAnimationFrame(scrollAnimation.current);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, top); return; }
    isTransitioning.current = true;
    const from = window.scrollY, start = performance.now();
    // Marketing transition: 2.2 s, using the existing (.77, 0, .175, 1) easing.
    const cubic = (t, a, b) => 3 * (1-t) * (1-t) * t * a + 3 * (1-t) * t * t * b + t*t*t;
    const ease = x => {
      let lo=0, hi=1;
      for (let i=0; i<16; i++) { const mid=(lo+hi)/2; if(cubic(mid,.77,.175)<x) lo=mid; else hi=mid; }
      return cubic((lo+hi)/2,0,1);
    };
    const tick = now => {
      const p = Math.min(1, (now-start)/2200);
      window.scrollTo(0, from + (top-from)*ease(p));
      if(p<1) scrollAnimation.current=requestAnimationFrame(tick);
      else { scrollAnimation.current=null; isTransitioning.current=false; }
    };
    scrollAnimation.current=requestAnimationFrame(tick);
  }
  navigateRef.current = navigate;
  return <main ref={track} className="experience" inert={!entered}>
    <div className={`experience-stage ${dark ? 'is-dark' : ''}`}>
      <div ref={backdrop} className="experience-backdrop" />
      <div ref={laptop} className="laptop-world">
        <div ref={lid} className="laptop-lid">
          <div ref={frame} className="laptop-frame" aria-hidden="true"><i /></div>
          <div className="laptop-front">
      <header className="header">
        <a className="brand" href="#" aria-label="nikk — на главную" onClick={e => { e.preventDefault(); navigate(false); }}>
          <img src={'/assets/logo.svg'} alt="nikk" />
        </a>
        <nav aria-label="Основная навигация">
          <button onClick={() => setPanel('about')}><HoverText>Обо мне</HoverText></button>
          <button onClick={() => navigate(true)}><HoverText>Мои работы</HoverText></button>
          <button onClick={() => setPanel('contact')}><HoverText>Контакты</HoverText></button>
        </nav>
        <a className="telegram" href="https://t.me/reallynikk" target="_blank" rel="noreferrer"><HoverText>Телеграм ↗</HoverText></a>
      </header>
      <h1 className="sr-only">Никита Иванов — Портфолио графического дизайнера</h1>
      <div ref={host} className="crystal-host" data-cursor="drag" role="group" tabIndex={0} aria-label="Стеклянный восьмилучевой знак. Тяните для вращения или используйте стрелки клавиатуры.">
        {failed && <div className="crystal-fallback">✳<small>3D недоступно в этом браузере. Проекты доступны ниже.</small></div>}
      </div>
      <footer ref={footer} className="footer">
        <div className="identity"><strong>НИКИТА ИВАНОВ</strong><span>графический дизайнер</span><small>/// сделано в 2026</small></div>
        <span className="crystal-caption">Вращайте. Рассматривайте.<br />Листайте вниз ↓</span>
        <button className="project-link" onClick={() => navigate(true)}><HoverText>Перейти к работам</HoverText> <span aria-hidden="true">↗</span></button>
      </footer>
            <div ref={dimmer} className="laptop-screen-dimmer" aria-hidden="true" />
          </div>
          <div className="laptop-back" aria-hidden="true"><img src="/assets/laptop-mark.svg" alt="" /></div>
        </div>
        <div ref={base} className="laptop-base" aria-hidden="true">
          <div className="laptop-keyboard">{Array.from({length: 70}, (_, i) => <i key={i} />)}</div>
          <div className="laptop-trackpad" /><div className="laptop-notch" />
        </div>
      </div>
      <div className={`projects-navigation ${works ? 'is-visible' : ''}`} inert={!works} aria-hidden={!works}>
      <header className="header">
        <a className="brand" href="#" aria-label="nikk — на главную" onClick={e => { e.preventDefault(); navigate(false); }}>
          <img src={'/assets/logo-white.svg'} alt="nikk" />
        </a>
        <nav aria-label="Основная навигация">
          <button onClick={() => setPanel('about')}><HoverText>Обо мне</HoverText></button>
          <button onClick={() => navigate(true)}><HoverText>Мои работы</HoverText></button>
          <button onClick={() => setPanel('contact')}><HoverText>Контакты</HoverText></button>
        </nav>
        <a className="telegram" href="https://t.me/reallynikk" target="_blank" rel="noreferrer"><HoverText>Телеграм ↗</HoverText></a>
      </header>
      </div>

      <section className={`projects-section ${works ? 'is-visible' : ''}`} inert={!works} aria-hidden={!works} aria-label="Мои работы">
        <div className="projects-heading"><span>ИЗБРАННЫЕ РАБОТЫ / 2026</span><span>03 ПРОЕКТА</span></div>
        <h2>Мои работы<span>↙</span></h2>
        <div className="project-triptych">
          {groups.map(group => <button className="project-card" key={group.number} onClick={() => setActiveProject(group)}>
            <div className={`project-cover project-cover--${group.number}`}>
              {group.image ? <img src={group.image} alt="" /> : <div className="curators-cover" aria-hidden="true"><span>ИГЭУ</span><strong>КУРАТОРЫ</strong><span>ЛЮДИ. ИДЕИ. СВЯЗИ.</span></div>}
              <span className="project-number">/{group.number}</span><span className="project-arrow">↗</span>
            </div>
            <h3>{group.name}</h3><p>{group.type}</p>
          </button>)}
        </div>
        <div className="projects-bottom"><span>Визуальные решения с характером.</span><button onClick={() => navigate(false)}>На главную ↑</button></div>
      </section>
    </div>
    <dialog ref={projectDialog} className="detail-dialog" onCancel={() => setActiveProject(null)} onClick={e => { if (e.target === projectDialog.current) setActiveProject(null); }}>
      <div className="dialog-inner"><button className="close" onClick={() => setActiveProject(null)}>Закрыть ×</button>
        <span className="eyebrow">{activeProject?.type}</span><h2>{activeProject?.name}</h2>
        {activeProject?.image && <img className="detail-award" src={activeProject.image} alt={activeProject.name} />}
        <p>Полный кейс появится позже.</p>
      </div>
    </dialog>
  </main>;
}
