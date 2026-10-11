import { TEXTURE_LIGHT, TEXTURE_PARTICLE_VERTEX, TEXTURE_PARTICLE_FRAGMENT } from "./texture-wave.js?v=20261011a";

export function createTextureLightLayer(parent) {
  const canvas = document.createElement("canvas");
  canvas.className = "glyph-texture-light";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
  if (!gl) throw new Error("Glyph texture lighting unavailable");
  const programs = [], buffers = [];
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
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
  try {
    const light = program("attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}", TEXTURE_LIGHT);
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
    const draw = (shader, data, count, mode, state) => {
      gl.useProgram(shader.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, data);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const values = {
        textureOrigin: [state.origin.x - box.left, state.origin.y - box.top],
        textureViewport: [width, height], texturePixels: [canvas.width, canvas.height],
        textureMotion: [state.motion.position, state.motion.speed], textureRecoil: state.motion.recoil,
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
