// Only the material buffer is downsampled. The final silhouette uses a device-pixel mask.
const fittedStates = new WeakMap();
const fittedRenderers = new WeakMap();
export function updateHeroMaterial(word, state) {
  fittedStates.set(word, state);
  // Paint in the fitter's frame, not the following material-clock frame.
  fittedRenderers.get(word)?.();
}

const BUFFER_EDGE = 1024;
const WORD_PIXELS = 140000;
const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;
const BLUR = `
precision mediump float;
varying vec2 uv;
uniform sampler2D source;
uniform vec2 stepSize;
uniform float sigma;
void main() {
  float sum = 0.; float weights = 0.;
  for (int i = -14; i <= 14; i++) {
    float x = float(i);
    float weight = exp(-.5 * x * x / (sigma * sigma));
    vec2 p = uv + stepSize * x;
    float inside = step(0., p.x) * step(p.x, 1.) * step(0., p.y) * step(p.y, 1.);
    sum += texture2D(source, clamp(p, 0., 1.)).a * weight * inside;
    weights += weight;
  }
  gl_FragColor = vec4(0., 0., 0., sum / weights);
}
`;
const MATERIAL = `
precision highp float;
varying vec2 uv;
uniform sampler2D softMask;
uniform vec2 size;
uniform float offset;
uniform float orange;
float ramp(float d, vec4 positions, vec4 values, float lastPosition) {
  if (d < positions.y) return mix(values.x, values.y, (d - positions.x) / (positions.y - positions.x));
  if (d < positions.z) return mix(values.y, values.z, (d - positions.y) / (positions.z - positions.y));
  if (d < positions.w) return mix(values.z, values.w, (d - positions.z) / (positions.w - positions.z));
  return mix(values.w, 0., clamp((d - positions.w) / (lastPosition - positions.w), 0., 1.));
}
vec3 palette(float value) {
  vec3 a; vec3 b; float t = clamp(value, 0., 1.) * 6.;
  if (orange > .5) {
    if (t < 1.) { a=vec3(.14,.018,.004); b=vec3(.36,.06,.01); }
    else if (t < 2.) { a=vec3(.36,.06,.01); b=vec3(1.,.40,.065); }
    else if (t < 3.) { a=vec3(1.,.40,.065); b=vec3(1.,.84,.56); }
    else if (t < 4.) { a=vec3(1.,.84,.56); b=vec3(.87,.19,.02); }
    else if (t < 5.) { a=vec3(.87,.19,.02); b=vec3(1.,.60,.20); }
    else { a=vec3(1.,.60,.20); b=vec3(1.,.94,.82); }
  } else {
    if (t < 1.) { a=vec3(.29,.30,.31); b=vec3(.385,.395,.41); }
    else if (t < 2.) { a=vec3(.385,.395,.41); b=vec3(.70,.71,.72); }
    else if (t < 3.) { a=vec3(.70,.71,.72); b=vec3(.91,.91,.895); }
    else if (t < 4.) { a=vec3(.91,.91,.895); b=vec3(.57,.58,.595); }
    else if (t < 5.) { a=vec3(.57,.58,.595); b=vec3(.815,.815,.805); }
    else { a=vec3(.815,.815,.805); b=vec3(.94,.935,.92); }
  }
  return mix(a, b, min(t - min(floor(t), 5.), 1.));
}
void main() {
  vec2 p = vec2(fract((uv.x * size.x + offset) / 486.), 1. - uv.y);
  float d = length((p - vec2(.80,-.04)) / vec2(.19,1.32));
  float alpha = ramp(d, vec4(0.,.37,.74,1.), vec4(.72,.46,.12,0.), 1.01);
  float source = mix(119./255.,208./255.,alpha);
  d = length((p - vec2(.35,.08)) / vec2(.34,1.65));
  alpha = ramp(d, vec4(0.,.24,.54,.81), vec4(.92,.78,.40,.10), 1.);
  source = mix(source,230./255.,alpha);
  d = length((p - vec2(.64,.95)) / vec2(.34,1.25));
  alpha = ramp(d, vec4(0.,.24,.53,.78), vec4(.86,.68,.32,.08), 1.);
  source = mix(source,24./255.,alpha);
  // The native mask supplies coverage at composition time. Do not let the
  // reduced mask's pixel coverage reintroduce stair steps into the bright rim.
  float edge = max(0., 1. - texture2D(softMask, uv).a);
  float relief = (157./255.) * (1. - edge * mix(.7,1.,orange));
  float lit = relief <= .5 ? 2. * source * relief : 1. - 2. * (1. - source) * (1. - relief);
  gl_FragColor = vec4(palette(lit), 1.);
}
`;

