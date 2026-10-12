import { useEffect, useRef, useState } from 'react';
import { createCrystal } from './CrystalScene';
import { HoverText } from './CrystalExperience';
import { PortraitPhoto } from './PortraitPhoto';
import { useAboutEntrance } from './useAboutEntrance';
import { AboutAward } from './AboutAward';

import './Journey.css';

const groups = [
  { name: 'Движение Первых', type: 'Айдентика · Полиграфия · Предметный дизайн', image: '/assets/preview-4.png', number: '01' },
  { name: 'Кураторы ИГЭУ', type: 'Айдентика · Графический дизайн', number: '02' },
  { name: 'Другие проекты', type: 'Графика · Эксперименты', number: '03' },
];

export function CrystalExperience({ entered, setPanel, onReady }) {
  const track = useRef(null), host = useRef(null), about = useRef(null), projects = useRef(null), dialog = useRef(null);
  const [failed, setFailed] = useState(false), [activeProject, setActiveProject] = useState(null);
  useAboutEntrance(about, entered);

  // Normal document scrolling carries the emblem out of view with Home.
  useEffect(() => createCrystal(host.current, () => 0, onReady, () => {
    setFailed(true);
    onReady();
  }), [onReady]);

  useEffect(() => {
    const root = track.current;
    const home = root.querySelector('.home-section');
    const surface = root.querySelector('.home-surface');
    const shade = root.querySelector('.home-shade');
    const header = root.querySelector('.page-header');
    const navigation = header.querySelector('nav');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const aboutTop = about.current.getBoundingClientRect().top;
      // Mobile navigation occupies a second row outside the header's own box.
      const headerBottom = Math.ceil(Math.max(header.getBoundingClientRect().bottom,
        navigation.getBoundingClientRect().bottom) + 18);
      header.style.setProperty('--header-background-height', `${headerBottom}px`);
      // Let the real dark edge fill both header rows during native scrolling.
      // Only replace it with the identical fixed backing once it reaches y=0.
      header.classList.toggle('has-dark-background', aboutTop <= 0);
      const progress = reduced.matches ? 0 : Math.max(0, Math.min(1,
        1 - aboutTop / home.clientHeight));
      surface.style.transform = reduced.matches ? 'none' : `scale(${1 - progress * 0.04})`;
      shade.style.opacity = String(progress * 0.32);
      home.inert = progress >= 1;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, []);

  useEffect(() => {
    if (!entered) return;
    const nodes = [...track.current.querySelectorAll('[data-reveal]')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const showAll = () => nodes.forEach(node => {
      node.classList.remove('reveal-pending');
      node.classList.add('reveal-visible');
    });
    if (reduced.matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) node.classList.add('reveal-visible');
      else {
        node.classList.add('reveal-pending');
        observer.observe(node);
      }
    });
    const revealFocused = event => {
      const node = event.target.closest('[data-reveal]');
      if (node) {
        node.classList.remove('reveal-pending');
        node.classList.add('reveal-visible');
        observer.unobserve(node);
      }
    };
    const preferenceChanged = () => { if (reduced.matches) { observer.disconnect(); showAll(); } };
    const root = track.current;
    root.addEventListener('focusin', revealFocused);
    reduced.addEventListener('change', preferenceChanged);
    return () => {
      observer.disconnect();
      root.removeEventListener('focusin', revealFocused);
      reduced.removeEventListener('change', preferenceChanged);
      showAll();
    };
  }, [entered]);

  useEffect(() => {
    if (activeProject) dialog.current.showModal();
    else dialog.current.close();
  }, [activeProject]);

  function navigate(destination, event) {
    const target = destination === 'home' ? track.current : destination === 'works' ? projects.current : about.current;
    const instant = event?.detail === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (destination === 'about' && instant) about.current.dispatchEvent(new CustomEvent('about-reveal-instant'));
    target.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }

  return <main ref={track} id="home" tabIndex={-1} className="experience calm-page" inert={!entered}>
      <header className="header page-header">
        <a className="brand" href="#home" aria-label="nikk — на главную" onClick={event => { event.preventDefault(); navigate('home', event); }}><img src="/assets/logo.svg" alt="nikk" /></a>
        <nav aria-label="Основная навигация">
          <button onClick={event => navigate('about', event)}><HoverText>Обо мне</HoverText></button>
          <button onClick={event => navigate('works', event)}><HoverText>Мои работы</HoverText></button>
          <button onClick={() => setPanel('contact')}><HoverText>Контакты</HoverText></button>
        </nav>
        <a className="telegram" href="https://t.me/reallynikk" target="_blank" rel="noreferrer"><HoverText>Телеграм ↗</HoverText></a>
      </header>
    <section className="experience-stage home-section" aria-label="Главная">
      <div className="home-surface">
      <div ref={host} className="crystal-host" data-cursor="drag" role="group" tabIndex={0} aria-label="Стеклянный знак. Наведите для локального распада, нажмите для разлома. Тяните для вращения или используйте стрелки.">{failed && <div className="crystal-fallback">nikk</div>}</div>
      <h1 className="sr-only">Никита Иванов — графический дизайнер</h1>
      <footer className="footer">
        <div className="identity"><strong>НИКИТА ИВАНОВ</strong><span>графический дизайнер</span><small>/// сделано в 2026</small></div>
        <div className="identity home-instruction"><strong>КАСАЙТЕСЬ. РАЗБИРАЙТЕ.</strong><span>Листайте — познакомимся ↓</span><small>/// наведите или нажмите на модель</small></div>
      </footer>
      </div>
      <div className="home-shade" aria-hidden="true" />
    </section>

    <section id="about" ref={about} tabIndex={-1} className="about-section" aria-labelledby="about-title">
      <div className="about-name" data-about-reveal>
        <h2 id="about-title" className="about-depth">Никита Иванов</h2>
      </div>
      <div className="about-role" data-about-reveal><p className="about-depth">Графический{' '}<br />дизайнер</p><AboutAward onOpen={() => setActiveProject(groups[0])} /></div>
      <figure className="about-photo">
        <PortraitPhoto />
      </figure>
      <div className="about-facts">
        <dl className="about-fact" data-about-reveal><div className="about-depth"><dt>3 года</dt><dd>опыта работы</dd></div></dl>
        <dl className="about-fact" data-about-reveal><div className="about-depth"><dt>3+</dt><dd>больших проекта</dd></div></dl>
      </div>

      <div className="about-next-wrap" data-about-reveal><button className="about-next about-depth" onClick={event => navigate('works', event)}>Смотреть работы <span aria-hidden="true">↗</span></button></div>
    </section>

    <section id="works" ref={projects} tabIndex={-1} className="projects-section is-visible" aria-label="Мои работы">
      <div data-reveal>
        <div className="projects-heading"><span>ИЗБРАННЫЕ РАБОТЫ / 2026</span><span>03 ПРОЕКТА</span></div>
        <h2>Мои работы<span aria-hidden="true">↙</span></h2>
      </div>
      <div className="project-triptych">{groups.map(group => <button className="project-card" data-reveal key={group.number} onClick={() => setActiveProject(group)}>
        <div className={`project-cover project-cover--${group.number}`}>{group.image ? <img src={group.image} alt="" /> : <div className="curators-cover"><span>{group.number === '02' ? 'ИГЭУ' : 'ГРАФИКА / ОБЪЕКТЫ'}</span><strong>{group.number === '02' ? 'КУРАТОРЫ' : 'ЭКСПЕРИМЕНТЫ'}</strong></div>}<span className="project-number">/{group.number}</span><span className="project-arrow" aria-hidden="true">↗</span></div><h3>{group.name}</h3><p>{group.type}</p>
      </button>)}</div>
      <div className="projects-bottom"><span>Визуальные решения с характером.</span><button onClick={event => navigate('about', event)}>Обо мне ↑</button></div>
    </section>
    <dialog ref={dialog} className="detail-dialog" aria-labelledby="project-title" onCancel={() => setActiveProject(null)} onClick={event => { if (event.target === dialog.current) setActiveProject(null); }}><div className="dialog-inner"><button className="close" onClick={() => setActiveProject(null)}>Закрыть ×</button><span className="eyebrow">{activeProject?.type}</span><h2 id="project-title">{activeProject?.name}</h2>{activeProject?.image && <img className="detail-award" src={activeProject.image} alt={activeProject.name} />}<p>Полный кейс появится позже.</p></div></dialog>
  </main>;
}



