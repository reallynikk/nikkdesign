/* ==========================================================================
   PORTFOLIO KINETIC INTERACTION & CASE STUDY CONTROLLER (2026 EDITION)
   Theme Accent: #45c8f5
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAuraCanvas();
  initCustomCursor();
  initKineticTypography();
  renderProjectsGrid();
  initCoverflowShowcase();
  initScrollEffects();
  initCaseStudyController();
  initLightboxZoom();
  initProjectsFilter();
  initTelegramFeatures();
  initMagneticButtons();
  initCounters();
});

/* --------------------------------------------------------------------------
   1. Interactive Ambient Liquid Canvas Aura
   -------------------------------------------------------------------------- */
function initAuraCanvas() {
  const canvas = document.getElementById('auraCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
    }
  }, { passive: true });

  const blobs = [
    { x: width * 0.25, y: height * 0.3, r: 480, color: 'rgba(69, 200, 245, 0.10)', vx: 1.0, vy: 0.6, phase: 0 },
    { x: width * 0.75, y: height * 0.7, r: 520, color: 'rgba(37, 99, 235, 0.08)', vx: -0.8, vy: -0.5, phase: 2.1 },
    { x: width * 0.5, y: height * 0.5, r: 400, color: 'rgba(139, 92, 246, 0.07)', vx: 0.6, vy: -0.9, phase: 4.2 }
  ];

  let time = 0;

  function render() {
    ctx.clearRect(0, 0, width, height);
    time += 0.024;

    mouseX += (targetX - mouseX) * 0.06;
    mouseY += (targetY - mouseY) * 0.06;

    blobs.forEach((blob) => {
      // Dynamic organic floating motion
      blob.x += blob.vx + Math.sin(time + blob.phase) * 0.75;
      blob.y += blob.vy + Math.cos(time * 0.9 + blob.phase * 0.7) * 0.75;

      if (blob.x - blob.r < -100 || blob.x + blob.r > width + 100) blob.vx *= -1;
      if (blob.y - blob.r < -100 || blob.y + blob.r > height + 100) blob.vy *= -1;

      const dx = mouseX - blob.x;
      const dy = mouseY - blob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 450) {
        blob.x += (dx / dist) * 0.6;
        blob.y += (dy / dist) * 0.6;
      }

      const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

/* --------------------------------------------------------------------------
   2. Contextual Magnetic Cursor
   -------------------------------------------------------------------------- */
function initCustomCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  const text = document.getElementById('cursorText');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  function renderCursor() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;

    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  function attachCursorListeners() {
    const interactiveElems = document.querySelectorAll('[data-cursor], a, button, .project-card, .skill-card, .case-gallery-block');
    interactiveElems.forEach(elem => {
      elem.removeEventListener('mouseenter', elem._cEnter);
      elem.removeEventListener('mouseleave', elem._cLeave);

      elem._cEnter = () => {
        ring.classList.add('active');
        text.textContent = '';
      };

      elem._cLeave = () => {
        ring.classList.remove('active');
        text.textContent = '';
      };

      elem.addEventListener('mouseenter', elem._cEnter);
      elem.addEventListener('mouseleave', elem._cLeave);
    });
  }

  attachCursorListeners();
  window.rebindCursor = attachCursorListeners;
}

/* --------------------------------------------------------------------------
   3. Kinetic Typography Effects
   -------------------------------------------------------------------------- */
function initKineticTypography() {
  const title = document.getElementById('kineticTitle');
  if (!title) return;

  const charHovers = title.querySelectorAll('.char-hover');
  charHovers.forEach(container => {
    const rawText = container.textContent;
    container.innerHTML = '';

    [...rawText].forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.classList.add('char-span');
      span.style.display = 'inline-block';
      span.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease';

      span.addEventListener('mouseenter', () => {
        span.style.transform = 'translateY(-12px) scale(1.18) rotate(' + (Math.random() * 8 - 4) + 'deg)';
        span.style.color = '#45c8f5';
      });

      span.addEventListener('mouseleave', () => {
        span.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        span.style.color = '';
      });

      container.appendChild(span);
    });
  });
}

/* --------------------------------------------------------------------------
   4. Scroll Effects & Header Shrink
   -------------------------------------------------------------------------- */
function initScrollEffects() {
  const header = document.getElementById('header');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(elem => observer.observe(elem));

  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => nav.classList.remove('open'));
    });
  }
}



