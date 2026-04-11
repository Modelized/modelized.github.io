(function(){
  "use strict";

  const body = document.body;
  const base = (body?.getAttribute('data-base') || '.').trim();
  const assetVersion = '20260411b';
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SETTLE_PASS_DELAYS = [0, 140, 320, 560];
  const simpleIcon = (name) => `https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${name}.svg`;
  const iconSvg = (path) => `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${path}</svg>`;

  const projects = [
    {
      slug: "istage",
      title: "iStage",
      description:
        "A pixel-perfect recreation of the iOS Lock Screen for Android, with built-in Dynamic Island, stock wallpapers and deep personalization — all powered by KLCK.",
      categories: ["Development", "Design"],
      icon: "assets/img/iStage-icon-dark.png",
      image: "assets/img/hero-iStage-series.png",
      url: "https://modelized.github.io/iStage/"
    },
    {
      slug: "sherlockgenes",
      title: "SherlockGenes",
      description:
        "An interactive pedigree analysis program that helps users build family trees and estimate the risk of inherited genetic disorders. It analyzes possible inheritance patterns based on provided family connections and medical conditions, calculating the probability of inheritance to make complex genetic prediction visual and accessible.",
      categories: ["Development", "Research"],
      image: "assets/img/hero-SherlockGenes.png"
    },
    {
      slug: "truevision",
      title: "TrueVision",
      description:
        "An AI-based crowd density analysis system designed to detect and visualize dangerous congestion in real time. Using computer vision, it analyzes video input to estimate relative positions and evaluate density, presenting intuitive visual data such as the number of detected people, density levels, and risk stages to effectively monitor crowd flow.",
      categories: ["Development", "Engineering", "Research"]
    },
    {
      slug: "vanta",
      title: "Vanta",
      description:
        "A native macOS launcher engineered for iOS virtual machines (vphone-aio). It replaces terminal-heavy workflows with a clean graphical interface and a dedicated viewer, making low-level VM management visually intuitive.",
      categories: ["Development", "Engineering"],
      icon: "assets/img/Vanta-icon-dark.png"
    },
    {
      slug: "airtime-cabin",
      title: "AirTime Cabin",
      description:
        "A hyper realistic virtual flight relaxation app for iOS and visionOS. Designed for focus and meditation, it dynamically simulates real world flight phases — triggering aviation announcements synchronized with the flight, weather shifts, and immersive 3D sky visuals outside the window.",
      categories: ["Development", "Design"]
    },
    {
      slug: "aero",
      title: "Aero",
      description:
        "A conceptual next-generation operating system designed ahead of its time, focusing on deep personalization and seamless UI/UX. It features Space — a fully customized and optimized environment tailored by the user, alongside context-aware action suggestions based on user data. It also introduces an interactive Activity Indicator that the navigation bar expands to display relevant live activities.",
      categories: ["Design"]
    }
  ];

  const disciplines = [
    {
      slug: "development",
      tone: "development",
      title: "Development",
      text:
        "Building native applications and computational systems. From developing macOS and iOS software to building intelligent models in Python, I focus on translating complex logic into functional code.",
      arsenalKind: "development",
      arsenal: [
        { iconUrl: simpleIcon("c"), label: "C" },
        { iconUrl: simpleIcon("cplusplus"), label: "C++" },
        { iconUrl: simpleIcon("python"), label: "Python" },
        { iconUrl: simpleIcon("swift"), label: "Swift" },
        { iconUrl: simpleIcon("kotlin"), label: "Kotlin" },
        { iconUrl: simpleIcon("javascript"), label: "JavaScript" },
        { iconUrl: simpleIcon("html5"), label: "HTML" },
        { iconUrl: simpleIcon("gnubash"), label: "Bash" },
        { iconSvg: iconSvg('<path d="M4.2 5.2h5.2M4.2 9.8h7.8M4.2 14.4h11.6"/><path d="m12.2 4.3 3.6 3.6-3.6 3.6"/>'), label: "Makefile" }
      ]
    },
    {
      slug: "engineering",
      tone: "engineering",
      title: "Engineering",
      text:
        "Diving into the core of operating systems and device environments. My work involves Custom ROM development and low-level system exploration, studying how device architectures function from the inside out to build highly optimized environments.",
      arsenalKind: "engineering",
      arsenal: [
        { iconSvg: iconSvg('<path d="M5 12.4a5 5 0 0 1 10 0v1.2H5Z"/><path d="m7.4 7.6-.72-1.08"/><path d="m12.6 7.6.72-1.08"/><circle cx="8.9" cy="10.1" r=".66" fill="currentColor" stroke="none"/><circle cx="11.1" cy="10.1" r=".66" fill="currentColor" stroke="none"/>'), label: "Custom ROM Building" },
        { iconSvg: iconSvg('<path d="M10 4.2 14 5.7v3.8c0 2.6-1.6 4.8-4 5.9-2.4-1.1-4-3.3-4-5.9V5.7L10 4.2Z"/><path d="m12.7 12.7 2.6 2.6"/><circle cx="12.1" cy="12.1" r="2.3"/>'), label: "iOS Security Analysis" },
        { iconSvg: iconSvg('<path d="m6.4 6.2-3.1 3.8 3.1 3.8"/><path d="m13.6 6.2 3.1 3.8-3.1 3.8"/><path d="m11 4.8-2 10.4"/>'), label: "Reverse Engineering" },
        { iconSvg: iconSvg('<rect x="4.1" y="4.5" width="11.8" height="8.2" rx="1.8"/><path d="M6.5 15.5h7"/><path d="M8 12.7v2.8M12 12.7v2.8"/>'), label: "System Virtualization" }
      ]
    },
    {
      slug: "design",
      tone: "design",
      title: "Design",
      text:
        "Designing the visual layer of the software I build. I treat UI/UX as the final phase of development — bringing aesthetics into the software environment to create visually compelling and intuitive interfaces."
    },
    {
      slug: "music",
      tone: "music",
      title: "Music",
      text:
        "Translating emotions and invisible moods into sound. It is a process of taking the unspoken feelings we experience in life and arranging them into a sonic space."
    },
    {
      slug: "research",
      tone: "research",
      title: "Research",
      text:
        "Exploring the intersection of biological systems and computer science. My research interests span across neuroscience, stem cells, and genetics. By leveraging bioinformatics, my focus is on decoding the complex patterns of neural cells and biological data, analyzing the fundamental mechanics of living systems."
    }
  ];

  function getPartialUrl(file) {
    if (!base || base === ".") {
      return `assets/partials/${file}?v=${assetVersion}`;
    }

    const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${normalized}/assets/partials/${file}?v=${assetVersion}`;
  }

  async function injectPartial(selector, file) {
    const slot = document.querySelector(selector);
    if (!slot) {
      return;
    }

    try {
      const response = await fetch(getPartialUrl(file));
      if (!response.ok) {
        throw new Error(`${file} fetch failed: ${response.status}`);
      }
      slot.innerHTML = await response.text();
    } catch (error) {
      console.error("Partial load failed", error);
    }
  }

  function renderProjects() {
    const stack = document.getElementById("project-stack");
    const template = document.getElementById("project-card-template");

    if (!stack || !template) {
      return;
    }

    stack.innerHTML = "";
    delete stack.dataset.stackReady;

    projects.forEach((project, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".project-stack-card");
      const title = fragment.querySelector(".project-stack-card__title");
      const description = fragment.querySelector(".project-stack-card__body");
      const icon = fragment.querySelector(".project-stack-card__icon");
      const media = fragment.querySelector(".project-stack-card__media");
      const image = fragment.querySelector(".project-stack-card__image");
      const categories = fragment.querySelector(".project-stack-card__categories");
      const actions = fragment.querySelector(".project-stack-card__actions");
      const button = fragment.querySelector(".project-stack-card__button");

      if (card) {
        card.dataset.index = String(index);
        card.dataset.slug = project.slug;
        card.classList.add(`project-stack-card--${project.slug}`);
        if (project.image) {
          card.classList.add("has-media");
        }
        if (project.icon) {
          card.classList.add("has-icon");
        }
      }

      if (title) title.textContent = project.title;
      if (description) description.textContent = project.description;

      if (icon) {
        if (project.icon) {
          icon.hidden = false;
          icon.src = project.icon;
          icon.alt = `${project.title} icon`;
        } else {
          icon.remove();
        }
      }

      if (media && image) {
        if (project.image) {
          media.hidden = false;
          image.src = project.image;
          image.alt = `${project.title} project preview`;
        } else {
          media.remove();
        }
      }

      if (categories) {
        if (project.categories?.length) {
          categories.hidden = false;
          project.categories.forEach((category) => {
            const pill = document.createElement("span");
            pill.className = "discipline-pill project-category-pill";

            const label = document.createElement("span");
            label.className = "discipline-pill__label";
            label.textContent = category;

            pill.appendChild(label);
            categories.appendChild(pill);
          });
        } else {
          categories.remove();
        }
      }

      if (actions && button) {
        if (project.url) {
          actions.hidden = false;
          button.href = project.url;
          button.setAttribute("aria-label", `Open ${project.title}`);
        } else {
          actions.remove();
        }
      }

      stack.appendChild(fragment);
    });
  }

  function renderDisciplines() {
    const stack = document.getElementById("discipline-stack");
    const template = document.getElementById("discipline-card-template");

    if (!stack || !template) {
      return;
    }

    stack.innerHTML = "";
    delete stack.dataset.stackReady;

    disciplines.forEach((discipline, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".discipline-stack-card");
      const title = fragment.querySelector(".discipline-stack-card__title");
      const bodyText = fragment.querySelector(".discipline-stack-card__body");
      const arsenal = fragment.querySelector(".discipline-stack-card__arsenal");

      if (card) {
        card.dataset.index = String(index);
        card.dataset.slug = discipline.slug;
        card.dataset.tone = discipline.tone;
        card.classList.add(`discipline-stack-card--${discipline.slug}`);
      }

      if (title) title.textContent = discipline.title;
      if (bodyText) bodyText.textContent = discipline.text;

      if (arsenal) {
        if (discipline.arsenal?.length) {
          arsenal.hidden = false;
          arsenal.dataset.arsenalKind = discipline.arsenalKind || "";

          discipline.arsenal.forEach((item) => {
            const pill = document.createElement("span");
            pill.className = "discipline-pill";
            if (item.label) {
              pill.classList.add(`discipline-pill--${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
            }

            const icon = document.createElement("span");
            icon.className = "discipline-pill__icon";
            icon.setAttribute("aria-hidden", "true");

            if (item.iconUrl) {
              const image = document.createElement("img");
              image.src = item.iconUrl;
              image.alt = "";
              image.loading = "lazy";
              image.decoding = "async";
              image.referrerPolicy = "no-referrer";
              image.draggable = false;
              icon.appendChild(image);
            } else if (item.iconSvg) {
              icon.innerHTML = item.iconSvg;
            }

            const label = document.createElement("span");
            label.className = "discipline-pill__label";
            label.textContent = item.label;

            pill.append(icon, label);
            arsenal.appendChild(pill);
          });
        } else {
          arsenal.remove();
        }
      }

      stack.appendChild(fragment);
    });
  }

  function initYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = year;
    });
  }

  function getScrollTop() {
    const scrollEl = document.scrollingElement || document.documentElement || document.body;
    return Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      scrollEl?.scrollTop || 0
    );
  }

  function createSettledScheduler(callback) {
    const timers = [];

    const clear = () => {
      while (timers.length) {
        window.clearTimeout(timers.pop());
      }
    };

    const schedule = (baseDelay = 0, beforeSchedule) => {
      clear();
      beforeSchedule?.();

      SETTLE_PASS_DELAYS.forEach((offset) => {
        timers.push(window.setTimeout(callback, baseDelay + offset));
      });
    };

    return { clear, schedule };
  }

  function getNavOffset(){
    const nav = document.querySelector('.nav');
    if (!nav) return 24;

    const row = nav.querySelector('.row');
    const rect = row ? row.getBoundingClientRect() : nav.getBoundingClientRect();
    return Math.ceil(rect.bottom + 18);
  }

  function isPortraitMobile(){
    return window.matchMedia('(max-width:900px) and (orientation:portrait)').matches;
  }

  function isNavMenuOpen(nav){
    return !!nav?.classList.contains('nav--open');
  }

  function isPortraitMenuActive(nav){
    return isPortraitMobile() && isNavMenuOpen(nav);
  }

  function clearPortraitMenuLayoutVars(){
    const root = document.documentElement;
    root.style.removeProperty('--menu-blur-top');
    root.style.removeProperty('--menu-blur-height');
    root.style.removeProperty('--mobile-row-inline');
    root.style.removeProperty('--mobile-menu-inline');
    root.style.removeProperty('--mobile-menu-top');
    root.style.removeProperty('--mobile-brand-shift-x');
    root.style.removeProperty('--mobile-brand-shift-y');
    root.style.removeProperty('--mobile-wordmark-font-size');
    root.style.removeProperty('--mobile-wordmark-right');
    root.style.removeProperty('--mobile-wordmark-bottom');
  }

  function syncPortraitMenuBlurViewport(){
    const root = document.documentElement;
    if (!isPortraitMobile()) return null;

    const vv = window.visualViewport;
    const scrollTop = Math.round(window.scrollY || window.pageYOffset || 0);
    const viewportTop = Math.round(vv?.offsetTop ?? 0);
    const viewportHeight = Math.round(vv?.height ?? window.innerHeight);
    const viewportWidth = Math.round(vv?.width ?? window.innerWidth);
    const viewportBottom = viewportTop + viewportHeight;

    root.style.setProperty('--menu-blur-top', `${scrollTop + viewportTop}px`);
    root.style.setProperty('--menu-blur-height', `${Math.max(0, viewportHeight)}px`);

    return { viewportHeight, viewportWidth, viewportBottom };
  }

  function syncPortraitMobileMenuLayout(nav){
    const root = document.documentElement;
    if (!nav || !isPortraitMobile()){
      clearPortraitMenuLayoutVars();
      return;
    }

    const viewport = syncPortraitMenuBlurViewport();
    if (!viewport) return;
    const { viewportHeight, viewportWidth, viewportBottom } = viewport;

    const menuInline = Math.round(Math.min(Math.max(viewportWidth * 0.084, 36), 46));
    root.style.setProperty('--mobile-menu-inline', `${menuInline}px`);

    const row = nav.querySelector('.row');
    const rowRect = row ? row.getBoundingClientRect() : null;
    const compositionLift = rowRect
      ? Math.round(Math.min(Math.max(rowRect.height * 0.15, 6), 8))
      : 0;
    const sheetContent = nav.querySelector('.sheet-content');
    if (rowRect && sheetContent){
      const sheetContentRect = sheetContent.getBoundingClientRect();
      const menuGap = Math.round(Math.min(Math.max(viewportHeight * 0.154, 92), 126));
      const menuTop = Math.round(Math.max(72, rowRect.bottom + menuGap - sheetContentRect.top) - compositionLift);
      root.style.setProperty('--mobile-menu-top', `${menuTop}px`);
    }

    const shouldAlignBrand = isNavMenuOpen(nav);

    if (shouldAlignBrand){
      const brand = nav.querySelector('.brand');
      const logo = nav.querySelector('.brand-logo');
      const firstLink = nav.querySelector('.mobile-menu a');
      if (brand && firstLink && rowRect){
        const logoRect = (logo || brand).getBoundingClientRect();
        const firstLinkRect = firstLink.getBoundingClientRect();
        const gapAbove = Math.round(Math.min(Math.max(viewportHeight * 0.01, 4), 8));
        const alignedTop = firstLinkRect.top - logoRect.height - gapAbove;
        const minLogoTop = Math.round(rowRect.top + 6);
        const targetTop = Math.max(alignedTop, minLogoTop) - compositionLift;
        const visualLeftInset = logoRect.width * (115 / 512);
        const shiftX = Math.round(firstLinkRect.left - (logoRect.left + visualLeftInset));
        const shiftY = Math.round(targetTop - logoRect.top);

        root.style.setProperty('--mobile-brand-shift-x', `${shiftX}px`);
        root.style.setProperty('--mobile-brand-shift-y', `${shiftY}px`);
      }
    } else {
      root.style.removeProperty('--mobile-brand-shift-x');
      root.style.removeProperty('--mobile-brand-shift-y');
    }

    const wordmark = document.querySelector('.mobile-menu-wordmark');
    if (!wordmark) return;

    const baseRight = Math.round(Math.min(Math.max(viewportWidth * 0.03, 14), 24));
    const baseBottom = Math.round(Math.min(Math.max(viewportHeight * 0.12, 76), 108));
    let fontSize = Math.round(Math.min(Math.max(viewportHeight * 0.108, 88), 124));

    root.style.setProperty('--mobile-wordmark-right', `${baseRight}px`);
    root.style.setProperty('--mobile-wordmark-bottom', `${baseBottom}px`);
    root.style.setProperty('--mobile-wordmark-font-size', `${fontSize}px`);

    let wordmarkRect = wordmark.getBoundingClientRect();
    if (wordmarkRect.height > 0){
      const desiredHeight = viewportHeight * 0.72;
      fontSize = Math.round(Math.min(Math.max(fontSize * (desiredHeight / wordmarkRect.height), 92), 144));
      root.style.setProperty('--mobile-wordmark-font-size', `${fontSize}px`);

      wordmarkRect = wordmark.getBoundingClientRect();
      const overflowBottom = Math.max(0, wordmarkRect.bottom - (viewportBottom - 18));
      const overflowRight = Math.max(0, wordmarkRect.right - (viewportWidth - 12));
      const correctedBottom = baseBottom + Math.ceil(overflowBottom) + 4;
      const correctedRight = baseRight + Math.ceil(overflowRight);

      root.style.setProperty('--mobile-wordmark-bottom', `${correctedBottom}px`);
      root.style.setProperty('--mobile-wordmark-right', `${correctedRight}px`);
    }
  }

  function clearTransientMobileMenuState(nav){
    if (isNavMenuOpen(nav)) return;
    const sheet = nav?.querySelector('#mobile-sheet');
    nav?.classList.remove('nav--opening');
    body.classList.remove('nav-menu-open');
    body.classList.remove('nav-menu-closing');
    body.classList.remove('no-scroll');
    if (sheet){
      sheet.setAttribute('aria-hidden', 'true');
      sheet.setAttribute('inert', '');
      sheet.hidden = true;
    }
    clearPortraitMenuLayoutVars();
  }

  function setNavOpenState(nav, open){
    const toggle = nav?.querySelector('.nav-toggle');
    const sheet  = nav?.querySelector('#mobile-sheet');

    if (!nav || !toggle) return;

    window.clearTimeout(setNavOpenState._stateTimer);

    if (open){
      if (sheet){
        sheet.hidden = false;
        sheet.removeAttribute('inert');
        sheet.setAttribute('aria-hidden', 'false');
      }
      nav.classList.add('nav--open');
      nav.classList.add('nav--opening');
      body.classList.remove('nav-menu-closing');

      requestAnimationFrame(() => {
        syncPortraitMobileMenuLayout(nav);
        body.classList.add('nav-menu-open');
        body.classList.add('no-scroll');
        requestAnimationFrame(() => {
          nav.classList.remove('nav--opening');
        });
      });
    } else {
      nav.classList.remove('nav--open');
      nav.classList.remove('nav--opening');
      body.classList.remove('nav-menu-open');
      body.classList.add('nav-menu-closing');
      body.classList.remove('no-scroll');
      if (sheet){
        sheet.setAttribute('aria-hidden', 'true');
        sheet.setAttribute('inert', '');
      }
    }

    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    setNavOpenState._stateTimer = window.setTimeout(() => {
      if (!open) {
        clearTransientMobileMenuState(nav);
      }
    }, open ? 0 : 360);
  }

  function closeMobileNav(){
    const nav = document.querySelector('.nav');
    if (!nav) return;
    setNavOpenState(nav, false);
  }

  function syncMobileNavState(){
    const nav = document.querySelector('.nav');
    if (!nav) return;

    if (!isPortraitMobile() && isNavMenuOpen(nav)){
      setNavOpenState(nav, false);
      return;
    }

    if (!isPortraitMenuActive(nav)){
      clearTransientMobileMenuState(nav);
      return;
    }

    syncPortraitMobileMenuLayout(nav);
  }

  function initMobileMenuDelays(){
    const items = Array.from(document.querySelectorAll('.mobile-menu li'));
    if (!items.length) return;

    const fallbackDelays = [0.00, 0.04, 0.08, 0.12, 0.16, 0.20, 0.25, 0.31];

    items.forEach((item, index) => {
      const existing = item.style.getPropertyValue('--menu-delay').trim();
      if (existing) return;
      const delay = fallbackDelays[index] ?? (0.31 + (index - fallbackDelays.length + 1) * 0.06);
      item.style.setProperty('--menu-delay', `${delay}s`);
    });
  }

 function initNavBackdrop(){
   if (document.body.dataset.backdropInit === '1') return;
   document.body.dataset.backdropInit = '1';

   let backdrop = document.querySelector('.nav-backdrop');
   let last = null;
   let ticking = false;

   const getScrolled = () => {
     return getScrollTop() > 4;
   };

   const resetBackdropState = () => {
     if (!backdrop) backdrop = document.querySelector('.nav-backdrop');
     backdrop?.classList.remove('is-visible');
     document.body.classList.remove('nav--scrolled');
     last = null;
   };

   const compute = () => {
     ticking = false;
     const scrolled = getScrolled();

     if (scrolled !== last){
       if (!backdrop) backdrop = document.querySelector('.nav-backdrop');
       if (backdrop) backdrop.classList.toggle('is-visible', scrolled);

       document.body.classList.toggle('nav--scrolled', scrolled);
       last = scrolled;
     }
   };

   const onChange = () => {
     if (ticking) return;
     ticking = true;
     requestAnimationFrame(compute);
   };

   const settledChange = createSettledScheduler(onChange);
   const scheduleSettledChange = (baseDelay = 0) => {
     settledChange.schedule(baseDelay, resetBackdropState);
   };

   compute();
   window.addEventListener('scroll', onChange, { passive:true });
   window.addEventListener('resize', () => scheduleSettledChange(80));
   window.addEventListener('orientationchange', () => scheduleSettledChange(140));
   window.addEventListener('pageshow', () => scheduleSettledChange(80));
   if (window.visualViewport){
     window.visualViewport.addEventListener('resize', () => scheduleSettledChange(100));
     window.visualViewport.addEventListener('scroll', () => scheduleSettledChange(100));
   }
 }

  function initMenuThumb(){
    const menu = document.querySelector('ul.menu');
    if (!menu) return;

    if (menu.dataset.thumbInit === '1') return;
    menu.dataset.thumbInit = '1';

    const allLinks = [...menu.querySelectorAll('a')];
    const links = allLinks.filter(a => a.matches('[data-nav-link]'));
    if (!links.length) return;

    const normHash = (h) => {
      if (!h || h === '#hero') return '';
      return h;
    };

    allLinks.forEach(a => a.classList.remove('is-current'));

    const currentHash = normHash(location.hash);
    let current = null;

    for (const a of links){
      const href = normHash(a.getAttribute('href'));
      if (href === currentHash){
        current = a;
        break;
      }
    }

    if (!current) current = links[0];
    if (current) current.classList.add('is-current');

    const setThumbTo = (a, show = true) => {
      if (!a){
        menu.style.setProperty('--menu-thumb-o', '0');
        return;
      }

      const mr = menu.getBoundingClientRect();
      const r  = a.getBoundingClientRect();
      const ms = getComputedStyle(menu);

      const padStr = ms.getPropertyValue('--menu-thumb-pad').trim();
      const padNum = parseFloat(padStr);
      const pad = Number.isFinite(padNum) ? padNum : 10;

      const borderLeftNum = parseFloat(ms.borderLeftWidth);
      const borderLeft = Number.isFinite(borderLeftNum) ? borderLeftNum : 0;

      const x  = (r.left - mr.left) - borderLeft - pad;
      const w  = r.width + pad * 2;

      menu.style.setProperty('--menu-thumb-x', `${x}px`);
      menu.style.setProperty('--menu-thumb-w', `${w}px`);
      menu.style.setProperty('--menu-thumb-o', show ? '1' : '0');
    };

    const setTargetClass = (targetEl) => {
      for (const a of allLinks) a.classList.remove('is-target');
      if (targetEl) targetEl.classList.add('is-target');
    };

    const snapToCurrent = () => {
      const cur = menu.querySelector('a.is-current');
      if (cur){
        setThumbTo(cur, true);
        setTargetClass(cur);
      }else{
        setThumbTo(null, false);
        setTargetClass(null);
      }
    };

    menu.classList.add('thumb-init');
    snapToCurrent();
    requestAnimationFrame(() => menu.classList.remove('thumb-init'));

    const realign = () => {
      if (menu.dataset.thumbHovering) return;
      snapToCurrent();
    };

    window.addEventListener('resize', realign);
    window.addEventListener('orientationchange', realign);
    window.addEventListener('modelized:navcurrentchange', realign);
    if (document.fonts?.ready) document.fonts.ready.then(realign);

    if (typeof ResizeObserver !== 'undefined'){
      const ro = new ResizeObserver(realign);
      ro.observe(menu);
    }

    let raf = 0;
    let target = menu.querySelector('a.is-current') || links[0];
    let leaveTimer = 0;

    const isHoverPointer = (e) => {
      return e && (e.pointerType === 'mouse' || e.pointerType === 'pen');
    };

    const nearestLinkByX = (clientX) => {
      let best = links[0];
      let bestD = Infinity;
      for (const a of links){
        const r = a.getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        const d = Math.abs(clientX - cx);
        if (d < bestD){ bestD = d; best = a; }
      }
      return best;
    };

    const tick = () => {
      raf = 0;
      setThumbTo(target, true);
      setTargetClass(target);
    };

    const cancelLeave = () => {
      if (leaveTimer){
        clearTimeout(leaveTimer);
        leaveTimer = 0;
      }
    };

    const scheduleLeave = () => {
      cancelLeave();
      leaveTimer = setTimeout(() => {
        delete menu.dataset.thumbHovering;
        snapToCurrent();
      }, 180);
    };

    menu.addEventListener('pointerenter', (e) => {
      if (!isHoverPointer(e)) return;
      cancelLeave();
      menu.dataset.thumbHovering = '1';
    });

    menu.addEventListener('pointermove', (e) => {
      if (!isHoverPointer(e)) return;
      cancelLeave();
      menu.dataset.thumbHovering = '1';

      const next = nearestLinkByX(e.clientX);
      if (next !== target) target = next;
      if (!raf) raf = requestAnimationFrame(tick);
    });

    menu.addEventListener('pointerleave', (e) => {
      if (!isHoverPointer(e)){
        delete menu.dataset.thumbHovering;
        snapToCurrent();
        return;
      }
      scheduleLeave();
    });

    if (!('PointerEvent' in window)){
      menu.addEventListener('mousemove', (e) => {
        menu.dataset.thumbHovering = '1';
        const next = nearestLinkByX(e.clientX);
        if (next !== target) target = next;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      menu.addEventListener('mouseleave', () => {
        delete menu.dataset.thumbHovering;
        snapToCurrent();
      });
    }
  }

  function scrollToTarget(hash) {
    if (!hash || hash === "#") {
      return null;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return null;
    }

    if (hash === '#hero'){
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      return 0;
    }

    const destination = Math.max(0, target.getBoundingClientRect().top + window.scrollY - getNavOffset());

    window.scrollTo({
      top: destination,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });

    return destination;
  }

  function initAnchorScroll(){
    document.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      scrollToTarget(hash);

      const nav = document.querySelector('.nav');
      if (nav?.classList.contains('nav--open')){
        closeMobileNav();
      }
    });
  }

  function initNav(){
    const nav    = document.querySelector('.nav');
    const toggle = document.querySelector('.nav-toggle');
    const sheet  = document.getElementById('mobile-sheet');

    if (toggle && sheet && nav){
      toggle.addEventListener('click', () => {
        const open = !nav.classList.contains('nav--open');
        setNavOpenState(nav, open);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('nav--open')){
          setNavOpenState(nav, false);
        }
      });

      window.addEventListener('resize', syncMobileNavState);
      window.addEventListener('orientationchange', syncMobileNavState);
      window.addEventListener('pageshow', syncMobileNavState);
      if (window.visualViewport){
        let viewportSyncRaf = 0;
        const syncViewportLayout = () => {
          if (!isPortraitMenuActive(nav) || !nav.classList.contains('nav--opening')) return;
          if (viewportSyncRaf) return;
          viewportSyncRaf = requestAnimationFrame(() => {
            viewportSyncRaf = 0;
            syncPortraitMenuBlurViewport();
          });
        };
        window.visualViewport.addEventListener('resize', syncViewportLayout);
        window.visualViewport.addEventListener('scroll', syncViewportLayout);
      }
    }

    const brand = document.querySelector('.brand');
    const logo  = document.querySelector('.brand-logo');

    function update(){
      if (brand && logo && logo.naturalWidth > 0){
        brand.classList.add('has-logo');
      }
    }

    if (logo){
      if (logo.complete) update();
      logo.addEventListener('load',  update);
      logo.addEventListener('error', () => {
        if (brand) brand.classList.remove('has-logo');
      });
    }

   initMenuThumb();
   initMobileMenuDelays();
   initNavBackdrop();
   syncMobileNavState();
  }

  function initSectionSpy() {
    const links = Array.from(document.querySelectorAll("[data-nav-link]"));
    if (!links.length) {
      return;
    }

    const map = new Map();
    links.forEach((link) => {
      const hash = link.getAttribute("href");
      if (!hash || !hash.startsWith("#")) {
        return;
      }
      const section = document.querySelector(hash);
      if (section) {
        const group = map.get(section) || [];
        group.push(link);
        map.set(section, group);
      }
    });

    const setActive = (targetLinks) => {
      links.forEach((item) => {
        item.classList.remove("is-active");
        item.classList.remove("is-current");
      });
      if (!targetLinks) {
        window.dispatchEvent(new Event('modelized:navcurrentchange'));
        return;
      }

      targetLinks.forEach((item) => {
        item.classList.add("is-active");
        item.classList.add("is-current");
      });
      window.dispatchEvent(new Event('modelized:navcurrentchange'));
    };

    const firstLinkForHash = (hash) => {
      if (!hash) {
        return links[0];
      }
      return links.find((item) => item.getAttribute("href") === hash) || links[0];
    };

    const setActiveByHash = (hash) => {
      if (!hash) {
        const homeLinks = links.filter((item) => item.getAttribute("href") === "#hero");
        setActive(homeLinks.length ? homeLinks : [links[0]]);
        return;
      }
      const matching = links.filter((item) => item.getAttribute("href") === hash);
      setActive(matching.length ? matching : [firstLinkForHash(hash)]);
    };

    const homeSection = document.querySelector("#hero");
    let lockedHash = "";
    let lockTimer = 0;

    const clearScrollLock = () => {
      if (lockTimer) {
        clearTimeout(lockTimer);
        lockTimer = 0;
      }
      lockedHash = "";
    };

    const releaseScrollLock = () => {
      clearScrollLock();
      syncFromViewport();
    };

    const scheduleScrollLockRelease = (delay = 140) => {
      if (!lockedHash) return;
      if (lockTimer) {
        clearTimeout(lockTimer);
      }
      lockTimer = window.setTimeout(releaseScrollLock, delay);
    };

    setActiveByHash(location.hash);

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const sectionRatios = new Map();
    map.forEach((_link, section) => sectionRatios.set(section, 0));

    const syncFromViewport = () => {
      if (lockedHash) {
        setActiveByHash(lockedHash);
        return;
      }

      const viewportFocus = window.innerHeight * 0.45;
      let currentSection = null;
      let bestScore = -Infinity;

      sectionRatios.forEach((ratio, section) => {
        if (ratio <= 0) {
          return;
        }

        const rect = section.getBoundingClientRect();
        const center = rect.top + rect.height * 0.5;
        const distance = Math.abs(center - viewportFocus);
        const score = ratio * 1000 - distance;

        if (score > bestScore) {
          bestScore = score;
          currentSection = section;
        }
      });

      if (!currentSection && window.scrollY <= getNavOffset() + 12 && homeSection) {
        currentSection = homeSection;
      }

      if (!currentSection) {
        return;
      }

      const currentHash = currentSection.id ? `#${currentSection.id}` : "";
      setActiveByHash(currentHash);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionRatios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        syncFromViewport();
      },
      {
        rootMargin: "-32% 0px -48% 0px",
        threshold: [0, 0.2, 0.45, 0.7]
      }
    );

    map.forEach((_link, section) => observer.observe(section));
    requestAnimationFrame(syncFromViewport);

    links.forEach((link) => {
      link.addEventListener('click', () => {
        const nextHash = link.getAttribute('href');
        if (!nextHash || !nextHash.startsWith('#')) return;

        clearScrollLock();
        lockedHash = nextHash;
        setActiveByHash(lockedHash);
        scheduleScrollLockRelease(prefersReducedMotion ? 0 : 180);
      });
    });

    window.addEventListener('scroll', () => {
      scheduleScrollLockRelease(140);
    }, { passive: true });

    window.addEventListener('orientationchange', clearScrollLock);
    window.addEventListener('resize', releaseScrollLock);
  }

  function applyRevealStagger() {
    const sections = Array.from(document.querySelectorAll(".section"));

    sections.forEach((section) => {
      const revealItems = Array.from(section.querySelectorAll("[data-reveal]"));

      revealItems.forEach((element, index) => {
        const rawDelay = Number(element.getAttribute("data-reveal-delay"));
        const delay = Number.isFinite(rawDelay) ? rawDelay : Math.min(index * 95, 520);

        element.style.setProperty("--reveal-delay", `${delay}ms`);
        element.style.setProperty("--reveal-distance", index === 0 ? "16px" : "24px");
      });
    });
  }

  function initReveal() {
    const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!revealElements.length) {
      return;
    }

    applyRevealStagger();
    revealElements.forEach((element) => element.classList.add("reveal"));

    const heroRevealElements = revealElements.filter((element) => element.closest("#hero"));
    const shouldPrewarmHero = () => {
      return getScrollTop() > Math.max(64, window.innerHeight * 0.16);
    };
    const settleHeroReveal = (observer) => {
      if (!shouldPrewarmHero()) {
        return;
      }

      heroRevealElements.forEach((element) => {
        element.classList.add("is-visible");
        observer?.unobserve?.(element);
      });
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      settleHeroReveal();
      return;
    }

    const revealElement = (element, observer) => {
      if (element.classList.contains("is-visible")) {
        return;
      }
      element.classList.add("is-visible");
      observer?.unobserve?.(element);
    };

    const inView = (element) => {
      const rect = element.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          revealElement(entry.target, obs);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -1% 0px",
        threshold: 0
      }
    );

    revealElements.forEach((element) => observer.observe(element));
    const revealVisibleNow = () => {
      revealElements.forEach((element) => {
        if (!element.classList.contains("is-visible") && inView(element)) {
          revealElement(element, observer);
        }
      });
    };
    requestAnimationFrame(revealVisibleNow);
    settleHeroReveal(observer);
    requestAnimationFrame(() => settleHeroReveal(observer));
    window.setTimeout(() => {
      settleHeroReveal(observer);
      revealVisibleNow();
    }, 120);
    window.addEventListener("resize", revealVisibleNow);
    window.addEventListener("pageshow", () => {
      settleHeroReveal(observer);
      revealVisibleNow();
    });
  }

  function initHeroIntro() {
    if (prefersReducedMotion) {
      body.classList.add("hero-ready");
      return;
    }

    const applyReady = () => {
      requestAnimationFrame(() => {
        body.classList.add("hero-ready");
      });
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(applyReady).catch(applyReady);
      return;
    }

    applyReady();
  }

  async function initHeroTitle() {
    const title = document.querySelector('.hero-title');
    if (!title) {
      return;
    }

    const sourceText = (title.dataset.heroText || title.getAttribute('aria-label') || title.textContent || "").trim();
    if (!sourceText) {
      return;
    }

    title.dataset.heroText = sourceText;
    title.classList.add('hero-title--pending');
    const words = sourceText.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return;
    }

    const renderLines = (lines) => {
      title.textContent = "";

      lines.forEach((line, index) => {
        const row = document.createElement("span");
        row.className = "hero-line";
        row.style.setProperty("--line-index", String(index));

        const stack = document.createElement("span");
        stack.className = "hero-stack";

        const outline = document.createElement("span");
        outline.className = "hero-text hero-text--outline";
        outline.textContent = line;

        const fill = document.createElement("span");
        fill.className = "hero-text hero-text--fill";
        fill.textContent = line;
        fill.setAttribute("aria-hidden", "true");

        const glow = document.createElement("span");
        glow.className = "hero-text hero-text--glow";
        glow.textContent = line;
        glow.setAttribute("aria-hidden", "true");

        stack.append(outline, fill, glow);
        row.append(stack);
        title.appendChild(row);
      });
    };

    const getMeasureWidth = () => {
      const parent = title.parentElement || title;
      const parentWidth = Math.max(1, Math.round(parent.getBoundingClientRect().width));
      const styles = getComputedStyle(title);
      const maxWidthValue = styles.maxWidth;
      const maxWidth = maxWidthValue && maxWidthValue !== "none"
        ? Math.max(1, Math.round(parseFloat(maxWidthValue)))
        : parentWidth;

      return Math.max(1, Math.min(parentWidth, maxWidth));
    };

    const measureLines = (width) => {
      const measure = document.createElement("span");
      measure.className = "hero-title hero-title--measure";
      measure.setAttribute("aria-hidden", "true");
      measure.style.width = `${width}px`;

      words.forEach((word, index) => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "hero-word";
        wordSpan.textContent = `${word}${index < words.length - 1 ? " " : ""}`;
        measure.appendChild(wordSpan);
      });

      (title.parentElement || document.body).appendChild(measure);

      const groups = [];
      let lastTop = null;

      measure.querySelectorAll(".hero-word").forEach((wordSpan) => {
        const token = wordSpan.textContent.trim();
        if (!token) return;

        const top = wordSpan.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
          groups.push([]);
          lastTop = top;
        }
        groups[groups.length - 1].push(token);
      });

      measure.remove();
      return groups.map((group) => group.join(" "));
    };

    let frame = 0;
    const cancelPendingBuild = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const runBuild = () => new Promise((resolve) => {
      const width = getMeasureWidth();

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const lines = measureLines(width);
        const signature = `${width}:${lines.join("|")}`;

        if (!signature) {
          title.textContent = sourceText;
          title.classList.remove('hero-title--pending');
          resolve();
          return;
        }

        if (signature === title.dataset.lineSignature && title.querySelector(".hero-line")) {
          title.classList.add('hero-title--built');
          title.classList.remove('hero-title--pending');
          resolve();
          return;
        }

        title.dataset.lineSignature = signature;
        renderLines(lines);
        title.classList.add('hero-title--built');
        title.classList.remove('hero-title--pending');
        resolve();
      });
    });

    const settledBuild = createSettledScheduler(runBuild);
    const scheduleSettledBuild = (baseDelay = 0) => {
      settledBuild.schedule(baseDelay, cancelPendingBuild);
    };

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (_error) {
        // Continue with current metrics if font readiness fails.
      }
    }

    await runBuild();

    if ("ResizeObserver" in window) {
      const resizeTarget = title.parentElement || title;
      const observer = new ResizeObserver(() => {
        scheduleSettledBuild(80);
      });
      observer.observe(resizeTarget);
      observer.observe(title);
    }

    window.addEventListener("resize", () => {
      scheduleSettledBuild(120);
    });
    window.addEventListener("orientationchange", () => {
      scheduleSettledBuild(180);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        scheduleSettledBuild(140);
      });
    }
  }

  const rockSaltCanvas = document.createElement("canvas");
  const rockSaltContext = rockSaltCanvas.getContext("2d");

  function applyRockSaltSafeArea(element, safe) {
    element.style.setProperty("--script-safe-top", `${safe.top}px`);
    element.style.setProperty("--script-safe-right", `${safe.right}px`);
    element.style.setProperty("--script-safe-bottom", `${safe.bottom}px`);
    element.style.setProperty("--script-safe-left", `${safe.left}px`);
    element.style.setProperty("--script-safe-top-neg", `${-safe.top}px`);
    element.style.setProperty("--script-safe-right-neg", `${-safe.right}px`);
    element.style.setProperty("--script-safe-bottom-neg", `${-safe.bottom}px`);
    element.style.setProperty("--script-safe-left-neg", `${-safe.left}px`);
  }

  function measureRockSaltSafeArea(element) {
    if (!rockSaltContext) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const computed = getComputedStyle(element);
    const text = (element.textContent || "").trim().toUpperCase();
    if (!text) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeightValue = parseFloat(computed.lineHeight);
    const lineHeight = Number.isFinite(lineHeightValue) ? lineHeightValue : fontSize;

    rockSaltContext.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;

    const metrics = rockSaltContext.measureText(text);
    const advanceWidth = metrics.width || 0;
    const bboxRight = metrics.actualBoundingBoxRight || advanceWidth;
    const bboxLeft = metrics.actualBoundingBoxLeft || 0;
    const bboxHeight = (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2);
    const extraHeight = Math.max(0, bboxHeight - lineHeight);
    const ascentRatio = bboxHeight > 0 ? (metrics.actualBoundingBoxAscent || bboxHeight * 0.8) / bboxHeight : 0.8;

    return {
      top: Math.max(1, Math.ceil(extraHeight * ascentRatio + 1)),
      right: Math.max(1, Math.ceil(Math.max(0, bboxRight - advanceWidth) + 1)),
      bottom: Math.max(1, Math.ceil(extraHeight * (1 - ascentRatio) + 1)),
      left: Math.max(1, Math.ceil(bboxLeft + 1))
    };
  }

  function syncRockSaltSafeAreas(scope = document) {
    const elements = Array.from(scope.querySelectorAll?.(".tagline-script") || []);
    elements.forEach((element) => {
      applyRockSaltSafeArea(element, measureRockSaltSafeArea(element));
    });
  }

  function initRockSaltSafeAreas() {
    const syncAll = () => syncRockSaltSafeAreas(document);
    const settledSync = createSettledScheduler(syncAll);

    syncAll();

    if (document.fonts?.ready) {
      document.fonts.ready.then(syncAll).catch(syncAll);
    }

    window.addEventListener("resize", () => {
      settledSync.schedule(90);
    });
    window.addEventListener("orientationchange", () => {
      settledSync.schedule(140);
    });
    window.addEventListener("pageshow", () => {
      settledSync.schedule(80);
    });
  }

  function initAboutCreator() {
    const title = document.querySelector(".about-creator-title");
    if (!title) {
      return;
    }

    const prefix = title.querySelector(".about-creator-prefix");
    const suffix = title.querySelector(".about-creator-suffix");
    const viewport = title.querySelector(".about-creator-viewport");
    const track = title.querySelector(".about-creator-track");
    const words = Array.from(title.querySelectorAll(".about-creator-word"));
    const glyphs = words.map((word) => word.querySelector(".about-creator-glyph"));
    if (!prefix || !suffix || !viewport || !track || !words.length || glyphs.some((glyph) => !glyph)) {
      return;
    }

    const finalIndex = words.length - 1;
    const transitionDuration = 620;
    const holdDuration = 400;
    const initialHold = 280;
    let activeIndex = 0;
    let started = false;
    let metrics = { height: 0, widths: [] };
    let sequenceFrame = 0;
    let nextStepAt = 0;
    let pendingRefresh = false;
    let lastLayoutWidth = 0;
    let lastViewportWidth = 0;

    const measureLayoutWidth = () => Math.round(title.offsetWidth || title.clientWidth || title.getBoundingClientRect().width);
    const measureViewportWidth = () => Math.round(document.documentElement.clientWidth || window.innerWidth || 0);

    const setImmediateTransitions = (enabled) => {
      const value = enabled ? "none" : "";
      viewport.style.transition = value;
      track.style.transition = value;
    };

    const updateLineBreaks = (longestWidth) => {
      const availableWidth = Math.round(title.clientWidth || title.getBoundingClientRect().width || 0);
      if (!availableWidth) {
        return;
      }

      const columnGap = parseFloat(getComputedStyle(title).columnGap) || 0;
      const prefixWidth = Math.ceil(prefix.getBoundingClientRect().width);
      const suffixWidth = Math.ceil(suffix.getBoundingClientRect().width);

      const breakBeforeWord = prefixWidth + columnGap + longestWidth > availableWidth;
      const breakBeforeBehind = (breakBeforeWord
        ? longestWidth + columnGap + suffixWidth
        : prefixWidth + columnGap + longestWidth + columnGap + suffixWidth) > availableWidth;

      title.classList.toggle("about-creator-break-before-word", breakBeforeWord);
      title.classList.toggle("about-creator-break-before-behind", breakBeforeBehind);
    };

    const updateMetrics = () => {
      syncRockSaltSafeAreas(title);

      const fallbackHeight = Math.ceil((parseFloat(getComputedStyle(title).fontSize) || 16) * 1.18);
      const widths = glyphs.map((glyph) => Math.ceil(glyph.getBoundingClientRect().width));
      const height = Math.max(
        fallbackHeight,
        ...glyphs.map((glyph) => Math.ceil(glyph.getBoundingClientRect().height))
      );
      const longestWidth = Math.max(...widths);

      metrics = { height, widths };
      title.style.setProperty("--about-creator-height", `${height}px`);
      updateLineBreaks(longestWidth);
      return metrics;
    };

    const captureLayoutWidths = () => {
      lastLayoutWidth = measureLayoutWidth();
      lastViewportWidth = measureViewportWidth();
    };

    const layoutWidthChanged = () => {
      const currentTitleWidth = measureLayoutWidth();
      const currentViewportWidth = measureViewportWidth();
      const titleDelta = Math.abs(currentTitleWidth - lastLayoutWidth);
      const viewportDelta = Math.abs(currentViewportWidth - lastViewportWidth);

      return titleDelta > 2 || viewportDelta > 2;
    };

    const applyIndex = (index, { immediate = false } = {}) => {
      activeIndex = index;
      words.forEach((word, wordIndex) => {
        word.classList.toggle("is-active", wordIndex === index);
      });

      if (!metrics.height || !metrics.widths.length) {
        updateMetrics();
      }

      const width = metrics.widths[index] || metrics.widths[0] || 0;
      const shift = metrics.height * index;

      if (immediate) {
        setImmediateTransitions(true);
      }

      title.style.setProperty("--about-creator-width", `${width}px`);
      title.style.setProperty("--about-creator-shift", `${shift}px`);

      if (immediate) {
        void title.offsetHeight;
        requestAnimationFrame(() => {
          setImmediateTransitions(false);
        });
      }
    };

    const stopSequence = () => {
      window.cancelAnimationFrame(sequenceFrame);
      sequenceFrame = 0;
    };

    const tickSequence = (now) => {
      if (!started || activeIndex >= finalIndex) {
        sequenceFrame = 0;
        return;
      }

      if (!nextStepAt) {
        nextStepAt = now + initialHold;
      }

      if (now >= nextStepAt) {
        applyIndex(activeIndex + 1);
        nextStepAt = now + transitionDuration + holdDuration;

        if (activeIndex >= finalIndex) {
          if (pendingRefresh) {
            pendingRefresh = false;
            updateMetrics();
            applyIndex(finalIndex, { immediate: true });
            captureLayoutWidths();
          }
          sequenceFrame = 0;
          return;
        }
      }

      sequenceFrame = window.requestAnimationFrame(tickSequence);
    };

    const runSequence = () => {
      if (started) {
        return;
      }

      started = true;
      pendingRefresh = false;

      if (prefersReducedMotion) {
        updateMetrics();
        applyIndex(finalIndex, { immediate: true });
        captureLayoutWidths();
        return;
      }

      updateMetrics();
      applyIndex(0, { immediate: true });
      captureLayoutWidths();
      nextStepAt = 0;
      stopSequence();
      sequenceFrame = window.requestAnimationFrame(tickSequence);
    };

    const refreshLayout = () => {
      if (!layoutWidthChanged()) {
        return;
      }

      if (started && activeIndex < finalIndex) {
        pendingRefresh = true;
        return;
      }

      updateMetrics();
      applyIndex(started ? activeIndex : 0, { immediate: true });
      captureLayoutWidths();
    };

    const settledRefresh = createSettledScheduler(refreshLayout);

    updateMetrics();
    applyIndex(prefersReducedMotion ? finalIndex : 0, { immediate: true });
    captureLayoutWidths();

    if ("ResizeObserver" in window) {
      const resizeTarget = title.parentElement || title;
      const observer = new ResizeObserver(() => {
        settledRefresh.schedule(80);
      });
      observer.observe(resizeTarget);
    }

    window.addEventListener("resize", () => {
      settledRefresh.schedule(120);
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(refreshLayout).catch(refreshLayout);
    }

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      runSequence();
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          runSequence();
          obs.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -16% 0px",
        threshold: 0.36
      }
    );

    observer.observe(title);
  }

  function measureDisciplineCard(card) {
    const surface = card.querySelector(".discipline-stack-card__surface");
    const header = surface?.querySelector(".discipline-stack-card__header");
    const body = surface?.querySelector(".discipline-stack-card__body");
    const arsenal = surface?.querySelector(".discipline-stack-card__arsenal:not([hidden])");
    const styles = surface ? getComputedStyle(surface) : null;
    const gap = styles ? parseFloat(styles.rowGap || styles.gap) || 0 : 0;
    const paddingTop = styles ? parseFloat(styles.paddingTop) || 0 : 0;
    const paddingBottom = styles ? parseFloat(styles.paddingBottom) || 0 : 0;
    const parts = [header, body, arsenal].filter(Boolean);

    return Math.ceil(
      paddingTop +
      paddingBottom +
      parts.reduce((sum, part) => sum + (part.scrollHeight || part.getBoundingClientRect().height || 0), 0) +
      gap * Math.max(0, parts.length - 1)
    );
  }

  function measureProjectCard(card, { portrait }) {
    const surface = card.querySelector(".project-stack-card__surface");
    const layout = surface?.querySelector(".project-stack-card__layout");
    const content = surface?.querySelector(".project-stack-card__content");
    const media = surface?.querySelector(".project-stack-card__media:not([hidden])");

    if (!surface || !layout || !content) {
      return 0;
    }

    const surfaceStyles = getComputedStyle(surface);
    const layoutStyles = getComputedStyle(layout);
    const paddingTop = parseFloat(surfaceStyles.paddingTop) || 0;
    const paddingBottom = parseFloat(surfaceStyles.paddingBottom) || 0;
    const rowGap = parseFloat(layoutStyles.rowGap || layoutStyles.gap) || 0;
    const contentHeight = content.scrollHeight || content.getBoundingClientRect().height || 0;
    const mediaHeight = media ? Math.max(media.scrollHeight || 0, media.getBoundingClientRect().height || 0) : 0;

    if (!media) {
      return Math.ceil(paddingTop + paddingBottom + contentHeight);
    }

    if (portrait) {
      return Math.ceil(paddingTop + paddingBottom + contentHeight + rowGap + mediaHeight);
    }

    return Math.ceil(paddingTop + paddingBottom + Math.max(contentHeight, mediaHeight));
  }

  function initStackDeck({
    stackId,
    items,
    getAriaLabel,
    getBaseCardHeight,
    measureCard
  }) {
    const stack = document.getElementById(stackId);
    const shell = stack?.closest(".discipline-stack-shell");
    const stage = stack?.closest(".discipline-stack-stage");
    const cards = Array.from(stack?.querySelectorAll(".discipline-stack-card") || []);

    if (!stack || !cards.length) {
      return;
    }

    const total = cards.length;
    const portraitQuery = window.matchMedia("(max-width: 980px) and (orientation: portrait)");
    let activeIndex = 0;
    let pointerState = null;
    let metrics = null;
    let activeAnimation = null;
    let lastViewportWidth = window.innerWidth;
    let lastViewportHeight = window.innerHeight;
    let lastPortraitState = portraitQuery.matches;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const createLayout = (x, y, scale, rotate) => ({ x, y, scale, rotate });
    const getSide = (offset) => (offset === 0 ? "front" : offset < 0 ? "left" : "right");

    const buildLayouts = (cardWidth) => {
      const steps = portraitQuery.matches
        ? [
            { x: 0, scale: 1, rotate: 0 },
            { x: cardWidth * 0.228, scale: 0.872, rotate: 5.1 },
            { x: cardWidth * 0.366, scale: 0.744, rotate: 8.4 },
            { x: cardWidth * 0.462, scale: 0.63, rotate: 11.1 },
            { x: cardWidth * 0.528, scale: 0.538, rotate: 13.5 },
            { x: cardWidth * 0.586, scale: 0.476, rotate: 15.3 }
          ]
        : [
            { x: 0, scale: 1, rotate: 0 },
            { x: cardWidth * 0.238, scale: 0.886, rotate: 4.6 },
            { x: cardWidth * 0.386, scale: 0.762, rotate: 7.2 },
            { x: cardWidth * 0.486, scale: 0.654, rotate: 9.8 },
            { x: cardWidth * 0.55, scale: 0.566, rotate: 11.8 },
            { x: cardWidth * 0.604, scale: 0.502, rotate: 13.6 }
          ];

      return steps.reduce((layouts, step, depth) => {
        const base = createLayout(step.x, 0, step.scale, step.rotate);
        if (depth === 0) {
          layouts[0] = base;
          return layouts;
        }

        layouts[depth] = base;
        layouts[-depth] = createLayout(-step.x, 0, step.scale, -step.rotate);
        return layouts;
      }, {});
    };

    const formatTransform = (layout) =>
      `translate(calc(-50% + ${layout.x.toFixed(2)}px), ${layout.y.toFixed(2)}px) scale(${layout.scale.toFixed(4)}) rotate(${layout.rotate.toFixed(2)}deg)`;

    const getDepthAppearance = (offset) => {
      const depth = Math.min(Math.abs(offset), total - 1);
      const dim = [0.028, 0.11, 0.18, 0.24, 0.29, 0.34][depth] || 0.34;
      const lift = [0.026, 0.018, 0.012, 0.008, 0.004, 0.002][depth] || 0.002;
      return { dim, lift };
    };

    const getZIndex = (offset) => {
      if (offset === 0) {
        return 200;
      }

      return 200 - Math.abs(offset) * 14;
    };

    const measureMetrics = () => {
      const firstCard = cards[0];
      let maxContentHeight = 0;

      cards.forEach((card) => {
        maxContentHeight = Math.max(
          maxContentHeight,
          Math.ceil(measureCard(card, { portrait: portraitQuery.matches }) || 0)
        );
      });

      const cardWidth = firstCard?.offsetWidth || stack.clientWidth || window.innerWidth;
      const breathingRoom = Math.ceil(clamp(window.innerHeight * 0.04, 32, 56));
      const baseHeight = Math.ceil(getBaseCardHeight({ portrait: portraitQuery.matches }));
      const cardHeight = Math.ceil(Math.max(baseHeight, maxContentHeight + breathingRoom));
      const pad = Math.ceil(Math.max(18, cardHeight * 0.055));

      shell?.style.setProperty("--discipline-card-height", `${cardHeight}px`);
      stage?.style.setProperty("--discipline-stack-pad-top", `${pad}px`);
      stage?.style.setProperty("--discipline-stack-pad-bottom", `${pad}px`);

      return {
        cardWidth,
        cardHeight,
        layouts: buildLayouts(cardWidth)
      };
    };

    const getMetrics = () => {
      if (!metrics) {
        metrics = measureMetrics();
      }
      return metrics;
    };

    const getLayoutForOffset = (offset) => {
      const currentMetrics = getMetrics();
      const normalized = offset === 0 ? 0 : clamp(offset, -(total - 1), total - 1);
      return currentMetrics.layouts[normalized] || currentMetrics.layouts[0];
    };

    const cancelActiveMotion = () => {
      activeAnimation?.cancel?.();
      activeAnimation = null;
      cards.forEach((card) => {
        card.style.removeProperty("transition");
        card.getAnimations?.().forEach((animation) => animation.cancel());
      });
    };

    const syncLabels = () => {
      const active = items[activeIndex];
      stack.setAttribute("aria-label", getAriaLabel(active, activeIndex, total));
      stack.dataset.swipeEnabled = portraitQuery.matches ? "true" : "false";
      stack.removeAttribute("tabindex");
    };

    const applyState = ({ dragProgress = 0 } = {}) => {
      const isDragging = portraitQuery.matches && Math.abs(dragProgress) > 0.001;
      const dragSign = dragProgress === 0 ? 0 : Math.sign(dragProgress);
      const currentMetrics = getMetrics();
      const dragMagnitude = Math.abs(dragProgress);
      const inwardSide = dragSign === 0 ? 0 : -dragSign;
      const hasTarget =
        dragSign === 0 ||
        (dragSign < 0 ? activeIndex < total - 1 : activeIndex > 0);

      stack.classList.toggle("is-dragging", isDragging);

      cards.forEach((card, index) => {
        const offset = index - activeIndex;
        let visual = getLayoutForOffset(offset);
        let zIndex = getZIndex(offset);

        if (isDragging && hasTarget && offset === 0 && dragSign !== 0) {
          visual = createLayout(
            currentMetrics.cardWidth * 0.58 * dragMagnitude * dragSign,
            0,
            1 - dragMagnitude * 0.024,
            dragSign * 9.1 * dragMagnitude
          );
        } else if (isDragging && hasTarget && offset !== 0) {
          const side = Math.sign(offset);
          const depth = Math.min(Math.abs(offset), total - 1);
          const inwardScaleLift = [0, 0.032, 0.026, 0.02, 0.016, 0.014][depth] || 0.014;
          const outwardScaleDrop = [0, 0.022, 0.028, 0.032, 0.036, 0.04][depth] || 0.04;
          const inwardXPull = [0, 0.18, 0.15, 0.13, 0.11, 0.1][depth] || 0.1;
          const outwardXPush = [0, 0.14, 0.18, 0.22, 0.26, 0.3][depth] || 0.3;
          const inwardRotateEase = [0, 0.18, 0.14, 0.12, 0.1, 0.08][depth] || 0.08;
          const outwardRotateBoost = [0, 0.08, 0.1, 0.12, 0.14, 0.16][depth] || 0.16;

          if (side === inwardSide) {
            visual = createLayout(
              visual.x * (1 - inwardXPull * dragMagnitude),
              0,
              visual.scale + inwardScaleLift * dragMagnitude,
              visual.rotate * (1 - inwardRotateEase * dragMagnitude)
            );
            zIndex += 8 - depth;
          } else if (side === dragSign) {
            visual = createLayout(
              visual.x * (1 + outwardXPush * dragMagnitude),
              0,
              visual.scale - outwardScaleDrop * dragMagnitude,
              visual.rotate * (1 + outwardRotateBoost * dragMagnitude)
            );
            zIndex -= 5 + depth;
          }
        }

        const appearance = getDepthAppearance(offset);
        const isNeighbor = !portraitQuery.matches && Math.abs(offset) === 1;

        card.dataset.stackPos = String(offset);
        card.dataset.stackDepth = String(Math.abs(offset));
        card.dataset.stackSide = getSide(offset);
        card.classList.toggle("is-active", offset === 0);
        card.classList.toggle("is-neighbor", isNeighbor);
        card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
        card.style.zIndex = String(zIndex);
        card.style.transform = formatTransform(visual);
        card.style.setProperty("--discipline-depth-dim", appearance.dim.toFixed(3));
        card.style.setProperty("--discipline-surface-lift", appearance.lift.toFixed(3));
      });

      stack.dataset.stackReady = "true";
      syncLabels();
    };

    const animateOutgoingCard = (card, direction, startLayout) => {
      if (!card || typeof card.animate !== "function" || prefersReducedMotion) {
        return;
      }

      const currentMetrics = getMetrics();
      const throwSign = direction > 0 ? -1 : 1;
      const finalLayout = getLayoutForOffset(direction > 0 ? -1 : 1);
      const midLayout = createLayout(
        throwSign * currentMetrics.cardWidth * (portraitQuery.matches ? 0.56 : 0.52),
        0,
        0.968,
        throwSign * (portraitQuery.matches ? 12.8 : 10.4)
      );
      const tuckLayout = createLayout(
        finalLayout.x * 1.18,
        0,
        Math.min(0.982, finalLayout.scale * 1.012),
        finalLayout.rotate + throwSign * 1.35
      );

      card.style.transition = "none";
      const animation = card.animate(
        [
          { transform: formatTransform(startLayout) },
          { transform: formatTransform(midLayout), offset: 0.5 },
          { transform: formatTransform(tuckLayout), offset: 0.82 },
          { transform: formatTransform(finalLayout) }
        ],
        {
          duration: portraitQuery.matches ? 920 : 820,
          easing: "cubic-bezier(0.18, 0.86, 0.22, 1)",
          fill: "both"
        }
      );

      activeAnimation = animation;
      animation.finished.finally(() => {
        if (activeAnimation === animation) {
          activeAnimation = null;
        }
        card.style.removeProperty("transition");
      });
    };

    const rotate = (direction) => {
      if (!direction) {
        return false;
      }

      const targetIndex = clamp(activeIndex + direction, 0, total - 1);
      if (targetIndex === activeIndex) {
        applyState();
        return false;
      }

      const outgoingCard = cards[activeIndex];
      const outgoingStart = getLayoutForOffset(0);

      cancelActiveMotion();
      activeIndex = targetIndex;
      applyState();
      animateOutgoingCard(outgoingCard, direction, outgoingStart);
      return true;
    };

    const syncWithoutAnimation = () => {
      cancelActiveMotion();
      pointerState = null;
      metrics = measureMetrics();
      stack.classList.add("discipline-stack-viewport--static");
      applyState();
      requestAnimationFrame(() => {
        stack.classList.remove("discipline-stack-viewport--static");
      });
    };

    const onPointerDown = (event) => {
      if (!portraitQuery.matches || !event.isPrimary) {
        return;
      }

      cancelActiveMotion();
      metrics = measureMetrics();
      stack.setPointerCapture?.(event.pointerId);
      pointerState = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        progress: 0,
        intent: null
      };
    };

    const clearPointer = (event, { snap = false } = {}) => {
      if (snap) {
        applyState();
      }

      if (event && pointerState?.id === event.pointerId) {
        stack.releasePointerCapture?.(event.pointerId);
      }

      pointerState = null;
    };

    const onPointerMove = (event) => {
      if (!portraitQuery.matches || !pointerState || pointerState.id !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;

      if (!pointerState.intent) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
          return;
        }

        pointerState.intent = Math.abs(deltaX) > Math.abs(deltaY) * 1.08 ? "x" : "y";
      }

      if (pointerState.intent !== "x") {
        return;
      }

      event.preventDefault();
      const width = Math.max(stack.clientWidth, 1);
      const raw = deltaX / (width * 0.46);
      const direction = raw === 0 ? 0 : raw > 0 ? -1 : 1;
      const outOfBounds = (direction < 0 && activeIndex === 0) || (direction > 0 && activeIndex === total - 1);
      const limit = outOfBounds ? 0.18 : 0.94;
      const resistance = outOfBounds ? 1.8 : 0.84;
      const progress = clamp(Math.sign(raw || 0) * limit * (1 - Math.exp(-Math.abs(raw) * resistance)), -limit, limit);
      pointerState.progress = progress;
      applyState({ dragProgress: progress });
    };

    const onPointerUp = (event) => {
      if (!portraitQuery.matches || !pointerState || pointerState.id !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      const progress = pointerState.progress || 0;
      const intent = pointerState.intent;
      clearPointer(event);

      if (intent !== "x") {
        applyState();
        return;
      }

      const direction = progress < 0 ? 1 : -1;
      const targetIndex = clamp(activeIndex + direction, 0, total - 1);
      const hasTarget = targetIndex !== activeIndex;
      if (
        hasTarget &&
        (Math.abs(deltaX) >= Math.max(stack.clientWidth * 0.11, 42) || Math.abs(progress) >= 0.28) &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.04
      ) {
        rotate(direction);
      } else {
        applyState();
      }
    };

    const onStackClick = (event) => {
      if (portraitQuery.matches) {
        return;
      }

      const card = event.target.closest(".discipline-stack-card");
      if (!card) {
        return;
      }

      const offset = Number(card.dataset.stackPos || 0);
      if (offset === -1) {
        rotate(-1);
      } else if (offset === 1) {
        rotate(1);
      }
    };

    stack.addEventListener("click", onStackClick);
    stack.addEventListener("pointerdown", onPointerDown);
    stack.addEventListener("pointermove", onPointerMove);
    stack.addEventListener("pointerup", onPointerUp);
    stack.addEventListener("pointercancel", (event) => clearPointer(event, { snap: true }));
    stack.addEventListener("pointerleave", (event) => clearPointer(event, { snap: true }));

    metrics = measureMetrics();
    stack.classList.add("discipline-stack-viewport--static");
    applyState();
    requestAnimationFrame(() => {
      stack.classList.remove("discipline-stack-viewport--static");
    });

    window.addEventListener("resize", () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextPortraitState = portraitQuery.matches;
      const widthChanged = Math.abs(nextWidth - lastViewportWidth) > 2;
      const portraitStateChanged = nextPortraitState !== lastPortraitState;
      const heightChanged = Math.abs(nextHeight - lastViewportHeight) > 120;

      lastViewportWidth = nextWidth;
      lastViewportHeight = nextHeight;
      lastPortraitState = nextPortraitState;

      if (portraitStateChanged || widthChanged || (!nextPortraitState && heightChanged)) {
        syncWithoutAnimation();
      }
    });

    window.addEventListener("orientationchange", syncWithoutAnimation);
    window.addEventListener("pageshow", syncWithoutAnimation);
  }

  function initDisciplineStack() {
    const getBaseCardHeight = ({ portrait }) => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (portrait) {
        return Math.min(Math.max(window.innerWidth * 0.84, 25.8 * rem), 30.4 * rem);
      }

      if (window.matchMedia("(max-width: 980px) and (orientation: landscape)").matches) {
        return Math.min(Math.max(window.innerWidth * 0.33, 18.8 * rem), 22.8 * rem);
      }

      if (window.innerWidth <= 980) {
        return Math.min(Math.max(window.innerWidth * 0.4, 20 * rem), 24 * rem);
      }

      return Math.min(Math.max(window.innerWidth * 0.39, 22 * rem), 28 * rem);
    };

    initStackDeck({
      stackId: "discipline-stack",
      items: disciplines,
      getAriaLabel: (item) => `Core disciplines cards. ${item.title} is in focus.`,
      getBaseCardHeight,
      measureCard: measureDisciplineCard
    });
  }

  function initProjectStack() {
    const getBaseCardHeight = ({ portrait }) => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (portrait) {
        return Math.min(Math.max(window.innerWidth * 1.04, 32.4 * rem), 39.5 * rem);
      }

      if (window.matchMedia("(max-width: 980px) and (orientation: landscape)").matches) {
        return Math.min(Math.max(window.innerWidth * 0.365, 21.5 * rem), 25.6 * rem);
      }

      if (window.innerWidth <= 980) {
        return Math.min(Math.max(window.innerWidth * 0.47, 22.8 * rem), 27.2 * rem);
      }

      return Math.min(Math.max(window.innerWidth * 0.325, 24.2 * rem), 29.5 * rem);
    };

    initStackDeck({
      stackId: "project-stack",
      items: projects,
      getAriaLabel: (item) => `Current project cards. ${item.title} is in focus.`,
      getBaseCardHeight,
      measureCard: measureProjectCard
    });
  }

  async function boot() {
    const heroTitleReady = initHeroTitle();

    await Promise.all([
      injectPartial('#nav-slot', 'nav.html'),
      injectPartial('#footer-slot', 'footer.html'),
      heroTitleReady
    ]);

    renderProjects();
    renderDisciplines();
    initYear();
    initNav();
    syncMobileNavState();
    initAnchorScroll();
    initSectionSpy();
    initReveal();
    initHeroIntro();
    initRockSaltSafeAreas();
    initAboutCreator();
    initDisciplineStack();
    initProjectStack();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
