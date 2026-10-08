export function captureTextureSurface(element, density, colorSpace) {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(rect.width * density));
  canvas.height = Math.max(1, Math.ceil(rect.height * density));
  const ctx = canvas.getContext("2d", { colorSpace, willReadFrequently: true });
  if (!ctx) throw new Error("Texture surface canvas is unavailable");
  ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
  const image = element.matches("img") ? element : element.querySelector("img");
  if (image) {
    if (!image.complete || !image.naturalWidth) throw new Error("Texture logo is not ready");
    const box = image.getBoundingClientRect();
    // The hero logo's image intentionally extends beyond its clipping frame.
    ctx.drawImage(image, box.left - rect.left, box.top - rect.top, box.width, box.height);
  } else {
    const style = getComputedStyle(element);
    const border = parseFloat(style.borderTopWidth) || 0;
    ctx.beginPath();
    ctx.roundRect(border / 2, border / 2, rect.width - border, rect.height - border,
      Math.min(parseFloat(style.borderTopLeftRadius) || 0, rect.height / 2));
    ctx.fillStyle = style.backgroundColor;
    ctx.fill();
    ctx.lineWidth = border;
    ctx.strokeStyle = style.borderTopColor;
    if (border) ctx.stroke();
    const label = [...element.querySelectorAll(".hero-project-link__label")]
      .find((node) => node.getBoundingClientRect().width > 0);
    if (label) {
      const textStyle = getComputedStyle(label);
      ctx.font = `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
      ctx.letterSpacing = textStyle.letterSpacing;
      ctx.fillStyle = textStyle.color;
      ctx.textBaseline = "alphabetic";
      for (const node of label.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange();
        // Word ranges preserve wrapping within a single text node.
        for (const token of node.textContent.matchAll(/\S+/g)) {
          range.setStart(node, token.index);
          range.setEnd(node, token.index + token[0].length);
          const box = range.getBoundingClientRect();
          const text = textStyle.textTransform === "uppercase" ? token[0].toUpperCase() : token[0];
          const metrics = ctx.measureText(text);
          const baseline = (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
          ctx.fillText(text, box.left - rect.left, box.top - rect.top + box.height / 2 + baseline);
        }
      }
    }
    const arrow = element.querySelector("svg");
    if (arrow) {
      const box = arrow.getBoundingClientRect();
      const arrowStyle = getComputedStyle(arrow);
      ctx.save();
      ctx.translate(box.left - rect.left, box.top - rect.top);
      ctx.scale(box.width / 24, box.height / 24);
      ctx.strokeStyle = arrowStyle.stroke;
      ctx.lineWidth = parseFloat(arrowStyle.strokeWidth);
      ctx.lineCap = arrowStyle.strokeLinecap;
      ctx.lineJoin = arrowStyle.strokeLinejoin;
      for (const path of arrow.querySelectorAll("path")) ctx.stroke(new Path2D(path.getAttribute("d")));
      ctx.restore();
    }
  }
  return { element, rect, width: canvas.width, height: canvas.height,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
}