/* --------------------------------------------------------------------------
   5. SPATIAL 3D COVERFLOW SHOWCASE CONTROLLER
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   5. SPATIAL 3D COVERFLOW SHOWCASE CONTROLLER
   -------------------------------------------------------------------------- */
function renderCoverflowTrack() {
  const track = document.getElementById('coverflowTrack');
  if (!track) return;

  track.innerHTML = '';

  const projectsData = getProjectsData();
  const featured = Object.values(projectsData).filter(p => p.featuredInHero !== false);

  featured.forEach((project, idx) => {
    const card = document.createElement('div');
    card.className = `coverflow-card open-case-trigger ${idx === 0 ? 'is-center' : idx === 1 ? 'is-right' : 'is-left'}`;
    card.setAttribute('data-index', idx);
    card.setAttribute('data-project-id', project.id);
    card.setAttribute('data-cursor', 'СМОТРЕТЬ КЕЙС');

    card.innerHTML = `
      <img src="${project.previewImage}" alt="${project.title}" class="coverflow-img">
      <div class="coverflow-overlay">
        <span class="coverflow-tag">${project.badgeText || `✦ ${project.year}`}</span>
        <h3 class="coverflow-title font-serif-italic">${project.title}</h3>
        <span class="coverflow-cta">Смотреть кейс →</span>
      </div>
    `;

    track.appendChild(card);
  });

  // Always append interactive Teaser Card 3 ("Ваш прекрасный проект ✦")
  const teaserIdx = featured.length;
  const teaserCard = document.createElement('div');
  teaserCard.className = `coverflow-card ${teaserIdx === 0 ? 'is-center' : teaserIdx === 1 ? 'is-right' : 'is-left'} coverflow-card--teaser`;
  teaserCard.setAttribute('data-index', teaserIdx);
  teaserCard.setAttribute('data-type', 'teaser');

  teaserCard.innerHTML = `
    <div class="teaser-card-content">
      <div class="teaser-star">✦</div>
      <span class="teaser-badge">СОЗДАДИМ ВМЕСТЕ</span>
      <h3 class="teaser-title font-serif-italic">Ваш прекрасный проект</h3>
      <p class="teaser-desc">Придумаем уникальный стиль, мерч или айдентику для вашего бренда</p>
      <a href="https://t.me/reallynikk" target="_blank" rel="noopener" class="teaser-btn btn-unusual btn-telegram-pulse">
        <span>Обсудить проект →</span>
      </a>
    </div>
  `;

  track.appendChild(teaserCard);
}

