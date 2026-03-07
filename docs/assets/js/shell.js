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
    const row = nav.querySelector(".nav-row");
    if (row) {
      return row.getBoundingClientRect().height + 22;
    }
    return nav.getBoundingClientRect().height + 22;
  }

  function isPortraitMobile() {
    return window.matchMedia("(max-width: 980px) and (orientation: portrait)").matches;
  }

 function setNavOpenState(nav, open) {
   const toggle = nav?.querySelector(".nav-toggle");
   const sheet = nav?.querySelector("#mobile-sheet");

   if (!nav || !toggle) {
     return;
   }

   nav.classList.toggle("nav-open", open);
   nav.classList.toggle("nav--open", open);
   toggle.setAttribute("aria-expanded", open ? "true" : "false");
   toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

   if (sheet) {
     sheet.setAttribute("aria-hidden", open ? "false" : "true");
   }

   body.classList.toggle("no-scroll", open);
   body.classList.toggle("nav-open", open);
   body.classList.toggle("nav--open", open);
 }

 function closeMobileNav() {
   const nav = document.querySelector(".site-nav");
   if (!nav) {
     return;
   }
   setNavOpenState(nav, false);
 }

 function initNavBackdrop() {
   if (document.body.dataset.backdropInit === "1") {
     return;
   }
   document.body.dataset.backdropInit = "1";

   let backdrop = document.querySelector(".nav-backdrop");
   let last = null;
   let ticking = false;

   const compute = () => {
     ticking = false;

     const y = window.scrollY || window.pageYOffset || 0;
     const scrolled = y > 4;

     if (scrolled !== last) {
       if (!backdrop) {
         backdrop = document.querySelector(".nav-backdrop");
       }
       if (backdrop) {
         backdrop.classList.toggle("is-visible", scrolled);
       }

       document.body.classList.toggle("nav--scrolled", scrolled);
       document.body.classList.toggle("nav-scrolled", scrolled);
       last = scrolled;
     }
   };

   const onChange = () => {
     if (ticking) {
       return;
     }
     ticking = true;
     requestAnimationFrame(compute);
   };

   compute();
   window.addEventListener("scroll", onChange, { passive: true });
   window.addEventListener("resize", onChange);
   window.addEventListener("orientationchange", onChange);
   window.addEventListener("pageshow", onChange);
 }

 function initMenuThumb() {
   const menu = document.querySelector(".nav-links-desktop");
   if (!menu) {
     return;
   }

   if (menu.dataset.thumbInit === "1") {
     return;
   }
   menu.dataset.thumbInit = "1";

   const allLinks = [...menu.querySelectorAll("a")];
   if (!allLinks.length) {
     return;
   }

   const normHash = (value) => {
     if (!value || value === "#hero") {
       return "";
     }
     return value;
   };

   allLinks.forEach((link) => link.classList.remove("is-current"));

   const currentHash = normHash(location.hash);
   let current = allLinks.find((link) => normHash(link.getAttribute("href")) === currentHash) || allLinks[0];

   if (current) {
     current.classList.add("is-current");
   }

   const setThumbTo = (link, show = true) => {
     if (!link) {
       menu.style.setProperty("--menu-thumb-o", "0");
       return;
     }

     const menuRect = menu.getBoundingClientRect();
     const rect = link.getBoundingClientRect();
     const styles = getComputedStyle(menu);

     const padStr = styles.getPropertyValue("--menu-thumb-pad").trim();
     const padNum = parseFloat(padStr);
     const pad = Number.isFinite(padNum) ? padNum : 6;

     const borderLeftNum = parseFloat(styles.borderLeftWidth);
     const borderLeft = Number.isFinite(borderLeftNum) ? borderLeftNum : 0;

     const x = rect.left - menuRect.left - borderLeft - pad;
     const w = rect.width + pad * 2;

     menu.style.setProperty("--menu-thumb-x", `${x}px`);
     menu.style.setProperty("--menu-thumb-w", `${w}px`);
     menu.style.setProperty("--menu-thumb-o", show ? "1" : "0");
   };

   const setTargetClass = (targetEl) => {
     allLinks.forEach((link) => link.classList.remove("is-target"));
     if (targetEl) {
       targetEl.classList.add("is-target");
     }
   };

   const snapToCurrent = () => {
     const cur = menu.querySelector("a.is-current");
     if (cur) {
       setThumbTo(cur, true);
       setTargetClass(cur);
     } else {
       setThumbTo(null, false);
       setTargetClass(null);
     }
   };

   menu.classList.add("thumb-init");
   snapToCurrent();
   requestAnimationFrame(() => menu.classList.remove("thumb-init"));

   const realign = () => {
     if (menu.dataset.thumbHovering) {
       return;
     }
     snapToCurrent();
   };

   window.addEventListener("resize", realign);
   window.addEventListener("orientationchange", realign);
   if (document.fonts?.ready) {
     document.fonts.ready.then(realign);
   }

   if (typeof ResizeObserver !== "undefined") {
     const ro = new ResizeObserver(realign);
     ro.observe(menu);
   }

   let raf = 0;
   let target = current || allLinks[0];
   let leaveTimer = 0;

   const isHoverPointer = (event) => event && (event.pointerType === "mouse" || event.pointerType === "pen");

   const nearestLinkByX = (clientX) => {
     let best = allLinks[0];
     let bestDistance = Infinity;

     for (const link of allLinks) {
       const rect = link.getBoundingClientRect();
       const centerX = (rect.left + rect.right) / 2;
       const distance = Math.abs(clientX - centerX);
       if (distance < bestDistance) {
         bestDistance = distance;
         best = link;
       }
     }

     return best;
   };

   const tick = () => {
     raf = 0;
     setThumbTo(target, true);
     setTargetClass(target);
   };

   const cancelLeave = () => {
     if (leaveTimer) {
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

   menu.addEventListener("pointerenter", (event) => {
     if (!isHoverPointer(event)) {
       return;
     }
     cancelLeave();
     menu.dataset.thumbHovering = "1";
   });

   menu.addEventListener("pointermove", (event) => {
     if (!isHoverPointer(event)) {
       return;
     }
     cancelLeave();
     menu.dataset.thumbHovering = "1";
     const next = nearestLinkByX(event.clientX);
     if (next !== target) {
       target = next;
     }
     if (!raf) {
       raf = requestAnimationFrame(tick);
     }
   });

   menu.addEventListener("pointerleave", (event) => {
     if (!isHoverPointer(event)) {
       delete menu.dataset.thumbHovering;
       snapToCurrent();
       return;
     }
     scheduleLeave();
   });
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

     const nav = document.querySelector(".site-nav");
     if (nav?.classList.contains("nav-open")) {
       closeMobileNav();
     }

     const desktopLinks = Array.from(document.querySelectorAll(".nav-links-desktop a"));
     desktopLinks.forEach((link) => link.classList.remove("is-current"));
     desktopLinks
       .filter((link) => (link.getAttribute("href") || "") === hash)
       .forEach((link) => link.classList.add("is-current"));

     requestAnimationFrame(() => {
       scrollToTarget(hash);
     });
   });
 }

 // REMOVED setNavScrolledState()

 function initNav() {
   const nav = document.querySelector(".site-nav");
   const toggle = nav?.querySelector(".nav-toggle");
   const sheet = nav?.querySelector("#mobile-sheet");
   const brand = nav?.querySelector(".brand");
   const logo = nav?.querySelector(".brand-logo");
   const text = nav?.querySelector(".brand-text");

   if (toggle && sheet && nav) {
     sheet.setAttribute("aria-hidden", "true");

     toggle.addEventListener("click", () => {
       const open = !nav.classList.contains("nav--open");
       setNavOpenState(nav, open);
     });

     document.addEventListener("keydown", (event) => {
       if (event.key === "Escape" && nav.classList.contains("nav--open")) {
         setNavOpenState(nav, false);
       }
     });
   }

   if (brand && logo) {
     const update = () => {
       if (logo.naturalWidth > 0) {
         brand.classList.add("has-logo");
         if (text) {
           text.style.display = "none";
         }
       }
     };

     if (logo.complete) {
       update();
     }
     logo.addEventListener("load", update);
     logo.addEventListener("error", () => {
       brand.classList.remove("has-logo");
       if (text) {
         text.style.display = "inline";
       }
     });
   }

   window.addEventListener("resize", () => {
     if (!isPortraitMobile()) {
       closeMobileNav();
     }
   });

   window.addEventListener("orientationchange", () => {
     if (!isPortraitMobile()) {
       closeMobileNav();
     }
   });

   document.addEventListener("visibilitychange", () => {
     if (document.hidden) {
       closeMobileNav();
     }
   });

   initMenuThumb();
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
        // --- PATCH: update desktop nav is-current
        const desktopLinks = Array.from(document.querySelectorAll(".nav-links-desktop a"));
        desktopLinks.forEach((link) => link.classList.remove("is-current"));

        const normalizedHash = !hash || hash === "#hero" ? "" : hash;
        const currentLink = desktopLinks.find((link) => {
          const href = link.getAttribute("href") || "";
          return (href === "#hero" ? "" : href) === normalizedHash;
        }) || desktopLinks[0];

        if (currentLink) {
          currentLink.classList.add("is-current");
        }
        // --- END PATCH
        return;
      }
      const matching = links.filter((item) => item.getAttribute("href") === hash);
      setActive(matching.length ? matching : [firstLinkForHash(hash)]);
      // --- PATCH: update desktop nav is-current
      const desktopLinks = Array.from(document.querySelectorAll(".nav-links-desktop a"));
      desktopLinks.forEach((link) => link.classList.remove("is-current"));

      const normalizedHash = !hash || hash === "#hero" ? "" : hash;
      const currentLink = desktopLinks.find((link) => {
        const href = link.getAttribute("href") || "";
        return (href === "#hero" ? "" : href) === normalizedHash;
      }) || desktopLinks[0];

      if (currentLink) {
        currentLink.classList.add("is-current");
      }
      // --- END PATCH
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
    };

    const requestFrame = () => {
      if (!raf) {
        raf = requestAnimationFrame(render);
      }
    };

    requestFrame();
    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame);
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
      injectPartial("#nav-slot", "nav.html"),
      injectPartial("#footer-slot", "footer.html")
    ]);

    renderProjects();
    initYear();
    initNav();
    initAnchorScroll();
    initSectionSpy();
    initSectionDepth();
    initReveal();
    initHeroIntro();
    initParallax();
    initHoverTracking();

    if (location.hash) {
      requestAnimationFrame(() => {
        scrollToTarget(location.hash);
      });
    } else {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
