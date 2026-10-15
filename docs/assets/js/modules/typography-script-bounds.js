import { createSettledScheduler } from "./layout-scheduler.js?v=20261015c";

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

export { syncRockSaltSafeAreas, initRockSaltSafeAreas };
