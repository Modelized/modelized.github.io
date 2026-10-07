import { body, prefersReducedMotion } from "./context.js?v=20261002a";
import { createSettledScheduler } from "./navigation.js?v=20261002a";
import { updateHeroMaterial } from "./hero-material.js?v=20261007b";
// Keep the pulse implementation available independently of arrival/refit motion.
const HERO_TOUCH_PULSE_ENABLED = true;
function initGridFittedTypography() {
  const cells = Array.from(document.querySelectorAll(".hero-fit-cell"));
  if (!cells.length) return;

  const measuringCanvas = document.createElement("canvas");
  const measuringContext = measuringCanvas.getContext("2d");
  const measuringSpan = document.createElement("span");
  measuringSpan.setAttribute("aria-hidden", "true");
  measuringSpan.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:-10000px",
    "display:inline-block",
    "visibility:hidden",
    "pointer-events:none",
    "contain:layout style paint",
    "font-family:Anybody,Arial Narrow,sans-serif",
    "font-size:100px",
    "font-optical-sizing:auto",
    "font-style:normal",
    "line-height:1",
    "text-transform:uppercase",
    "white-space:nowrap"
  ].join(";");
  document.body.append(measuringSpan);

  const svgNamespace = "http://www.w3.org/2000/svg";
  const measuringSvg = document.createElementNS(svgNamespace, "svg");
  const measuringText = document.createElementNS(svgNamespace, "text");
  measuringSvg.setAttribute("aria-hidden", "true");
  measuringSvg.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:-10000px",
    "width:2000px",
    "height:400px",
    "overflow:visible",
    "visibility:hidden",
    "pointer-events:none"
  ].join(";");
  measuringText.setAttribute("x", "0");
  measuringText.setAttribute("y", "150");
  measuringSvg.append(measuringText);
  document.body.append(measuringSvg);

  let rafId = 0;
  let fontsAreReady = false;
  const fitConfigurations = new WeakMap();
  const glyphMeasurements = new Map();
  const appliedFitStyles = new WeakMap();
  const activeWeightAnimations = new Map();
  const activeMetalClockAnimations = new Map();
  const metalRoot = document.querySelector(".page-wrap");
  const metalClockGroups = new Map([
    ["hero-metal-model-stream", new Set()],
    ["hero-metal-story-stream", new Set()]
  ]);
  const fitSignatures = new WeakMap();

  const measureGlyph = (word, weight, width, trackingEm) => {
    if (!measuringContext) {
      return {
        width: 100,
        inkLeft: 0,
        inkWidth: 100,
        height: 72,
        centerOffsetY: 0
      };
    }

    const text = word.textContent.trim();
    // Measurements use a fixed 100px font. Reuse identical inputs across
    // responsive fits, but never reuse metrics across a font load.
    const cacheable = fontsAreReady && document.fonts?.status === "loaded";
    const measurementKey = JSON.stringify([text, weight, width, trackingEm]);
    if (cacheable && glyphMeasurements.has(measurementKey)) {
      return glyphMeasurements.get(measurementKey);
    }
    const tracking = `${trackingEm * 100}px`;

    measuringSpan.textContent = text;
    measuringSpan.style.fontWeight = String(weight);
    measuringSpan.style.fontVariationSettings = `"wght" ${weight}, "wdth" ${width}`;
    measuringSpan.style.letterSpacing = tracking;
    const measuredWidth = measuringSpan.getBoundingClientRect().width;

    measuringText.textContent = text;
    measuringText.style.fontFamily = '"Anybody", "Arial Narrow", sans-serif';
    measuringText.style.fontSize = "100px";
    measuringText.style.fontWeight = String(weight);
    measuringText.style.fontVariationSettings = `"wght" ${weight}, "wdth" ${width}`;
    measuringText.style.letterSpacing = tracking;
    let inkLeft = 0;
    let inkWidth = measuredWidth;
    try {
      const inkBounds = measuringText.getBBox();
      inkLeft = inkBounds.x || 0;
      inkWidth = inkBounds.width || measuredWidth;
    } catch {
      inkLeft = 0;
      inkWidth = measuredWidth;
    }

    measuringContext.font = `${weight} 100px "Anybody", "Arial Narrow", sans-serif`;
    if ("fontKerning" in measuringContext) {
      measuringContext.fontKerning = "normal";
    }
    if ("textRendering" in measuringContext) {
      measuringContext.textRendering = "geometricPrecision";
    }

    const verticalMetrics = measuringContext.measureText(text);
    const ascent = verticalMetrics.actualBoundingBoxAscent || 72;
    const descent = verticalMetrics.actualBoundingBoxDescent || 0;
    const fontAscent = verticalMetrics.fontBoundingBoxAscent || ascent;
    const fontDescent = verticalMetrics.fontBoundingBoxDescent || descent;
    const baseline = (100 - fontAscent - fontDescent) / 2 + fontAscent;
    const inkCenter = baseline + (descent - ascent) / 2;

    const result = {
      width: Math.max(1, measuredWidth),
      inkLeft,
      inkWidth: Math.max(1, inkWidth),
      height: ascent + descent,
      centerOffsetY: inkCenter - 50
    };
    if (cacheable) {
      if (glyphMeasurements.size >= 2048) {
        glyphMeasurements.delete(glyphMeasurements.keys().next().value);
      }
      glyphMeasurements.set(measurementKey, result);
    }
    return result;
  };

  const findWidthAxis = (
    word,
    weight,
    trackingEm,
    targetRatio,
    minimumWidth = 50,
    maximumWidth = 150
  ) => {
    let low = minimumWidth;
    let high = maximumWidth;
    const lowMetrics = measureGlyph(word, weight, low, trackingEm);
    const highMetrics = measureGlyph(word, weight, high, trackingEm);
    const lowRatio = lowMetrics.width / lowMetrics.height;
    const highRatio = highMetrics.width / highMetrics.height;

    if (targetRatio <= lowRatio) return { width: low, metrics: lowMetrics };
    if (targetRatio >= highRatio) return { width: high, metrics: highMetrics };

    let bestWidth = low;
    let bestMetrics = lowMetrics;
    let bestDelta = Math.abs(bestMetrics.width / bestMetrics.height - targetRatio);

    for (let index = 0; index < 7; index += 1) {
      const candidate = (low + high) / 2;
      const metrics = measureGlyph(word, weight, candidate, trackingEm);
      const ratio = metrics.width / metrics.height;
      const delta = Math.abs(ratio - targetRatio);

      if (delta < bestDelta) {
        bestWidth = candidate;
        bestMetrics = metrics;
        bestDelta = delta;
      }

      if (ratio < targetRatio) {
        low = candidate;
      } else {
        high = candidate;
      }
    }

    return { width: bestWidth, metrics: bestMetrics };
  };

  const cubicCoordinate = (time, firstControl, secondControl) => {
    const inverse = 1 - time;
    return (
      3 * inverse * inverse * time * firstControl +
      3 * inverse * time * time * secondControl +
      time * time * time
    );
  };
  const solveBezierParameter = (target, firstControl, secondControl) => {
    if (target <= 0 || target >= 1) return target;

    let low = 0;
    let high = 1;
    for (let index = 0; index < 16; index += 1) {
      const candidate = (low + high) / 2;
      if (cubicCoordinate(candidate, firstControl, secondControl) < target) {
        low = candidate;
      } else {
        high = candidate;
      }
    }

    return (low + high) / 2;
  };
  const arrivalEase = (progress) => {
    if (progress <= 0 || progress >= 1) return progress;
    const parameter = solveBezierParameter(progress, 0.19, 0.32);
    return cubicCoordinate(parameter, 1, 1);
  };

  const measureFittedState = (
    word,
    configuration,
    weight,
    {
      widthAxis = configuration.widthAxis,
      trackingEm = configuration.trackingEm,
      scaleMultiplier = 1
    } = {}
  ) => {
    const metrics = measureGlyph(word, weight, widthAxis, trackingEm);
    if (!metrics.width || !metrics.height) return null;

    const fontScale = configuration.targetHeight / metrics.height;
    const scaleX =
      (configuration.targetInkWidth / (metrics.inkWidth * fontScale)) * scaleMultiplier;
    const inkCenterOffset =
      (metrics.inkLeft + metrics.inkWidth / 2 - metrics.width / 2) * fontScale;
    return {
      weight,
      width: widthAxis,
      trackingEm,
      materialWidth: metrics.width * fontScale * scaleX,
      materialHeight: 100 * fontScale,
      fontSize: 100 * fontScale,
      scaleX,
      shiftX: configuration.targetInkCenterOffset - inkCenterOffset * scaleX,
      shiftY: -metrics.centerOffsetY * fontScale
    };
  };

  const buildFittedStates = (word, configuration) => {
    const weights = [];
    for (let weight = 180; weight <= 900; weight += 10) {
      weights.push(weight);
    }
    if (!weights.includes(configuration.finalWeight)) {
      weights.push(configuration.finalWeight);
      weights.sort((first, second) => first - second);
    }

    return weights
      .map((weight) => measureFittedState(word, configuration, weight))
      .filter(Boolean);
  };

  const solveFittedState = (configuration, weight) => {
    if (configuration.finalState && Math.abs(weight - configuration.finalWeight) < 0.001) {
      return configuration.finalState;
    }

    const states = configuration.states;
    if (!states?.length) {
      return configuration.finalState;
    }

    const clampedWeight = Math.min(900, Math.max(180, weight));
    let upperIndex = states.findIndex((state) => state.weight >= clampedWeight);
    if (upperIndex <= 0) return states[Math.max(0, upperIndex)];
    if (upperIndex < 0) return states[states.length - 1];

    const lower = states[upperIndex - 1];
    const upper = states[upperIndex];
    if (upper.weight === clampedWeight) return upper;

    const progress = (clampedWeight - lower.weight) / (upper.weight - lower.weight);
    const interpolate = (from, to) => from + (to - from) * progress;
    return {
      weight: clampedWeight,
      width: configuration.widthAxis,
      trackingEm: configuration.trackingEm,
      fontSize: interpolate(lower.fontSize, upper.fontSize),
      scaleX: interpolate(lower.scaleX, upper.scaleX),
      shiftX: interpolate(lower.shiftX, upper.shiftX),
      shiftY: interpolate(lower.shiftY, upper.shiftY)
    };
  };

  const interpolateFittedState = (from, to, progress) => {
    const interpolate = (start, end) => start + (end - start) * progress;
    return {
      weight: interpolate(from.weight, to.weight),
      width: interpolate(from.width, to.width),
      trackingEm: interpolate(from.trackingEm, to.trackingEm),
      fontSize: interpolate(from.fontSize, to.fontSize),
      scaleX: interpolate(from.scaleX, to.scaleX),
      shiftX: interpolate(from.shiftX, to.shiftX),
      shiftY: interpolate(from.shiftY, to.shiftY)
    };
  };

  const buildTouchStates = (word, configuration) => {
    const desiredWeightGain = 60;
    const peakWeight = Math.min(900, configuration.finalWeight + desiredWeightGain);
    const missingWeightGain = Math.max(
      0,
      desiredWeightGain - (peakWeight - configuration.finalWeight)
    );
    const widthCompensation = 0.035 * (missingWeightGain / desiredWeightGain);
    const peakWidth = Math.max(50, configuration.widthAxis * (1 - widthCompensation));
    const states = [];

    for (let index = 0; index <= 20; index += 1) {
      const progress = index / 20;
      const state = measureFittedState(
        word,
        configuration,
        configuration.finalWeight + (peakWeight - configuration.finalWeight) * progress,
        {
          widthAxis: configuration.widthAxis + (peakWidth - configuration.widthAxis) * progress,
          trackingEm: configuration.trackingEm,
          scaleMultiplier: 1 + 0.055 * progress
        }
      );
      if (state) states.push({ progress, state });
    }

    return states;
  };

  const solveTouchState = (states, progress) => {
    if (!states.length) return null;
    if (progress <= 0) return states[0].state;
    if (progress >= 1) return states[states.length - 1].state;

    const scaledIndex = progress * (states.length - 1);
    const lowerIndex = Math.floor(scaledIndex);
    const upperIndex = Math.min(states.length - 1, lowerIndex + 1);
    return interpolateFittedState(
      states[lowerIndex].state,
      states[upperIndex].state,
      scaledIndex - lowerIndex
    );
  };

  const applyFittedState = (word, state) => {
    if (!state) return;
    const values = {
      "--fit-wdth": state.width.toFixed(3),
      "--fit-wght": state.weight.toFixed(3),
      "--fit-tracking": `${state.trackingEm.toFixed(5)}em`,
      "--fit-font-size": `${state.fontSize.toFixed(3)}px`,
      "--fit-shift-x": `${state.shiftX.toFixed(3)}px`,
      "--fit-shift-y": `${state.shiftY.toFixed(3)}px`,
      "--fit-scale-x": state.scaleX.toFixed(5)
    };
    const previous = appliedFitStyles.get(word);
    Object.entries(values).forEach(([property, value]) => {
      if (previous?.[property] !== value) word.style.setProperty(property, value);
    });
    appliedFitStyles.set(word, values);
    updateHeroMaterial(word, state);
  };

  const fit = (allowDuringGlyphStory = false) => {
    rafId = 0;

    if (body.classList.contains("glyph-story-active") && !allowDuringGlyphStory) {
      return;
    }

    cells.forEach((cell) => {
      const word = cell.querySelector(".hero-fit-word");
      if (!word) return;

      const cellRect = cell.getBoundingClientRect();
      if (!cellRect.width || !cellRect.height) return;

      const targetWidth = cellRect.width;
      const targetHeight = cellRect.height;
      const targetRatio = targetWidth / targetHeight;
      const computed = getComputedStyle(word);
      const baseWeight = Number.parseFloat(computed.getPropertyValue("--word-wght")) || 850;
      const fitSignature = [
        cellRect.width.toFixed(2),
        cellRect.height.toFixed(2),
        baseWeight.toFixed(1),
        fontsAreReady ? "ready" : "loading",
        "density-v1",
        word.textContent.trim()
      ].join(":");
      if (fitSignatures.get(word) === fitSignature) return;

      const trackingEm = 0.017;
      const measureGeometry = (candidateWeight) => {
        const widthResult = findWidthAxis(
          word,
          candidateWeight,
          trackingEm,
          targetRatio,
          50,
          150
        );
        const metrics = widthResult.metrics;
        const fontScale = targetHeight / metrics.height;
        return {
          widthResult,
          metrics,
          fontScale,
          scaleX: targetWidth / (metrics.width * fontScale)
        };
      };
      let weight = baseWeight;
      let geometry = measureGeometry(weight);
      const compression = Math.max(0, 1 - geometry.scaleX);
      const densityWeightBoost = Math.min(48, compression * 180);
      if (densityWeightBoost >= 0.5) {
        weight = Math.min(900, baseWeight + densityWeightBoost);
        geometry = measureGeometry(weight);
      }
      const widthResult = geometry.widthResult;
      const configuration = {
        targetWidth,
        targetHeight,
        trackingEm,
        finalWeight: weight,
        widthAxis: widthResult.width,
        targetInkWidth: 0,
        targetInkCenterOffset: 0,
        finalState: null,
        states: null,
        touchStates: null
      };
      const finalMetrics = geometry.metrics;
      const finalFontScale = geometry.fontScale;
      const finalState = {
        weight,
        width: widthResult.width,
        trackingEm,
        fontSize: 100 * finalFontScale,
        scaleX: geometry.scaleX,
        shiftX: 0,
        shiftY: -finalMetrics.centerOffsetY * finalFontScale
      };
      configuration.targetInkWidth = finalMetrics.inkWidth * finalFontScale * finalState.scaleX;
      configuration.targetInkCenterOffset =
        (finalMetrics.inkLeft + finalMetrics.inkWidth / 2 - finalMetrics.width / 2) *
        finalFontScale *
        finalState.scaleX;
      configuration.finalState = finalState;
      configuration.states = fontsAreReady ? buildFittedStates(word, configuration) : null;

      applyFittedState(word, finalState);
      updateHeroMaterial(word, finalState, {
        width: Math.max(finalMetrics.width * finalFontScale * finalState.scaleX,
          ...(configuration.states || []).map((state) => state.materialWidth)),
        height: Math.max(finalState.fontSize,
          ...(configuration.states || []).map((state) => state.materialHeight))
      });
      fitConfigurations.set(word, configuration);
      fitSignatures.set(word, fitSignature);
    });
  };

  const heroMotionIsActive = () =>
    body.classList.contains("hero-intro-running") || body.classList.contains("hero-handoff");

  const requestFit = (force = false) => {
    if (!force && heroMotionIsActive()) return;
    if (!rafId) rafId = requestAnimationFrame(fit);
  };

  const fitImmediately = (allowDuringGlyphStory = false) => {
    if (rafId) cancelAnimationFrame(rafId);
    fit(allowDuringGlyphStory);
  };

  const invalidateFits = () => {
    cells.forEach((cell) => {
      const word = cell.querySelector(".hero-fit-word");
      if (word) fitSignatures.delete(word);
    });
  };

  let settledFitTimer = 0;
  const stackedHomeLayout = window.matchMedia(
    "(max-width: 900px) and (orientation: portrait), (width > 900px) and (max-aspect-ratio: 9 / 16)"
  );
  let lastViewportWidth = window.innerWidth;
  let lastViewportHeight = window.innerHeight;
  let lastOrientation = window.matchMedia("(orientation: portrait)").matches;
  let lastStackedHomeLayout = stackedHomeLayout.matches;
  const touchViewport = navigator.maxTouchPoints > 0;
  let invalidateOnSettledFit = false;
  let responsiveRefitPending = false;
  let responsiveRefitStartedAt = 0;

  const syncMetalClockGroups = () => {
    if (!metalRoot || typeof metalRoot.getAnimations !== "function") return;

    const animations = metalRoot.getAnimations({ subtree: true });
    metalClockGroups.forEach((group, animationName) => {
      const members = animations.filter((animation) => animation.animationName === animationName);
      const clock = members.find((animation) => animation.effect?.target === metalRoot);
      const added = group.has(clock)
        ? members.filter((animation) => !group.has(animation))
        : members;
      group.clear();
      members.forEach((animation) => group.add(animation));
      if (!clock) return;

      const synchronize = () => {
        if (!group.has(clock) || clock.startTime === null) return;
        added.forEach((animation) => {
          if (animation === clock || !group.has(animation)) return;
          animation.playbackRate = clock.playbackRate;
          if (animation.playState === "paused") {
            animation.currentTime = clock.currentTime;
          } else {
            animation.startTime = clock.startTime;
          }
        });
      };
      if (clock.pending) {
        clock.ready.then(synchronize, () => {});
      } else {
        synchronize();
      }
    });
  };

  const setMetalPlaybackRate = (animations, rate) => {
    animations.forEach((animation) => {
      if (typeof animation.updatePlaybackRate === "function") {
        animation.updatePlaybackRate(rate);
      } else {
        animation.playbackRate = rate;
      }
    });
  };

  const cancelMetalClockAnimation = (animationName) => {
    const controller = activeMetalClockAnimations.get(animationName);
    if (!controller) return;

    controller.cancelled = true;
    window.clearTimeout(controller.timerId);
    cancelAnimationFrame(controller.rafId);
    setMetalPlaybackRate(controller.animations, 1);
    activeMetalClockAnimations.delete(animationName);
  };

  const clearMetalClockAnimations = () => {
    Array.from(activeMetalClockAnimations.keys()).forEach(cancelMetalClockAnimation);
  };

  const playMetalClockArrival = (animationName, duration, delay) => {
    cancelMetalClockAnimation(animationName);
    const animations = metalClockGroups.get(animationName);
    if (!animations?.size) return;

    const controller = {
      animations,
      cancelled: false,
      timerId: 0,
      rafId: 0
    };
    activeMetalClockAnimations.set(animationName, controller);

    controller.timerId = window.setTimeout(() => {
      let startedAt = null;
      const tick = (now) => {
        if (controller.cancelled) return;
        if (startedAt === null) startedAt = now;

        const progress = Math.min(1, (now - startedAt) / duration);
        setMetalPlaybackRate(controller.animations, 1 + 3.2 * (1 - arrivalEase(progress)));

        if (progress < 1) {
          controller.rafId = requestAnimationFrame(tick);
          return;
        }

        setMetalPlaybackRate(controller.animations, 1);
        activeMetalClockAnimations.delete(animationName);
      };

      controller.rafId = requestAnimationFrame(tick);
    }, delay);
  };

  const playSharedMetalArrival = () => {
    syncMetalClockGroups();
    playMetalClockArrival("hero-metal-model-stream", 640, 400);
    playMetalClockArrival("hero-metal-story-stream", 900, 650);
  };

  const cancelWeightAnimation = (word) => {
    const controller = activeWeightAnimations.get(word);
    if (!controller) return;

    controller.cancelled = true;
    window.clearTimeout(controller.timerId);
    cancelAnimationFrame(controller.rafId);
    activeWeightAnimations.delete(word);
  };

  const animateFittedWeight = (
    word,
    {
      duration,
      delay = 0,
      weightAtProgress = null,
      stateAtProgress = null,
      opacityAtProgress = null
    }
  ) => {
    const configuration = fitConfigurations.get(word);
    if (!configuration) return;

    if (!configuration.states?.length) {
      configuration.states = buildFittedStates(word, configuration);
    }

    cancelWeightAnimation(word);
    const controller = {
      cancelled: false,
      timerId: 0,
      rafId: 0
    };
    activeWeightAnimations.set(word, controller);

    controller.timerId = window.setTimeout(() => {
      let startedAt = null;
      const tick = (now) => {
        if (controller.cancelled) return;
        if (startedAt === null) startedAt = now;

        const progress = Math.min(1, (now - startedAt) / duration);
        const state = stateAtProgress
          ? stateAtProgress(progress, configuration)
          : solveFittedState(configuration, weightAtProgress(progress, configuration));
        applyFittedState(word, state);

        word.style.opacity = opacityAtProgress ? String(opacityAtProgress(progress)) : "1";

        if (progress < 1) {
          controller.rafId = requestAnimationFrame(tick);
          return;
        }

        applyFittedState(word, solveFittedState(configuration, configuration.finalWeight));
        word.style.opacity = "1";
        activeWeightAnimations.delete(word);
      };

      controller.rafId = requestAnimationFrame(tick);
    }, delay);
  };

  const playArrival = (selector, duration, delayForWord, reveal) => {
    document.querySelectorAll(selector).forEach((word) => {
      animateFittedWeight(word, {
        duration,
        delay: delayForWord(word),
        weightAtProgress: (progress, configuration) =>
          180 + (configuration.finalWeight - 180) * arrivalEase(progress),
        opacityAtProgress: reveal ? (progress) => Math.min(1, progress / 0.16) : null
      });
    });
  };

  const playTouchPulse = (word) => {
    const configuration = fitConfigurations.get(word);
    if (!configuration) return;

    if (!configuration.touchStates?.length) {
      configuration.touchStates = buildTouchStates(word, configuration);
    }
    if (!configuration.touchStates.length) return;

    const pulseIntensity = (progress) => {
      if (progress <= 0 || progress >= 1) return 0;
      const parameter = solveBezierParameter(progress, 0.25, 0.35);
      const phase = cubicCoordinate(parameter, 0.8, 1);
      return Math.sin(Math.PI * phase);
    };
    animateFittedWeight(word, {
      duration: 820,
      stateAtProgress: (progress) =>
        solveTouchState(configuration.touchStates, pulseIntensity(progress))
    });
  };

  const clearArrivalAnimations = () => {
    Array.from(activeWeightAnimations.keys()).forEach(cancelWeightAnimation);
  };

  const beginResponsiveRefit = () => {
    if (prefersReducedMotion || !body.classList.contains("hero-ready")) return;
    if (!responsiveRefitPending) {
      responsiveRefitStartedAt = performance.now();
      body.classList.add("hero-refitting");
      clearArrivalAnimations();
    }
    responsiveRefitPending = true;
  };

  const scheduleSettledFit = (
    delay = 180,
    invalidate = false,
    animateResponsiveChange = false
  ) => {
    if (animateResponsiveChange) beginResponsiveRefit();
    invalidateOnSettledFit ||= invalidate;
    window.clearTimeout(settledFitTimer);
    const minimumFadeTime = responsiveRefitPending
      ? Math.max(0, 220 - (performance.now() - responsiveRefitStartedAt))
      : 0;
    settledFitTimer = window.setTimeout(
      () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const shouldInvalidate = invalidateOnSettledFit;
            invalidateOnSettledFit = false;
            if (shouldInvalidate) invalidateFits();

            if (responsiveRefitPending && body.classList.contains("hero-ready")) {
              clearArrivalAnimations();
              fitImmediately();
              playArrival(".hero-brand-lockup .hero-fit-word", 560, () => 0, false);
              requestAnimationFrame(() => {
                body.classList.remove("hero-refitting");
                responsiveRefitPending = false;
                responsiveRefitStartedAt = 0;
              });
              return;
            }

            requestFit();
          });
        });
      },
      Math.max(delay, minimumFadeTime)
    );
  };

  const handleViewportResize = () => {
    const widthChanged = Math.abs(window.innerWidth - lastViewportWidth) > 1;
    const heightChanged = Math.abs(window.innerHeight - lastViewportHeight) > 1;
    const orientation = window.matchMedia("(orientation: portrait)").matches;
    const orientationChanged = orientation !== lastOrientation;
    const stackedLayout = stackedHomeLayout.matches;
    const layoutChanged = stackedLayout !== lastStackedHomeLayout;

    lastViewportWidth = window.innerWidth;
    lastViewportHeight = window.innerHeight;
    lastOrientation = orientation;
    lastStackedHomeLayout = stackedLayout;

    if (widthChanged || orientationChanged || layoutChanged) {
      syncMetalClockGroups();
    }

    if (layoutChanged || orientationChanged) {
      scheduleSettledFit(260, true, true);
      return;
    }

    if (responsiveRefitPending) {
      scheduleSettledFit(160, true);
      return;
    }

    if (touchViewport && !widthChanged && !orientationChanged) {
      return;
    }

    if (!widthChanged && !heightChanged && !orientationChanged) return;
    requestFit();
    scheduleSettledFit(orientationChanged ? 180 : 120);
  };

  const handleHomeLayoutChange = (event) => {
    if (event.matches === lastStackedHomeLayout) return;

    lastStackedHomeLayout = event.matches;
    lastViewportWidth = window.innerWidth;
    lastViewportHeight = window.innerHeight;
    lastOrientation = window.matchMedia("(orientation: portrait)").matches;
    scheduleSettledFit(260, true, true);
  };

  requestFit();
  const typographyReady = Promise.resolve(document.fonts?.ready).then(() => {
    glyphMeasurements.clear();
    fontsAreReady = true;
    fitImmediately();
  });
  document.fonts?.addEventListener("loading", () => glyphMeasurements.clear());
  document.fonts?.addEventListener("loadingdone", () => glyphMeasurements.clear());
  document.fonts?.addEventListener("loadingerror", () => glyphMeasurements.clear());
  window.addEventListener("resize", handleViewportResize);
  window.addEventListener("orientationchange", () => {
    scheduleSettledFit(260, true, true);
  });
  stackedHomeLayout.addEventListener?.("change", handleHomeLayoutChange);
  window.addEventListener("pageshow", () => {
    syncMetalClockGroups();
    scheduleSettledFit(0, true);
  });
  window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .addEventListener?.("change", syncMetalClockGroups);
  syncMetalClockGroups();
  document.addEventListener("stack:decoration", (event) => {
    // Rejoin the shared metal clock after a stack resumes, without waking paused effects.
    metalClockGroups.forEach((group) => {
      const clock = Array.from(group).find((animation) => animation.effect?.target === metalRoot);
      if (!clock || clock.startTime === null) return;
      group.forEach((animation) => {
        if (!event.target.contains(animation.effect?.target) || animation.playState === "paused")
          return;
        animation.playbackRate = clock.playbackRate;
        animation.startTime = clock.startTime;
      });
    });
  });
  document.querySelector(".hero-brand-lockup")?.addEventListener("click", (event) => {
    if (
      !HERO_TOUCH_PULSE_ENABLED ||
      prefersReducedMotion ||
      !body.classList.contains("hero-ready") ||
      body.classList.contains("hero-refitting")
    ) {
      return;
    }

    const cell = event.target.closest(".hero-fit-cell");
    const word = cell?.querySelector(".hero-fit-word");
    if (word) playTouchPulse(word);
  });
  window.addEventListener("hero:intro", () => {
    fitImmediately();
    playArrival(
      ".hero-intro-cell .hero-fit-word",
      640,
      (word) => {
        const cell = word.closest(".hero-intro-cell");
        if (cell?.classList.contains("hero-intro-cell--the")) return 430;
        if (cell?.classList.contains("hero-intro-cell--unseen")) return 720;
        return 140;
      },
      true
    );
  });
  window.addEventListener("hero:handoff", () => {
    document.querySelectorAll(".hero-intro-cell .hero-fit-word").forEach((word) => {
      word.style.opacity = "1";
    });
    clearArrivalAnimations();
    clearMetalClockAnimations();
    fitImmediately();
    playSharedMetalArrival();
    playArrival(
      ".hero-brand-lockup .hero-fit-word",
      640,
      (word) => {
        const cell = word.closest(".hero-fit-cell");
        if (
          cell?.classList.contains("hero-home-meta-cell") ||
          cell?.classList.contains("hero-home-year-cell") ||
          cell?.classList.contains("hero-home-year-part")
        ) {
          return 650;
        }
        if (cell?.classList.contains("hero-manifesto-cell")) return 900;
        return 400;
      },
      false
    );
  });
  window.addEventListener("hero:ready", () => {
    clearArrivalAnimations();
    clearMetalClockAnimations();
    fitImmediately();
    body.classList.remove("hero-refitting");
    responsiveRefitPending = false;
    responsiveRefitStartedAt = 0;
  });
  window.addEventListener("glyph-story:prepare-close", () => {
    clearArrivalAnimations();
    window.clearTimeout(settledFitTimer);
    invalidateOnSettledFit = false;
    responsiveRefitPending = false;
    responsiveRefitStartedAt = 0;
    body.classList.remove("hero-refitting");
    invalidateFits();
    fitImmediately(true);
    lastViewportWidth = window.innerWidth;
    lastViewportHeight = window.innerHeight;
    lastOrientation = window.matchMedia("(orientation: portrait)").matches;
    lastStackedHomeLayout = stackedHomeLayout.matches;
  });
  window.addEventListener("glyph-story:closed", () => {
    invalidateFits();
    fitImmediately();
    lastViewportWidth = window.innerWidth;
    lastViewportHeight = window.innerHeight;
    lastOrientation = window.matchMedia("(orientation: portrait)").matches;
    lastStackedHomeLayout = stackedHomeLayout.matches;
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => scheduleSettledFit());
    document.querySelectorAll(".hero-intro-grid, .hero-brand-lockup").forEach((element) => {
      observer.observe(element);
    });
  }
  return typographyReady;
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
  const strokeWidth = parseFloat(computed.webkitTextStrokeWidth) || 0;
  const visualShift = Math.abs(parseFloat(computed.top) || 0);
  const verticalGuard = Math.ceil(visualShift + strokeWidth + 2);

  rockSaltContext.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;

  const metrics = rockSaltContext.measureText(text);
  const advanceWidth = metrics.width || 0;
  const bboxRight = metrics.actualBoundingBoxRight || advanceWidth;
  const bboxLeft = metrics.actualBoundingBoxLeft || 0;
  const bboxHeight =
    (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
    (metrics.actualBoundingBoxDescent || fontSize * 0.2);
  const extraHeight = Math.max(0, bboxHeight - lineHeight);
  const ascentRatio =
    bboxHeight > 0 ? (metrics.actualBoundingBoxAscent || bboxHeight * 0.8) / bboxHeight : 0.8;
  return {
    top: Math.max(verticalGuard, Math.ceil(extraHeight * ascentRatio + verticalGuard)),
    right: Math.max(1, Math.ceil(Math.max(0, bboxRight - advanceWidth) + strokeWidth + 1)),
    bottom: Math.max(verticalGuard, Math.ceil(extraHeight * (1 - ascentRatio) + verticalGuard)),
    left: Math.max(1, Math.ceil(bboxLeft + strokeWidth + 1))
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

export { syncRockSaltSafeAreas, initGridFittedTypography, initRockSaltSafeAreas };
