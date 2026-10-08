import { getTexturePreference } from "./texture-state.js?v=20261008i";
import { TEXTURE_WAVE, TEXTURE_LIGHT, TEXTURE_SURFACE, TEXTURE_PARTICLE_VERTEX, TEXTURE_PARTICLE_FRAGMENT } from "./texture-wave.js?v=20261008i";
import { captureTextureSurface } from "./texture-surfaces.js?v=20261008i";

// One smooth, repeating reflection tile per context; coverage and relief stay native.
const REFLECTION_TILE_SIZE = 1024;
const REFLECTION_PERIOD = 486;
// Keep the familiar phone-scale density on larger fitted words. This changes
// texture coordinates only, not the cached reflection or glyph resolution.
const REFLECTION_REPEATS = 1.2;
const fittedStates = new WeakMap();
const fittedBounds = new WeakMap();
const reflectionPeriods = new WeakMap();
const pendingPreparations = new WeakSet();
// Pinch zoom only magnifies the existing canvas. For page zoom, DPR and CSS
// viewport width change inversely while the physical viewport stays the same.
// Track that separately from real display / preview-density changes, rather
// than freezing the first DPR (which may belong to a temporary preview setup).
function viewportSample() {
  return { dpr: window.devicePixelRatio || 1, width: window.innerWidth,
    outerWidth: window.outerWidth,
    screen: [screen.width, screen.height].sort((a, b) => a - b).join(":") };
}
let previousViewport = viewportSample();
let renderDensity = previousViewport.dpr;
function renderingDensity() {
  const next = viewportSample();
  if (next.dpr !== previousViewport.dpr) {
    const physicalWidth = next.width * next.dpr;
    const previousPhysicalWidth = previousViewport.width * previousViewport.dpr;
    const pageZoom = next.screen === previousViewport.screen &&
      Math.abs(next.outerWidth - previousViewport.outerWidth) <= 2 &&
      Math.abs(physicalWidth - previousPhysicalWidth) <= Math.max(4, physicalWidth * .01);
    if (!pageZoom) renderDensity *= next.dpr / previousViewport.dpr;
  }
  previousViewport = next;
  return renderDensity;
}
export function updateHeroMaterial(word, state, bounds) {
  // A new animation frame, refit or cancellation supersedes queued preparation.
  pendingPreparations.delete(word);
  fittedStates.set(word, state);
  if (bounds) {
    fittedBounds.set(word, bounds);
    // Use the settled, untransformed width, not a changing reveal/touch frame.
    reflectionPeriods.set(word, Math.max(REFLECTION_PERIOD, bounds.reflectionWidth / REFLECTION_REPEATS));
  }
}

export function prepareHeroMaterial(word) {
  pendingPreparations.add(word);
}

