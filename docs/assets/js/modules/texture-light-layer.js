import { TEXTURE_LIGHT, TEXTURE_PARTICLE_VERTEX, TEXTURE_PARTICLE_FRAGMENT } from "./texture-wave.js?v=20261012d";
import { captureGlyphField, GLYPH_FOCUS_LIGHT } from "./glyph-light-field.js?v=20261012d";

export function createTextureLightLayer(parent, mark) {
  const canvas = document.createElement("canvas");
  canvas.className = "glyph-texture-light";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
  if (!gl) throw new Error("Glyph texture lighting unavailable");
  const programs = [], buffers = [], textures = [];
  const program = (vertex, fragment) => {
    const result = gl.createProgram();
    programs.push(result);
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      gl.attachShader(result, shader);
      gl.deleteShader(shader);
    }
    gl.bindAttribLocation(result, 0, "position");
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
    return { program: result, uniforms: new Map() };
  };
  const buffer = (data) => {
    const value = gl.createBuffer();
    buffers.push(value);
    gl.bindBuffer(gl.ARRAY_BUFFER, value);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return value;
  };
  const dispose = () => {
    programs.forEach((value) => gl.deleteProgram(value));
    buffers.forEach((value) => gl.deleteBuffer(value));
    textures.forEach((value) => gl.deleteTexture(value));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
  try {
    const field = mark ? captureGlyphField(mark) : null;
    const light = program("attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}", field ? GLYPH_FOCUS_LIGHT : TEXTURE_LIGHT);
    const particles = program(TEXTURE_PARTICLE_VERTEX, TEXTURE_PARTICLE_FRAGMENT);
    const quad = buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const seeds = buffer(Array.from({ length: 32 }, (_, i) => [i, (i * .618) % 1]).flat());
    parent.append(canvas);
    const box = parent.getBoundingClientRect();
    const width = box.width, height = box.height;
    const density = Math.min(devicePixelRatio || 1, 1.5, gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0] / width, gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1] / height);
    canvas.width = Math.ceil(width * density);
    canvas.height = Math.ceil(height * density);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (field) {
      const texture = gl.createTexture();
      textures.push(texture); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.width, field.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, field.pixels);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Glyph field upload failed");
      gl.useProgram(light.program);
      gl.uniform1i(gl.getUniformLocation(light.program, "glyphField"), 0);
      gl.uniform4f(gl.getUniformLocation(light.program, "glyphBox"), field.rect.x - box.left, field.rect.y - box.top, field.rect.width, field.rect.height);
      gl.uniform1f(gl.getUniformLocation(light.program, "glyphDensity"), field.density);
    }
    const draw = (shader, data, count, mode, state) => {
      gl.useProgram(shader.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, data);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const values = {
        textureOrigin: [state.origin.x - box.left, state.origin.y - box.top],
        textureViewport: [width, height], texturePixels: [canvas.width, canvas.height],
        textureMotion: [state.motion.position, state.motion.speed], textureRecoil: state.motion.recoil,
        textureWaveSize: field?.waveSize || [0, 0],
        textureBloom: field ? 1 : 0,
        textureFocus: state.origin.radius, textureStage: state.stage, textureStrength: state.strength ?? 1,
        textureLightLimit: 0, textureJitter: [0, 0], textureCharge: 0, textureLoading: 0,
        textureElapsed: state.elapsed, textureGlyphMode: 0, textureRadial: 1, textureBurst: state.burst ? 1 : 0
      };
      for (const [name, value] of Object.entries(values)) {
        if (!shader.uniforms.has(name)) shader.uniforms.set(name, gl.getUniformLocation(shader.program, name));
        const location = shader.uniforms.get(name);
        if (Array.isArray(value)) gl.uniform2f(location, ...value);
        else gl.uniform1f(location, value);
      }
      gl.drawArrays(mode, 0, count);
    };
    return {
      render(state) {
        if (gl.isContextLost()) throw new Error("Glyph lighting context lost");
        gl.clear(gl.COLOR_BUFFER_BIT);
        draw(light, quad, 6, gl.TRIANGLES, state);
        draw(particles, seeds, 32, gl.POINTS, state);
      },
      dispose
    };
  } catch (error) { dispose(); throw error; }
}