function initCoverflowShowcase() {
  renderCoverflowTrack();

  const cards = Array.from(document.querySelectorAll('.coverflow-card'));
  const dotsWrap = document.getElementById('coverflowDots');
  const stage = document.getElementById('coverflowStage');
  const prevBtn = document.getElementById('coverflowPrev');
  const nextBtn = document.getElementById('coverflowNext');
  if (!cards.length) return;

  let centerIdx = 0;
  let timer;

  // Build dots navigation
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = i === 0 ? 'coverflow-dot is-active' : 'coverflow-dot';
      dot.setAttribute('aria-label', `Слайд ${i + 1}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        rotateTo(i);
        startAutoPlay();
      });
      dotsWrap.appendChild(dot);
    });
  }

  const dotEls = Array.from(document.querySelectorAll('.coverflow-dot'));

  function updateCardPositions() {
    cards.forEach((card, i) => {
      card.classList.remove('is-center', 'is-left', 'is-right', 'is-hidden');

      const total = cards.length;
      const diff = (i - centerIdx + total) % total;

      if (diff === 0) {
        card.classList.add('is-center');
      } else if (diff === 1) {
        card.classList.add('is-right');
      } else if (diff === total - 1) {
        card.classList.add('is-left');
      } else {
        card.classList.add('is-hidden');
      }
    });

    dotEls.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === centerIdx);
    });
  }

  let isAnimating = false;
  const ANIM_DURATION = 260; // ms transition throttle for fluid rapid flipping

  function rotateTo(targetIdx) {
    if (targetIdx === centerIdx) return;
    if (isAnimating) return;
    isAnimating = true;
    centerIdx = targetIdx;
    updateCardPositions();
    setTimeout(() => {
      isAnimating = false;
    }, ANIM_DURATION);
  }

  function nextCard() {
    const next = (centerIdx + 1) % cards.length;
    rotateTo(next);
  }

  function prevCard() {
    const prev = (centerIdx - 1 + cards.length) % cards.length;
    rotateTo(prev);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prevCard();
      startAutoPlay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nextCard();
      startAutoPlay();
    });
  }

  // Click on cards
  cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (i !== centerIdx) {
        e.preventDefault();
        e.stopPropagation();
        rotateTo(i);
        startAutoPlay();
        return;
      }

      const projectId = card.getAttribute('data-project-id');
      const cardType = card.getAttribute('data-type');

      if (cardType === 'teaser') {
        window.open('https://t.me/reallynikk', '_blank');
      } else if (projectId && window.openCaseGlobal) {
        window.openCaseGlobal(projectId);
      }
    });
  });

  // Touch & Mouse Drag Gesture Swipe Support for Smooth Flipping
  let startX = 0;
  let isDragging = false;

  if (stage) {
    stage.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        isDragging = true;
      }
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (e.changedTouches && e.changedTouches[0]) {
        const diffX = e.changedTouches[0].clientX - startX;
        if (diffX < -35) {
          nextCard();
          startAutoPlay();
        } else if (diffX > 35) {
          prevCard();
          startAutoPlay();
        }
      }
    }, { passive: true });

    stage.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      isDragging = true;
    });

    stage.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diffX = e.clientX - startX;
      if (diffX < -45) {
        nextCard();
        startAutoPlay();
      } else if (diffX > 45) {
        prevCard();
        startAutoPlay();
      }
    });

    stage.addEventListener('mouseenter', stopAutoPlay);
    stage.addEventListener('mouseleave', () => {
      isDragging = false;
      startAutoPlay();
    });
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setTimeout(() => {
      nextCard();
      startAutoPlay();
    }, 2800);
  }

  function stopAutoPlay() {
    if (timer) clearTimeout(timer);
  }

  updateCardPositions();
  startAutoPlay();
}

/* --------------------------------------------------------------------------
   6. PROJECTS TEMPLATE DATA & DYNAMIC GRID / CASE STUDY CONTROLLER
   -------------------------------------------------------------------------- */
// Dynamic Projects Data imported from modular files (js/projects/index.js)
const getProjectsData = () => window.PROJECTS_DATA || {};

/* Render Dynamic Portfolio Grid from PROJECTS_DATA */
function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const projectsData = getProjectsData();
  const projects = Object.values(projectsData).sort((a, b) => (b.year || 0) - (a.year || 0));

  projects.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card project-card--featured open-case-trigger reveal active';
    card.setAttribute('data-category', project.filterCategory || 'branding');
    card.setAttribute('data-project-id', project.id);
    card.setAttribute('data-year', project.year);

    card.innerHTML = `
      <div class="project-card__thumb-wrap">
        <img src="${project.previewImage}" alt="${project.title}" class="project-card__img" loading="lazy">
        <div class="project-card__badge project-card__badge--accent">${project.badgeText || `✦ ${project.year}`}</div>
        <div class="project-card__overlay">
          <div class="overlay-btn btn-unusual btn-magnetic">
            <span>Смотреть кейс «${project.title}»</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      <div class="project-card__meta">
        <div class="project-card__year">${project.tagline || `${project.year} • КЕЙС`}</div>
        <h3 class="project-card__title">${project.title}</h3>
        <p class="project-card__desc">${project.cardDescription || project.subtitle}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

function initCaseStudyController() {
  const casePage = document.getElementById('caseStudyPage');
  const backBtn = document.getElementById('caseBackBtn');
  const doodleBg = document.getElementById('caseDoodleBg');
  if (!casePage) return;

  function openCase(projectId) {
    const projectsData = getProjectsData();
    const data = projectsData[projectId];
    if (!data) return;

    document.getElementById('caseNavTitle').textContent = data.title;
    document.getElementById('caseCategory').textContent = data.category;
    document.getElementById('caseTitle').textContent = data.title;
    document.getElementById('caseSubtitle').textContent = data.subtitle;
    document.getElementById('caseTask').textContent = data.task;

    const heroWrap = document.getElementById('caseHeroVisual');
    if (data.heroImage) {
      heroWrap.style.display = 'block';
      heroWrap.className = 'case-hero-banner zoomable-img-wrap';
      heroWrap.innerHTML = `<img src="${data.heroImage}" alt="${data.title}">`;
      heroWrap.onclick = () => openLightbox(data.heroImage, data.title);
    } else {
      heroWrap.style.display = 'none';
    }

    const deliverablesUl = document.getElementById('caseDeliverables');
    deliverablesUl.innerHTML = '';
    data.deliverables.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      deliverablesUl.appendChild(li);
    });

    const toolsDiv = document.getElementById('caseTools');
    toolsDiv.innerHTML = '';
    data.tools.forEach(t => {
      const tag = document.createElement('span');
      tag.classList.add('tool-tag');
      tag.textContent = t;
      toolsDiv.appendChild(tag);
    });

    // Render Categorized Project Photo Albums
    renderProjectAlbums(data);

    // Toggle Animated Graphic Branding Elements Theme
    if (data.isDoodleTheme) {
      casePage.classList.add('powerq-theme');
      renderChildhoodDoodles(doodleBg);
    } else if (data.isCuratorsTheme) {
      casePage.classList.add('powerq-theme');
      renderCuratorsSideElements(doodleBg);
    } else {
      casePage.classList.remove('powerq-theme');
      if (doodleBg) doodleBg.innerHTML = '';
    }

    casePage.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.rebindCursor) window.rebindCursor();
  }

  window.openCaseGlobal = openCase;

  function closeCase() {
    casePage.classList.remove('active');
    casePage.classList.remove('powerq-theme');
    if (doodleBg) doodleBg.innerHTML = '';
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.open-case-trigger');
    if (trigger) {
      const id = trigger.getAttribute('data-project-id');
      if (id) openCase(id);
    }
  });

  if (backBtn) {
    backBtn.addEventListener('click', closeCase);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && casePage.classList.contains('active')) {
      closeCase();
    }
  });
}

