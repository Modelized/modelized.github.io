import { prefersReducedMotion } from "./context.js?v=20261002a";
import { syncRockSaltSafeAreas } from "./typography.js?v=20261007e";
import { createSettledScheduler } from "./navigation.js?v=20261002a";
function initAboutDisclosure() {
  const details = document.getElementById("about-details");
  const toggle = document.querySelector(".about-copy__toggle");
  const label = toggle?.querySelector("[data-about-toggle-label]");
  if (!details || !toggle || !label) {
    return;
  }

  const textBlocks = Array.from(details.querySelectorAll(".about-copy__title, p"));
  const motion = {
    lineDuration: 1440,
    lineStagger: 20,
    lineDistance: 16,
    heightLead: 100,
    collapseDuration: 720,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
  };
  const revealAnimations = [];
  const splitBlocks = [];
  let lineLayout = null;
  let expanded = false;
  let heightAnimation = null;
  let anchorFrame = 0;
  let anchorTop = null;
  let viewportWidth = window.innerWidth;

  const measureLines = () => {
    const bounds = details.getBoundingClientRect();
    const style = getComputedStyle(details);
    const key = [
      bounds.width,
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.fontStyle,
      style.fontStretch,
      style.lineHeight,
      style.letterSpacing,
      style.wordSpacing,
      style.fontFeatureSettings,
      style.fontVariationSettings
    ].join("|");
    if (lineLayout?.key === key) return lineLayout;

    const range = document.createRange();
    const blocks = textBlocks.flatMap((element) => {
      const node = element.firstChild;
      if (element.childNodes.length !== 1 || node?.nodeType !== Node.TEXT_NODE || !node.length) {
        return [];
      }

      range.selectNodeContents(node);
      const rows = [];
      for (const rect of range.getClientRects()) {
        if (
          rect.width &&
          rect.height &&
          (!rows.length || Math.abs(rect.top - rows[rows.length - 1].top) > 0.5)
        ) {
          rows.push(rect);
        }
      }

      const lines = [];
      let start = 0;
      rows.forEach((row, index) => {
        let end = node.length;
        if (index < rows.length - 1) {
          let low = start + 1;
          let high = node.length;
          range.setStart(node, start);
          // Find the rendered wrap without splitting words or measuring every character.
          while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            range.setEnd(node, middle);
            const rects = range.getClientRects();
            if (rects.length && rects[rects.length - 1].top <= row.top + 0.5) {
              low = middle;
            } else {
              high = middle - 1;
            }
          }
          end = low;
        }
        lines.push({ text: node.data.slice(start, end), bottom: row.bottom - bounds.top });
        start = end;
      });
      return lines.length ? [{ element, node, lines }] : [];
    });
    lineLayout = {
      key,
      blocks,
      lines: blocks.flatMap((block) => block.lines),
      height: details.scrollHeight
    };
    return lineLayout;
  };
  const getExpansion = (layout, startHeight) => {
    if (startHeight === 0 && layout.expansion) return layout.expansion;

    const delays = new Map();
    layout.lines.forEach((line) => {
      if (line.bottom <= startHeight) return;
      const delay = motion.heightLead + delays.size * motion.lineStagger;
      delays.set(line, delay);
    });
    const duration =
      motion.lineDuration +
      (delays.size ? motion.heightLead + (delays.size - 1) * motion.lineStagger : 0);
    const expansion = {
      delays,
      duration,
      keyframes: [{ height: `${startHeight}px` }, { height: `${layout.height}px` }]
    };
    if (startHeight === 0) layout.expansion = expansion;
    return expansion;
  };
  const clearLineReveal = () => {
    revealAnimations.forEach((animation) => animation.cancel());
    revealAnimations.length = 0;
    splitBlocks.forEach(({ element, node }) => element.replaceChildren(node));
    splitBlocks.length = 0;
    details.style.removeProperty("overflow");
  };
  const revealLines = (layout, expansion, startTime) => {
    // Keep the last line's travel unclipped.
    details.style.overflow = "visible";
    layout.blocks.forEach((block) => {
      if (!block.lines.some((line) => expansion.delays.has(line))) return;
      const spans = block.lines.map((line) => {
        const span = document.createElement("span");
        span.className = "about-copy__line";
        span.textContent = line.text;
        return span;
      });
      block.element.replaceChildren(...spans);
      splitBlocks.push(block);
      block.lines.forEach((line, index) => {
        const delay = expansion.delays.get(line);
        if (delay === undefined) return;
        const animation = spans[index].animate(
          [
            { opacity: 0, transform: `translateY(${motion.lineDistance}px)` },
            { opacity: 1, transform: "translateY(0)" }
          ],
          {
            duration: motion.lineDuration,
            delay,
            easing: motion.easing,
            fill: "backwards"
          }
        );
        if (startTime !== null) animation.startTime = startTime;
        revealAnimations.push(animation);
      });
    });
  };
  const releaseScrollAnchor = () => {
    cancelAnimationFrame(anchorFrame);
    anchorFrame = 0;
    anchorTop = null;
  };
  const alignToggle = () => {
    if (anchorTop === null) return;
    const delta = toggle.getBoundingClientRect().top - anchorTop;
    if (Math.abs(delta) > 0.5) {
      window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "instant" });
    }
  };
  const trackCollapse = () => {
    anchorFrame = 0;
    alignToggle();
    if (heightAnimation && !expanded && anchorTop !== null) {
      anchorFrame = requestAnimationFrame(trackCollapse);
    }
  };
  const cancelAnimations = () => {
    releaseScrollAnchor();
    heightAnimation?.cancel();
    heightAnimation = null;
    clearLineReveal();
  };
  const invalidateLines = () => {
    cancelAnimations();
    lineLayout = null;
    details.hidden = !expanded;
  };
  details.hidden = true;
  toggle.hidden = false;
  window.addEventListener("wheel", releaseScrollAnchor, { passive: true });
  window.addEventListener("touchstart", releaseScrollAnchor, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth === viewportWidth) return;
    viewportWidth = window.innerWidth;
    invalidateLines();
  });
  document.fonts?.ready.then(invalidateLines);
  document.fonts?.addEventListener("loadingdone", invalidateLines);
  document.fonts?.addEventListener("loadingerror", invalidateLines);

  toggle.addEventListener("click", () => {
    const scrollTop = window.scrollY;
    const toggleTop = toggle.getBoundingClientRect().top;
    const startHeight = details.hidden ? 0 : details.getBoundingClientRect().height;

    cancelAnimations();
    expanded = !expanded;
    details.hidden = false;
    details.inert = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    label.textContent = expanded ? "Show less" : "Show more";
    if (!expanded && toggleTop >= 0 && toggleTop < window.innerHeight) {
      anchorTop = toggleTop;
    }

    if (prefersReducedMotion || typeof details.animate !== "function") {
      details.hidden = !expanded;
      alignToggle();
      releaseScrollAnchor();
      return;
    }

    const layout = expanded ? measureLines() : null;
    const expansion = expanded ? getExpansion(layout, startHeight) : null;
    const startTime = document.timeline.currentTime;
    const animation = details.animate(
      expanded ? expansion.keyframes : [{ height: `${startHeight}px` }, { height: "0px" }],
      {
        duration: expanded ? expansion.duration : motion.collapseDuration,
        easing: motion.easing,
        fill: "both"
      }
    );
    if (startTime !== null) animation.startTime = startTime;
    heightAnimation = animation;
    animation.onfinish = () => {
      if (heightAnimation !== animation) return;
      details.hidden = !expanded;
      animation.cancel();
      heightAnimation = null;
      clearLineReveal();
      alignToggle();
      releaseScrollAnchor();
    };

    if (expanded) {
      revealLines(layout, expansion, startTime);
      window.scrollTo({ top: scrollTop, behavior: "instant" });
    } else {
      // Follow the shrinking content only until the user starts scrolling.
      trackCollapse();
    }
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
  if (
    !prefix ||
    !suffix ||
    !viewport ||
    !track ||
    !words.length ||
    glyphs.some((glyph) => !glyph)
  ) {
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

  const measureLayoutWidth = () =>
    Math.round(title.offsetWidth || title.clientWidth || title.getBoundingClientRect().width);
  const measureViewportWidth = () =>
    Math.round(document.documentElement.clientWidth || window.innerWidth || 0);

  const setImmediateTransitions = (enabled) => {
    const value = enabled ? "none" : "";
    viewport.style.transition = value;
    track.style.transition = value;
  };

  const updateLineBreaks = (longestWidth) => {
    const availableWidth = Math.round(
      title.clientWidth || title.getBoundingClientRect().width || 0
    );
    if (!availableWidth) {
      return;
    }

    const columnGap = parseFloat(getComputedStyle(title).columnGap) || 0;
    const prefixWidth = Math.ceil(prefix.getBoundingClientRect().width);
    const suffixWidth = Math.ceil(suffix.getBoundingClientRect().width);

    const breakBeforeWord = prefixWidth + columnGap + longestWidth > availableWidth;
    const breakBeforeBehind =
      (breakBeforeWord
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

export { initAboutDisclosure, initAboutCreator };