const VERTEX = `
attribute vec2 position;
uniform vec4 rectangle;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(rectangle.xy + uv * rectangle.zw, 0., 1.);
}
`;
const BLUR = `
precision highp float;
varying vec2 uv;
uniform sampler2D source;
uniform vec2 textureScale;
uniform vec2 stepSize;
uniform vec2 taps[48];
uniform int tapCount;
uniform float centerWeight;
float sampleAlpha(vec2 p) {
  float inside = step(0., p.x) * step(p.x, 1.) * step(0., p.y) * step(p.y, 1.);
  return texture2D(source, p * textureScale).a * inside;
}
void main() {
  float sum = sampleAlpha(uv) * centerWeight;
  for (int i = 0; i < 48; i++) {
    if (i >= tapCount) break;
    vec2 delta = stepSize * taps[i].x;
    sum += (sampleAlpha(uv + delta) + sampleAlpha(uv - delta)) * taps[i].y;
  }
  gl_FragColor = vec4(0., 0., 0., sum);
}
`;
const REFLECTION = `
precision highp float;
varying vec2 uv;
float ramp(float d, vec4 positions, vec4 values, float lastPosition) {
  if (d < positions.y) return mix(values.x, values.y, (d - positions.x) / (positions.y - positions.x));
  if (d < positions.z) return mix(values.y, values.z, (d - positions.y) / (positions.z - positions.y));
  if (d < positions.w) return mix(values.z, values.w, (d - positions.z) / (positions.w - positions.z));
  return mix(values.w, 0., clamp((d - positions.w) / (lastPosition - positions.w), 0., 1.));
}
void main() {
  vec2 p = vec2(uv.x, 1. - uv.y);
  float d = length((p - vec2(.80,-.04)) / vec2(.19,1.32));
  float alpha = ramp(d, vec4(0.,.37,.74,1.), vec4(.72,.46,.12,0.), 1.01);
  float source = mix(119./255.,208./255.,alpha);
  d = length((p - vec2(.35,.08)) / vec2(.34,1.65));
  alpha = ramp(d, vec4(0.,.24,.54,.81), vec4(.92,.78,.40,.10), 1.);
  source = mix(source,230./255.,alpha);
  d = length((p - vec2(.64,.95)) / vec2(.34,1.25));
  alpha = ramp(d, vec4(0.,.24,.53,.78), vec4(.86,.68,.32,.08), 1.);
  source = mix(source,24./255.,alpha);
  // Preserve smooth tonal precision in RGBA8; both channels interpolate linearly.
  float encodedValue = source * 255.;
  gl_FragColor = vec4(floor(encodedValue) / 255., fract(encodedValue), 0., 1.);
}
`;
const MATERIAL = `
precision highp float;
varying vec2 uv;
uniform sampler2D softMask;
uniform sampler2D mask;
uniform sampler2D reflection;
uniform vec2 textureScale;
uniform vec2 reflectionMapping;
uniform float orange;
uniform float opacity;
#ifdef TEXTURE_TRANSITION
${TEXTURE_WAVE}
uniform vec4 textureGlyph;
uniform vec2 textureFlatMapping;
uniform sampler2D textureFlatPalette;
uniform float textureToLiquid;
#endif
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
vec4 materialSample(vec2 sampleUV, float liquid) {
  vec2 reflectionUV = vec2(sampleUV.x * reflectionMapping.x + reflectionMapping.y, sampleUV.y);
  vec2 encoded = texture2D(reflection, reflectionUV).rg;
  float source = encoded.r + encoded.g / 255.;
  float coverage = texture2D(mask, sampleUV * textureScale).a;
#ifdef TEXTURE_TRANSITION
  coverage *= step(0., sampleUV.x) * step(sampleUV.x, 1.) * step(0., sampleUV.y) * step(sampleUV.y, 1.);
#endif
  float edge = max(0., coverage - texture2D(softMask, sampleUV * textureScale).a) * mix(.7,1.,orange);
  float relief = (157./255.) * (1. - edge);
  float lit = relief <= .5 ? 2. * source * relief : 1. - 2. * (1. - source) * (1. - relief);
  // Match feBlend's source-over alpha, then the final SourceAlpha composite.
  float blendedAlpha = coverage * (2. - coverage);
  lit = ((1. - coverage) * (source + relief) + coverage * lit) / max(.00001, 2. - coverage);
  float alphaOut = blendedAlpha * coverage * opacity;
  vec4 color = vec4(palette(lit) * alphaOut, alphaOut);
#ifdef TEXTURE_TRANSITION
  float flatX = fract(sampleUV.x * textureFlatMapping.x + textureFlatMapping.y);
  vec3 flatColor = texture2D(textureFlatPalette, vec2(flatX, orange > .5 ? .25 : .75)).rgb;
  vec4 flatSample = vec4(flatColor * coverage * opacity, coverage * opacity);
  color = mix(flatSample, color, liquid);
#endif
  return color;
}
void main() {
#ifdef TEXTURE_TRANSITION
  vec2 point = texturePoint();
  vec2 displaced = point + textureDisplacement(point);
  vec2 sampleUV = vec2((displaced.x - textureGlyph.x) / textureGlyph.z,
    1. - (displaced.y - textureGlyph.y) / textureGlyph.w);
  float front = textureStage < .5 ? 0. : 1. - smoothstep(-.45, .45, textureWave(point).x);
  float liquid = mix(1. - textureToLiquid, textureToLiquid, front);
  // Three-tap defocus is limited to the transition shader.
  vec2 ray = point - textureOrigin;
  float chromatic = textureChromatic(point);
  vec2 defocus = ray / max(1., length(ray)) * (textureDefocus(point) * (1. - chromatic * .5) + chromatic * 2.);
  vec2 delta = vec2(defocus.x / textureGlyph.z, -defocus.y / textureGlyph.w);
  gl_FragColor = textureComposite(materialSample(sampleUV, liquid),
    materialSample(sampleUV - delta, liquid), materialSample(sampleUV + delta, liquid), chromatic);
#else
  gl_FragColor = materialSample(uv, 1.);
#endif
}
`;