/* --------------------------------------------------------------------------
   6b. PROJECT PHOTO ALBUMS & GALLERIES CONTROLLER
   -------------------------------------------------------------------------- */
function renderProjectAlbums(data) {
  const container = document.getElementById('caseAlbumsSection');
  if (!container) return;

  container.innerHTML = '';

  const galleryImages = data.galleryImages || [];
  const rawImages = data.rawImages || [];

  if (galleryImages.length === 0 && rawImages.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Section Title
  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'album-section-header';
  sectionTitle.innerHTML = `
    <span class="section-tag">✦ АЛЬБОМЫ & МАТЕРИАЛЫ</span>
    <h2 class="album-section-title font-serif-italic">Галерея макетов и результатов</h2>
  `;
  container.appendChild(sectionTitle);

  // Album 1: Merch & Mockups
  if (galleryImages.length > 0) {
    const block1 = document.createElement('div');
    block1.className = 'album-category-block';
    block1.innerHTML = `
      <div class="album-cat-header">
        <h3 class="album-cat-title">Фирменный мерч & Макеты</h3>
        <span class="album-cat-count">${galleryImages.length} фото</span>
      </div>
      <div class="album-grid" id="albumGridMockups"></div>
    `;
    container.appendChild(block1);

    const grid1 = block1.querySelector('#albumGridMockups');
    galleryImages.forEach(img => {
      const card = createAlbumCard(img);
      grid1.appendChild(card);
    });
  }

  // Album 2: Live Vibe / Atmosphere Photos
  if (rawImages.length > 0) {
    const block2 = document.createElement('div');
    block2.className = 'album-category-block';
    block2.innerHTML = `
      <div class="album-cat-header">
        <h3 class="album-cat-title">Живые фото & Атмосфера</h3>
        <span class="album-cat-count">${rawImages.length} фото</span>
      </div>
      <div class="album-grid" id="albumGridVibe"></div>
    `;
    container.appendChild(block2);

    const grid2 = block2.querySelector('#albumGridVibe');
    rawImages.forEach(img => {
      const card = createAlbumCard(img);
      grid2.appendChild(card);
    });
  }
}

function createAlbumCard(img) {
  const card = document.createElement('div');
  card.className = 'album-card glass-card';
  card.setAttribute('data-cursor', 'ЗУМ');
  card.innerHTML = `
    <div class="album-card__thumb">
      <img src="${img.src}" alt="${img.caption || ''}" loading="lazy" decoding="async">
      <div class="album-card__zoom-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        <span>Увеличить</span>
      </div>
    </div>
    <div class="album-card__caption">${img.caption || ''}</div>
  `;

  card.addEventListener('click', () => {
    if (window.openLightbox) {
      window.openLightbox(img.src, img.caption);
    }
  });

  return card;
}




/* --------------------------------------------------------------------------
   7. HIGH-RES IMAGE LIGHTBOX ZOOM CONTROLLER
   -------------------------------------------------------------------------- */
function initLightboxZoom() {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const captionText = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxCloseBtn');

  if (!lightbox) return;

  window.openLightbox = function (src, caption) {
    lightboxImg.src = src;
    captionText.textContent = caption || '';
    lightbox.classList.add('active');
  };

  function closeLightbox() {
    lightbox.classList.remove('active');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxImg) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
}

/* --------------------------------------------------------------------------
   8. Projects Filtering & Auto-Sorting Tabs
   -------------------------------------------------------------------------- */
function initProjectsFilter() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  const projectGrid = document.getElementById('projectsGrid');

  // Auto-Sort Projects by Year (Descending)
  function sortProjectsByYear() {
    if (!projectGrid) return;
    const cards = Array.from(projectGrid.querySelectorAll('.project-card'));
    cards.sort((a, b) => {
      const yearA = parseInt(a.getAttribute('data-year')) || 0;
      const yearB = parseInt(b.getAttribute('data-year')) || 0;
      return yearB - yearA;
    });
    cards.forEach(card => projectGrid.appendChild(card));
  }

  sortProjectsByYear();

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');
      const projectCards = document.querySelectorAll('.project-card');

      projectCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.classList.remove('hide');
        } else {
          card.classList.add('hide');
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   9. Telegram Quick-Copy & QR Popover Features
   -------------------------------------------------------------------------- */
function initTelegramFeatures() {
  const copyBtn = document.getElementById('copyTgBtn');
  const tgHandleText = document.getElementById('tgHandleText');

  if (copyBtn && tgHandleText) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = tgHandleText.textContent.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Имя пользователя Telegram ${textToCopy} скопировано в буфер!`);
      }).catch(() => {
        showToast(`Скопируйте вручную: ${textToCopy}`);
      });
    });
  }

  const copyEmailBtn = document.getElementById('copyEmailBtn');
  const emailHandleText = document.getElementById('emailHandleText');
  if (copyEmailBtn && emailHandleText) {
    copyEmailBtn.addEventListener('click', () => {
      const textToCopy = emailHandleText.textContent.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Почта ${textToCopy} скопирована в буфер!`);
      }).catch(() => {
        showToast(`Скопируйте вручную: ${textToCopy}`);
      });
    });
  }

  // About Me Section Contact Copy Chips
  const aboutTgCard = document.getElementById('aboutTgCard');
  if (aboutTgCard) {
    aboutTgCard.addEventListener('click', () => {
      const tgLink = 'https://t.me/reallynikk';
      navigator.clipboard.writeText(tgLink).then(() => {
        showToast(`Ссылка Telegram ${tgLink} скопирована!`);
      }).catch(() => {
        showToast(`Скопируйте вручную: ${tgLink}`);
      });
    });
  }

  const aboutEmailCard = document.getElementById('aboutEmailCard');
  if (aboutEmailCard) {
    aboutEmailCard.addEventListener('click', () => {
      const email = 'nikkdesign@yandex.ru';
      navigator.clipboard.writeText(email).then(() => {
        showToast(`Почта ${email} скопирована!`);
      }).catch(() => {
        showToast(`Скопируйте вручную: ${email}`);
      });
    });
  }

  const qrModal = document.getElementById('qrModal');
  const qrCloseBtn = document.getElementById('qrCloseBtn');

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#openQrBtn, .open-qr-trigger');
    if (trigger && qrModal) {
      e.preventDefault();
      qrModal.classList.add('active');
      if (window.rebindCursor) window.rebindCursor();
    }
  });

  if (qrModal) {
    qrModal.addEventListener('click', () => {
      qrModal.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && qrModal.classList.contains('active')) {
        qrModal.classList.remove('active');
      }
    });
  }
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Rapid click handling: smoothly dismiss existing toasts immediately
  const existingToasts = container.querySelectorAll('.toast');
  existingToasts.forEach(oldToast => {
    oldToast.classList.add('hiding');
    setTimeout(() => oldToast.remove(), 250);
  });

  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.innerHTML = `<span class="toast-icon">✓</span><span>${message}</span>`;

  container.appendChild(toast);

  // Auto-dismiss after 1.8s (faster duration)
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}

