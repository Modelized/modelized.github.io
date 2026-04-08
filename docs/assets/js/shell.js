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

  function initAboutOperator() {
    const title = document.querySelector(".about-operator-title");
    if (!title) {
      return;
    }

    const viewport = title.querySelector(".about-operator-viewport");
    const track = title.querySelector(".about-operator-track");
    const words = Array.from(title.querySelectorAll(".about-operator-word"));
    if (!viewport || !track || !words.length) {
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
    let lastLayoutWidth = 0;
    let lastViewportWidth = 0;

    const setImmediateTransitions = (enabled) => {
      const value = enabled ? "none" : "";
      viewport.style.transition = value;
      track.style.transition = value;
    };

    const updateMetrics = () => {
      const fallbackHeight = Math.ceil((parseFloat(getComputedStyle(title).fontSize) || 16) * 1.08);
      const widths = words.map((word) => Math.ceil(word.getBoundingClientRect().width));
      const height = Math.max(
        fallbackHeight,
        ...words.map((word) => Math.ceil(word.getBoundingClientRect().height))
      );

      metrics = { height, widths };
      title.style.setProperty("--about-role-height", `${height}px`);
      return metrics;
    };

    const captureLayoutWidths = () => {
      lastLayoutWidth = Math.round(title.getBoundingClientRect().width);
      lastViewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth || 0);
    };

    const layoutWidthChanged = () => {
      const currentTitleWidth = Math.round(title.getBoundingClientRect().width);
      const currentViewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth || 0);
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

      title.style.setProperty("--about-role-width", `${width}px`);
      title.style.setProperty("--about-role-shift", `${shift}px`);

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
    const heroTitleReady = initHeroTitle();

    await Promise.all([
      injectPartial('#nav-slot', 'nav.html'),
      injectPartial('#footer-slot', 'footer.html'),
      heroTitleReady
    ]);

    renderProjects();
    initYear();
    initNav();
    syncMobileNavState();
    initAnchorScroll();
    initSectionSpy();
    initSectionDepth();
    initReveal();
    initHeroIntro();
    initAboutOperator();
    initParallax();
    initHoverTracking();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