function createProgram(gl, fragment, vertex = VERTEX) {
  const program = gl.createProgram();
  const shaders = [];
  try {
    if (!program) throw new Error("WebGL program allocation failed");
    for (const [type, code] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("WebGL shader allocation failed");
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return { program, uniforms: new Map() };
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    shaders.forEach((shader) => gl.deleteShader(shader));
  }
}

// Pair adjacent Gaussian taps with linear texture sampling. This keeps the
// original 4.5 CSS-pixel relief without calculating Gaussian weights per pixel.
function gaussianKernel(sigma) {
  // Large responsive scaleX values are valid (especially in landscape). Keep
  // the same CSS-space radius with wider sampling, rather than abandoning GL.
  const spacing = Math.max(1, sigma / 32);
  sigma /= spacing;
  const radius = Math.min(96, Math.ceil(sigma * 3));
  const taps = new Float32Array(96);
  const weight = (x) => Math.exp(-.5 * x * x / (sigma * sigma));
  let total = 1;
  let count = 0;
  for (let x = 1; x <= radius; x += 2) {
    const a = weight(x);
    const b = x + 1 <= radius ? weight(x + 1) : 0;
    taps[count * 2] = (x + b / (a + b)) * spacing;
    taps[count * 2 + 1] = a + b;
    total += 2 * (a + b);
    count++;
  }
  for (let i = 0; i < count; i++) taps[i * 2 + 1] /= total;
  return { taps, count, center: 1 / total };
}

function createMaterialLayer(root, restore, unavailable) {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-material-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false
  });
  if (!gl) throw new Error("WebGL is unavailable");
  // Preserve the original transfer-table palette on wide-gamut displays.
  if ("drawingBufferColorSpace" in gl) {
    gl.drawingBufferColorSpace = matchMedia("(color-gamut: p3)").matches ? "display-p3" : "srgb";
  }
  const entries = [];
  let reflectionTile;
  let reflectionTarget;
  const programs = [];
  let quad;
  let stopped = false;
  let lost = false;
  let lastFrame = "";
  let textureFrame = null;
  let texturePadding = 0;
  let textureMaterial = null;
  let textureLight = null;
  let textureParticles = null;
  let particleBuffer = null;
  let textureFlatPalette = null;
  let textureSurfaceProgram = null;
  let textureLightLimit = 0;
  const textureSurfaces = [];
  const clearTextureSurfaces = () => {
    for (const surface of textureSurfaces) {
      surface.element.classList.remove("texture-surface-active");
      gl.deleteTexture(surface.texture);
    }
    textureSurfaces.length = 0;
  };
  const showPlain = () => {
    textureSurfaces.forEach(({ element }) => element.classList.remove("texture-surface-active"));
    canvas.hidden = true;
    root.dataset.materialRenderer = "plain";
    for (const entry of entries) {
      entry.word.classList.remove("hero-material-webgl");
      entry.active = false;
    }
  };
  const dispose = (releaseContext = true) => {
    stopped = true;
    showPlain();
    clearTextureSurfaces();
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    root.classList.remove("hero-material-layer");
    canvas.remove();
    for (const entry of entries) {
      entry.word.classList.remove("hero-material-webgl");
      entry.mask.remove();
      entry.textures.forEach((texture) => gl.deleteTexture(texture));
      entry.targets.forEach((target) => gl.deleteFramebuffer(target));
      entry.mask.width = entry.mask.height = 1;
    }
    if (reflectionTile) gl.deleteTexture(reflectionTile);
    if (reflectionTarget) gl.deleteFramebuffer(reflectionTarget);
    if (textureFlatPalette) gl.deleteTexture(textureFlatPalette);
    programs.forEach((shader) => gl.deleteProgram(shader.program));
    if (quad) gl.deleteBuffer(quad);
    if (particleBuffer) gl.deleteBuffer(particleBuffer);
    if (releaseContext) gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  const fail = (error) => {
    if (stopped) return;
    dispose();
    unavailable();
    console.warn("Hero material is unavailable; using un-beveled text", error);
  };
  const onContextLost = (event) => {
    event.preventDefault();
    lost = true;
    showPlain();
    unavailable();
  };
  const onContextRestored = () => {
    dispose(false);
    restore();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  try {
    const blur = createProgram(gl, BLUR);
    programs.push(blur);
    const material = createProgram(gl, MATERIAL);
    programs.push(material);
    const reflection = createProgram(gl, REFLECTION);
    programs.push(reflection);
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const maxRenderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const uniform = (shader, name) => {
      if (!shader.uniforms.has(name)) shader.uniforms.set(name, gl.getUniformLocation(shader.program, name));
      return shader.uniforms.get(name);
    };
    const bind = (texture, unit = 0) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    };
    const texture = () => {
      const result = gl.createTexture();
      bind(result);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return result;
    };
    const prepareTexturePrograms = () => {
      if (textureMaterial && textureLight && textureFlatPalette && textureSurfaceProgram && textureParticles && particleBuffer) return;
      // Keep individually completed resources reusable after a failed attempt.
      if (!textureMaterial) {
        textureMaterial = createProgram(gl, "#define TEXTURE_TRANSITION\n" + MATERIAL);
        programs.push(textureMaterial);
      }
      if (!textureLight) {
        textureLight = createProgram(gl, TEXTURE_LIGHT);
        programs.push(textureLight);
      }
      if (!textureSurfaceProgram) {
        textureSurfaceProgram = createProgram(gl, TEXTURE_SURFACE);
        programs.push(textureSurfaceProgram);
      }
      if (!textureParticles) {
        textureParticles = createProgram(gl, TEXTURE_PARTICLE_FRAGMENT, TEXTURE_PARTICLE_VERTEX);
        programs.push(textureParticles);
      }
      if (!particleBuffer) {
        particleBuffer = gl.createBuffer();
        if (!particleBuffer) throw new Error("Texture particle allocation failed");
        const seeds = new Float32Array(32);
        for (let i = 0; i < 16; i++) { seeds[i * 2] = i; seeds[i * 2 + 1] = i / 16; }
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      }
      // Preserve the flat CSS palette and its color space.
      const paletteCanvas = document.createElement("canvas");
      paletteCanvas.width = 512;
      paletteCanvas.height = 2;
      const ctx = paletteCanvas.getContext("2d", { colorSpace: gl.drawingBufferColorSpace || "srgb" });
      if (!ctx) throw new Error("Texture palette canvas is unavailable");
      const style = getComputedStyle(root);
      ["--papaya-metal-gradient", "--silver-metal-gradient"].forEach((name, row) => {
        const gradient = ctx.createLinearGradient(0, 0, 512, 0);
        const stops = [...style.getPropertyValue(name).matchAll(/(#[\da-f]+)\s+([\d.]+)%/gi)];
        if (!stops.length) throw new Error("Texture palette is unavailable");
        stops.forEach(([, color, offset]) => gradient.addColorStop(Number(offset) / 100, color));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, row, 512, 1);
      });
      const pixels = ctx.getImageData(0, 0, 512, 2).data;
      const palette = texture();
      try {
        if (!palette) throw new Error("Texture palette allocation failed");
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (gl.getError() !== gl.NO_ERROR) throw new Error("Texture palette upload failed");
        textureFlatPalette = palette;
      } catch (error) {
        if (palette) gl.deleteTexture(palette);
        throw error;
      }
    };
    const textureUniforms = (shader, box) => {
      gl.uniform2f(uniform(shader, "textureOrigin"), textureFrame.origin.x, textureFrame.origin.y);
      gl.uniform2f(uniform(shader, "textureViewport"), box.width, box.height);
      gl.uniform2f(uniform(shader, "texturePixels"), canvas.width, canvas.height);
      gl.uniform2f(uniform(shader, "textureMotion"), textureFrame.motion.position, textureFrame.motion.speed);
      gl.uniform1f(uniform(shader, "textureRecoil"), textureFrame.motion.recoil);
      gl.uniform1f(uniform(shader, "textureFocus"), textureFrame.origin.radius);
      gl.uniform1f(uniform(shader, "textureStage"), textureFrame.stage);
      gl.uniform1f(uniform(shader, "textureStrength"), textureFrame.strength ?? 1);
      gl.uniform1f(uniform(shader, "textureLightLimit"), textureLightLimit);
      gl.uniform2f(uniform(shader, "textureJitter"), textureFrame.jitter?.x || 0, textureFrame.jitter?.y || 0);
      gl.uniform1f(uniform(shader, "textureCharge"), textureFrame.charge || 0);
      gl.uniform1f(uniform(shader, "textureElapsed"), textureFrame.elapsed || 0);
    };
    // The field only translates; its shape never changes. Bake one full period
    // once, then move sampling coordinates rather than redraw reflection buffers.
    // Power-of-two storage allows seamless horizontal REPEAT in WebGL 1.
    const tileSize = Math.min(REFLECTION_TILE_SIZE, maxTexture);
    reflectionTile = texture();
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tileSize, tileSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    reflectionTarget = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflectionTarget);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflectionTile, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Reflection tile framebuffer is incomplete");
    }
    gl.viewport(0, 0, tileSize, tileSize);
    gl.useProgram(reflection.program);
    gl.uniform4f(uniform(reflection, "rectangle"), -1, -1, 2, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(reflectionTarget);
    reflectionTarget = null;
    const rebuild = (entry, state, width, height, densityX, densityY, key) => {
      const { mask, context, family } = entry;
      const w = Math.min(maxTexture, Math.max(1, Math.ceil(width * densityX)));
      const h = Math.min(maxTexture, Math.max(1, Math.ceil(height * densityY)));
      // Reserve the fitted animation envelope, not just this frame's thin glyph.
      // Small headroom also covers the existing 5.5% touch expansion. Reserve
      // dimensions stay within the GPU's actual texture-size limit.
      const bounds = fittedBounds.get(entry.word);
      const rootScaleX = densityX / Math.max(.00001, Math.abs(state.scaleX));
      let reserveW = Math.max(w, Math.ceil((bounds?.width || 0) * rootScaleX * 1.0625));
      let reserveH = Math.max(h, Math.ceil((bounds?.height || 0) * densityY * 1.0625));
      reserveW = Math.min(maxTexture, Math.ceil(reserveW / 128) * 128);
      reserveH = Math.min(maxTexture, Math.ceil(reserveH / 128) * 128);
      if (mask.width < reserveW || mask.height < reserveH) {
        mask.width = Math.max(mask.width, reserveW);
        mask.height = Math.max(mask.height, reserveH);
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, w, h);
      const fontSize = Number(state.fontSize.toFixed(3));
      // Draw bottom-up so the typed-pixel upload needs no browser-side flip or
      // Canvas-to-WebGL conversion. Glyph coverage is still native resolution.
      context.setTransform(w / width, 0, 0, -h / height, 0, h);
      // A connected canvas inherits the word's CSS variation axes. Unlike the
      // FontFace variation descriptor, this also works in WebKit.
      context.font = '100px ' + family;
      const metrics = context.measureText("Hg");
      const baseline = (100 + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) * fontSize / 200;
      context.font = fontSize + 'px ' + family;
      context.fontKerning = "normal";
      context.textRendering = "geometricPrecision";
      context.letterSpacing = (fontSize * Number(state.trackingEm.toFixed(5))) + "px";
      const text = entry.word.textContent.trim();
      const measuredWidth = context.measureText(text).width;
      if (!Number.isFinite(baseline) || !Number.isFinite(measuredWidth) || measuredWidth <= 0) {
        throw new Error("Canvas returned invalid glyph metrics: " + text);
      }
      // Browser metric differences should not switch the whole layer to plain.
      // Keep the existing positioning; only fit discrepancies beyond its tolerance.
      if (Math.abs(measuredWidth - width) > Math.max(2, width * .015)) context.scale(width / measuredWidth, 1);
      context.fillStyle = "white";
      context.fillText(text, 0, baseline);

      // Grow storage only when necessary; axis animation updates existing textures.
      if (reserveW > entry.capacityW || reserveH > entry.capacityH) {
        entry.capacityW = Math.max(entry.capacityW, reserveW);
        entry.capacityH = Math.max(entry.capacityH, reserveH);
        entry.textures.forEach((value) => {
          bind(value);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, entry.capacityW, entry.capacityH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        });
        if (gl.getError() !== gl.NO_ERROR) throw new Error("GPU could not allocate glyph textures");
        entry.targets.forEach((target) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Native material framebuffer is incomplete");
          }
        });
      }
      bind(entry.textures[0]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE,
        context.getImageData(0, 0, w, h).data);
      entry.w = w;
      entry.h = h;
      entry.width = width;
      entry.height = height;
      entry.key = key;
      entry.reliefDirty = true;
    };
    const renderRelief = (entry) => {
      const { w, h, width, height } = entry;
      gl.disable(gl.BLEND);
      gl.useProgram(blur.program);
      gl.uniform4f(uniform(blur, "rectangle"), -1, -1, 2, 2);
      gl.uniform1i(uniform(blur, "source"), 0);
      gl.uniform2f(uniform(blur, "textureScale"), w / entry.capacityW, h / entry.capacityH);
      gl.viewport(0, 0, w, h);
      for (let pass = 0; pass < 2; pass++) {
        const sigma = 4.5 * (pass === 0 ? w / width : h / height);
        if (entry.sigmas[pass] !== sigma) {
          entry.kernels[pass] = gaussianKernel(sigma);
          entry.sigmas[pass] = sigma;
        }
        const kernel = entry.kernels[pass];
        gl.bindFramebuffer(gl.FRAMEBUFFER, entry.targets[pass]);
        bind(entry.textures[pass]);
        gl.uniform2f(uniform(blur, "stepSize"), pass === 0 ? 1 / w : 0, pass === 1 ? 1 / h : 0);
        gl.uniform2fv(uniform(blur, "taps[0]"), kernel.taps);
        gl.uniform1i(uniform(blur, "tapCount"), kernel.count);
        gl.uniform1f(uniform(blur, "centerWeight"), kernel.center);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      entry.reliefDirty = false;
    };
    root.classList.add("hero-material-layer");
    root.append(canvas);
    return {
      root, entries, dispose,
      get active() { return !stopped && !lost; },
      get textureActive() { return !!textureFrame; },
      prepareTexturePrograms,
      async prepareTextureSurfaces(signal) {
        clearTextureSurfaces();
        const elements = document.querySelectorAll(".hero-project-logo-frame, .hero-project-link, .brand-logo");
        for (const element of elements) {
          await new Promise(requestAnimationFrame);
          if (signal.aborted || stopped || lost) throw new DOMException("Texture preparation cancelled", "AbortError");
          const box = element.getBoundingClientRect();
          const density = Math.min(renderingDensity(), maxTexture / Math.max(1, box.width), maxTexture / Math.max(1, box.height));
          const surface = captureTextureSurface(element, density, gl.drawingBufferColorSpace || "srgb");
          if (!surface) continue;
          const uploaded = texture();
          if (!uploaded) throw new Error("Texture surface allocation failed");
          textureSurfaces.push({ ...surface, texture: uploaded });
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, surface.width, surface.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, surface.pixels);
          if (gl.getError() !== gl.NO_ERROR) throw new Error("Texture surface upload failed");
        }
      },
      setTextureFrame(value) {
        if (stopped || lost) return;
        const entering = !textureFrame;
        textureFrame = value;
        if (entering) {
          const reach = Math.hypot(Math.max(value.origin.x, window.innerWidth - value.origin.x),
            Math.max(value.origin.y, window.innerHeight - value.origin.y));
          const breadth = Math.min(window.innerWidth, window.innerHeight) * .30 + reach * .035;
          texturePadding = Math.ceil(reach * .09 + breadth * .40 + 10);
          // Short viewports retain the full light pass below the hero minimum.
          const viewportHeight = Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
          const stage = root.closest(".hero-stage");
          const minimumHeight = stage ? parseFloat(getComputedStyle(stage).minHeight) || 0 : 0;
          const availableHeight = viewportHeight - (stage?.getBoundingClientRect().top || 0);
          textureLightLimit = availableHeight >= minimumHeight ? Math.max(1, viewportHeight - value.origin.y) : 0;
          // Absolute positioning preserves Safari's page background during the lock.
          canvas.classList.add("texture-transition-canvas");
          canvas.style.height = `${window.innerHeight}px`;
          document.body.append(canvas);
        }
        lastFrame = "";
        // Repaint the relocated canvas before exposing its old coordinate space.
        if (entering) this.render();
      },
      finishTexture() {
        textureFrame = null;
        clearTextureSurfaces();
        canvas.classList.remove("texture-transition-canvas");
        canvas.style.removeProperty("height");
        if (!stopped) root.append(canvas);
        lastFrame = "";
        if (getTexturePreference() === "flat") showPlain();
      },
      showPlain,
      add(word) {
        const mask = document.createElement("canvas");
        // This surface is read after every shape change; keep its backing store
        // CPU-readable instead of forcing GPU readback during texture upload.
        const context = mask.getContext("2d", { willReadFrequently: true });
        if (!context || !("letterSpacing" in context)) {
          throw new Error("Exact canvas typography is not supported");
        }
        mask.className = "hero-material-mask";
        mask.setAttribute("aria-hidden", "true");
        word.append(mask);
        const family = getComputedStyle(word).fontFamily;
        const textures = [texture(), texture(), texture()];
        const targets = [gl.createFramebuffer(), gl.createFramebuffer()];
        targets.forEach((target, i) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[i + 1], 0);
        });
        entries.push({ word, family, mask, context, textures, targets, capacityW: 0, capacityH: 0,
          key: "", sigmas: [], kernels: [], orange: !!word.closest(".hero-modelized, .hero-intro-cell--shape") });
      },
      render(preparingEntry = null) {
        if (stopped || lost) return;
        if (!preparingEntry && !textureFrame && getTexturePreference() === "flat") {
          if (!canvas.hidden) showPlain();
          return;
        }
        try {
          const rootBox = root.getBoundingClientRect();
          if (!rootBox.width || !rootBox.height ||
              (!preparingEntry && (rootBox.bottom < 0 || rootBox.top > innerHeight))) return;
          // Canvas is inside the same animated container: parent opacity, transforms,
          // scrolling and Glyph Story visibility remain controlled by the existing CSS.
          const box = canvas.getBoundingClientRect();
          const geometry = entries.map((entry) => ({ entry, rect: entry.word.getBoundingClientRect() }));
          // Hardware dimensions are actual constraints, not a reason to abandon
          // the material at an arbitrary pixel count. Fit only when necessary.
          let density = Math.min(renderingDensity(),
            Math.min(maxViewport[0], maxRenderbuffer) / box.width,
            Math.min(maxViewport[1], maxRenderbuffer) / box.height);
          for (const { rect } of geometry) {
            if (rect.width && rect.height) density = Math.min(density, maxTexture / rect.width, maxTexture / rect.height);
          }
          const w = Math.min(maxViewport[0], maxRenderbuffer, Math.max(1, Math.ceil(box.width * density)));
          const h = Math.min(maxViewport[1], maxRenderbuffer, Math.max(1, Math.ceil(box.height * density)));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            if (!gl.isContextLost() && (gl.drawingBufferWidth !== w || gl.drawingBufferHeight !== h)) {
              throw new Error("GPU could not allocate the drawing buffer");
            }
            lastFrame = "";
          }
          // Read geometry before allocating or drawing; one coherent snapshot per frame.
          let hiddenPreparation = null;
          const frames = geometry.map(({ entry, rect }) => {
            if (preparingEntry && entry !== preparingEntry) return null;
            const state = fittedStates.get(entry.word);
            if (!state || !rect.width || !rect.height) return null;
            const style = getComputedStyle(entry.word);
            const opacity = preparingEntry ? 1 : Number(style.opacity);
            if (!preparingEntry) {
              if (style.visibility === "hidden") return null;
              if (!opacity) {
                // Use the existing render loop and storage. Spread hidden first
                // frames over separate ticks instead of batching them at reveal.
                if (hiddenPreparation || !pendingPreparations.has(entry.word)) return null;
                hiddenPreparation = entry;
              }
            }
            const width = parseFloat(style.width);
            const height = parseFloat(style.height);
            const densityX = density * rect.width / width;
            const densityY = density * rect.height / height;
            const key = [entry.word.textContent, state.weight.toFixed(3), state.width.toFixed(3),
              state.fontSize.toFixed(3), state.trackingEm.toFixed(5), width, height,
              Math.ceil(width * densityX), Math.ceil(height * densityY)].join("|");
            const property = entry.word.closest(".hero-intro") ? "--hero-metal-intro-position" :
              entry.orange ? "--hero-metal-model-position" : "--hero-metal-story-position";
            return { entry, state, rect, width, height, densityX, densityY, key, opacity,
              reflectionPeriod: reflectionPeriods.get(entry.word) || REFLECTION_PERIOD,
              offset: -(parseFloat(style.getPropertyValue(property)) || 0) };
          }).filter(Boolean);
          const signature = frames.map(({ key, rect, opacity, offset, reflectionPeriod }) =>
            [key, rect.left - box.left, rect.top - box.top, rect.width, rect.height, opacity, offset, reflectionPeriod].join(":"))
            .join(";");
          if (signature === lastFrame && !hiddenPreparation) return;
          for (const item of frames) {
            if (item.entry.key !== item.key) {
              rebuild(item.entry, item.state, item.width, item.height, item.densityX, item.densityY, item.key);
            }
          }
          // Submit uploads together, before GPU passes consume their textures.
          // Interleaving CPU uploads with each word's blur can serialize the pipeline.
          for (const { entry } of frames) {
            if (entry.reliefDirty) renderRelief(entry);
            pendingPreparations.delete(entry.word);
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          const shader = textureFrame ? textureMaterial : material;
          gl.useProgram(shader.program);
          gl.uniform1i(uniform(shader, "mask"), 0);
          gl.uniform1i(uniform(shader, "softMask"), 1);
          gl.uniform1i(uniform(shader, "reflection"), 2);
          if (textureFrame) {
            textureUniforms(shader, box);
            bind(textureFlatPalette, 3);
            gl.uniform1i(uniform(shader, "textureFlatPalette"), 3);
            gl.uniform1f(uniform(shader, "textureToLiquid"), textureFrame.target === "liquid" ? 1 : 0);
          }
          for (const { entry, rect, width, offset, opacity, reflectionPeriod } of frames) {
            bind(entry.textures[0], 0);
            bind(entry.textures[2], 1);
            bind(reflectionTile, 2);
            const padding = textureFrame ? texturePadding : 0;
            gl.uniform4f(uniform(shader, "rectangle"),
              (rect.left - box.left - padding) / box.width * 2 - 1,
              1 - (rect.bottom - box.top + padding) / box.height * 2,
              (rect.width + padding * 2) / box.width * 2, (rect.height + padding * 2) / box.height * 2);
            gl.uniform2f(uniform(shader, "textureScale"), entry.w / entry.capacityW, entry.h / entry.capacityH);
            // Keep phase in the original clock's units: a wider pattern travels
            // farther per cycle without slowing down or jumping at clock wrap.
            gl.uniform2f(uniform(shader, "reflectionMapping"), width / reflectionPeriod,
              ((offset % REFLECTION_PERIOD) + REFLECTION_PERIOD) % REFLECTION_PERIOD / REFLECTION_PERIOD);
            gl.uniform1f(uniform(shader, "orange"), entry.orange ? 1 : 0);
            gl.uniform1f(uniform(shader, "opacity"), opacity);
            if (textureFrame) {
              gl.uniform4f(uniform(shader, "textureGlyph"), rect.left - box.left, rect.top - box.top, rect.width, rect.height);
              gl.uniform2f(uniform(shader, "textureFlatMapping"), width / REFLECTION_PERIOD,
                ((offset % REFLECTION_PERIOD) + REFLECTION_PERIOD) % REFLECTION_PERIOD / REFLECTION_PERIOD);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (!preparingEntry && !entry.active) {
              entry.word.classList.add("hero-material-webgl");
              entry.active = true;
            }
          }
          if (textureFrame) {
            gl.useProgram(textureSurfaceProgram.program);
            textureUniforms(textureSurfaceProgram, box);
            gl.uniform1i(uniform(textureSurfaceProgram, "surface"), 0);
            for (const surface of textureSurfaces) {
              const rect = surface.rect;
              bind(surface.texture);
              gl.uniform4f(uniform(textureSurfaceProgram, "surfaceBox"), rect.left - box.left, rect.top - box.top, rect.width, rect.height);
              gl.uniform4f(uniform(textureSurfaceProgram, "rectangle"),
                (rect.left - box.left - texturePadding) / box.width * 2 - 1,
                1 - (rect.bottom - box.top + texturePadding) / box.height * 2,
                (rect.width + texturePadding * 2) / box.width * 2, (rect.height + texturePadding * 2) / box.height * 2);
              gl.drawArrays(gl.TRIANGLES, 0, 6);
              surface.element.classList.add("texture-surface-active");
            }
            gl.useProgram(textureLight.program);
            textureUniforms(textureLight, box);
            gl.uniform4f(uniform(textureLight, "rectangle"), -1, -1, 2, 2);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (textureFrame.stage === 0 || textureFrame.motion.position < .22) {
              gl.useProgram(textureParticles.program);
              textureUniforms(textureParticles, box);
              gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
              gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
              gl.drawArrays(gl.POINTS, 0, 16);
              gl.bindBuffer(gl.ARRAY_BUFFER, quad);
              gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            }
          }
          if (preparingEntry) {
            // Exercise the real upload/relief/composite path without exposing a
            // final-weight frame before the original arrival animation starts.
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.flush();
            lastFrame = "";
            return;
          }
          lastFrame = signature;
          canvas.hidden = false;
          if (root.dataset.materialRenderer !== "webgl") root.dataset.materialRenderer = "webgl";
        } catch (error) {
          // Keep the restoration listener alive when the driver loses context.
          if (!gl.isContextLost()) fail(error);
        }
      }
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export async function initHeroMaterial({ typographyReady } = {}) {
  const roots = Array.from(document.querySelectorAll(".hero .hero-intro-grid, .hero .hero-brand-lockup"));
  if (!roots.length) return;
  const layers = [];
  let frame = 0;
  const shouldRun = () => getTexturePreference() === "liquid" || layers.some((layer) => layer?.textureActive);
  const tick = () => {
    frame = 0;
    if (document.hidden) return;
    layers.forEach((layer) => layer?.render());
    if (shouldRun() && layers.some((layer) => layer?.active)) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const mount = (root, index) => {
    root.dataset.materialRenderer = "plain";
    let layer;
    try {
      const notify = () => window.dispatchEvent(new Event("texture:availability"));
      layer = createMaterialLayer(root, () => { mount(root, index); wake(); notify(); }, notify);
      for (const word of root.querySelectorAll(".hero-fit-word.hero-metal")) layer.add(word);
      layers[index] = layer;
    } catch (error) {
      layer?.dispose();
      layers[index] = null;
      console.warn("Hero material is unavailable; using un-beveled text", error);
    }
  };
  try {
    await Promise.all([document.fonts.ready, typographyReady]);
    roots.forEach(mount);
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    // Prepare every word before releasing the boot gate. Yield between words
    // so the loader remains responsive; a skipped loader never gets re-hidden.
    for (const layer of layers) {
      if (!layer?.active || getTexturePreference() === "flat") continue;
      for (const entry of layer.entries) {
        await nextFrame();
        if (!document.documentElement.classList.contains("site-boot-pending")) break;
        layer.render(entry);
      }
    }
    await nextFrame();
    const sleep = () => { cancelAnimationFrame(frame); frame = 0; };
    document.addEventListener("visibilitychange", () => document.hidden ? sleep() : wake());
    window.addEventListener("pagehide", sleep);
    window.addEventListener("pageshow", wake);
    wake();
    const main = () => layers.find((layer) => layer?.root.matches(".hero-brand-lockup"));
    return {
      get available() { return !!main()?.active; },
      async prepareTexture(signal) {
        const layer = main();
        const check = () => {
          if (signal.aborted) throw new DOMException("Texture preparation cancelled", "AbortError");
          if (!layer?.active || main() !== layer) throw new Error("Texture renderer is unavailable");
        };
        check();
        await nextFrame();
        check();
        layer.prepareTexturePrograms();
        await layer.prepareTextureSurfaces(signal);
        check();
        // Refresh paused flat glyphs without clearing a visible liquid canvas.
        if (getTexturePreference() === "flat") {
          for (const entry of layer.entries) {
            await nextFrame();
            check();
            layer.render(entry);
          }
        }
        await nextFrame();
        check();
      },
      updateTexture(frameState) { main()?.setTextureFrame(frameState); wake(); },
      finishTexture() {
        layers.forEach((layer) => layer?.finishTexture());
        if (getTexturePreference() === "liquid") main()?.render();
        wake();
      }
    };
  } catch (error) {
    layers.forEach((layer) => layer?.dispose());
    console.warn("Hero material is unavailable; using un-beveled text", error);
  }
}
