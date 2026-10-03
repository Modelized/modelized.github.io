// Only the moving reflection uses a smaller buffer; coverage and relief stay native.
const REFLECTION_SCALE = .75;
const fittedStates = new WeakMap();
export function updateHeroMaterial(word, state) {
  fittedStates.set(word, state);
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
uniform vec2 size;
uniform float offset;
float ramp(float d, vec4 positions, vec4 values, float lastPosition) {
  if (d < positions.y) return mix(values.x, values.y, (d - positions.x) / (positions.y - positions.x));
  if (d < positions.z) return mix(values.y, values.z, (d - positions.y) / (positions.z - positions.y));
  if (d < positions.w) return mix(values.z, values.w, (d - positions.z) / (positions.w - positions.z));
  return mix(values.w, 0., clamp((d - positions.w) / (lastPosition - positions.w), 0., 1.));
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
uniform vec2 reflectionScale;
uniform vec2 reflectionTexel;
uniform float orange;
uniform float opacity;
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
  vec2 reflectionUV = clamp(uv * reflectionScale, reflectionTexel * .5,
    reflectionScale - reflectionTexel * .5);
  vec2 encoded = texture2D(reflection, reflectionUV).rg;
  float source = encoded.r + encoded.g / 255.;
  float coverage = texture2D(mask, uv * textureScale).a;
  float edge = max(0., coverage - texture2D(softMask, uv * textureScale).a) * mix(.7,1.,orange);
  float relief = (157./255.) * (1. - edge);
  float lit = relief <= .5 ? 2. * source * relief : 1. - 2. * (1. - source) * (1. - relief);
  // Match feBlend's source-over alpha, then the final SourceAlpha composite.
  float blendedAlpha = coverage * (2. - coverage);
  lit = ((1. - coverage) * (source + relief) + coverage * lit) / max(.00001, 2. - coverage);
  float alphaOut = blendedAlpha * coverage * opacity;
  gl_FragColor = vec4(palette(lit) * alphaOut, alphaOut);
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
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  shaders.forEach((shader) => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return { program, uniforms: new Map() };
}

// Pair adjacent Gaussian taps with linear texture sampling. This keeps the
// original 4.5 CSS-pixel relief without calculating Gaussian weights per pixel.
function gaussianKernel(sigma) {
  const radius = Math.ceil(sigma * 3);
  if (radius > 96) throw new Error("Native relief exceeds the supported kernel size");
  const taps = new Float32Array(96);
  const weight = (x) => Math.exp(-.5 * x * x / (sigma * sigma));
  let total = 1;
  let count = 0;
  for (let x = 1; x <= radius; x += 2) {
    const a = weight(x);
    const b = x + 1 <= radius ? weight(x + 1) : 0;
    taps[count * 2] = x + b / (a + b);
    taps[count * 2 + 1] = a + b;
    total += 2 * (a + b);
    count++;
  }
  for (let i = 0; i < count; i++) taps[i * 2 + 1] /= total;
  return { taps, count, center: 1 / total };
}

function createMaterialLayer(root) {
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
  const programs = [];
  let quad;
  let stopped = false;
  let lastFrame = "";
  const dispose = () => {
    stopped = true;
    root.classList.remove("hero-material-layer");
    root.dataset.materialRenderer = "svg";
    canvas.remove();
    for (const entry of entries) {
      entry.word.classList.remove("hero-material-webgl");
      entry.mask.remove();
      entry.textures.forEach((texture) => gl.deleteTexture(texture));
      entry.targets.forEach((target) => gl.deleteFramebuffer(target));
      entry.mask.width = entry.mask.height = 1;
    }
    programs.forEach((shader) => gl.deleteProgram(shader.program));
    if (quad) gl.deleteBuffer(quad);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  const fail = (error) => {
    if (stopped) return;
    dispose();
    console.warn("Hero material kept the SVG fallback", error);
  };
  canvas.addEventListener("webglcontextlost", () => fail(new Error("WebGL context lost")));
  try {
    const blur = createProgram(gl, BLUR);
    programs.push(blur);
    const material = createProgram(gl, MATERIAL);
    programs.push(material);
    const reflection = createProgram(gl, REFLECTION);
    programs.push(reflection);
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
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
    const rebuild = (entry, state, width, height, densityX, densityY, key) => {
      const { mask, context, family } = entry;
      const w = Math.max(1, Math.ceil(width * densityX));
      const h = Math.max(1, Math.ceil(height * densityY));
      if (w > maxTexture || h > maxTexture || w * h > 16000000) {
        throw new Error("Native material exceeds the safe texture size");
      }
      if (mask.width !== w || mask.height !== h) {
        mask.width = w;
        mask.height = h;
      } else {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, w, h);
      }
      const fontSize = Number(state.fontSize.toFixed(3));
      context.setTransform(w / width, 0, 0, h / height, 0, 0);
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
      if (!Number.isFinite(baseline) ||
          Math.abs(measuredWidth - width) > Math.max(2, width * .015)) {
        throw new Error("Canvas and live variable-font metrics differ: " + text + " (" + measuredWidth.toFixed(2) + " / " + width.toFixed(2) + ")");
      }
      context.fillStyle = "white";
      context.fillText(text, 0, baseline);

      // Grow storage only when necessary; axis animation updates existing textures.
      if (w > entry.capacityW || h > entry.capacityH) {
        entry.capacityW = Math.min(maxTexture, Math.max(entry.capacityW, Math.ceil(w / 128) * 128));
        entry.capacityH = Math.min(maxTexture, Math.max(entry.capacityH, Math.ceil(h / 128) * 128));
        entry.textures.slice(0, 3).forEach((value) => {
          bind(value);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, entry.capacityW, entry.capacityH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        });
        entry.targets.slice(0, 2).forEach((target) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Native material framebuffer is incomplete");
          }
        });
      }
      entry.reflectionW = Math.max(1, Math.ceil(w * REFLECTION_SCALE));
      entry.reflectionH = Math.max(1, Math.ceil(h * REFLECTION_SCALE));
      if (entry.reflectionW > entry.reflectionCapacityW || entry.reflectionH > entry.reflectionCapacityH) {
        entry.reflectionCapacityW = Math.min(maxTexture, Math.max(entry.reflectionCapacityW, Math.ceil(entry.reflectionW / 128) * 128));
        entry.reflectionCapacityH = Math.min(maxTexture, Math.max(entry.reflectionCapacityH, Math.ceil(entry.reflectionH / 128) * 128));
        bind(entry.textures[3]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, entry.reflectionCapacityW, entry.reflectionCapacityH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, entry.targets[2]);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          throw new Error("Reflection framebuffer is incomplete");
        }
      }
      bind(entry.textures[0]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
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
      entry.w = w;
      entry.h = h;
      entry.key = key;
    };
    root.classList.add("hero-material-layer");
    root.append(canvas);
    return {
      root, entries, dispose,
      get active() { return !stopped; },
      add(word) {
        const mask = document.createElement("canvas");
        const context = mask.getContext("2d");
        if (!context || !("letterSpacing" in context)) {
          throw new Error("Exact canvas typography is not supported");
        }
        mask.className = "hero-material-mask";
        mask.setAttribute("aria-hidden", "true");
        word.append(mask);
        const family = getComputedStyle(word).fontFamily;
        const textures = [texture(), texture(), texture(), texture()];
        const targets = [gl.createFramebuffer(), gl.createFramebuffer(), gl.createFramebuffer()];
        targets.forEach((target, i) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[i + 1], 0);
        });
        entries.push({ word, family, mask, context, textures, targets, capacityW: 0, capacityH: 0,
          reflectionCapacityW: 0, reflectionCapacityH: 0,
          key: "", sigmas: [], kernels: [], orange: !!word.closest(".hero-modelized, .hero-intro-cell--shape") });
      },
      render() {
        if (stopped) return;
        try {
          const rootBox = root.getBoundingClientRect();
          if (!rootBox.width || !rootBox.height || rootBox.bottom < 0 || rootBox.top > innerHeight) return;
          // Canvas is inside the same animated container: parent opacity, transforms,
          // scrolling and Glyph Story visibility remain controlled by the existing CSS.
          const box = canvas.getBoundingClientRect();
          const density = (window.devicePixelRatio || 1) * (window.visualViewport?.scale || 1);
          const w = Math.max(1, Math.ceil(box.width * density));
          const h = Math.max(1, Math.ceil(box.height * density));
          if (w > maxViewport[0] || h > maxViewport[1] || w * h > 24000000) {
            throw new Error("Native material exceeds the safe drawing buffer size");
          }
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            lastFrame = "";
          }
          // Read geometry before allocating or drawing; one coherent snapshot per frame.
          const frames = entries.map((entry) => {
            const state = fittedStates.get(entry.word);
            const rect = entry.word.getBoundingClientRect();
            if (!state || !rect.width || !rect.height) return null;
            const style = getComputedStyle(entry.word);
            const opacity = Number(style.opacity);
            if (!opacity || style.visibility === "hidden") return null;
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
              offset: -(parseFloat(style.getPropertyValue(property)) || 0) };
          }).filter(Boolean);
          const signature = frames.map(({ key, rect, opacity, offset }) =>
            [key, rect.left - box.left, rect.top - box.top, rect.width, rect.height, opacity, offset].join(":"))
            .join(";");
          if (signature === lastFrame) return;
          for (const item of frames) {
            if (item.entry.key !== item.key) {
              rebuild(item.entry, item.state, item.width, item.height, item.densityX, item.densityY, item.key);
            }
          }
          // Keep the reflection pass and its upsampling on the GPU. The native
          // mask is applied only below, so internal resolution cannot pixelate glyph edges.
          gl.disable(gl.BLEND);
          gl.useProgram(reflection.program);
          gl.uniform4f(uniform(reflection, "rectangle"), -1, -1, 2, 2);
          for (const { entry, width, height, offset } of frames) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, entry.targets[2]);
            gl.viewport(0, 0, entry.reflectionW, entry.reflectionH);
            gl.uniform2f(uniform(reflection, "size"), width, height);
            gl.uniform1f(uniform(reflection, "offset"), offset);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.useProgram(material.program);
          gl.uniform1i(uniform(material, "mask"), 0);
          gl.uniform1i(uniform(material, "softMask"), 1);
          gl.uniform1i(uniform(material, "reflection"), 2);
          for (const { entry, rect, opacity } of frames) {
            bind(entry.textures[0], 0);
            bind(entry.textures[2], 1);
            bind(entry.textures[3], 2);
            gl.uniform4f(uniform(material, "rectangle"),
              (rect.left - box.left) / box.width * 2 - 1,
              1 - (rect.bottom - box.top) / box.height * 2,
              rect.width / box.width * 2, rect.height / box.height * 2);
            gl.uniform2f(uniform(material, "textureScale"), entry.w / entry.capacityW, entry.h / entry.capacityH);
            gl.uniform2f(uniform(material, "reflectionScale"), entry.reflectionW / entry.reflectionCapacityW, entry.reflectionH / entry.reflectionCapacityH);
            gl.uniform2f(uniform(material, "reflectionTexel"), 1 / entry.reflectionCapacityW, 1 / entry.reflectionCapacityH);
            gl.uniform1f(uniform(material, "orange"), entry.orange ? 1 : 0);
            gl.uniform1f(uniform(material, "opacity"), opacity);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (!entry.active) {
              entry.word.classList.add("hero-material-webgl");
              entry.active = true;
            }
          }
          lastFrame = signature;
          if (root.dataset.materialRenderer !== "webgl") root.dataset.materialRenderer = "webgl";
        } catch (error) { fail(error); }
      }
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export async function initHeroMaterial() {
  const roots = Array.from(document.querySelectorAll(".hero .hero-intro-grid, .hero .hero-brand-lockup"));
  if (!roots.length) return;
  const layers = [];
  try {
    await document.fonts.ready;
    for (const root of roots) {
      const layer = createMaterialLayer(root);
      layers.push(layer);
      for (const word of root.querySelectorAll(".hero-fit-word.hero-metal")) {
        layer.add(word);
      }
    }
    let frame = 0;
    const tick = () => {
      frame = 0;
      if (document.hidden) return;
      layers.forEach((layer) => layer.render());
      if (layers.some((layer) => layer.active)) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const sleep = () => { cancelAnimationFrame(frame); frame = 0; };
    document.addEventListener("visibilitychange", () => document.hidden ? sleep() : wake());
    window.addEventListener("pagehide", sleep);
    window.addEventListener("pageshow", wake);
    wake();
  } catch (error) {
    layers.forEach((layer) => layer.dispose());
    console.warn("Hero material kept the SVG fallback", error);
  }
}
