(function(){
  "use strict";

  const body = document.body;
  const base = (body?.getAttribute('data-base') || '.').trim();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const heroTitleSelector = '.hero-title';

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
      return `assets/partials/${file}`;
    }

    const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${normalized}/assets/partials/${file}`;
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

  function getNavOffset(){
    const nav = document.querySelector('.nav');
    if (!nav) return 22;

    const row = nav.querySelector('.row');
    if (row){
      return row.getBoundingClientRect().height + 22;
    }
    return nav.getBoundingClientRect().height + 22;
  }

  function isPortraitMobile(){
    return window.matchMedia('(max-width:900px) and (orientation:portrait)').matches;
  }

  function setNavOpenState(nav, open){
    const toggle = nav?.querySelector('.nav-toggle');
    const sheet  = nav?.querySelector('#mobile-sheet');

    if (!nav || !toggle) return;

    nav.classList.toggle('nav--open', open);
    nav.classList.toggle('nav--opening', open);
    nav.classList.toggle('nav--closing', !open);
    body.classList.toggle('nav-menu-open', open);
    body.classList.toggle('nav-menu-closing', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    if (sheet){
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    body.classList.toggle('no-scroll', open);

    const backdrop = document.querySelector('.nav-backdrop');
    if (backdrop){
      backdrop.classList.toggle('is-visible', open || document.body.classList.contains('nav--scrolled'));
    }

    window.clearTimeout(setNavOpenState._stateTimer);
    setNavOpenState._stateTimer = window.setTimeout(() => {
      nav.classList.remove('nav--opening');
      nav.classList.remove('nav--closing');
      body.classList.remove('nav-menu-closing');
    }, open ? 920 : 720);
  }

  function closeMobileNav(){
    const nav = document.querySelector('.nav');
    if (!nav) return;
    setNavOpenState(nav, false);
  }

  function syncMobileNavState(){
    const nav = document.querySelector('.nav');
    if (!nav) return;

    if (!isPortraitMobile() && nav.classList.contains('nav--open')){
      setNavOpenState(nav, false);
    }
  }

  function initMobileMenuDelays(){
    const items = Array.from(document.querySelectorAll('.mobile-menu li'));
    if (!items.length) return;

    const delays = [0.04, 0.085, 0.135, 0.19, 0.25, 0.315, 0.385, 0.46];

    items.forEach((item, index) => {
      const delay = delays[index] ?? (0.46 + (index - delays.length + 1) * 0.075);
      item.style.setProperty('--menu-delay', `${delay}s`);
    });
  }

  function initNavBackdrop(){
    if (document.body.dataset.backdropInit === '1') return;
    document.body.dataset.backdropInit = '1';

    let backdrop = document.querySelector('.nav-backdrop');
    let last = null;
    let ticking = false;

    const compute = () => {
      ticking = false;

      const y = window.scrollY || window.pageYOffset || 0;
      const scrolled = y > 4;

      if (scrolled !== last){
        if (!backdrop) backdrop = document.querySelector('.nav-backdrop');
        if (backdrop) backdrop.classList.toggle('is-visible', scrolled || document.body.classList.contains('nav-menu-open') || document.body.classList.contains('nav-menu-closing'));

        document.body.classList.toggle('nav--scrolled', scrolled);
        last = scrolled;
      }
    };

    const onChange = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onChange, { passive:true });
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    window.addEventListener('pageshow', onChange);
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

    const destination = target.getBoundingClientRect().top + window.scrollY - getNavOffset();

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
      links.forEach((item) => item.classList.remove("is-active"));
      if (!targetLinks) {
        return;
      }

      targetLinks.forEach((item) => item.classList.add("is-active"));
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
  function getHeroTitleText(title){
    if (!title) return '';

    const explicit = (title.getAttribute('data-title-text') || '').trim();
    if (explicit) return explicit;

    const text = (title.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  function splitHeroTitleLines(title){
    if (!title) return;

    const fullText = getHeroTitleText(title);
    if (!fullText) return;

    const words = fullText.split(' ').filter(Boolean);
    if (!words.length) return;

    const computed = window.getComputedStyle(title);
    const measure = document.createElement('div');
    measure.setAttribute('aria-hidden', 'true');
    measure.style.position = 'absolute';
    measure.style.left = '-99999px';
    measure.style.top = '0';
    measure.style.visibility = 'hidden';
    measure.style.pointerEvents = 'none';
    measure.style.whiteSpace = 'normal';
    measure.style.width = `${Math.ceil(title.clientWidth || title.getBoundingClientRect().width)}px`;
    measure.style.fontFamily = computed.fontFamily;
    measure.style.fontSize = computed.fontSize;
    measure.style.fontWeight = computed.fontWeight;
    measure.style.letterSpacing = computed.letterSpacing;
    measure.style.lineHeight = computed.lineHeight;
    measure.style.textTransform = computed.textTransform;

    const tokens = [];

    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.textContent = index < words.length - 1 ? `${word} ` : word;
      measure.appendChild(span);
      tokens.push(span);
    });

    document.body.appendChild(measure);

    const lines = [];
    let currentTop = null;
    let currentLine = [];

    tokens.forEach((token) => {
      const top = token.offsetTop;

      if (currentTop === null || Math.abs(top - currentTop) < 2){
        currentTop = currentTop === null ? top : currentTop;
        currentLine.push(token.textContent || '');
        return;
      }

      lines.push(currentLine.join('').trim());
      currentTop = top;
      currentLine = [token.textContent || ''];
    });

    if (currentLine.length){
      lines.push(currentLine.join('').trim());
    }

    document.body.removeChild(measure);

    const normalizedLines = lines.filter(Boolean);
    if (!normalizedLines.length) return;

    title.innerHTML = '';
    title.setAttribute('data-title-text', fullText);
    title.setAttribute('aria-label', fullText);

    normalizedLines.forEach((lineText) => {
      const line = document.createElement('span');
      line.className = 'hero-line';

      const inner = document.createElement('span');
      inner.textContent = lineText;

      line.appendChild(inner);
      title.appendChild(line);
    });
  }

  function initAdaptiveHeroTitle(){
    const title = document.querySelector(heroTitleSelector);
    if (!title) return;

    let frame = 0;

    const render = () => {
      frame = 0;
      splitHeroTitleLines(title);
    };

    const requestRender = () => {
      if (frame) return;
      frame = requestAnimationFrame(render);
    };

    requestRender();

    window.addEventListener('resize', requestRender);
    window.addEventListener('orientationchange', requestRender);
    window.addEventListener('pageshow', requestRender);

    if (document.fonts?.ready){
      document.fonts.ready.then(requestRender).catch(() => {});
    }
  }
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

      const scene = document.querySelector('.ambient-scene');
      if (scene){
        scene.style.transform = `translate3d(${ambientShiftX.toFixed(2)}px, ${ambientShiftY.toFixed(2)}px, 0)`;
      }
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
    syncMobileNavState();
    initAnchorScroll();
    initSectionSpy();
    initSectionDepth();
    initReveal();
    initAdaptiveHeroTitle();
    initHeroIntro();
    initParallax();
    initHoverTracking();

    requestAnimationFrame(() => {
      const title = document.querySelector(heroTitleSelector);
      if (title) splitHeroTitleLines(title);
    });

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
