import { body, prefersReducedMotion, base } from "./context.js?v=20261002a";
import { disciplines, projects } from "./content.js?v=20261002a";
function measureDisciplineCard(card) {
  const surface = card.querySelector(".discipline-stack-card__surface");
  const layout = surface?.querySelector(".discipline-stack-card__layout");
  const header = surface?.querySelector(".discipline-stack-card__header");
  const body = surface?.querySelector(".discipline-stack-card__body");
  const arsenal = surface?.querySelector(".discipline-stack-card__arsenal:not([hidden])");
  const styles = surface ? getComputedStyle(surface) : null;
  const layoutStyles = layout ? getComputedStyle(layout) : null;
  const gap = layoutStyles ? parseFloat(layoutStyles.rowGap || layoutStyles.gap) || 0 : 0;
  const paddingTop = styles ? parseFloat(styles.paddingTop) || 0 : 0;
  const paddingBottom = styles ? parseFloat(styles.paddingBottom) || 0 : 0;
  const parts = [header, body, arsenal].filter(Boolean);

  return Math.ceil(
    paddingTop +
      paddingBottom +
      parts.reduce(
        (sum, part) => sum + (part.scrollHeight || part.getBoundingClientRect().height || 0),
        0
      ) +
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
  const imageHeight = media?.offsetHeight || 0;

  if (!media) {
    return Math.ceil(paddingTop + paddingBottom + contentHeight);
  }

  if (portrait) {
    return Math.ceil(paddingTop + paddingBottom + contentHeight + rowGap + imageHeight);
  }

  return Math.ceil(paddingTop + paddingBottom + Math.max(contentHeight, imageHeight));
}

function initStackDeck({
  stackId,
  items,
  getAriaLabel,
  getBaseCardHeight,
  measureCard,
  mediaSelector,
  extraBlockSpace = 0
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
  const motions = new Map();
  const cardStates = cards.map((card, index) => ({
    card,
    index,
    layout: null,
    transform: "",
    zIndex: ""
  }));
  let dragFrame = 0;
  let queuedDragProgress = 0;
  let queuedSyncFrame = 0;
  let lastViewportWidth = window.innerWidth;
  let lastViewportHeight = window.innerHeight;
  let lastPortraitState = portraitQuery.matches;
  let loadingFadeScheduled = false;
  let loadingFinished = false;
  let stackVisible = !("IntersectionObserver" in window);

  const releaseSettledMotions = () => {
    motions.forEach((animation, card) => {
      if (animation.playState !== "finished") return;
      motions.delete(card);
      animation.cancel();
    });
  };
  const syncDecorationState = () => {
    const moving =
      stack.classList.contains("is-dragging") ||
      Array.from(motions.values()).some((animation) => animation.playState !== "finished");
    const decorating = stackVisible && !document.hidden && !moving && !prefersReducedMotion;
    const value = String(decorating);
    if (stack.dataset.stackDecorating !== value) {
      stack.dataset.stackDecorating = value;
    }
    if (!stackVisible || document.hidden) releaseSettledMotions();
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const createLayout = (x, y, scale, rotate) => ({ x, y, scale, rotate });
  const getSide = (offset) => (offset === 0 ? "front" : offset < 0 ? "left" : "right");
  const dragCurve = {
    inwardScaleLift: [0, 0.032, 0.026, 0.02, 0.016, 0.014],
    outwardScaleDrop: [0, 0.022, 0.028, 0.032, 0.036, 0.04],
    inwardXPull: [0, 0.18, 0.15, 0.13, 0.11, 0.1],
    outwardXPush: [0, 0.14, 0.18, 0.22, 0.26, 0.3],
    inwardRotateEase: [0, 0.18, 0.14, 0.12, 0.1, 0.08],
    outwardRotateBoost: [0, 0.08, 0.1, 0.12, 0.14, 0.16]
  };

  const setStackLoading = (isLoading) => {
    shell?.setAttribute("data-stack-loading", isLoading ? "true" : "false");
    stack.setAttribute("aria-busy", isLoading ? "true" : "false");
  };

  const finishStackLoading = () => {
    if (loadingFinished || loadingFadeScheduled) {
      return;
    }

    loadingFadeScheduled = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        loadingFadeScheduled = false;
        loadingFinished = true;
        stack.dataset.stackReady = "true";
        setStackLoading(false);
        stack.dispatchEvent(new Event("stack:ready"));
      });
    });
  };

  const buildLayouts = (cardWidth) => {
    const steps = portraitQuery.matches
      ? [
          { x: 0, scale: 1, rotate: 0 },
          { x: cardWidth * 0.228, scale: 0.866, rotate: 5.1 },
          { x: cardWidth * 0.366, scale: 0.734, rotate: 8.4 },
          { x: cardWidth * 0.462, scale: 0.616, rotate: 11.1 },
          { x: cardWidth * 0.528, scale: 0.522, rotate: 13.5 },
          { x: cardWidth * 0.586, scale: 0.458, rotate: 15.3 }
        ]
      : [
          { x: 0, scale: 1, rotate: 0 },
          { x: cardWidth * 0.238, scale: 0.88, rotate: 4.6 },
          { x: cardWidth * 0.386, scale: 0.752, rotate: 7.2 },
          { x: cardWidth * 0.486, scale: 0.64, rotate: 9.8 },
          { x: cardWidth * 0.55, scale: 0.55, rotate: 11.8 },
          { x: cardWidth * 0.604, scale: 0.486, rotate: 13.6 }
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

  const formatTransformValues = (x, y, scale, rotate) =>
    `translate3d(${(x - getMetrics().cardWidth / 2).toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`;
  const formatTransform = (layout) =>
    formatTransformValues(layout.x, layout.y, layout.scale, layout.rotate);

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

    // Preserve fractional CSS pixels for both centering and interrupted-motion capture.
    const cardWidth =
      parseFloat(getComputedStyle(firstCard).width) || stack.clientWidth || window.innerWidth;
    const breathingRoom = Math.ceil(clamp(window.innerHeight * 0.04, 32, 56));
    const baseHeight = Math.ceil(getBaseCardHeight({ portrait: portraitQuery.matches }));
    const cardHeight = Math.ceil(
      Math.max(baseHeight, maxContentHeight + breathingRoom) + extraBlockSpace * 2
    );
    const pad = Math.ceil(clamp(window.innerHeight * 0.026, 18, 28));

    shell?.style.setProperty("--discipline-card-height", `${cardHeight}px`);
    stage?.style.setProperty("--discipline-stack-pad-top", `${pad}px`);

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

  const writeLayout = (state, layout, zIndex = state.zIndex) => {
    const transform = formatTransform(layout);
    const nextZIndex = String(zIndex);
    if (state.zIndex !== nextZIndex) {
      state.card.style.zIndex = nextZIndex;
      state.zIndex = nextZIndex;
    }
    if (state.transform !== transform) {
      state.card.style.transform = transform;
      state.transform = transform;
    }
    state.layout = layout;
  };

  const captureLayouts = () =>
    new Map(
      cardStates.map(({ card, layout }) => {
        const motion = motions.get(card);
        if (!motion || motion.playState === "finished") {
          return [card, createLayout(layout.x, layout.y, layout.scale, layout.rotate)];
        }

        // Read only at a motion handoff, never on each drag frame.
        const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
        return [
          card,
          createLayout(
            matrix.m41 + getMetrics().cardWidth / 2,
            matrix.m42,
            Math.hypot(matrix.m11, matrix.m12),
            (Math.atan2(matrix.m12, matrix.m11) * 180) / Math.PI
          )
        ];
      })
    );

  const cancelMotions = () => {
    cards.forEach((card) => card.classList.remove("is-settling"));
    motions.forEach((animation) => animation.cancel());
    motions.clear();
  };

  const cancelQueuedDragState = () => {
    if (dragFrame) {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }

    queuedDragProgress = 0;
  };

  const queueDragState = (dragProgress) => {
    queuedDragProgress = dragProgress;
    if (dragFrame) {
      return;
    }

    dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      if (pointerState) {
        if (portraitQuery.matches) {
          applyDragState(queuedDragProgress);
        } else {
          applyState();
        }
      }
    });
  };

  const queueSyncWithoutAnimation = () => {
    if (queuedSyncFrame) {
      cancelAnimationFrame(queuedSyncFrame);
    }

    queuedSyncFrame = requestAnimationFrame(() => {
      queuedSyncFrame = 0;
      syncWithoutAnimation();
    });
  };

  const syncLabels = () => {
    const active = items[activeIndex];
    stack.setAttribute("aria-label", getAriaLabel(active, activeIndex, total));
    stack.dataset.swipeEnabled = portraitQuery.matches ? "true" : "false";
    stack.removeAttribute("tabindex");
  };

  const prepareDrag = () => {
    const layouts = captureLayouts();
    cancelMotions();
    pointerState.cardWidth = getMetrics().cardWidth;
    pointerState.cards = cardStates.map((state) => {
      const offset = state.index - activeIndex;
      const depth = Math.min(Math.abs(offset), total - 1);
      const base = getLayoutForOffset(offset);
      const start = layouts.get(state.card);
      const zIndex = getZIndex(offset);
      writeLayout(state, start);

      return {
        state,
        offset,
        side: Math.sign(offset),
        base,
        zIndex,
        delta: createLayout(
          start.x - base.x,
          start.y - base.y,
          start.scale - base.scale,
          start.rotate - base.rotate
        ),
        layout: createLayout(base.x, base.y, base.scale, base.rotate),
        inward: {
          x: dragCurve.inwardXPull[depth] || 0.1,
          scale: dragCurve.inwardScaleLift[depth] || 0.014,
          rotate: dragCurve.inwardRotateEase[depth] || 0.08,
          zIndex: zIndex + 8 - depth
        },
        outward: {
          x: dragCurve.outwardXPush[depth] || 0.3,
          scale: dragCurve.outwardScaleDrop[depth] || 0.04,
          rotate: dragCurve.outwardRotateBoost[depth] || 0.16,
          zIndex: zIndex - 5 - depth
        }
      };
    });
    stack.classList.add("is-dragging");
    syncDecorationState();
  };

  const applyDragState = (dragProgress) => {
    const dragSign = dragProgress === 0 ? 0 : Math.sign(dragProgress);
    const dragMagnitude = Math.abs(dragProgress);
    const inwardSide = dragSign === 0 ? 0 : -dragSign;
    const hasTarget =
      dragSign === 0 || (dragSign < 0 ? activeIndex < total - 1 : activeIndex > 0);

    pointerState.cards.forEach(
      ({ state, offset, side, base, delta, layout, inward, outward, zIndex: baseZIndex }) => {
        let visualX = base.x;
        let visualY = base.y;
        let visualScale = base.scale;
        let visualRotate = base.rotate;
        let zIndex = baseZIndex;

        if (hasTarget && offset === 0 && dragSign !== 0) {
          visualX = pointerState.cardWidth * 0.58 * dragMagnitude * dragSign;
          visualY = 0;
          visualScale = 1 - dragMagnitude * 0.024;
          visualRotate = dragSign * 9.1 * dragMagnitude;
        } else if (hasTarget && offset !== 0) {
          if (side === inwardSide) {
            visualX *= 1 - inward.x * dragMagnitude;
            visualY = 0;
            visualScale += inward.scale * dragMagnitude;
            visualRotate *= 1 - inward.rotate * dragMagnitude;
            zIndex = inward.zIndex;
          } else if (side === dragSign) {
            visualX *= 1 + outward.x * dragMagnitude;
            visualY = 0;
            visualScale -= outward.scale * dragMagnitude;
            visualRotate *= 1 + outward.rotate * dragMagnitude;
            zIndex = outward.zIndex;
          }
        }

        layout.x = visualX + delta.x;
        layout.y = visualY + delta.y;
        layout.scale = visualScale + delta.scale;
        layout.rotate = visualRotate + delta.rotate;
        writeLayout(state, layout, zIndex);
      }
    );
  };

  const applyState = ({
    animate = false,
    fromLayouts = null,
    outgoingCard = null,
    direction = 0
  } = {}) => {
    stack.classList.remove("is-dragging");
    const shouldAnimate = animate && !prefersReducedMotion;
    if (shouldAnimate) {
      // Freeze every card at the captured frame before enabling CSS transitions.
      cardStates.forEach((state) => {
        state.card.classList.remove("is-settling");
        writeLayout(state, fromLayouts?.get(state.card) || state.layout);
      });
      // One batched style/layout flush per handoff, never during drag frames.
      void stack.offsetWidth;
    }
    cardStates.forEach((state) => {
      const { card, index } = state;
      const offset = index - activeIndex;
      const layout = getLayoutForOffset(offset);
      const startLayout = fromLayouts?.get(card) || state.layout || layout;
      const isNeighbor = !portraitQuery.matches && Math.abs(offset) === 1;

      card.dataset.stackPos = String(offset);
      card.dataset.stackDepth = String(Math.abs(offset));
      card.dataset.stackSide = getSide(offset);
      card.classList.toggle("is-active", offset === 0);
      card.classList.toggle("is-neighbor", isNeighbor);
      card.classList.toggle("is-settling", shouldAnimate && card !== outgoingCard);
      card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
      writeLayout(state, layout, getZIndex(offset));
      if (shouldAnimate && card === outgoingCard) {
        animateOutgoingCard(card, startLayout, layout, direction);
      }
    });

    if (shouldAnimate) {
      // Observe browser-created transitions only; do not drive their playback in JS.
      cards.forEach((card) => {
        if (card === outgoingCard) return;
        const transition = card
          .getAnimations()
          .find((animation) => animation.transitionProperty === "transform");
        if (transition) trackMotion(card, transition, false);
      });
    }
    syncLabels();
    syncDecorationState();
  };

  const trackMotion = (card, animation, retainFinalFrame) => {
    motions.set(card, animation);
    const finishAnimation = () => {
      if (motions.get(card) !== animation) return;
      // CSS transitions settle onto the underlying style without a retained effect.
      if (!retainFinalFrame) motions.delete(card);
      syncDecorationState();
    };
    animation.finished.then(finishAnimation, finishAnimation);
  };

  const animateOutgoingCard = (card, startLayout, finalLayout, direction) => {
    if (!card || typeof card.animate !== "function" || prefersReducedMotion) {
      return;
    }

    const startTransform = formatTransform(startLayout);
    const finalTransform = formatTransform(finalLayout);
    const keyframes = [{ transform: startTransform }];
    if (direction) {
      const throwSign = direction > 0 ? -1 : 1;
      const midLayout = createLayout(
        throwSign * getMetrics().cardWidth * (portraitQuery.matches ? 0.56 : 0.52),
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
      keyframes.push(
        { transform: formatTransform(midLayout), offset: 0.5 },
        { transform: formatTransform(tuckLayout), offset: 0.82 }
      );
    }
    keyframes.push({ transform: finalTransform });

    const animation = card.animate(keyframes, {
      duration: portraitQuery.matches ? 920 : 820,
      easing: "cubic-bezier(0.18, 0.86, 0.22, 1)",
      fill: "both"
    });
    // Preserve the outgoing card's existing final-frame handoff behavior.
    trackMotion(card, animation, true);
  };

  const settleCards = () => {
    const fromLayouts = captureLayouts();
    cancelMotions();
    applyState({ animate: true, fromLayouts });
  };

  const rotate = (direction) => {
    if (!direction) {
      return false;
    }

    const targetIndex = clamp(activeIndex + direction, 0, total - 1);
    if (targetIndex === activeIndex) {
      settleCards();
      return false;
    }

    const outgoingCard = cards[activeIndex];
    const fromLayouts = captureLayouts();
    cancelMotions();
    activeIndex = targetIndex;
    applyState({ animate: true, fromLayouts, outgoingCard, direction });
    return true;
  };

  const syncWithoutAnimation = () => {
    cancelMotions();
    cancelQueuedDragState();
    pointerState = null;
    metrics = measureMetrics();
    applyState();
  };

  const bindMediaSync = () => {
    if (!mediaSelector) {
      finishStackLoading();
      return;
    }

    const mediaNodes = Array.from(stack.querySelectorAll(mediaSelector));
    if (!mediaNodes.length) {
      finishStackLoading();
      return;
    }

    let readyCount = 0;
    mediaNodes.forEach((media) => {
      const markReady = () => {
        if (media.dataset.stackMediaReady === "true") {
          return;
        }

        media.dataset.stackMediaReady = "true";
        readyCount += 1;
        queueSyncWithoutAnimation();
        if (readyCount >= mediaNodes.length) {
          finishStackLoading();
        }
      };

      if (media.complete && media.naturalWidth) {
        markReady();
        return;
      }

      media.addEventListener("load", markReady, { once: true });
      media.addEventListener("error", markReady, { once: true });

      if (typeof media.decode === "function") {
        media
          .decode()
          .then(markReady)
          .catch(() => {});
      }
    });
  };

  const onPointerDown = (event) => {
    if (!portraitQuery.matches || !event.isPrimary) {
      return;
    }

    getMetrics();
    const gestureWidth = Math.max(stack.clientWidth, 1);
    stack.setPointerCapture?.(event.pointerId);
    pointerState = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      progress: 0,
      intent: null,
      width: gestureWidth
    };
  };

  const clearPointer = (event, { snap = false } = {}) => {
    if (!pointerState || (event && pointerState.id !== event.pointerId)) {
      return;
    }

    cancelQueuedDragState();
    const pointerId = pointerState.id;
    const wasDragging = pointerState.intent === "x";
    pointerState = null;
    stack.classList.remove("is-dragging");

    if (snap && wasDragging) {
      settleCards();
    }

    if (stack.hasPointerCapture?.(pointerId)) {
      stack.releasePointerCapture(pointerId);
    }
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
      if (pointerState.intent === "x") {
        prepareDrag();
      }
    }

    if (pointerState.intent !== "x") {
      return;
    }

    event.preventDefault();
    const raw = deltaX / (pointerState.width * 0.46);
    const direction = raw === 0 ? 0 : raw > 0 ? -1 : 1;
    const outOfBounds =
      (direction < 0 && activeIndex === 0) || (direction > 0 && activeIndex === total - 1);
    const limit = outOfBounds ? 0.18 : 0.94;
    const resistance = outOfBounds ? 1.8 : 0.84;
    const progress = clamp(
      Math.sign(raw || 0) * limit * (1 - Math.exp(-Math.abs(raw) * resistance)),
      -limit,
      limit
    );
    pointerState.progress = progress;
    queueDragState(progress);
  };

  const onPointerUp = (event) => {
    if (!portraitQuery.matches || !pointerState || pointerState.id !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointerState.x;
    const deltaY = event.clientY - pointerState.y;
    const progress = pointerState.progress || 0;
    const intent = pointerState.intent;
    const gestureWidth = pointerState.width;
    clearPointer(event);

    if (intent !== "x") {
      return;
    }

    const direction = progress < 0 ? 1 : -1;
    const targetIndex = clamp(activeIndex + direction, 0, total - 1);
    const hasTarget = targetIndex !== activeIndex;
    if (
      hasTarget &&
      (Math.abs(deltaX) >= Math.max(gestureWidth * 0.11, 42) || Math.abs(progress) >= 0.28) &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.04
    ) {
      rotate(direction);
    } else {
      settleCards();
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
  stack.addEventListener("pointerleave", (event) => {
    if (!stack.hasPointerCapture?.(event.pointerId)) {
      clearPointer(event, { snap: true });
    }
  });
  stack.addEventListener("lostpointercapture", (event) => {
    if (pointerState?.id === event.pointerId) {
      clearPointer(null, { snap: true });
    }
  });

  metrics = measureMetrics();
  setStackLoading(true);
  stack.dataset.stackReady = "false";
  applyState();
  bindMediaSync();

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        stackVisible = entry.isIntersecting;
        syncDecorationState();
      },
      { rootMargin: "128px 0px" }
    );
    visibilityObserver.observe(stack);
  }
  document.addEventListener("visibilitychange", syncDecorationState);

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