function createProgram(gl, fragment) {
  const program = gl.createProgram();
  const shaders = [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]].map(([type, code]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    gl.attachShader(program, shader);
    return shader;
  });
  gl.linkProgram(program);
  shaders.forEach((shader) => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return { program, uniforms: new Map() };
}

// Reuse the same font source as the page, with an independent axis instance per word.
// Canvas fontStretch cannot represent the continuous width percentages used by the fitter.
async function loadFontSource() {
  const stylesheet = document.querySelector('link[href*="fonts.googleapis.com"][href*="Anybody"]');
  if (!stylesheet) throw new Error("Hero font stylesheet is missing");
  const response = await fetch(stylesheet.href);
  if (!response.ok) throw new Error("Hero font stylesheet could not be loaded");
  const css = await response.text();
  const blocks = Array.from(css.matchAll(/@font-face\s*\{([^}]+)\}/g))
    .map((match) => match[1]).filter((block) => /font-family:\s*['"]Anybody['"]/.test(block));
  const latin = blocks.find((block) => /U\+0000-00FF/i.test(block)) || blocks.at(-1);
  const url = latin?.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, "");
  if (!url) throw new Error("Hero font source could not be resolved");
  const font = await fetch(url);
  if (!font.ok) throw new Error("Hero font could not be loaded");
  return font.arrayBuffer();
}

