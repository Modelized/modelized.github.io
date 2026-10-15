export const GLYPH_COPY_MS = 620;

export function captureGlyphCopy(element) {
  element.classList.remove("glyph-copy-settled");
  element.style.opacity = "0";
  element.style.transform = "none";
  const rect = element.getBoundingClientRect();
  const density = devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width * density);
  canvas.height = Math.ceil(rect.height * density);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Glyph copy surface unavailable");
  ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
  for (const button of element.querySelectorAll("button")) {
    const box = button.getBoundingClientRect(), style = getComputedStyle(button);
    const border = parseFloat(style.borderTopWidth) || 0;
    ctx.beginPath();
    ctx.roundRect(box.left - rect.left + border / 2, box.top - rect.top + border / 2,
      box.width - border, box.height - border, Math.min(parseFloat(style.borderTopLeftRadius) || 0, box.height / 2));
    ctx.fillStyle = style.backgroundColor; ctx.fill();
    ctx.lineWidth = border; ctx.strokeStyle = style.borderTopColor;
    if (border) ctx.stroke();
  }
  // Word ranges preserve the DOM's line breaks in the temporary canvas copy.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest("[data-glyph-hint]")) continue;
    const style = getComputedStyle(node.parentElement);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fontKerning = style.fontKerning;
    ctx.fontStretch = style.fontStretch;
    ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    ctx.fillStyle = style.color;
    ctx.textBaseline = "alphabetic";
    for (const token of node.textContent.matchAll(/\S+/g)) {
      range.setStart(node, token.index); range.setEnd(node, token.index + token[0].length);
      const box = range.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const text = style.textTransform === "uppercase" ? token[0].toUpperCase() : token[0];
      const metrics = ctx.measureText(text);
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
      ctx.fillText(text, box.left - rect.left, box.top - rect.top + (box.height + ascent - descent) / 2);
    }
  }
  return { canvas, rect };
}

export function clearGlyphCopy(element) {
  element.classList.add("glyph-copy-settled");
  element.style.removeProperty("opacity");
  element.style.removeProperty("transform");
}
