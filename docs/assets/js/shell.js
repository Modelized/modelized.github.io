(function(){
  "use strict";

  const body = document.body;
  const base = (body?.getAttribute('data-base') || '.').trim();
  const assetVersion = '20260320h';
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SETTLE_PASS_DELAYS = [0, 140, 320, 560];

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
      const name = fragment.querySelector(".project-name");
      const tagline = fragment.querySelector(".project-tagline");
      const description = fragment.querySelector(".project-description");
      const icon = fragment.querySelector(".project-icon");
      const hero = fragment.querySelector(".project-media");
      const link = fragment.querySelector(".project-link");

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

  function initYear() {
    const year = document.getElementById("year");
    if (year) {
      year.textContent = new Date().getFullYear();
    }
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

    const rowInline = Math.round(Math.min(Math.max(viewportWidth * 0.118, 50), 60));
    const menuInline = Math.round(Math.min(Math.max(viewportWidth * 0.084, 36), 46));
    root.style.setProperty('--mobile-row-inline', `${rowInline}px`);
    root.style.setProperty('--mobile-menu-inline', `${menuInline}px`);

    const row = nav.querySelector('.row');
    const sheetContent = nav.querySelector('.sheet-content');
    if (row && sheetContent){
      const rowRect = row.getBoundingClientRect();
      const sheetContentRect = sheetContent.getBoundingClientRect();
      const menuGap = Math.round(Math.min(Math.max(viewportHeight * 0.17, 114), 148));
      const menuTop = Math.round(Math.max(72, rowRect.bottom + menuGap - sheetContentRect.top));
      root.style.setProperty('--mobile-menu-top', `${menuTop}px`);
    }

    const shouldAlignBrand = isNavMenuOpen(nav);

    if (shouldAlignBrand){
      const brand = nav.querySelector('.brand');
      const logo = nav.querySelector('.brand-logo');
      const firstLink = nav.querySelector('.mobile-menu a');
      if (brand && firstLink){
        const logoRect = (logo || brand).getBoundingClientRect();
        const firstLinkRect = firstLink.getBoundingClientRect();
        const gapAbove = Math.round(Math.min(Math.max(viewportHeight * 0.038, 26), 34));
        const targetTop = firstLinkRect.top - logoRect.height - gapAbove;
        const shiftX = Math.round(firstLinkRect.left - logoRect.left);
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
    nav?.classList.remove('nav--opening');
    body.classList.remove('nav-menu-open');
    body.classList.remove('nav-menu-closing');
    body.classList.remove('no-scroll');
    clearPortraitMenuLayoutVars();
  }

  function setNavOpenState(nav, open){
    const toggle = nav?.querySelector('.nav-toggle');
    const sheet  = nav?.querySelector('#mobile-sheet');

    if (!nav || !toggle) return;

    window.clearTimeout(setNavOpenState._stateTimer);

    if (open){
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
    }

    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    if (sheet){
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    setNavOpenState._stateTimer = window.setTimeout(() => {
      if (!open) {
        clearTransientMobileMenuState(nav);
      }
    }, open ? 0 : 260);
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

    const fallbackDelays = [0.02, 0.06, 0.10, 0.14, 0.19, 0.25, 0.32, 0.40];

    items.forEach((item, index) => {
      const existing = item.style.getPropertyValue('--menu-delay').trim();
      if (existing) return;
      const delay = fallbackDelays[index] ?? (0.40 + (index - fallbackDelays.length + 1) * 0.08);
      item.style.setProperty('--menu-delay', `${delay}s`);
    });
  }

  function initOrientationRecovery(){
    let lastPortrait = isPortraitMobile();
    let lastStableScrollY = getScrollTop();
    let pendingRecovery = null;

    const updateStableState = () => {
      lastPortrait = isPortraitMobile();
      lastStableScrollY = getScrollTop();
    };

    const settledRecovery = createSettledScheduler(() => {
      if (pendingRecovery && isPortraitMobile() && !pendingRecovery.previousPortrait){
        const currentY = getScrollTop();
        if (Math.abs(currentY - pendingRecovery.scrollY) > 1){
          window.scrollTo({ top: pendingRecovery.scrollY, behavior: 'auto' });
        }
      }

      pendingRecovery = null;
      updateStableState();
    });

    window.addEventListener('scroll', () => {
      lastStableScrollY = getScrollTop();
    }, { passive:true });

    window.addEventListener('orientationchange', () => {
      pendingRecovery = {
        previousPortrait: lastPortrait,
        scrollY: lastStableScrollY
      };
      settledRecovery.schedule(160);
    });

    window.addEventListener('resize', () => {
      if (pendingRecovery){
        settledRecovery.schedule(120);
        return;
      }
      updateStableState();
    });

    window.addEventListener('pageshow', updateStableState);

    if (window.visualViewport){
      const syncViewportRecovery = () => {
        if (!pendingRecovery) return;
        settledRecovery.schedule(120);
      };

      window.visualViewport.addEventListener('resize', syncViewportRecovery);
      window.visualViewport.addEventListener('scroll', syncViewportRecovery);
    }
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
      return;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return;
    }

    if (hash === '#hero'){
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      return;
    }

    const destination = Math.max(0, target.getBoundingClientRect().top + window.scrollY - getNavOffset());

    window.scrollTo({
      top: destination,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
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
    let lastViewportHash = location.hash === "#hero" ? "" : location.hash;

    const syncUrlToSection = (section) => {
      if (!section || !section.id) {
        return;
      }

      const sectionHash = `#${section.id}`;
      const nextHash = section === homeSection ? "" : sectionHash;
      if (nextHash === lastViewportHash) {
        return;
      }

      const nextUrl = nextHash
        ? `${location.pathname}${location.search}${nextHash}`
        : `${location.pathname}${location.search}`;

      history.replaceState(null, "", nextUrl);
      lastViewportHash = nextHash;
    };

    setActiveByHash(location.hash);

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const sectionRatios = new Map();
    map.forEach((_link, section) => sectionRatios.set(section, 0));

    const syncFromViewport = () => {
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
      syncUrlToSection(currentSection);
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

        const text = document.createElement("span");
        text.className = "hero-text";
        text.textContent = line;
        text.setAttribute("data-text", line);

        row.append(text);
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
          resolve();
          return;
        }

        if (signature === title.dataset.lineSignature && title.querySelector(".hero-line")) {
          resolve();
          return;
        }

        title.dataset.lineSignature = signature;
        renderLines(lines);
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

  function initParallax() {
    if (prefersReducedMotion) {
      return;
    }

    const layers = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!layers.length) {
      return;
    }

    let raf = 0;

    const render = () => {
      raf = 0;
      const viewportCenter = window.innerHeight * 0.5;

      layers.forEach((layer) => {
        const speed = Number(layer.getAttribute("data-parallax")) || 0.02;
        const rect = layer.getBoundingClientRect();
        const distance = rect.top + rect.height * 0.5 - viewportCenter;
        const shift = Math.max(-34, Math.min(34, -distance * speed));

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

    const cards = Array.from(document.querySelectorAll(".discipline-card, .project-card"));

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
    await Promise.all([
      injectPartial('#nav-slot', 'nav.html'),
      injectPartial('#footer-slot', 'footer.html')
    ]);

    renderProjects();
    initYear();
    initNav();
    initOrientationRecovery();
    syncMobileNavState();
    initAnchorScroll();
    initSectionSpy();
    initSectionDepth();
    initReveal();
    await initHeroTitle();
    initHeroIntro();
    initParallax();
    initHoverTracking();

    if (location.hash){
      requestAnimationFrame(() => {
        scrollToTarget(location.hash);
      });
    }else{
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