export async function initHeroMaterial() {
  const words = Array.from(document.querySelectorAll(".hero .hero-fit-word.hero-metal"));
  if (!words.length) return;
  const surface = document.createElement("canvas");
  surface.width = surface.height = BUFFER_EDGE;
  const gl = surface.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return; // The existing SVG treatment is the no-WebGL/no-JS fallback.
  const entries = [];
  let frame = 0;
  let stopped = false;
  let resizeObserver;
  let visibilityObserver;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const fail = (error) => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    entries.forEach((entry) => {
      entry.word.classList.remove("hero-material-buffered");
      fittedRenderers.delete(entry.word);
      entry.canvas.remove();
      document.fonts.delete(entry.face);
      entry.textures.forEach((texture) => gl.deleteTexture(texture));
      entry.targets.forEach((target) => gl.deleteFramebuffer(target));
      [entry.canvas, entry.mask, entry.smallMask].forEach((canvas) => { canvas.width = canvas.height = 1; });
    });
    entries.length = 0;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (error) console.warn("Hero material kept the SVG fallback", error);
  };
  surface.addEventListener("webglcontextlost", () => fail());
  try {
    const blur = createProgram(gl, BLUR);
    const material = createProgram(gl, MATERIAL);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const use = (shader) => {
      gl.useProgram(shader.program);
      const attribute = gl.getAttribLocation(shader.program, "position");
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    };
    const uniform = (shader, name) => {
      if (!shader.uniforms.has(name)) shader.uniforms.set(name, gl.getUniformLocation(shader.program, name));
      return shader.uniforms.get(name);
    };
    const texture = () => {
      const result = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, result);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return result;
    };
    const bind = (value, unit = 0) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, value);
    };
    const fontSource = await loadFontSource();
    await document.fonts.ready;
    for (const [index, word] of words.entries()) {
      const face = new FontFace(`HeroMaterial${index}`, fontSource, { variationSettings: '"wght" 850, "wdth" 100' });
      await face.load();
      document.fonts.add(face);
      const canvas = document.createElement("canvas");
      canvas.className = "hero-material-canvas";
      canvas.setAttribute("aria-hidden", "true");
      const mask = document.createElement("canvas");
      const smallMask = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const maskContext = mask.getContext("2d");
      const smallContext = smallMask.getContext("2d");
      if (!context || !maskContext || !smallContext || !("letterSpacing" in maskContext)) {
        document.fonts.delete(face);
        throw new Error("Exact canvas typography is not supported");
      }
      const textures = [texture(), texture(), texture()];
      const targets = [gl.createFramebuffer(), gl.createFramebuffer()];
      const entry = { word, face, canvas, mask, smallMask, context, maskContext, smallContext,
        textures, targets, dirty: true, state: null, width: 0, height: 0, visible: false, active: false,
        intro: !!word.closest(".hero-intro"),
        orange: !!word.closest(".hero-modelized, .hero-intro-cell--shape"), clock: null };
      entries.push(entry);
      word.append(canvas);
    }
    const rebuild = (entry, state, width, height, dpr) => {
      const { mask, maskContext: ctx, smallMask, smallContext, canvas, face } = entry;
      entry.state = state;
      entry.width = width;
      entry.height = height;
      entry.dpr = dpr;
      entry.dirty = false;
      // Native-resolution silhouette; only its blurred relief is reduced below.
      const pixelScaleX = dpr * Math.max(1, Math.abs(state.scaleX));
      const pixelWidth = Math.ceil(width * pixelScaleX);
      const pixelHeight = Math.ceil(height * dpr);
      // At extreme zoom, retain native text rather than allocate an unsafe bitmap
      // or silently lower the silhouette resolution.
      if (pixelWidth > 16384 || pixelHeight > 16384 || pixelWidth * pixelHeight > 16000000) {
        throw new Error("Native silhouette exceeds the safe canvas size");
      }
      if (mask.width !== pixelWidth || mask.height !== pixelHeight) {
        mask.width = canvas.width = pixelWidth;
        mask.height = canvas.height = pixelHeight;
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pixelWidth, pixelHeight);
      }
      face.variationSettings = `"wght" ${state.weight.toFixed(3)}, "wdth" ${state.width.toFixed(3)}`;
      // Map the full integer bitmap back to the exact fractional CSS box.
      // Otherwise ceil(width * density) changes the glyph scale on every axis frame.
      ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
      const fontSize = Number(state.fontSize.toFixed(3));
      ctx.font = `100px "${face.family}"`;
      const fontMetrics = ctx.measureText("Hg");
      const baseline = ((100 - fontMetrics.fontBoundingBoxAscent - fontMetrics.fontBoundingBoxDescent) / 2
        + fontMetrics.fontBoundingBoxAscent) * fontSize / 100;
      ctx.font = `${fontSize}px "${face.family}"`;
      ctx.fontKerning = "normal";
      ctx.textRendering = "geometricPrecision";
      ctx.letterSpacing = `${fontSize * Number(state.trackingEm.toFixed(5))}px`;
      const text = entry.word.textContent.trim();
      const metrics = ctx.measureText(text);
      if (!Number.isFinite(baseline) || Math.abs(metrics.width - width) > Math.max(2, width * .015)) {
        throw new Error("Canvas and live variable-font metrics differ");
      }
      ctx.fillStyle = "white";
      ctx.fillText(text, 0, baseline);
      const scale = Math.min(1, dpr * .5, BUFFER_EDGE / Math.max(width, height), Math.sqrt(WORD_PIXELS / (width * height)));
      const w = smallMask.width = Math.max(1, Math.floor(width * scale));
      const h = smallMask.height = Math.max(1, Math.floor(height * scale));
      smallContext.drawImage(mask, 0, 0, w, h);
      bind(entry.textures[0]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, smallMask);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      use(blur);
      gl.uniform1i(uniform(blur, "source"), 0);
      gl.viewport(0, 0, w, h);
      for (let pass = 0; pass < 2; pass++) {
        bind(entry.textures[pass + 1]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, entry.targets[pass]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, entry.textures[pass + 1], 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Material buffer is incomplete");
        bind(entry.textures[pass]);
        gl.uniform2f(uniform(blur, "stepSize"), pass === 0 ? 1 / w : 0, pass === 1 ? 1 / h : 0);
        gl.uniform1f(uniform(blur, "sigma"), Math.max(.35, 4.5 * (pass === 0 ? w / width : h / height)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
    const renderEntry = (entry) => {
      if (stopped || document.hidden) return;
      try {
        const showIntro = document.body.classList.contains("hero-intro-running") ||
          document.body.classList.contains("hero-handoff");
          const state = fittedStates.get(entry.word);
          if (!state || !entry.visible || (entry.intro && !showIntro)) return;
          // Pinch zoom does not necessarily change devicePixelRatio. Keep the final
          // silhouette sharp at that scale without increasing the material buffer.
          const dpr = Math.max(2, window.devicePixelRatio || 1) * (window.visualViewport?.scale || 1);
          if (entry.dirty || entry.state !== state || entry.dpr !== dpr) {
            const style = getComputedStyle(entry.word);
            const width = parseFloat(style.width);
            const height = parseFloat(style.height);
            if (!width || !height) return;
            rebuild(entry, state, width, height, dpr);
          } else if (motion.matches && entry.active) return;
          if (!entry.clock || entry.clock.playState === "idle" || entry.clock.playState === "finished") {
            const target = entry.intro ? entry.word.closest(".hero-intro-grid") : entry.word;
            entry.clock = target.getAnimations().find((animation) => animation.animationName?.endsWith("metal-stream") ||
              /hero-metal-(model|story)-stream/.test(animation.animationName));
          }
          const progress = motion.matches ? 0 : (entry.clock?.effect?.getComputedTiming().progress ?? 0);
          const w = entry.smallMask.width;
          const h = entry.smallMask.height;
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, w, h);
          use(material);
          bind(entry.textures[2], 0);
          gl.uniform1i(uniform(material, "softMask"), 0);
          gl.uniform2f(uniform(material, "size"), entry.width, entry.height);
          gl.uniform1f(uniform(material, "offset"), progress * 486);
          gl.uniform1f(uniform(material, "orange"), entry.orange ? 1 : 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          const ctx = entry.context;
          ctx.globalCompositeOperation = "copy";
          ctx.drawImage(surface, 0, BUFFER_EDGE - h, w, h, 0, 0, entry.canvas.width, entry.canvas.height);
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(entry.mask, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          if (!entry.active) {
            entry.word.classList.add("hero-material-buffered");
            entry.active = true;
          }
      } catch (error) { fail(error); }
    };
    const tick = () => {
      frame = 0;
      if (stopped || document.hidden) return;
      entries.forEach(renderEntry);
      if (!stopped) frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!stopped && !frame && !document.hidden) frame = requestAnimationFrame(tick); };
    // A JS renderer must explicitly preserve the browser's offscreen paint culling.
    visibilityObserver = new IntersectionObserver((records) => {
      for (const record of records) {
        const entry = entries.find((item) => item.word === record.target);
        if (entry) entry.visible = record.isIntersecting;
      }
      wake();
    });
    resizeObserver = new ResizeObserver((records) => {
      for (const record of records) {
        const entry = entries.find((item) => item.word === record.target);
        if (entry) entry.dirty = true;
      }
      wake();
    });
    entries.forEach((entry) => {
      fittedRenderers.set(entry.word, () => renderEntry(entry));
      resizeObserver.observe(entry.word);
      visibilityObserver.observe(entry.word);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake();
    });
    window.addEventListener("pageshow", wake);
    window.addEventListener("pagehide", () => { cancelAnimationFrame(frame); frame = 0; });
    motion.addEventListener("change", () => { entries.forEach((entry) => { entry.dirty = true; }); wake(); });
    wake();
  } catch (error) { fail(error); }
}
