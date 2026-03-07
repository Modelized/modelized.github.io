(function () {
  "use strict";

  const body = document.body;
  const base = (body?.getAttribute("data-base") || ".").trim();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const projects = [
    {
      name: "iStage",
      tagline: "Android. Reimagined.",
      description:
        "A pixel-perfect recreation of the iOS Lock Screen for Android, with built-in Dynamic Island, stock wallpapers and deep personalization - all powered by KLCK.",
      icon: "assets/img/iStage-icon.png",
      hero: "assets/img/hero-iStage-series.png"
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

      track.appendChild(fragment);
    });
  }

  function initYear() {
    const year = document.getElementById("year");
    if (year) {
      year.textContent = new Date().getFullYear();
    }
  }

  function getNavOffset() {
    const nav = document.querySelector(".site-nav");
    if (!nav) {
      return 22;
    }
    return nav.getBoundingClientRect().height + 22;
  }

  function closeMobileNav() {
    const nav = document.querySelector(".site-nav");
    const toggle = nav?.querySelector(".nav-toggle");

    if (!nav || !toggle) {
      return;
    }

    nav.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    body.classList.remove("no-scroll");
  }

  function scrollToTarget(hash, replaceHash = false) {
    if (!hash || hash === "#") {
      return;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return;
    }

    const destination =
      target.getBoundingClientRect().top + window.scrollY - getNavOffset();

    window.scrollTo({
      top: destination,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });

    if (replaceHash) {
      history.replaceState(null, "", hash);
    }
  }

  function initAnchorScroll() {
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) {
        return;
      }

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }

      const target = document.querySelector(hash);
      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToTarget(hash, true);

      const nav = document.querySelector(".site-nav");
      if (nav?.classList.contains("nav-open")) {
        closeMobileNav();
      }
    });
  }

  function setNavScrolledState() {
    body.classList.toggle("nav-scrolled", window.scrollY > 22);
  }

  function initNav() {
    const nav = document.querySelector(".site-nav");
    const toggle = nav?.querySelector(".nav-toggle");

    if (!nav || !toggle) {
      return;
    }

    toggle.addEventListener("click", () => {
      const next = !nav.classList.contains("nav-open");
      nav.classList.toggle("nav-open", next);
      toggle.setAttribute("aria-expanded", String(next));
      body.classList.toggle("no-scroll", next && window.innerWidth <= 980);
    });

    window.addEventListener(
      "scroll",
      () => {
        setNavScrolledState();
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) {
        closeMobileNav();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    });

    setNavScrolledState();
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
        map.set(section, link);
      }
    });

    const setActive = (link) => {
      links.forEach((item) => item.classList.remove("is-active"));
      if (link) {
        link.classList.add("is-active");
      }
    };

    const initialLink =
      links.find((link) => link.getAttribute("href") === location.hash) || links[0];
    setActive(initialLink);

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length) {
          setActive(map.get(visible[0].target));
        }
      },
      {
        rootMargin: "-35% 0px -46% 0px",
        threshold: [0.2, 0.45, 0.7]
      }
    );

    map.forEach((_link, section) => observer.observe(section));
  }

  function initReveal() {
    const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!revealElements.length) {
      return;
    }

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
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.18
      }
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  async function boot() {
    await Promise.all([
      injectPartial("#nav-slot", "nav.html"),
      injectPartial("#footer-slot", "footer.html")
    ]);

    renderProjects();
    initYear();
    initNav();
    initAnchorScroll();
    initSectionSpy();
    initReveal();

    if (location.hash) {
      requestAnimationFrame(() => scrollToTarget(location.hash, false));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
