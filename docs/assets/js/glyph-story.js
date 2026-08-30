(function () {
  "use strict";

  const root = document.querySelector("#glyph-story");
  const trigger = document.querySelector(".hero-project-logo-frame");
  if (!root || !trigger) return;

  const visual = root.querySelector("[data-glyph-visual]");
  const grid = root.querySelector(".glyph-story__grid");
  const bloom = root.querySelector(".glyph-story__bloom");
  const rail = root.querySelector("[data-glyph-rail]");
  const mark = root.querySelector("[data-glyph-mark]");
  const control = root.querySelector("[data-glyph-control]");
  const previousButton = root.querySelector("[data-glyph-previous]");
  const nextButton = root.querySelector("[data-glyph-next]");
  const details = root.querySelector(".glyph-story__details");
  const finishButton = root.querySelector("[data-glyph-finish]");
  const closeButton = root.querySelector("[data-glyph-close]");
  const epilogue = root.querySelector(".glyph-story__epilogue");
  const pieces = Array.from(root.querySelectorAll("[data-glyph-piece]"));
  const panels = Array.from(root.querySelectorAll("[data-glyph-panel]"));
  const progressItems = Array.from(root.querySelectorAll("[data-glyph-progress]"));
  const motions = pieces.map((piece) => piece.querySelector(".glyph-piece__motion"));
  const forms = pieces.map((piece) => piece.querySelector(".glyph-piece__form"));
  const fillPaths = Array.from(
    root.querySelectorAll(".glyph-piece__art .glyph-piece__fill")
  );
  const artPaths = Array.from(
    root.querySelectorAll(".glyph-piece__art .glyph-piece__outline")
  );
  const glowPaths = Array.from(
    root.querySelectorAll(".glyph-piece__glow .glyph-piece__outline")
  );
  const glowLayers = pieces.map((piece) => piece.querySelector(".glyph-piece__glow"));
  const outlinePaths = [...artPaths, ...glowPaths];
  const keys = pieces.map((piece) => piece.dataset.glyphPiece);
  const gridContext = grid?.getContext("2d");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stackedLayout = window.matchMedia(
    "(max-width: 900px), (min-width: 901px) and (max-aspect-ratio: 9 / 16)"
  );
  if (
    !visual ||
    !grid ||
    !gridContext ||
    !bloom ||
    !rail ||
    !mark ||
    !control ||
    !previousButton ||
    !nextButton ||
    !details ||
    !finishButton ||
    !closeButton ||
    !epilogue ||
    motions.some((motion) => !motion) ||
    forms.some((form) => !form) ||
    glowLayers.some((layer) => !layer)
  ) {
    return;
  }

  const pieceNames = {
    m: "The Formless",
    o: "The Aperture",
    d: "The Structure"
  };
  const settleEase = "cubic-bezier(0.16, 1, 0.3, 1)";

  let state = "closed";
  let activeIndex = 0;
  let currentRotation = 0;
  let transitioning = false;
  let lastFocused = null;
  let keyboardSession = false;
  let programmaticScroll = false;
  let pointerGesture = null;
  let railAnimationFrame = 0;
  let railVisualFrame = 0;
  let railCommitTimer = 0;
  let finishRevealFrame = 0;
  let reflowFrame = 0;
  let gridDrawFrame = 0;
  let transitionTimeline = null;
  let pendingReflow = false;
  let lastViewportWidth = window.innerWidth;
  let lastViewportHeight = window.innerHeight;
  let lastLayoutIsStacked = stackedLayout.matches;
  const supportsScrollEnd = "onscrollend" in rail;
  const activeAnimations = new Set();
  const visited = new Set();
  const dashLengths = new WeakMap();

  const nextFrame = () => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const clamp = (value, minimum, maximum) => (
    Math.min(maximum, Math.max(minimum, value))
  );

  const setFloatStrength = (value) => {
    root.style.setProperty(
      "--glyph-float-strength",
      String(clamp(value, 0, 1))
    );
  };

  const mix = (start, end, progress) => (
    start + ((end - start) * progress)
  );

  const cubicBezier = (x1, y1, x2, y2) => {
    const sample = (point1, point2, value) => {
      const inverse = 1 - value;
      return (
        (3 * inverse * inverse * value * point1) +
        (3 * inverse * value * value * point2) +
        (value * value * value)
      );
    };

    return (value) => {
      const target = clamp(value, 0, 1);
      if (target === 0 || target === 1) return target;

      let lower = 0;
      let upper = 1;
      let parameter = target;
      for (let index = 0; index < 12; index += 1) {
        const sampledX = sample(x1, x2, parameter);
        if (sampledX < target) lower = parameter;
        else upper = parameter;
        parameter = (lower + upper) / 2;
      }
      return sample(y1, y2, parameter);
    };
  };

  const transitionEase = cubicBezier(0.22, 1, 0.36, 1);
  const outlineEase = cubicBezier(0.18, 0.88, 0.25, 1);

  const configureOutlinePaths = () => {
    outlinePaths.forEach((path) => {
      let dashLength = 1000;
      try {
        const measuredLength = path.getTotalLength();
        const svg = path.ownerSVGElement;
        const svgRect = svg?.getBoundingClientRect();
        const viewBox = svg?.viewBox?.baseVal;
        const renderedScale = (
          svgRect &&
          viewBox &&
          viewBox.width > 0 &&
          viewBox.height > 0 &&
          svgRect.width > 0 &&
          svgRect.height > 0
        )
          ? Math.min(
            svgRect.width / viewBox.width,
            svgRect.height / viewBox.height
          )
          : 1;
        if (Number.isFinite(measuredLength) && measuredLength > 0) {
          dashLength = Math.ceil(measuredLength * renderedScale);
        }
      } catch {
        // The shared fallback still uses the same dash model for every path.
      }

      dashLengths.set(path, dashLength);
      path.removeAttribute("pathLength");
      path.removeAttribute("stroke-dasharray");
      path.removeAttribute("stroke-dashoffset");
      path.style.strokeDasharray = `${dashLength} ${dashLength}`;
      path.style.strokeDashoffset = "0";
    });
  };

  const dashLengthFor = (path) => dashLengths.get(path) || 1000;

  const cancelTransitionTimeline = () => {
    if (!transitionTimeline) return;

    cancelAnimationFrame(transitionTimeline.frame);
    const resolve = transitionTimeline.resolve;
    transitionTimeline = null;
    resolve(false);
  };

  const runFrameTimeline = (duration, update) => {
    cancelTransitionTimeline();
    if (reducedMotion.matches || duration <= 0) {
      update(1);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const timeline = {
        frame: 0,
        resolve,
        startedAt: null
      };
      transitionTimeline = timeline;

      const tick = (now) => {
        if (transitionTimeline !== timeline) return;
        if (timeline.startedAt === null) timeline.startedAt = now;

        const progress = clamp((now - timeline.startedAt) / duration, 0, 1);
        update(progress);
        if (progress < 1) {
          timeline.frame = requestAnimationFrame(tick);
          return;
        }

        transitionTimeline = null;
        resolve(true);
      };

      timeline.frame = requestAnimationFrame(tick);
    });
  };

  const setPathDash = (path, progress) => {
    path.style.strokeDashoffset = String(
      dashLengthFor(path) * (1 - clamp(progress, 0, 1))
    );
  };

  const applyEntryVisual = (progress) => {
    const outlineProgress = outlineEase(progress);
    const fillProgress = transitionEase(clamp(progress / 0.72, 0, 1));
    const glowProgress = transitionEase(clamp((progress - 0.08) / 0.92, 0, 1));

    fillPaths.forEach((path) => {
      path.style.fill = `rgba(255, 255, 255, ${1 - fillProgress})`;
      path.style.fillOpacity = "1";
    });
    artPaths.forEach((path) => {
      setPathDash(path, outlineProgress);
      path.style.stroke = `rgba(255, 169, 99, ${0.96 * outlineProgress})`;
    });
    glowPaths.forEach((path) => setPathDash(path, outlineProgress));
    glowLayers.forEach((layer) => {
      layer.style.opacity = String(0.5 * glowProgress);
    });
  };

  const applyClosingVisual = (
    progress,
    fromFilled,
    easedProgress = transitionEase(progress)
  ) => {
    const visualProgress = easedProgress;
    const outlineProgress = 1 - visualProgress;

    fillPaths.forEach((path) => {
      const startGreen = fromFilled ? 159 : 255;
      const startBlue = fromFilled ? 85 : 255;
      const startAlpha = fromFilled ? 1 : 0;
      path.style.fill = `rgba(255, ${mix(startGreen, 255, visualProgress)}, ${mix(startBlue, 255, visualProgress)}, ${mix(startAlpha, 1, visualProgress)})`;
      path.style.fillOpacity = "1";
    });
    artPaths.forEach((path) => {
      setPathDash(path, outlineProgress);
      path.style.stroke = `rgba(255, ${mix(fromFilled ? 208 : 169, 169, visualProgress)}, ${mix(fromFilled ? 170 : 99, 99, visualProgress)}, ${0.96 * outlineProgress})`;
    });
    glowPaths.forEach((path) => setPathDash(path, outlineProgress));
    glowLayers.forEach((layer) => {
      layer.style.opacity = String((fromFilled ? 0.8 : 0.5) * outlineProgress);
    });
  };

  const applyAssemblyVisual = (progress) => {
    const bloomPeak = 0.3;
    const bloomIn = transitionEase(clamp(progress / bloomPeak, 0, 1));
    const bloomReleaseProgress = clamp(
      (progress - bloomPeak) / (1 - bloomPeak),
      0,
      1
    );
    const bloomSpread = 1 - Math.pow(1 - clamp(progress, 0, 1), 2.2);
    const fillProgress = transitionEase(clamp((progress - 0.28) / 0.66, 0, 1));
    const bloomOpacity = progress <= bloomPeak
      ? bloomIn
      : Math.pow(1 - bloomReleaseProgress, 1.08);
    const bloomScale = mix(0.16, 1.94, bloomSpread);

    bloom.style.opacity = String(bloomOpacity);
    bloom.style.transform = `translate(-50%, -50%) scale(${bloomScale})`;
    fillPaths.forEach((path) => {
      path.style.fill = `rgba(255, 159, 85, ${fillProgress})`;
      path.style.fillOpacity = "1";
    });
    artPaths.forEach((path) => {
      path.style.stroke = `rgb(255, ${mix(169, 208, fillProgress)}, ${mix(99, 170, fillProgress)})`;
      path.style.strokeDashoffset = "0";
    });
    glowLayers.forEach((layer) => {
      layer.style.opacity = String(mix(0.5, 0.8, fillProgress));
    });
  };

  const clearFrameDrivenStyles = () => {
    fillPaths.forEach((path) => {
      path.style.removeProperty("fill");
      path.style.removeProperty("fill-opacity");
    });
    outlinePaths.forEach((path) => {
      path.style.removeProperty("stroke-dasharray");
      path.style.removeProperty("stroke-dashoffset");
      path.style.removeProperty("stroke");
    });
    glowLayers.forEach((layer) => layer.style.removeProperty("opacity"));
    bloom.style.removeProperty("opacity");
    bloom.style.removeProperty("transform");
    root.classList.remove("is-frame-driven");
  };

  const deactivateBloom = () => {
    bloom.hidden = true;
    bloom.style.removeProperty("opacity");
    bloom.style.removeProperty("transform");
  };

  const drawGlyphGrid = () => {
    gridDrawFrame = 0;
    const bounds = visual.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (width <= 0 || height <= 0) return;

    const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (grid.width !== pixelWidth || grid.height !== pixelHeight) {
      grid.width = pixelWidth;
      grid.height = pixelHeight;
    }

    gridContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    gridContext.clearRect(0, 0, width, height);
    gridContext.lineWidth = 1 / dpr;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const spacing = clamp(width * 0.032, rootFontSize * 0.9, rootFontSize * 2.1);
    const centerX = width / 2;
    const centerY = height / 2;
    const focusGrid = state === "focus";
    const snap = (value) => (Math.round(value * dpr) + 0.5) / dpr;

    const drawLine = (x1, y1, x2, y2, color) => {
      gridContext.beginPath();
      gridContext.strokeStyle = color;
      gridContext.moveTo(snap(x1), snap(y1));
      gridContext.lineTo(snap(x2), snap(y2));
      gridContext.stroke();
    };

    const verticalStart = -Math.ceil(centerX / spacing);
    const verticalEnd = Math.ceil((width - centerX) / spacing);
    for (let index = verticalStart; index <= verticalEnd; index += 1) {
      const isCenter = index === 0;
      const isMajor = index % 4 === 0;
      const color = isCenter && focusGrid
        ? "rgba(255, 159, 85, 0.28)"
        : isMajor
          ? "rgba(255, 168, 98, 0.09)"
          : "rgba(255, 255, 255, 0.032)";
      drawLine(centerX + (index * spacing), 0, centerX + (index * spacing), height, color);
    }

    const horizontalStart = -Math.ceil(centerY / spacing);
    const horizontalEnd = Math.ceil((height - centerY) / spacing);
    for (let index = horizontalStart; index <= horizontalEnd; index += 1) {
      const isCenter = index === 0;
      const isMajor = index % 4 === 0;
      const color = isCenter && focusGrid
        ? "rgba(255, 159, 85, 0.28)"
        : isMajor
          ? "rgba(255, 168, 98, 0.09)"
          : "rgba(255, 255, 255, 0.032)";
      drawLine(0, centerY + (index * spacing), width, centerY + (index * spacing), color);
    }
  };

  const scheduleGridDraw = () => {
    cancelAnimationFrame(gridDrawFrame);
    gridDrawFrame = requestAnimationFrame(drawGlyphGrid);
  };

  const rotationForProgress = (progress) => (
    Math.sin(clamp(progress, 0, pieces.length - 1) * (Math.PI / 2)) * 90
  );

  const easeInOutCubic = (value) => (
    value < 0.5
      ? 4 * value * value * value
      : 1 - (Math.pow((-2 * value) + 2, 3) / 2)
  );

  const rectCenter = (rect) => ({
    x: rect.left + (rect.width / 2),
    y: rect.top + (rect.height / 2)
  });

  const setScrollLocked = (locked) => {
    document.documentElement.classList.toggle("glyph-story-lock", locked);
    document.body.classList.toggle("glyph-story-lock", locked);
  };

  const cancelActiveAnimations = () => {
    activeAnimations.forEach((animation) => animation.cancel());
    activeAnimations.clear();
  };

  const animateElement = async (element, keyframes, options) => {
    if (reducedMotion.matches || typeof element.animate !== "function") return;

    const animation = element.animate(keyframes, options);
    activeAnimations.add(animation);
    try {
      await animation.finished;
    } catch {
      // A newer state owns this element.
    } finally {
      activeAnimations.delete(animation);
      animation.cancel();
    }
  };

  const cancelRailAnimation = () => {
    if (railAnimationFrame) {
      cancelAnimationFrame(railAnimationFrame);
      railAnimationFrame = 0;
    }
    programmaticScroll = false;
    rail.classList.remove("is-animating");
  };

  const clearRailCommit = () => {
    window.clearTimeout(railCommitTimer);
    railCommitTimer = 0;
  };

  const clearFinishReveal = ({ preserveVisible = true } = {}) => {
    cancelAnimationFrame(finishRevealFrame);
    finishRevealFrame = 0;

    if (!preserveVisible || !finishButton.classList.contains("is-visible")) {
      details.classList.remove("is-finish-reserving");
      finishButton.classList.remove("is-visible");
      finishButton.disabled = true;
      finishButton.setAttribute("aria-hidden", "true");
    }
  };

  const updateEdgeControls = () => {
    const focusState = state === "focus";

    previousButton.disabled = !focusState || activeIndex === 0;
    nextButton.disabled = (
      !focusState ||
      activeIndex === pieces.length - 1
    );
    previousButton.setAttribute(
      "aria-hidden",
      focusState ? "false" : "true"
    );
    nextButton.setAttribute(
      "aria-hidden",
      focusState ? "false" : "true"
    );
  };

  const setState = (nextState) => {
    state = nextState;
    root.dataset.state = nextState;
    scheduleGridDraw();

    pieces.forEach((piece) => {
      piece.disabled = nextState !== "overview";
    });
    control.disabled = nextState !== "overview" && nextState !== "focus";
    finishButton.disabled = (
      nextState !== "focus" ||
      visited.size !== pieces.length ||
      !finishButton.classList.contains("is-visible")
    );
    closeButton.disabled = nextState !== "epilogue";
    rail.tabIndex = nextState === "focus" ? 0 : -1;
    updateEdgeControls();
  };

  const getTriggerRect = () => {
    const frameRect = trigger.getBoundingClientRect();
    const size = Math.max(1, Math.min(frameRect.width, frameRect.height));
    const center = rectCenter(frameRect);
    return {
      left: center.x - (size / 2),
      top: center.y - (size / 2),
      width: size,
      height: size,
      right: center.x + (size / 2),
      bottom: center.y + (size / 2)
    };
  };

  const markTransformMetricsForRect = (targetRect, baseRect) => {
    const targetCenter = rectCenter(targetRect);
    const baseCenter = rectCenter(baseRect);
    return {
      x: targetCenter.x - baseCenter.x,
      y: targetCenter.y - baseCenter.y,
      scale: Math.max(
        0.001,
        Math.min(targetRect.width / baseRect.width, targetRect.height / baseRect.height)
      )
    };
  };

  const formatMarkTransform = ({ x, y, scale }) => (
    `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  );

  const interpolateMarkTransform = (start, end, progress) => formatMarkTransform({
    x: mix(start.x, end.x, progress),
    y: mix(start.y, end.y, progress),
    scale: mix(start.scale, end.scale, progress)
  });

  const startMarkTransformAnimation = (start, end, duration) => {
    if (reducedMotion.matches || typeof mark.animate !== "function") return null;

    return mark.animate(
      [
        { transform: formatMarkTransform(start) },
        { transform: formatMarkTransform(end) }
      ],
      {
        duration,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
  };

  const finishMarkTransformAnimation = (animation, metrics) => {
    mark.style.transform = formatMarkTransform(metrics);
    animation?.cancel();
  };

  const targetScrollLeft = (index) => {
    const piece = pieces[index];
    if (!piece) return 0;
    const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const centered = piece.offsetLeft - ((rail.clientWidth - piece.offsetWidth) / 2);
    return clamp(centered, 0, maximum);
  };

  const railStep = () => {
    if (pieces.length > 1) {
      const difference = targetScrollLeft(1) - targetScrollLeft(0);
      if (Math.abs(difference) > 1) return difference;
    }
    return Math.max(1, rail.clientWidth);
  };

  const railProgress = () => (
    clamp(rail.scrollLeft / Math.max(1, railStep()), 0, pieces.length - 1)
  );

  const syncProgress = () => {
    const activeKey = keys[activeIndex];
    progressItems.forEach((item) => {
      const key = item.dataset.glyphProgress;
      const selected = key === activeKey;
      const explored = visited.has(key);
      item.classList.toggle("is-active", selected);
      item.classList.toggle("is-visited", explored);
      item.setAttribute(
        "aria-label",
        `${pieceNames[key]} ${selected ? "selected" : explored ? "explored" : "not explored"}`
      );
    });
  };

  const setActiveIndex = (index, { visit = false } = {}) => {
    activeIndex = clamp(index, 0, pieces.length - 1);
    const activeKey = keys[activeIndex];

    pieces.forEach((piece, pieceIndex) => {
      const selected = pieceIndex === activeIndex;
      piece.classList.toggle("is-active", selected);
      piece.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    panels.forEach((panel, panelIndex) => {
      const selected = panelIndex === activeIndex;
      panel.classList.toggle("is-active", selected);
      panel.setAttribute("aria-hidden", selected ? "false" : "true");
    });

    if (visit) visited.add(activeKey);
    syncProgress();
    updateEdgeControls();
  };

  const scheduleFinishReveal = () => {
    if (
      state !== "focus" ||
      visited.size !== pieces.length ||
      finishButton.classList.contains("is-visible")
    ) {
      return;
    }

    clearFinishReveal({ preserveVisible: false });
    details.classList.add("is-finish-reserving");
    finishRevealFrame = requestAnimationFrame(() => {
      finishRevealFrame = 0;
      if (state !== "focus" || visited.size !== pieces.length || transitioning) return;
      finishButton.classList.add("is-visible");
      finishButton.disabled = false;
      finishButton.setAttribute("aria-hidden", "false");
    });
  };

  const prepareForNavigation = () => {
    clearRailCommit();
    if (!finishButton.classList.contains("is-visible")) {
      clearFinishReveal({ preserveVisible: false });
    }
  };

  const updateRailVisuals = () => {
    if (state !== "focus") return;

    const progress = railProgress();
    currentRotation = rotationForProgress(progress);
    const nearest = clamp(Math.round(progress), 0, pieces.length - 1);

    pieces.forEach((piece, index) => {
      const delta = index - progress;
      const distance = Math.abs(delta);
      piece.style.setProperty("--rail-rotation", `${currentRotation.toFixed(3)}deg`);
      piece.style.setProperty(
        "--rail-scale",
        String(clamp(1 - (distance * 0.075), 0.91, 1))
      );
      piece.style.setProperty(
        "--rail-opacity",
        String(clamp(1 - (distance * 1.08), 0, 1))
      );
    });

    panels.forEach((panel, index) => {
      const delta = index - progress;
      const distance = Math.abs(delta);
      panel.style.setProperty(
        "--panel-shift",
        `${(clamp(delta, -1, 1) * 42).toFixed(2)}px`
      );
      panel.style.setProperty(
        "--panel-opacity",
        String(clamp(1 - (distance * 1.06), 0, 1))
      );
    });

    if (nearest !== activeIndex) setActiveIndex(nearest);
  };

  const alignRailToIndex = (index, { visit = false } = {}) => {
    rail.scrollLeft = targetScrollLeft(index);
    setActiveIndex(index, { visit });
    updateRailVisuals();
  };

  const commitRailSelection = () => {
    if (
      state !== "focus" ||
      transitioning ||
      programmaticScroll ||
      pointerGesture
    ) {
      return;
    }

    const nearest = clamp(Math.round(railProgress()), 0, pieces.length - 1);
    setActiveIndex(nearest, { visit: true });
    updateRailVisuals();
    scheduleFinishReveal();
  };

  const scheduleRailCommit = (delay = 180) => {
    clearRailCommit();
    railCommitTimer = window.setTimeout(commitRailSelection, delay);
  };

  const animateRailTo = (index, duration = 720) => {
    if (state !== "focus" || transitioning) return;

    const nextIndex = clamp(index, 0, pieces.length - 1);
    prepareForNavigation();
    cancelRailAnimation();

    const destination = targetScrollLeft(nextIndex);
    const start = rail.scrollLeft;
    const distance = destination - start;
    if (reducedMotion.matches || Math.abs(distance) < 1) {
      rail.scrollLeft = destination;
      setActiveIndex(nextIndex, { visit: true });
      updateRailVisuals();
      scheduleFinishReveal();
      return;
    }

    programmaticScroll = true;
    rail.classList.add("is-animating");
    const startedAt = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      rail.scrollLeft = start + (distance * easeInOutCubic(progress));
      updateRailVisuals();

      if (progress < 1) {
        railAnimationFrame = requestAnimationFrame(step);
        return;
      }

      railAnimationFrame = 0;
      rail.scrollLeft = destination;
      programmaticScroll = false;
      rail.classList.remove("is-animating");
      setActiveIndex(nextIndex, { visit: true });
      updateRailVisuals();
      scheduleFinishReveal();
      if (keyboardSession) rail.focus({ preventScroll: true });
    };

    railAnimationFrame = requestAnimationFrame(step);
  };

  const captureFormRects = () => forms.map((form) => form.getBoundingClientRect());

  const translationKeyframes = (startRect, endRect, rotationDelta) => {
    const startCenter = rectCenter(startRect);
    const endCenter = rectCenter(endRect);
    const scaleX = startRect.width / Math.max(1, endRect.width);
    const scaleY = startRect.height / Math.max(1, endRect.height);
    return [
      {
        transform: [
          `translate(${startCenter.x - endCenter.x}px, ${startCenter.y - endCenter.y}px)`,
          `scale(${scaleX}, ${scaleY})`,
          `rotate(${rotationDelta}deg)`
        ].join(" ")
      },
      { transform: "translate(0, 0) scale(1, 1) rotate(0deg)" }
    ];
  };

  const transitionForms = async ({ mutate, duration, targetRotation }) => {
    if (transitioning) return false;

    transitioning = true;
    cancelActiveAnimations();
    cancelRailAnimation();
    prepareForNavigation();

    const startRotation = currentRotation;
    const before = captureFormRects();
    root.classList.add("is-transitioning");
    mutate();
    void root.offsetWidth;
    const after = captureFormRects();
    const rotationDelta = startRotation - targetRotation;

    if (!reducedMotion.matches) {
      await Promise.all(motions.map((motion, index) => animateElement(
        motion,
        translationKeyframes(before[index], after[index], rotationDelta),
        {
          duration,
          easing: settleEase,
          fill: "both"
        }
      )));
    }

    currentRotation = targetRotation;
    root.classList.remove("is-transitioning");
    transitioning = false;
    if (pendingReflow) performResponsiveReflow();
    return true;
  };

  const resetPieceStyles = () => {
    currentRotation = 0;
    pieces.forEach((piece) => {
      piece.classList.remove("is-active");
      piece.setAttribute("aria-pressed", "false");
      piece.style.setProperty("--rail-rotation", "0deg");
      piece.style.setProperty("--rail-scale", "1");
      piece.style.setProperty("--rail-opacity", "1");
    });
  };

  const resetExploration = () => {
    cancelTransitionTimeline();
    cancelRailAnimation();
    cancelActiveAnimations();
    clearRailCommit();
    clearFinishReveal({ preserveVisible: false });
    visited.clear();
    activeIndex = 0;
    pointerGesture = null;
    rail.scrollLeft = 0;
    root.classList.remove(
      "is-transitioning",
      "is-filled",
      "is-closing",
      "is-reflowing"
    );
    clearFrameDrivenStyles();
    deactivateBloom();
    root.style.removeProperty("--glyph-float-strength");
    mark.style.removeProperty("transform");
    mark.style.removeProperty("opacity");
    resetPieceStyles();

    panels.forEach((panel, index) => {
      panel.classList.remove("is-active");
      panel.setAttribute("aria-hidden", "true");
      panel.style.setProperty("--panel-shift", `${index * 42}px`);
      panel.style.setProperty("--panel-opacity", "0");
    });
    progressItems.forEach((item) => {
      item.classList.remove("is-active", "is-visited");
      const key = item.dataset.glyphProgress;
      item.setAttribute("aria-label", `${pieceNames[key]} not explored`);
    });
    finishButton.classList.remove("is-visible");
    finishButton.disabled = true;
    finishButton.setAttribute("aria-hidden", "true");
    epilogue.setAttribute("aria-hidden", "true");
    control.setAttribute("aria-label", "Close glyph story");
    updateEdgeControls();
  };

  const focusPiece = async (index) => {
    if (transitioning || state !== "overview") return;

    const selectedIndex = clamp(index, 0, pieces.length - 1);
    pieces[selectedIndex]?.blur();
    control.setAttribute("aria-label", "Return to glyph overview");

    const changed = await transitionForms({
      duration: 1040,
      targetRotation: rotationForProgress(selectedIndex),
      mutate: () => {
        setState("focus");
        void rail.offsetWidth;
        alignRailToIndex(selectedIndex);
      }
    });
    if (!changed) return;

    setActiveIndex(selectedIndex, { visit: true });
    updateRailVisuals();
    scheduleFinishReveal();
    if (keyboardSession) rail.focus({ preventScroll: true });
  };

  const returnToOverview = async () => {
    if (state !== "focus" || transitioning) return;

    control.setAttribute("aria-label", "Close glyph story");
    clearFinishReveal({ preserveVisible: false });
    const changed = await transitionForms({
      duration: 900,
      targetRotation: 0,
      mutate: () => {
        setState("overview");
        rail.scrollLeft = 0;
        resetPieceStyles();
        panels.forEach((panel) => {
          panel.classList.remove("is-active");
          panel.setAttribute("aria-hidden", "true");
        });
        progressItems.forEach((item) => item.classList.remove("is-active"));
      }
    });

    if (changed && keyboardSession) control.focus({ preventScroll: true });
  };

  const openStory = async (event) => {
    if (state !== "closed" || transitioning || trigger.disabled) return;

    transitioning = true;
    keyboardSession = event?.detail === 0;
    lastFocused = document.activeElement;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    await nextFrame();
    document.documentElement.style.scrollBehavior = previousScrollBehavior;

    resetExploration();
    setFloatStrength(0);
    const sourceRect = getTriggerRect();
    root.hidden = false;
    root.inert = false;
    root.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    setState("entering");
    setScrollLocked(true);

    // Measure once while hidden, then let one frame loop own every visual value.
    await nextFrame();
    configureOutlinePaths();
    const baseRect = mark.getBoundingClientRect();
    const sourceMetrics = markTransformMetricsForRect(sourceRect, baseRect);
    const destinationMetrics = { x: 0, y: 0, scale: 1 };
    root.classList.add("is-frame-driven");
    applyEntryVisual(0);
    mark.style.transform = formatMarkTransform(sourceMetrics);
    mark.style.opacity = "1";
    void mark.offsetWidth;

    // The replacement is visible before the source is hidden, preventing a flash.
    root.classList.add("is-open");
    document.body.classList.add("glyph-story-active", "glyph-story-source-hidden");
    await nextFrame();

    const entryDuration = 1180;
    const markAnimation = startMarkTransformAnimation(
      sourceMetrics,
      destinationMetrics,
      entryDuration
    );
    const completed = await runFrameTimeline(entryDuration, (progress) => {
      const eased = transitionEase(progress);
      if (!markAnimation) {
        mark.style.transform = interpolateMarkTransform(
          sourceMetrics,
          destinationMetrics,
          eased
        );
      }
      setFloatStrength(eased);
      applyEntryVisual(progress);
    });
    if (!completed) {
      markAnimation?.cancel();
      return;
    }

    applyEntryVisual(1);
    setFloatStrength(1);
    finishMarkTransformAnimation(markAnimation, destinationMetrics);
    setState("overview");
    await nextFrame();
    clearFrameDrivenStyles();
    root.style.removeProperty("--glyph-float-strength");
    mark.style.removeProperty("transform");
    mark.style.removeProperty("opacity");
    transitioning = false;
    if (pendingReflow) performResponsiveReflow();
    if (keyboardSession) control.focus({ preventScroll: true });
  };

  const closeStory = async () => {
    if (
      (state !== "overview" && state !== "epilogue") ||
      transitioning
    ) {
      return;
    }

    const closingFromFilled = state === "epilogue";
    transitioning = true;
    cancelActiveAnimations();
    cancelRailAnimation();
    clearFinishReveal({ preserveVisible: false });
    setFloatStrength(1);
    document.body.classList.add("glyph-story-measuring-home");
    window.dispatchEvent(new Event("glyph-story:prepare-close"));

    const currentRect = mark.getBoundingClientRect();
    const targetRect = getTriggerRect();
    root.classList.add("is-closing", "is-transitioning", "is-frame-driven");
    setState("closing");
    void root.offsetWidth;
    configureOutlinePaths();
    const baseRect = mark.getBoundingClientRect();
    const startMetrics = markTransformMetricsForRect(currentRect, baseRect);
    const targetMetrics = markTransformMetricsForRect(targetRect, baseRect);
    mark.style.transform = formatMarkTransform(startMetrics);
    mark.style.opacity = "1";
    applyClosingVisual(0, closingFromFilled);
    document.body.classList.remove(
      "glyph-story-active",
      "glyph-story-measuring-home"
    );

    const closingDuration = 980;
    const markAnimation = startMarkTransformAnimation(
      startMetrics,
      targetMetrics,
      closingDuration
    );
    const completed = await runFrameTimeline(closingDuration, (progress) => {
      const eased = transitionEase(progress);
      setFloatStrength(1 - eased);
      if (!markAnimation) {
        mark.style.transform = interpolateMarkTransform(
          startMetrics,
          targetMetrics,
          eased
        );
      }
      applyClosingVisual(progress, closingFromFilled, eased);
    });
    if (!completed) {
      markAnimation?.cancel();
      return;
    }

    applyClosingVisual(1, closingFromFilled);
    setFloatStrength(0);
    finishMarkTransformAnimation(markAnimation, targetMetrics);
    document.body.classList.remove("glyph-story-source-hidden");
    await nextFrame();

    root.classList.remove(
      "is-open",
      "is-closing",
      "is-transitioning",
      "is-filled"
    );
    root.hidden = true;
    root.inert = true;
    root.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    clearFrameDrivenStyles();
    mark.style.removeProperty("transform");
    mark.style.removeProperty("opacity");
    resetExploration();
    setState("closed");
    pendingReflow = false;

    // Tear down the fixed surface before Safari recalculates its dynamic
    // viewport when the page scroll lock is released.
    setScrollLocked(false);
    await nextFrame();
    window.dispatchEvent(new Event("glyph-story:closed"));
    transitioning = false;

    if (keyboardSession) {
      const focusTarget = lastFocused instanceof HTMLElement ? lastFocused : trigger;
      focusTarget?.focus?.({ preventScroll: true });
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keyboardSession = false;
  };

  const finishExploration = async () => {
    if (state !== "focus" || transitioning || visited.size !== pieces.length) return;

    clearFinishReveal({ preserveVisible: false });
    control.setAttribute("aria-label", "Close glyph story");
    epilogue.setAttribute("aria-hidden", "false");

    bloom.hidden = false;
    root.classList.add("is-frame-driven");
    applyAssemblyVisual(0);
    const changed = await transitionForms({
      duration: 980,
      targetRotation: 0,
      mutate: () => {
        setState("synthesis");
        rail.scrollLeft = 0;
        resetPieceStyles();
      }
    });
    if (!changed) {
      deactivateBloom();
      return;
    }

    const completed = await runFrameTimeline(1900, applyAssemblyVisual);
    if (!completed) {
      deactivateBloom();
      return;
    }

    root.classList.add("is-filled");
    applyAssemblyVisual(1);
    setState("epilogue");
    await nextFrame();
    clearFrameDrivenStyles();
    deactivateBloom();
    if (keyboardSession) closeButton.focus({ preventScroll: true });
  };

  const handleRailScroll = () => {
    if (state !== "focus") return;
    if (!railVisualFrame) {
      railVisualFrame = requestAnimationFrame(() => {
        railVisualFrame = 0;
        updateRailVisuals();
      });
    }
    if (!programmaticScroll && !supportsScrollEnd) {
      scheduleRailCommit(180);
    }
  };

  const handleRailWheel = (event) => {
    if (state !== "focus" || transitioning) return;
    const horizontalIntent = (
      event.shiftKey ||
      Math.abs(event.deltaX) > Math.max(4, Math.abs(event.deltaY) * 0.85)
    );
    if (!horizontalIntent) return;

    keyboardSession = false;
    prepareForNavigation();
    if (programmaticScroll) cancelRailAnimation();
  };

  const handlePointerDown = (event) => {
    if (state !== "focus" || transitioning || !event.isPrimary) return;
    pointerGesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      decided: false
    };
  };

  const handlePointerMove = (event) => {
    if (
      !pointerGesture ||
      pointerGesture.id !== event.pointerId ||
      pointerGesture.decided
    ) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerGesture.x);
    const deltaY = Math.abs(event.clientY - pointerGesture.y);
    if (Math.max(deltaX, deltaY) < 10) return;

    pointerGesture.decided = true;
    if (deltaX > deltaY * 1.1) {
      keyboardSession = false;
      prepareForNavigation();
      if (programmaticScroll) cancelRailAnimation();
    }
  };

  const endPointerGesture = (event) => {
    if (!pointerGesture || pointerGesture.id !== event.pointerId) return;
    pointerGesture = null;
    if (!supportsScrollEnd) scheduleRailCommit(180);
  };

  const handlePieceClick = (event) => {
    if (transitioning || state !== "overview") return;
    const index = pieces.indexOf(event.currentTarget);
    if (index >= 0) focusPiece(index);
  };

  const handleControl = () => {
    if (state === "focus") {
      returnToOverview();
    } else if (state === "overview") {
      closeStory();
    }
  };

  const focusableElements = () => Array.from(root.querySelectorAll(
    "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
  )).filter((element) => {
    const style = getComputedStyle(element);
    return (
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      element.getAttribute("aria-hidden") !== "true"
    );
  });

  const handleKeydown = (event) => {
    if (state === "closed") return;
    keyboardSession = true;

    if (event.key === "Escape") {
      event.preventDefault();
      if (state === "focus") returnToOverview();
      else if (state === "overview" || state === "epilogue") closeStory();
      return;
    }

    if (state === "focus" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      animateRailTo(
        activeIndex + (event.key === "ArrowRight" ? 1 : -1)
      );
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      root.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  const performResponsiveReflow = () => {
    if (state === "closed") {
      pendingReflow = false;
      return;
    }
    if (transitioning) {
      pendingReflow = true;
      return;
    }

    pendingReflow = false;
    root.classList.add("is-reflowing");
    cancelRailAnimation();
    cancelAnimationFrame(reflowFrame);
    reflowFrame = requestAnimationFrame(() => {
      reflowFrame = requestAnimationFrame(() => {
        if (state === "focus") {
          rail.scrollLeft = targetScrollLeft(activeIndex);
          updateRailVisuals();
        }
        drawGlyphGrid();
        updateEdgeControls();
        root.classList.remove("is-reflowing");
      });
    });
  };

  const handleResize = () => {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    const widthChanged = Math.abs(nextWidth - lastViewportWidth) > 1;
    const heightChanged = Math.abs(nextHeight - lastViewportHeight) > 2;
    const layoutChanged = stackedLayout.matches !== lastLayoutIsStacked;

    lastViewportWidth = nextWidth;
    lastViewportHeight = nextHeight;
    lastLayoutIsStacked = stackedLayout.matches;

    if (widthChanged || heightChanged || layoutChanged) {
      performResponsiveReflow();
    }
  };

  trigger.addEventListener("click", openStory);
  root.addEventListener("pointerdown", () => {
    keyboardSession = false;
  }, { capture: true, passive: true });
  control.addEventListener("click", handleControl);
  previousButton.addEventListener("click", () => {
    animateRailTo(activeIndex - 1);
  });
  nextButton.addEventListener("click", () => {
    animateRailTo(activeIndex + 1);
  });
  finishButton.addEventListener("click", finishExploration);
  closeButton.addEventListener("click", closeStory);
  pieces.forEach((piece) => piece.addEventListener("click", handlePieceClick));
  rail.addEventListener("scroll", handleRailScroll, { passive: true });
  rail.addEventListener("wheel", handleRailWheel, { passive: true });
  if (supportsScrollEnd) {
    rail.addEventListener("scrollend", commitRailSelection, { passive: true });
  }
  rail.addEventListener("pointerdown", handlePointerDown, { passive: true });
  rail.addEventListener("pointermove", handlePointerMove, { passive: true });
  rail.addEventListener("pointerup", endPointerGesture, { passive: true });
  rail.addEventListener("pointercancel", endPointerGesture, { passive: true });
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", performResponsiveReflow);
  window.visualViewport?.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("hero:ready", () => {
    trigger.disabled = false;
  });

  const gridResizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(scheduleGridDraw)
    : null;
  gridResizeObserver?.observe(visual);
  setState("closed");
  resetExploration();
  if (document.body.classList.contains("hero-ready")) trigger.disabled = false;
})();
