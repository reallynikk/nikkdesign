import { useEffect, useRef } from 'react';
import './WorkAtmosphere.css';

export const artwork = [
  { name: 'Хор Первых', image: '/assets/preview-0.webp' },
  { name: 'Открытки', image: '/assets/preview-1.webp' },
  { name: 'Театральный комплекс', image: '/assets/preview-2.webp' },
  { name: 'Графический дизайн', image: '/assets/preview-3.webp' },
  { name: 'Движение Первых', image: '/assets/preview-4.webp' },
  { name: 'Награда Движения Первых', image: '/assets/preview-4.webp' },
];

const processPhrases = [
  'Задача: определить цель коммуникации.',
  'Аудитория: потребности и мотивация.',
  'Контекст: где человек увидит дизайн?',
  'Анализ визуальных кодов конкурентов.',
  'Барьеры: что мешает принять решение?',
  'Сегментация по сценариям поведения.',
  'Позиционирование: ключевое отличие.',
  'Гипотеза → проверка → корректировка.',
  'Какие ассоциации вызывает образ?',
  'Типографика: иерархия сообщений.',
  'Цвет: контраст и смысловая функция.',
  'Композиция: порядок считывания.',
  'Проверка читаемости в малом формате.',
  'Концепция: связь формы с задачей.',
  'Анализ точек контакта с брендом.',
  'Система: единые правила оформления.',
  'Носители: ограничения производства.',
  'Проверка масштабируемости знака.',
  'Оценка целостности визуальной системы.',
  'Что нужно понять за первые секунды?',
  'Уточнение брифа и критериев результата.',
  'Сопоставление вариантов с задачей.',
  'Приоритет: основное сообщение.',
  'Проверка макетов перед передачей.',
];
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Each new character stays scrambled until the typing head moves five places on.
function createProcessTyping(root) {
  const nodes = [...root.querySelectorAll('.process-type-text')];
  const states = nodes.map((node, index) => ({ node, index, text: processPhrases[index], time: -index * 250 }));
  function relocate(state) {
    const box = state.node.parentElement;
    const w = root.clientWidth, h = root.clientHeight;
    const margin = w * .04;
    const right = state.index % 2;
    const lower = state.index >= 2;
    const minX = right ? w * .52 : margin;
    const maxX = right ? w - box.offsetWidth - margin : w * .48 - box.offsetWidth;
    const minY = lower ? h * .68 : Math.max(85, h * .12);
    const maxY = lower ? h - box.offsetHeight - (w < 700 ? 110 : 45) : h * .33 - box.offsetHeight;
    box.style.left = `${minX + Math.random() * Math.max(0, maxX - minX)}px`;
    box.style.top = `${minY + Math.random() * Math.max(0, maxY - minY)}px`;
  }
  states.forEach(state => { state.node.textContent = ''; relocate(state); });
  let frame = 0, last = 0, tickTime = 0;
  const renderText = (text, visible, stable) => [...text].slice(0, visible).map((letter, index) =>
    index < stable || /\s/.test(letter) ? letter : latin[Math.floor(Math.random() * latin.length)]).join('');
  function tick(now) {
    frame = 0;
    const delta = last ? Math.min(100, now - last) : 0;
    last = now;
    tickTime += delta;
    if (tickTime >= 30) {
      const elapsed = tickTime;
      tickTime = 0;
      for (const state of states) {
        state.time += elapsed;
        const text = state.text;
        const length = [...text].length;
        const typing = (length + 5) * 30, hold = 650, deleting = (length + 5) * 20;
        const t = state.time;
        if (t < 0) { state.node.textContent = ''; continue; }
        if (t < typing) {
          const head = Math.floor(t / 30);
          state.node.textContent = renderText(text, Math.min(length, head), Math.max(0, head - 5));
        } else if (t < typing + hold) state.node.textContent = text;
        else if (t < typing + hold + deleting) {
          const head = Math.floor((t - typing - hold) / 20);
          state.node.textContent = renderText(text, Math.max(0, length - Math.max(0, head - 5)), Math.max(0, length - head));
        } else {
          state.node.textContent = '';
          if (t >= typing + hold + deleting + 250) {
            const available = processPhrases.filter(phrase => !states.some(other => other.text === phrase));
            state.text = available[Math.floor(Math.random() * available.length)];
            state.time = 0;
            relocate(state);
          }
        }
      }
    }
    frame = requestAnimationFrame(tick);
  }
  return {
    start() { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } },
    stop() { cancelAnimationFrame(frame); frame = 0; last = 0; },
    static() { states.forEach(state => { state.node.textContent = state.text; }); },
  };
}

// Decorative timelines live on the compositor, not in the React render loop.
export function WorkAtmosphere({ entered }) {
  const host = useRef(null);
  useEffect(() => {
    const root = host.current;
    const stage = root.closest('.works-stage');
    const about = root.closest('main').querySelector('#about');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const typing = createProcessTyping(root);
    const sync = () => {
      const rect = root.getBoundingClientRect();
      const running = entered && !document.hidden && !reduced.matches
        && rect.bottom > 0 && rect.top < innerHeight && about.getBoundingClientRect().bottom < innerHeight;
      root.classList.toggle('is-running', running);
      stage.classList.toggle('is-running', running);
      if (running) typing.start();
      else typing.stop();
      if (reduced.matches) typing.static();
    };
    const observer = new IntersectionObserver(sync);
    observer.observe(root);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      typing.stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      reduced.removeEventListener('change', sync);
    };
  }, [entered]);

  return <div ref={host} className="work-atmosphere work-atmosphere--pulse" aria-hidden="true">
    {artwork.map((work, index) => <div className={`floating-work floating-work--${index}`} key={work.name}>
      <div className="floating-work-window"><img src={work.image} alt="" draggable="false" decoding="async" /></div>
    </div>)}
    <div className="process-notes">
      {[0, 1, 2, 3].map(index => <div className="process-note" key={index}>
        <span className="process-type-text" /><span className="process-type-caret" />
      </div>)}
    </div>
  </div>;
}

export function DevelopmentTape() {
  return <div className="development-status" role="status"><h2>Раздел в активной<br />разработке</h2></div>;
}
