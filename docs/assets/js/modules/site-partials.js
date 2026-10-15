import { body } from "./context.js?v=20261015c";

const base = (body?.getAttribute("data-base") || ".").trim();
const assetVersion = "20260831c";

function getPartialUrl(file) {
  const version = file === "nav.html" ? "20261008k" : assetVersion;
  if (!base || base === ".") {
    return `assets/partials/${file}?v=${version}`;
  }

  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/assets/partials/${file}?v=${version}`;
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

export { injectPartial };
