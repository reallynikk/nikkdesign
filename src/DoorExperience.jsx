import { useEffect, useRef, useState } from 'react';
import { createArtcraftScene } from './ArtcraftScene';
import { GlassNavigation } from './GlassNavigation';
import { ButtonIcon } from './ButtonIcon';
import { PortraitPhoto } from './PortraitPhoto';
import { useAboutEntrance } from './useAboutEntrance';
import { AboutLogo } from './AboutLogo';
import { WorkAtmosphere, DevelopmentTape } from './WorkAtmosphere';

import './Journey.css';
import './PortfolioTheme.css';
import './ArtcraftHome.css';

export function CrystalExperience({ entered, onReady }) {
  const track = useRef(null), host = useRef(null), about = useRef(null), projects = useRef(null);
  const [failed, setFailed] = useState(false);
  const contacts = useRef(null), contactHost = useRef(null);
  useEffect(() => {
    return createArtcraftScene(contactHost.current, () => onReady('contact'), () => onReady('contact'), { includeVideos: true });
  }, [onReady]);
  const [section, setSection] = useState('home');
  useAboutEntrance(about, entered);

  // Normal document scrolling carries the emblem out of view with Home.
  useEffect(() => createArtcraftScene(host.current, () => onReady('home'), () => {
    setFailed(true);
    onReady('home');
  }, { cover: about.current, includeVideos: true }), [onReady]);

  useEffect(() => {
    const root = track.current;
    const home = root.querySelector('.home-section');
    const surface = root.querySelector('.home-surface');
    const shade = root.querySelector('.home-shade');
    const worksSurface = projects.current.querySelector('.works-surface');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const contactContent = contacts.current.querySelector('.contact-content');
    const setStyle = (node, property, value) => { if (node.style[property] !== value) node.style[property] = value; };
    let frame = 0;
    const update = () => {
      frame = 0;
      const aboutRect = about.current.getBoundingClientRect();
      const contactTop = contacts.current.getBoundingClientRect().top;
      const homeHeight = home.clientHeight;
      const aboutTop = aboutRect.top;
      const aboutBottom = aboutRect.bottom;
      setSection(contactTop <= innerHeight * .5 ? 'contact' : aboutBottom <= innerHeight * .5 ? 'works' : aboutTop <= innerHeight * .5 ? 'about' : 'home');
      const progress = reduced.matches ? 0 : Math.max(0, Math.min(1,
        1 - aboutTop / homeHeight));
      const depth = progress * progress * (3 - 2 * progress);
      const compact = innerWidth <= 700;
      setStyle(surface, 'transform', reduced.matches ? 'none' : `scale(${1 - depth * (compact ? .04 : .09)})`);
      setStyle(surface, 'filter', 'none');
      setStyle(surface, 'clipPath', reduced.matches ? 'none' : `inset(0 round ${depth * 42}px)`);
      setStyle(surface, 'opacity', String(reduced.matches ? 1 : 1 - depth * .35));
      const entry = Math.max(0, Math.min(1, 1 - aboutTop / innerHeight));
      setStyle(about.current, 'clipPath', reduced.matches ? 'none' : `inset(0 round ${(1 - entry) * 48}px ${(1 - entry) * 48}px 0 0)`);
      // About slides UP to uncover Works: the reverse of covering Home.
      // Native scroll retraces the same composition in either direction.
      const viewport = innerHeight;
      const clamp = value => Math.max(0, Math.min(1, value));
      const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
      const handoff = clamp(1 - aboutRect.bottom / viewport);
      const reveal = smooth(handoff);
      setStyle(worksSurface, 'transform', reduced.matches ? 'none' : `scale(${.92 + reveal * .08})`);
      setStyle(worksSurface, 'clipPath', reduced.matches ? 'none' : `inset(${(1 - reveal) * 3}% round ${(1 - reveal) * 48}px)`);
      const contactEntry = smooth(1 - contactTop / viewport);
      setStyle(contacts.current, 'clipPath', reduced.matches ? 'none' : `inset(${(1 - contactEntry) * 6}% ${(1 - contactEntry) * 5}% 0 round ${(1 - contactEntry) * 64}px)`);
      setStyle(contactContent, 'transform', reduced.matches ? 'none' : `translate3d(0,${(1 - contactEntry) * 60}px,0)`);
      setStyle(contactContent, 'opacity', String(reduced.matches ? 1 : .45 + contactEntry * .55));
      setStyle(shade, 'opacity', String(progress * 0.32));
      const homeCovered = aboutTop <= 0;
      if (home.inert !== homeCovered) home.inert = homeCovered;
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

  function navigate(destination, event) {
    const target = destination === 'home' ? track.current : destination === 'works' ? projects.current : destination === 'contact' ? contacts.current : about.current;
    const instant = event?.detail === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (destination === 'about' && instant) about.current.dispatchEvent(new CustomEvent('about-reveal-instant'));
    if (destination === 'works') {
      const overlap = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : innerHeight;
      scrollTo({ top: scrollY + target.getBoundingClientRect().top + overlap, behavior: instant ? 'instant' : 'smooth' });
    } else target.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }

  return <main ref={track} id="home" tabIndex={-1} className="experience calm-page artcraft-page" data-section={section} inert={!entered}>
      <GlassNavigation active={section} navigate={navigate} onContact={event => navigate('contact', event)} />
    <section className="experience-stage home-section" aria-label="Главная">
      <div className="home-surface">
      <div ref={host} className={`crystal-host mono-host${failed ? ' mono-host--fallback' : ''}`} role="img" aria-label="nikk — логотип и работы Никиты Иванова">{failed && <img className="mono-fallback" src="/assets/logo.svg" alt="" />}</div>
      <div className="artcraft-hero-content">
        <div className="artcraft-hero-stack">
          <div className="artcraft-hero-scrim" aria-hidden="true" />
          <div className="artcraft-wordmark"><img src="/assets/logo.svg" alt="nikk — Никита Иванов" /></div>
          <h1>Графический дизайнер</h1>
          <div className="artcraft-hero-actions"><button className="artcraft-cta artcraft-cta-primary" onClick={event => navigate('works', event)}><ButtonIcon name="layout-grid" />Смотреть работы</button><a className="artcraft-cta artcraft-cta-secondary" href="https://t.me/reallynikk" target="_blank" rel="noreferrer"><ButtonIcon name="message-circle" />Обсудить проект</a></div>
        </div>
      </div>
      </div>
      <div className="home-shade" aria-hidden="true" />
    </section>

    <section id="about" ref={about} tabIndex={-1} className="about-section" aria-labelledby="about-title">
      <div className="about-name" data-about-reveal>
        <h2 id="about-title" className="about-depth">Никита Иванов</h2>
      </div>
      <div className="about-role" data-about-reveal><p className="about-depth">Графический{' '}<br />дизайнер</p><AboutLogo onReady={onReady} /></div>
      <figure className="about-photo">
        <PortraitPhoto />
      </figure>
      <div className="about-facts">
        <dl className="about-fact" data-about-reveal><div className="about-depth"><dt>3 года</dt><dd>опыта работы</dd></div></dl>
        <dl className="about-fact" data-about-reveal><div className="about-depth"><dt>3+</dt><dd>больших проекта</dd></div></dl>
      </div>

      <div className="about-next-wrap" data-about-reveal><button className="artcraft-cta about-depth about-works-glass" onClick={event => navigate('works', event)}><ButtonIcon name="layout-grid" />Смотреть работы</button></div>
    </section>

    <section id="works" ref={projects} tabIndex={-1} className="projects-section development-section is-visible" aria-label="Раздел в активной разработке">
      <div className="works-stage">
        <div className="works-surface">
          <WorkAtmosphere entered={entered} />
          <DevelopmentTape />
        </div>
      </div>
    </section>
    <section id="contact" ref={contacts} tabIndex={-1} className="contact-section" aria-labelledby="contact-title">
      <div ref={contactHost} className="contact-galaxy" aria-hidden="true" />
      <div className="contact-content">
        <h2 id="contact-title"><span className="contact-title-line"><ButtonIcon name="message-circle" />Есть идея?</span><br /><span>Давайте обсудим.</span></h2>
        <a className="contact-link" href="https://t.me/reallynikk" target="_blank" rel="noreferrer">
          <span className="contact-link-copy"><span className="contact-link-label">Написать в Телеграм</span><span className="contact-handle">@reallynikk</span></span>
          <span className="contact-link-arrow" aria-hidden="true">↗</span>
        </a>
        <a className="contact-link" href="https://vk.ru/reallynikk" target="_blank" rel="noreferrer">
          <span className="contact-link-copy"><span className="contact-link-label">Написать во ВКонтакте</span><span className="contact-handle">@reallynikk</span></span>
          <span className="contact-link-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
    <footer className="site-footer"><span>Никита Иванов</span><a href="https://reallynikk.ru/">reallynikk.ru</a><span>© 2026</span></footer>

  </main>;
}