function createStackHeightResolver(sizes) {
  return ({ portrait }) => {
    const size = portrait
      ? sizes.portrait
      : window.matchMedia("(max-width: 980px) and (orientation: landscape)").matches
        ? sizes.landscape
        : window.innerWidth <= 980
          ? sizes.narrow
          : sizes.wide;
    if (!size) return 0;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const [viewportRatio, minRem, maxRem] = size;
    return Math.min(Math.max(window.innerWidth * viewportRatio, minRem * rem), maxRem * rem);
  };
}

function initDisciplineStack() {
  initStackDeck({
    stackId: "discipline-stack",
    items: disciplines,
    getAriaLabel: (item) => `Core disciplines cards. ${item.title} is in focus.`,
    getBaseCardHeight: createStackHeightResolver({
      portrait: [0.84, 25.8, 30.4],
      landscape: [0.33, 18.8, 22.8],
      narrow: [0.4, 20, 24],
      wide: [0.39, 22, 28]
    }),
    measureCard: measureDisciplineCard,
    extraBlockSpace: 8
  });
}

function initProjectStack() {
  initStackDeck({
    stackId: "project-stack",
    items: projects,
    getAriaLabel: (item) => `Current project cards. ${item.title} is in focus.`,
    getBaseCardHeight: createStackHeightResolver({
      portrait: null,
      landscape: [0.365, 21.5, 25.6],
      narrow: [0.47, 22.8, 27.2],
      wide: [0.325, 24.2, 29.5]
    }),
    measureCard: measureProjectCard,
    mediaSelector: ".project-stack-card__image"
  });
}

export { initDisciplineStack, initProjectStack };
