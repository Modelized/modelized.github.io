(function(){
  "use strict";

  const body = document.body;
  const base = (body?.getAttribute('data-base') || '.').trim();
  const assetVersion = '20260410d';
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SETTLE_PASS_DELAYS = [0, 140, 320, 560];
  const devicon = (family, file = `${family}-original.svg`) => `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${family}/${file}`;
  const iconSvg = (path) => `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${path}</svg>`;

  const projects = [
    {
      name: "iStage",
      tagline: "Android. Reimagined.",
      description:
        "A pixel-perfect recreation of the iOS Lock Screen for Android, with built-in Dynamic Island, stock wallpapers and deep personalization - all powered by KLCK.",
      icon: "assets/img/iStage-icon.png",
      hero: "assets/img/hero-iStage-series.png",
      url: "https://modelized.github.io/iStage/"
    }

    // Duplicate this object block to add another project card.
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
        { iconUrl: devicon("c"), label: "C" },
        { iconUrl: devicon("cplusplus"), label: "C++" },
        { iconUrl: devicon("python"), label: "Python" },
        { iconUrl: devicon("swift"), label: "Swift" },
        { iconUrl: devicon("kotlin"), label: "Kotlin" },
        { iconUrl: devicon("javascript"), label: "JavaScript" },
        { iconUrl: devicon("html5"), label: "HTML" },
        { iconUrl: devicon("bash"), label: "Bash" },
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
        { iconSvg: iconSvg('<rect x="4.1" y="4.5" width="11.8" height="8.2" rx="1.8"/><path d="M6.5 15.5h7"/><path d="M8 12.7v2.8M12 12.7v2.8"/>'), label: "Custom ROM Building" },
        { iconSvg: iconSvg('<path d="M10 4.2 14 5.7v3.8c0 2.6-1.6 4.8-4 5.9-2.4-1.1-4-3.3-4-5.9V5.7L10 4.2Z"/><path d="m12.7 12.7 2.6 2.6"/><circle cx="12.1" cy="12.1" r="2.3"/>'), label: "iOS Security Analysis" },
        { iconSvg: iconSvg('<path d="M6 6.2h8M6 10h5.4M6 13.8h8"/><path d="m11.4 4.5 4.1 4.1-4.1 4.1"/><path d="m8.6 15.5-4.1-4.1 4.1-4.1"/>'), label: "Reverse Engineering" },
        { iconSvg: iconSvg('<rect x="4.2" y="4.2" width="6.2" height="6.2" rx="1.3"/><rect x="9.6" y="9.6" width="6.2" height="6.2" rx="1.3"/><path d="M9.6 7.4h2.1M10.7 6.3v2.2"/>'), label: "System Virtualization" }
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
    const track = document.getElementById("project-track");
    const template = document.getElementById("project-card-template");

    if (!track || !template) {
      return;
    }

    track.innerHTML = "";

    projects.forEach((project) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".project-card");
      const name = fragment.querySelector(".project-name");
      const tagline = fragment.querySelector(".project-tagline");
      const description = fragment.querySelector(".project-description");
      const icon = fragment.querySelector(".project-icon");
      const hero = fragment.querySelector(".project-media");
      const link = fragment.querySelector(".project-link");

      if (card && project.name) {
        const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        card.classList.add(`project-card--${slug}`);
      }

      if (name) name.textContent = project.name;
      if (tagline) tagline.textContent = project.tagline;
      if (description) description.textContent = project.description;

      if (icon) {
        icon.src = project.icon;
        icon.alt = `${project.name} icon`;
      }

      if (hero) {
        hero.src = project.hero;
        hero.alt = `${project.name} project preview`;
      }

      if (link && project.url) {
        link.href = project.url;
        link.setAttribute("aria-label", `Open ${project.name}`);
      }

      track.appendChild(fragment);
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

  function initSectionDepth() {
    const sections = Array.from(document.querySelectorAll(".section"));
    if (!sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      {
        rootMargin: "-20% 0px -20% 0px",
        threshold: 0.18
      }
    );

    sections.forEach((section) => observer.observe(section));
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

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          if (entry.target.hasAttribute("data-parallax")) {
            const rawDelay = parseFloat(entry.target.style.getPropertyValue("--reveal-delay")) || 0;
            window.setTimeout(() => {
              entry.target.classList.add("reveal-settled");
            }, rawDelay + 940);
          }
          obs.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12
      }
    );

    revealElements.forEach((element) => observer.observe(element));
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

  function initDisciplineStack() {
    const stack = document.getElementById("discipline-stack");
    const stage = stack?.closest(".discipline-stack-stage");
    const prevButton = document.querySelector(".discipline-nav--prev");
    const nextButton = document.querySelector(".discipline-nav--next");
    const cards = Array.from(stack?.querySelectorAll(".discipline-stack-card") || []);

    if (!stack || !cards.length) {
      return;
    }

    const total = cards.length;
    const portraitQuery = window.matchMedia("(max-width: 980px) and (orientation: portrait)");
    let activeIndex = 0;
    let pointerState = null;
    let metrics = null;

    const mod = (value, base) => ((value % base) + base) % base;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const createLayout = (x, y, scale, rotate, opacity = 1) => ({ x, y, scale, rotate, opacity });

    const buildLayouts = (cardWidth, cardHeight) => {
      if (portraitQuery.matches) {
        return {
          0: createLayout(0, 0, 1, 0, 1),
          1: createLayout(cardWidth * 0.175, cardHeight * 0.034, 0.942, 4.8, 1),
          2: createLayout(cardWidth * 0.292, cardHeight * 0.061, 0.878, 7.2, 1),
          3: createLayout(cardWidth * 0.372, cardHeight * 0.084, 0.812, 9.1, 1),
          4: createLayout(cardWidth * 0.428, cardHeight * 0.104, 0.752, 10.4, 1),
          "-1": createLayout(-cardWidth * 0.175, cardHeight * 0.034, 0.942, -4.8, 1),
          "-2": createLayout(-cardWidth * 0.292, cardHeight * 0.061, 0.878, -7.2, 1),
          "-3": createLayout(-cardWidth * 0.372, cardHeight * 0.084, 0.812, -9.1, 1),
          "-4": createLayout(-cardWidth * 0.428, cardHeight * 0.104, 0.752, -10.4, 1)
        };
      }

      return {
        0: createLayout(0, 0, 1, 0, 1),
        1: createLayout(cardWidth * 0.195, cardHeight * 0.018, 0.946, 3.8, 1),
        2: createLayout(cardWidth * 0.332, cardHeight * 0.034, 0.888, 5.8, 1),
        3: createLayout(cardWidth * 0.432, cardHeight * 0.046, 0.83, 7.0, 1),
        4: createLayout(cardWidth * 0.504, cardHeight * 0.056, 0.776, 8.0, 1),
        "-1": createLayout(-cardWidth * 0.195, cardHeight * 0.018, 0.946, -3.8, 1),
        "-2": createLayout(-cardWidth * 0.332, cardHeight * 0.034, 0.888, -5.8, 1),
        "-3": createLayout(-cardWidth * 0.432, cardHeight * 0.046, 0.83, -7.0, 1),
        "-4": createLayout(-cardWidth * 0.504, cardHeight * 0.056, 0.776, -8.0, 1)
      };
    };

    const measureMetrics = () => {
      const firstCard = cards[0];
      let maxContentHeight = 0;

      cards.forEach((card) => {
        const surface = card.querySelector(".discipline-stack-card__surface");
        const contentHeight = surface?.scrollHeight || card.scrollHeight || 0;
        maxContentHeight = Math.max(maxContentHeight, contentHeight);
      });

      const currentHeight = firstCard?.offsetHeight || stack.clientHeight || 0;
      const cardHeight = Math.ceil(Math.max(currentHeight, maxContentHeight));
      stack.style.setProperty("--discipline-card-height", `${cardHeight}px`);

      const cardWidth = firstCard?.offsetWidth || stack.clientWidth || window.innerWidth;
      const layouts = buildLayouts(cardWidth, cardHeight);
      const layoutValues = Object.values(layouts);
      const maxBottom = Math.max(...layoutValues.map((layout) => layout.y + cardHeight * layout.scale));
      const topPad = Math.ceil(cardHeight * 0.035 + 14);
      const bottomPad = Math.ceil(Math.max(56, maxBottom - cardHeight + cardHeight * 0.1 + 18));

      stage?.style.setProperty("--discipline-stack-pad-top", `${topPad}px`);
      stage?.style.setProperty("--discipline-stack-pad-bottom", `${bottomPad}px`);

      return { cardWidth, cardHeight, layouts };
    };

    const getMetrics = () => {
      if (!metrics) {
        metrics = measureMetrics();
      }

      return metrics;
    };

    const interpolateLayout = (from, to, t) => ({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      scale: from.scale + (to.scale - from.scale) * t,
      rotate: from.rotate + (to.rotate - from.rotate) * t,
      opacity: from.opacity + (to.opacity - from.opacity) * t
    });

    const formatTransform = (layout) =>
      `translate(calc(-50% + ${layout.x.toFixed(2)}px), ${layout.y.toFixed(2)}px) scale(${layout.scale.toFixed(4)}) rotate(${layout.rotate.toFixed(2)}deg)`;

    const getLayoutForOffset = (offset) => {
      const currentMetrics = getMetrics();
      const layouts = currentMetrics.layouts;
      const normalized = offset === 0 ? 0 : Math.sign(offset) * Math.min(Math.abs(offset), total - 1);
      const base = layouts[normalized] || layouts[0];
      const extra = Math.max(0, Math.abs(offset) - (total - 1));

      if (!extra) {
        return base;
      }

      return createLayout(
        base.x + Math.sign(offset) * currentMetrics.cardWidth * 0.11 * extra,
        base.y + currentMetrics.cardHeight * 0.055 * extra,
        Math.max(0.72, base.scale - 0.05 * extra),
        base.rotate + Math.sign(offset) * 1.8 * extra,
        base.opacity
      );
    };

    const getRelativeOffset = (index, baseIndex = activeIndex) => index - mod(baseIndex, total);

    const getZIndex = (offset) => {
      if (offset === 0) {
        return 200;
      }

      return 200 - Math.abs(offset) * 10 - (offset < 0 ? 1 : 0);
    };

    const getDepthAppearance = (offset) => {
      const depth = Math.min(Math.abs(offset), total - 1);
      const dim = [0, 0.035, 0.07, 0.105, 0.135][depth] || 0;
      const lift = [0.05, 0.042, 0.034, 0.028, 0.022][depth] || 0.022;
      return { dim, lift };
    };

    const syncLabels = () => {
      const active = disciplines[mod(activeIndex, total)];
      const previous = disciplines[mod(activeIndex - 1, total)];
      const next = disciplines[mod(activeIndex + 1, total)];

      stack.setAttribute("aria-label", `Core disciplines cards. ${active.title} is in focus.`);
      prevButton?.setAttribute("aria-label", `Show previous discipline, ${previous.title}`);
      nextButton?.setAttribute("aria-label", `Show next discipline, ${next.title}`);
      stack.dataset.swipeEnabled = portraitQuery.matches ? "true" : "false";
      if (portraitQuery.matches) {
        stack.removeAttribute("tabindex");
      } else {
        stack.tabIndex = 0;
      }
    };

    const applyState = ({ dragProgress = 0 } = {}) => {
      const isDragging = portraitQuery.matches && Math.abs(dragProgress) > 0.001;
      const direction = dragProgress === 0 ? 0 : dragProgress > 0 ? 1 : -1;

      stack.classList.toggle("is-dragging", isDragging);

      cards.forEach((card, index) => {
        const offset = getRelativeOffset(index);
        let visual = getLayoutForOffset(offset);

        if (isDragging) {
          const target = getLayoutForOffset(offset + direction);
          visual = interpolateLayout(visual, target, Math.abs(dragProgress));
        }

        card.dataset.stackPos = String(offset);
        card.dataset.stackDepth = String(Math.abs(offset));
        card.dataset.stackSide = offset === 0 ? "front" : offset < 0 ? "left" : "right";
        card.classList.toggle("is-active", offset === 0);
        card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
        card.style.zIndex = String(getZIndex(offset));
        card.style.opacity = visual.opacity.toFixed(3);
        card.style.transform = formatTransform(visual);

        const appearance = getDepthAppearance(offset);
        card.style.setProperty("--discipline-depth-dim", appearance.dim.toFixed(3));
        card.style.setProperty("--discipline-surface-lift", appearance.lift.toFixed(3));
      });

      stack.dataset.stackReady = "true";
      syncLabels();
    };

    const rotate = (direction) => {
      const outgoingIndex = activeIndex;
      const outgoingCard = cards.find((card) => Number(card.dataset.index) === outgoingIndex);
      const outgoingStart = getLayoutForOffset(0);
      activeIndex = mod(activeIndex + direction, total);
      applyState();

      if (!outgoingCard || typeof outgoingCard.animate !== "function") {
        return;
      }

      const finalOffset = getRelativeOffset(outgoingIndex);
      const finalLayout = getLayoutForOffset(finalOffset);
      const throwSign = direction > 0 ? -1 : 1;
      const currentMetrics = getMetrics();
      const midLayout = createLayout(
        throwSign * currentMetrics.cardWidth * (portraitQuery.matches ? 0.255 : 0.285),
        currentMetrics.cardHeight * (portraitQuery.matches ? 0.022 : 0.016),
        0.968,
        throwSign * (portraitQuery.matches ? 8.4 : 6.4),
        1
      );

      outgoingCard.getAnimations?.().forEach((animation) => animation.cancel());
      outgoingCard.style.transition = "none";
      outgoingCard.animate(
        [
          { transform: formatTransform(outgoingStart) },
          { transform: formatTransform(midLayout), offset: 0.42 },
          { transform: formatTransform(finalLayout) }
        ],
        {
          duration: portraitQuery.matches ? 720 : 760,
          easing: "cubic-bezier(0.16, 0.94, 0.22, 1)",
          fill: "both"
        }
      ).finished.finally(() => {
        outgoingCard.style.removeProperty("transition");
        applyState();
      }).catch(() => {
        outgoingCard.style.removeProperty("transition");
      });
    };

    const onPointerDown = (event) => {
      if (!portraitQuery.matches || !event.isPrimary) {
        return;
      }

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
      const raw = deltaX / (width * 0.24);
      const limited = 0.74 * (1 - Math.exp(-Math.abs(raw) * 1.45));
      const progress = clamp(Math.sign(raw || 0) * limited, -0.74, 0.74);
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

      if ((Math.abs(deltaX) >= Math.max(stack.clientWidth * 0.11, 42) || Math.abs(progress) >= 0.28) && Math.abs(deltaX) > Math.abs(deltaY) * 1.05) {
        rotate(progress < 0 ? 1 : -1);
      } else {
        applyState();
      }
    };

    const syncWithoutAnimation = () => {
      cards.forEach((card) => {
        card.getAnimations?.().forEach((animation) => animation.cancel());
      });
      metrics = measureMetrics();
      stack.classList.add("discipline-stack-viewport--static");
      applyState();
      requestAnimationFrame(() => {
        stack.classList.remove("discipline-stack-viewport--static");
      });
    };

    prevButton?.addEventListener("click", () => rotate(-1));
    nextButton?.addEventListener("click", () => rotate(1));

    stack.addEventListener("pointerdown", onPointerDown);
    stack.addEventListener("pointermove", onPointerMove);
    stack.addEventListener("pointerup", onPointerUp);
    stack.addEventListener("pointercancel", (event) => clearPointer(event, { snap: true }));
    stack.addEventListener("pointerleave", (event) => clearPointer(event, { snap: true }));
    stack.addEventListener("keydown", (event) => {
      if (portraitQuery.matches) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        rotate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        rotate(1);
      }
    });

    stack.classList.add("discipline-stack-viewport--static");
    metrics = measureMetrics();
    applyState();
    requestAnimationFrame(() => {
      stack.classList.remove("discipline-stack-viewport--static");
    });

    window.addEventListener("resize", syncWithoutAnimation);
    window.addEventListener("orientationchange", syncWithoutAnimation);
  }

  function initParallax() {
    if (prefersReducedMotion) {
      return;
    }

    const layers = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!layers.length) {
      return;
    }

    const entries = layers.map((layer) => ({
      layer,
      speed: Number(layer.getAttribute("data-parallax")) || 0.02,
      section: layer.closest(".section")
    }));

    let raf = 0;

    const render = () => {
      raf = 0;
      const viewportCenter = window.innerHeight * 0.5;
      const sectionDistances = new Map();

      entries.forEach(({ section, layer, speed }) => {
        const key = section || layer;

        if (!sectionDistances.has(key)) {
          const rect = key.getBoundingClientRect();
          const distance = rect.top + rect.height * 0.5 - viewportCenter;
          sectionDistances.set(key, distance);
        }

        const distance = sectionDistances.get(key) || 0;
        const shift = Math.max(-28, Math.min(28, -distance * speed));

        layer.style.setProperty("--parallax-y", `${shift.toFixed(2)}px`);
      });

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const maxScroll = Math.max(1, documentHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      const ambientShiftY = Math.max(-22, Math.min(22, scrollY * 0.018));
      const ambientShiftX = Math.max(-14, Math.min(14, (progress - 0.5) * 18));

      body.style.setProperty("--scroll-progress", progress.toFixed(4));
      body.style.setProperty("--ambient-shift-y", `${ambientShiftY.toFixed(2)}px`);
      body.style.setProperty("--ambient-shift-x", `${ambientShiftX.toFixed(2)}px`);
    };

    const requestFrame = () => {
      if (!raf) {
        raf = requestAnimationFrame(render);
      }
    };

    requestFrame();
    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame);
    window.addEventListener('pageshow', requestFrame);
  }

  function initHoverTracking() {
    if (prefersReducedMotion) {
      return;
    }

    const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!supportsFinePointer) {
      return;
    }

    const cards = Array.from(document.querySelectorAll(".project-card"));

    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        card.style.setProperty("--mx", `${x.toFixed(2)}%`);
        card.style.setProperty("--my", `${y.toFixed(2)}%`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      });
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
    initSectionDepth();
    initReveal();
    initHeroIntro();
    initRockSaltSafeAreas();
    initAboutCreator();
    initDisciplineStack();
    initParallax();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