/* --------------------------------------------------------------------------
   10. 3D Magnetic Button Effect
   -------------------------------------------------------------------------- */
function initMagneticButtons() {
  const magneticBtns = document.querySelectorAll('.btn-magnetic');

  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

/* --------------------------------------------------------------------------
   11. Stat Increment Counters
   -------------------------------------------------------------------------- */
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  let started = false;

  function checkScroll() {
    const statsCard = document.querySelector('.about__stats-card');
    if (!statsCard) return;

    const rect = statsCard.getBoundingClientRect();
    if (rect.top < window.innerHeight && !started) {
      started = true;
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        let current = 0;
        const step = Math.ceil(target / 40);

        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            counter.textContent = target;
            clearInterval(timer);
          } else {
            counter.textContent = current;
          }
        }, 30);
      });
    }
  }

  window.addEventListener('scroll', checkScroll);
  checkScroll();
}

/* --------------------------------------------------------------------------
   12. Childhood Doodle Background Animator for PowerQ 2025
   -------------------------------------------------------------------------- */
function renderChildhoodDoodles(container) {
  if (!container) return;
  container.innerHTML = `
    <!-- Floating Interactive Childhood Sketch Doodles -->
    <div class="doodle-item doodle-plane" style="top: 6%; right: 7%;" data-cursor="✈️ САМОЛЕТИК">
      <svg width="72" height="72" viewBox="0 0 100 100" fill="none" stroke="#45c8f5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 50 L90 10 L60 90 L45 55 L10 50 Z" class="draw-path"/>
        <path d="M45 55 L90 10" class="draw-path"/>
        <path d="M15 78 Q 30 62, 48 80" stroke="#ffcb2b" stroke-dasharray="4 4" stroke-width="2.5"/>
      </svg>
    </div>

    <div class="doodle-item doodle-star-1" style="top: 10%; left: 4%;" data-cursor="⭐ ЗВЕЗДА">
      <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="#ffcb2b" stroke-width="3.5" stroke-linecap="round">
        <path d="M30 5 L35 22 L52 22 L38 32 L43 50 L30 38 L17 50 L22 32 L8 22 L25 22 Z" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-pencil" style="top: 18%; left: 24%;" data-cursor="✏️ КАРАНДАШ">
      <svg width="60" height="60" viewBox="0 0 70 70" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 55 L25 55 L55 25 L45 15 L15 45 Z" class="draw-path"/>
        <path d="M15 55 L10 60 L25 55" class="draw-path"/>
        <line x1="40" y1="20" x2="50" y2="30" stroke="#ffcb2b"/>
      </svg>
    </div>

    <div class="doodle-item doodle-smiley" style="top: 24%; right: 5%;" data-cursor="😄 СМАЙЛИК">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="#ff5964" stroke-width="3.5" stroke-linecap="round">
        <circle cx="30" cy="30" r="24" class="draw-path"/>
        <circle cx="20" cy="22" r="3.5" fill="#ff5964"/>
        <circle cx="40" cy="22" r="3.5" fill="#ff5964"/>
        <path d="M18 35 Q 30 48, 42 35" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-heart" style="top: 30%; left: 8%;" data-cursor="❤️ СЕРДЕЧКО">
      <svg width="54" height="54" viewBox="0 0 60 60" fill="none" stroke="#ff5964" stroke-width="3.5" stroke-linecap="round">
        <path d="M30 52 C12 38, 4 24, 14 12 C22 2, 30 14, 30 14 C30 14, 38 2, 46 12 C56 24, 48 38, 30 52 Z" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-rocket" style="top: 38%; right: 10%;" data-cursor="🚀 РАКЕТА">
      <svg width="64" height="64" viewBox="0 0 70 70" fill="none" stroke="#a855f7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M35 10 C45 20, 50 35, 50 45 L20 45 C20 35, 25 20, 35 10 Z" class="draw-path"/>
        <circle cx="35" cy="30" r="6" stroke="#45c8f5"/>
        <path d="M20 45 L10 58 L20 52 M50 45 L60 58 L50 52" class="draw-path"/>
        <path d="M30 52 L35 62 L40 52" stroke="#ffcb2b" stroke-width="3"/>
      </svg>
    </div>

    <div class="doodle-item doodle-lightning" style="top: 46%; left: 5%;" data-cursor="⚡ МОЛНИЯ">
      <svg width="48" height="48" viewBox="0 0 50 60" fill="none" stroke="#ffcb2b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M28 5 L10 32 L26 32 L20 55 L42 24 L26 24 Z" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-crown" style="top: 55%; left: 7%;" data-cursor="👑 КОРОНА">
      <svg width="62" height="62" viewBox="0 0 80 80" fill="none" stroke="#ffcb2b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 60 L10 25 L30 40 L40 15 L50 40 L70 25 L65 60 Z" class="draw-path"/>
        <circle cx="10" cy="20" r="4" fill="#ffcb2b"/>
        <circle cx="40" cy="10" r="4" fill="#ffcb2b"/>
        <circle cx="70" cy="20" r="4" fill="#ffcb2b"/>
      </svg>
    </div>

    <div class="doodle-item doodle-rainbow" style="top: 63%; right: 6%;" data-cursor="🌈 РАДУГА">
      <svg width="70" height="50" viewBox="0 0 80 50" fill="none" stroke="#ff5964" stroke-width="3.5" stroke-linecap="round">
        <path d="M10 45 A 30 30 0 0 1 70 45" class="draw-path"/>
        <path d="M20 45 A 20 20 0 0 1 60 45" stroke="#ffcb2b" class="draw-path"/>
        <path d="M30 45 A 10 10 0 0 1 50 45" stroke="#45c8f5" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-cloud" style="top: 70%; left: 12%;" data-cursor="☁️ ОБЛАКО">
      <svg width="64" height="48" viewBox="0 0 70 50" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round">
        <path d="M15 40 C6 40, 5 28, 15 26 C12 14, 28 8, 38 16 C46 8, 62 14, 58 26 C66 28, 65 40, 55 40 Z" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-lightbulb" style="top: 78%; right: 9%;" data-cursor="💡 ИДЕЯ">
      <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="#45c8f5" stroke-width="3.5" stroke-linecap="round">
        <path d="M20 24 C20 14, 40 14, 40 24 C40 30, 34 33, 34 38 L26 38 C26 33, 20 30, 20 24 Z" class="draw-path"/>
        <path d="M25 44 L35 44" stroke-width="4"/>
        <path d="M27 49 L33 49" stroke-width="3"/>
        <line x1="30" y1="5" x2="30" y2="1" stroke="#ffcb2b" stroke-width="3"/>
        <line x1="12" y1="12" x2="8" y2="8" stroke="#ffcb2b" stroke-width="3"/>
        <line x1="48" y1="12" x2="52" y2="8" stroke="#ffcb2b" stroke-width="3"/>
      </svg>
    </div>

    <div class="doodle-item doodle-star-2" style="top: 86%; left: 6%;" data-cursor="✨ ВСПЫШКА">
      <svg width="48" height="48" viewBox="0 0 50 50" fill="none" stroke="#a855f7" stroke-width="3.5" stroke-linecap="round">
        <path d="M25 5 L28 18 L42 18 L31 26 L35 40 L25 31 L15 40 L19 26 L8 18 L22 18 Z" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-sparkle" style="top: 92%; left: 45%;" data-cursor="✦ ИСКОРКА">
      <svg width="42" height="42" viewBox="0 0 40 40" fill="none" stroke="#ffcb2b" stroke-width="3" stroke-linecap="round">
        <path d="M20 2 L20 38 M2 20 L38 20 M7 7 L33 33 M33 7 L7 33" class="draw-path"/>
      </svg>
    </div>

    <div class="doodle-item doodle-squiggle-1" style="top: 20%; left: 50%; transform: translateX(-50%);" data-cursor="〰️ ЗАРИСОВКА">
      <svg width="260" height="40" viewBox="0 0 260 40" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round">
        <path d="M10 20 Q 35 5, 60 20 T 110 20 T 160 20 T 210 20 T 250 20" class="draw-path"/>
      </svg>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   14. Curators ISPU Animated Side Branding Graphic Elements Controller
   -------------------------------------------------------------------------- */
function renderCuratorsSideElements(container) {
  if (!container) return;

  container.innerHTML = `
    <!-- Top Left: Curator Diamond Emblem -->
    <div class="curators-side-element" style="top: 8%; left: 3%;" data-cursor="✦ КУРАТОРЫ ИГЭУ">
      <svg width="74" height="74" viewBox="0 0 100 100" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 5 L90 50 L50 95 L10 50 Z" class="draw-path-curators"/>
        <path d="M50 20 L75 50 L50 80 L25 50 Z" stroke="#45c8f5" class="draw-path-curators" style="animation-delay: 1s;"/>
        <circle cx="50" cy="50" r="8" fill="#38bdf8"/>
      </svg>
    </div>

    <!-- Middle Left: Crown & Stars Crest -->
    <div class="curators-side-element" style="top: 32%; left: 4%;" data-cursor="👑 ЛИДЕРСТВО 2026">
      <svg width="84" height="84" viewBox="0 0 110 110" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 75 L15 35 L40 50 L55 20 L70 50 L95 35 L90 75 Z" class="draw-path-curators" style="animation-delay: 1.5s;"/>
        <circle cx="15" cy="28" r="5" fill="#38bdf8"/>
        <circle cx="55" cy="14" r="5" fill="#45c8f5"/>
        <circle cx="95" cy="28" r="5" fill="#38bdf8"/>
        <path d="M30 85 L80 85" stroke="#45c8f5" stroke-width="4" class="draw-path-curators" style="animation-delay: 0.5s;"/>
      </svg>
    </div>

    <!-- Bottom Left: Energy Pulse & Flames -->
    <div class="curators-side-element" style="top: 60%; left: 3.5%;" data-cursor="⚡ ЭНЕРГИЯ ИГЭУ">
      <svg width="68" height="80" viewBox="0 0 80 100" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M45 5 L15 50 L40 50 L30 95 L65 42 L42 42 Z" class="draw-path-curators" style="animation-delay: 2s;"/>
      </svg>
    </div>

    <!-- Bottom Left 2: Geometric Hexagon Motif -->
    <div class="curators-side-element" style="top: 82%; left: 4%;" data-cursor="✦ ВЕКТОР">
      <svg width="65" height="65" viewBox="0 0 80 80" fill="none" stroke="#45c8f5" stroke-width="3" stroke-linecap="round">
        <path d="M40 5 L70 22 L70 58 L40 75 L10 58 L10 22 Z" class="draw-path-curators" style="animation-delay: 0.8s;"/>
        <circle cx="40" cy="40" r="12" stroke="#38bdf8" stroke-width="2.5" class="draw-path-curators"/>
      </svg>
    </div>

    <!-- Top Right: ISPU Crest Emblem -->
    <div class="curators-side-element" style="top: 10%; right: 3.5%;" data-cursor="✦ АЙДЕНТИКА 2026">
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="50" r="42" class="draw-path-curators" style="animation-delay: 0.7s;"/>
        <path d="M30 35 L50 20 L70 35 L70 65 L50 80 L30 65 Z" stroke="#45c8f5" class="draw-path-curators" style="animation-delay: 2.2s;"/>
        <path d="M50 20 L50 80 M30 35 L70 65 M70 35 L30 65" stroke="#38bdf8" stroke-width="2" class="draw-path-curators"/>
      </svg>
    </div>

    <!-- Middle Right: Sparkle & Star Cluster -->
    <div class="curators-side-element" style="top: 35%; right: 4%;" data-cursor="✨ СОЗВЕЗДИЕ КУРАТОРОВ">
      <svg width="76" height="76" viewBox="0 0 90 90" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round">
        <path d="M45 5 L52 32 L80 32 L58 48 L66 75 L45 58 L24 75 L32 48 L10 32 L38 32 Z" class="draw-path-curators" style="animation-delay: 1.2s;"/>
        <path d="M75 15 L75 30 M67.5 22.5 L82.5 22.5" stroke="#ffcb2b" stroke-width="2.5" class="draw-path-curators"/>
      </svg>
    </div>

    <!-- Bottom Right: Kinetic Wave Ribbon -->
    <div class="curators-side-element" style="top: 62%; right: 3.5%;" data-cursor="〰️ ПАТТЕРН">
      <svg width="85" height="60" viewBox="0 0 100 70" fill="none" stroke="#45c8f5" stroke-width="3.5" stroke-linecap="round">
        <path d="M10 35 Q 30 10, 50 35 T 90 35" class="draw-path-curators" style="animation-delay: 0.4s;"/>
        <path d="M10 50 Q 30 25, 50 50 T 90 50" stroke="#38bdf8" stroke-width="2.5" class="draw-path-curators" style="animation-delay: 1.8s;"/>
      </svg>
    </div>

    <!-- Bottom Right 2: Infinity Branding Loop -->
    <div class="curators-side-element" style="top: 84%; right: 4%;" data-cursor="♾️ ЕДИНСТВО">
      <svg width="78" height="50" viewBox="0 0 100 60" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round">
        <path d="M30 30 C10 10, 10 50, 30 30 C50 10, 70 10, 80 30 C90 50, 70 50, 50 30 Z" class="draw-path-curators" style="animation-delay: 1.1s;"/>
      </svg>
    </div>
  `;
}
