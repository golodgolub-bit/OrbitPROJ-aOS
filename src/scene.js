import { vertex, blur, glass } from "./scene-shaders.js";
import { springState, clamp } from "./motion.js";
export { createDistanceField, createTextField } from "./distance-field.js";
export { bindGlassRange, bindGlassSelection } from "./control-bindings.js";

export const materials = Object.freeze({
  clear: Object.freeze({
    ior: 1.45,
    thickness: 22,
    bevel: 14,
    dispersion: 0.025,
    roughness: 0.14,
    frost: 0.035,
    reflection: 0.68,
    shadow: 0.08,
    tint: [0.95, 0.97, 1, 0.025],
  }),
  regular: Object.freeze({
    ior: 1.45,
    thickness: 20,
    bevel: 16,
    dispersion: 0.018,
    roughness: 0.25,
    frost: 0.3,
    reflection: 0.6,
    shadow: 0.1,
    tint: [0.95, 0.97, 1, 0.1],
  }),
});
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const numericKeys = [
  "x",
  "y",
  "width",
  "height",
  "radius",
  "opacity",
  "scale",
  "frost",
];
const validateConfig = (c) => {
  if (!["lite", "balanced", "rich"].includes(c.quality))
    throw new RangeError("Unknown quality");
  if (
    ![
      "ior",
      "thickness",
      "bevel",
      "dispersion",
      "roughness",
      "frost",
      "reflection",
      "shadow",
      "merge",
    ].every((k) => Number.isFinite(c[k]) && c[k] >= 0) ||
    c.ior < 1 ||
    c.bevel < 1
  )
    throw new RangeError("Invalid material parameters");
  if (
    !Array.isArray(c.tint) ||
    c.tint.length !== 4 ||
    !c.tint.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
  )
    throw new RangeError("Tint must be four values from 0 to 1");
};
export function normalizeShape(shape, index = 0) {
  const s = {
    id: String(index),
    x: 0,
    y: 0,
    width: 64,
    height: 64,
    radius: 32,
    opacity: 1,
    scale: 1,
    group: String(index),
    frost: 0,
    ...shape,
  };
  if (
    !numericKeys.every((k) => Number.isFinite(s[k])) ||
    s.width <= 0 ||
    s.height <= 0 ||
    s.radius < 0 ||
    s.scale < 0
  )
    throw new RangeError("Invalid glass shape");
  return {
    ...s,
    id: String(s.id),
    group: String(s.group),
    opacity: clamp(s.opacity, 0, 1),
  };
}
/** Shared snapshot + cached separable blur + one SDF material pass. */
export function createGlassScene(
  canvas,
  source,
  {
    material = "regular",
    quality = "balanced",
    renderBackground = false,
    merge = 24,
    pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.5),
    ...overrides
  } = {},
) {
  if (!materials[material]) throw new RangeError("Unknown material");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const shaders = [],
    programs = [],
    buffers = [],
    textures = [],
    fbos = [];
  const nominalScales = new Map();
  let disposed = false,
    lost = false,
    frame = 0,
    shapes = [],
    animations = new Map(),
    sourceSize = {
      width: source.width || source.naturalWidth,
      height: source.height || source.naturalHeight,
    },
    mask = null,
    maskId = null;
  let width = canvas.clientWidth || canvas.width,
    height = canvas.clientHeight || canvas.height,
    ratio = clamp(pixelRatio, 0.5, 2),
    light = { x: 0.18, y: -0.2 },
    dirtyBlur = true;
  let config = {
    ...(materials[material] || materials.regular),
    ...overrides,
    merge,
    quality,
    renderBackground,
  };
  validateConfig(config);
  const check = () => {
    if (disposed) throw new Error("Glass scene disposed");
    if (lost)
      throw new Error(
        "WebGL context lost. Recreate the scene after restoration.",
      );
  };
  const program = (fragment) => {
    const p = gl.createProgram();
    programs.push(p);
    for (const [type, code] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const s = gl.createShader(type);
      shaders.push(s);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  const texture = () => {
    const t = gl.createTexture();
    textures.push(t);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
      [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  const release = () => {
    fbos.forEach((x) => gl.deleteFramebuffer(x));
    textures.forEach((x) => gl.deleteTexture(x));
    buffers.forEach((x) => gl.deleteBuffer(x));
    programs.forEach((x) => gl.deleteProgram(x));
    shaders.forEach((x) => gl.deleteShader(x));
  };
  let glassProgram,
    blurProgram,
    buffer,
    sourceTexture,
    maskTexture,
    blurTextures,
    blurFbos;
  try {
    glassProgram = program(glass);
    blurProgram = program(blur);
    buffer = gl.createBuffer();
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    sourceTexture = texture();
    maskTexture = texture();
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      1,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255]),
    );
    blurTextures = [texture(), texture()];
    blurFbos = blurTextures.map((t) => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      );
      const f = gl.createFramebuffer();
      fbos.push(f);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        t,
        0,
      );
      return f;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } catch (error) {
    release();
    throw error;
  }
  const u = new Map(),
    uniform = (p, name) => {
      const key = (p === glassProgram ? "g" : "b") + name;
      if (!u.has(key)) u.set(key, gl.getUniformLocation(p, name));
      return u.get(key);
    };
  const quad = (p) => {
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const at = gl.getAttribLocation(p, "aPosition");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  };
  const bind = (unit, tex) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  };
  const upload = (image) => {
    check();
    const w = image.naturalWidth || image.width,
      h = image.naturalHeight || image.height;
    if (!w || !h || w > 4096 || h > 4096)
      throw new RangeError("Source must be loaded and at most 4096 × 4096");
    sourceSize = { width: w, height: h };
    bind(0, sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    dirtyBlur = true;
  };
  const rebuildBlur = () => {
    const w = Math.max(1, Math.round(sourceSize.width / 2)),
      h = Math.max(1, Math.round(sourceSize.height / 2));
    for (const t of blurTextures) {
      bind(0, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }
    quad(blurProgram);
    gl.viewport(0, 0, w, h);
    gl.uniform1i(uniform(blurProgram, "uImage"), 0);
    const radius = config.quality === "rich" ? 4.8 : 3.1;
    for (let i = 0; i < 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurFbos[i]);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error("Blur framebuffer incomplete");
      bind(0, i === 0 ? sourceTexture : blurTextures[0]);
      gl.uniform1i(uniform(blurProgram, "uFlip"), i === 0 ? 1 : 0);
      gl.uniform2f(
        uniform(blurProgram, "uStep"),
        i === 0 ? radius / sourceSize.width : 0,
        i === 1 ? radius / h : 0,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    dirtyBlur = false;
  };
  let drawCount = 0,
    blurCount = 0;
  const listeners = new Set();
  const draw = () => {
    check();
    if (dirtyBlur && config.quality !== "lite") {
      rebuildBlur();
      blurCount++;
    }
    quad(glassProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    bind(0, sourceTexture);
    bind(1, blurTextures[1]);
    bind(2, maskTexture);
    gl.uniform1i(uniform(glassProgram, "uImage"), 0);
    gl.uniform1i(uniform(glassProgram, "uBlurred"), 1);
    gl.uniform1i(uniform(glassProgram, "uMask"), 2);
    const ordered = [...shapes].sort((a, b) => a.group.localeCompare(b.group));
    const rects = new Float32Array(48),
      styles = new Float32Array(48),
      tints = new Float32Array(48);
    let group = -1,
      last,
      maskIndex = -1;
    ordered.forEach((s, i) => {
      if (s.group !== last) {
        last = s.group;
        group++;
      }
      rects.set(
        [
          s.x,
          s.y,
          Math.max(0.01, (s.width * s.scale) / 2),
          Math.max(0.01, (s.height * s.scale) / 2),
        ],
        i * 4,
      );
      styles.set([s.radius * s.scale, group, s.opacity, s.frost], i * 4);
      tints.set(s.tint || config.tint, i * 4);
      if (s.id === maskId) maskIndex = i;
    });
    gl.uniform4fv(uniform(glassProgram, "uRects[0]"), rects);
    gl.uniform4fv(uniform(glassProgram, "uStyles[0]"), styles);
    gl.uniform4fv(uniform(glassProgram, "uTints[0]"), tints);
    gl.uniform2f(uniform(glassProgram, "uSize"), width, height);
    gl.uniform2f(uniform(glassProgram, "uLight"), light.x, light.y);
    gl.uniform1i(uniform(glassProgram, "uCount"), ordered.length);
    gl.uniform1i(uniform(glassProgram, "uMaskIndex"), maskIndex);
    gl.uniform1f(uniform(glassProgram, "uMaskRange"), mask?.range || 32);
    gl.uniform2f(
      uniform(glassProgram, "uMaskSize"),
      mask?.width || 1,
      mask?.height || 1,
    );
    for (const [name, key] of [
      ["uMerge", "merge"],
      ["uIOR", "ior"],
      ["uThickness", "thickness"],
      ["uBevel", "bevel"],
      ["uDispersion", "dispersion"],
      ["uRoughness", "roughness"],
      ["uFrost", "frost"],
      ["uReflection", "reflection"],
      ["uShadow", "shadow"],
    ])
      gl.uniform1f(uniform(glassProgram, name), config[key]);
    gl.uniform1i(
      uniform(glassProgram, "uBackground"),
      config.renderBackground ? 1 : 0,
    );
    gl.uniform1i(
      uniform(glassProgram, "uOpaque"),
      config.quality === "lite" ? 1 : 0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    drawCount++;
    for (const listener of listeners) listener();
  };
  const cancel = (id, ok = false) => {
    const a = animations.get(id);
    if (a) {
      animations.delete(id);
      a.resolve(ok);
    }
  };
  const tick = (now) => {
    frame = 0;
    for (const [id, a] of animations) {
      const s = shapes.find((s) => s.id === id);
      if (!s) {
        cancel(id);
        continue;
      }
      let settled = true;
      for (const key of a.keys) {
        const v = springState((now - a.start) / 1000, a.from[key], a.to[key], {
          ...a.options,
          velocity: a.velocity[key] || 0,
        });
        s[key] = v.value;
        a.currentVelocity[key] = v.velocity;
        if (
          Math.abs(v.value - a.to[key]) > 0.001 ||
          Math.abs(v.velocity) > 0.01
        )
          settled = false;
      }
      if (
        a.options.liquid &&
        a.to.width !== undefined &&
        a.to.radius !== undefined
      ) {
        const p = clamp(
            (s.width - a.from.width) / (a.to.width - a.from.width || 1),
            0,
            1,
          ),
          half = Math.min(s.width, s.height) / 2;
        const ease = (t) => {
          t = clamp(t, 0, 1);
          return t * t * (3 - 2 * t);
        };
        s.radius =
          a.to.width > a.from.width
            ? half + (a.to.radius - half) * ease((p - 0.45) / 0.55)
            : a.from.radius + (half - a.from.radius) * ease(p / 0.65);
      }
      s.opacity = clamp(s.opacity, 0, 1);
      s.scale = Math.max(0.001, s.scale);
      s.width = Math.max(0.1, s.width);
      s.height = Math.max(0.1, s.height);
      s.radius = Math.max(0, s.radius);
      if (settled || now - a.start > 2200) {
        Object.assign(s, a.to);
        cancel(id, true);
      }
    }
    draw();
    if (animations.size) frame = requestAnimationFrame(tick);
  };
  const invalidate = () => {
    if (!frame && !disposed && !lost) frame = requestAnimationFrame(tick);
  };
  const resize = (
    w = canvas.clientWidth || width,
    h = canvas.clientHeight || height,
    dpr = ratio,
  ) => {
    check();
    if (![w, h, dpr].every(Number.isFinite) || w <= 0 || h <= 0)
      throw new RangeError("Invalid viewport");
    width = w;
    height = h;
    ratio = clamp(dpr, 0.5, 2);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    invalidate();
  };
  const setShapes = (next) => {
    check();
    if (next.length > 12) throw new RangeError("At most 12 shapes per scene");
    const normalized = next.map(normalizeShape);
    if (new Set(normalized.map((s) => s.id)).size !== normalized.length)
      throw new Error("Shape IDs must be unique");
    for (const id of animations.keys()) cancel(id);
    nominalScales.clear();
    shapes = normalized;
    invalidate();
  };
  const update = (id, patch) => {
    check();
    const i = shapes.findIndex((s) => s.id === id);
    if (i < 0) throw new Error("Unknown shape " + id);
    cancel(id);
    shapes[i] = normalizeShape({ ...shapes[i], ...patch });
    invalidate();
  };
  const transition = (id, patch, options = {}) => {
    check();
    const s = shapes.find((s) => s.id === id);
    if (!s) throw new Error("Unknown shape " + id);
    normalizeShape({ ...s, ...patch });
    const previous = animations.get(id),
      velocity = previous?.currentVelocity || {};
    cancel(id);
    const keys = numericKeys.filter((k) => patch[k] !== undefined),
      to = Object.fromEntries(keys.map((k) => [k, patch[k]]));
    for (const [key, value] of Object.entries(patch))
      if (!keys.includes(key)) s[key] = value;
    if (options.reducedMotion ?? reduced()) {
      Object.assign(s, to);
      invalidate();
      return Promise.resolve(true);
    }
    springState(0, 0, 1, options);
    return new Promise((resolve) => {
      animations.set(id, {
        keys,
        from: Object.fromEntries(keys.map((k) => [k, s[k]])),
        to,
        velocity,
        currentVelocity: { ...velocity },
        start: performance.now(),
        options,
        resolve,
      });
      invalidate();
    });
  };
  const setMask = (id, field) => {
    check();
    if (
      field.width * field.height !== field.data.length ||
      field.width > 2048 ||
      field.height > 2048
    )
      throw new RangeError("Invalid SDF mask");
    mask = field;
    maskId = id;
    bind(2, maskTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      field.width,
      field.height,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      field.data,
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    invalidate();
  };
  const configure = (next) => {
    check();
    const preset = next.material ? materials[next.material] : null;
    if (next.material && !preset) throw new RangeError("Unknown material");
    const updated = { ...config, ...preset, ...next };
    validateConfig(updated);
    if (updated.quality !== config.quality) dirtyBlur = true;
    config = updated;
    invalidate();
  };
  const contextLost = (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const id of animations.keys()) cancel(id);
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  try {
    upload(source);
    resize(width, height, ratio);
  } catch (error) {
    release();
    canvas.removeEventListener("webglcontextlost", contextLost);
    throw error;
  }
  return {
    setShapes,
    addShape(shape) {
      check();
      if (shapes.length >= 12)
        throw new RangeError("At most 12 shapes per scene");
      const next = normalizeShape(shape);
      if (shapes.some((s) => s.id === next.id))
        throw new Error("Shape IDs must be unique");
      shapes.push(next);
      invalidate();
    },
    removeShape(id) {
      check();
      const index = shapes.findIndex((s) => s.id === id);
      if (index < 0) return false;
      cancel(id);
      nominalScales.delete(id);
      shapes.splice(index, 1);
      if (maskId === id) {
        maskId = null;
        mask = null;
      }
      invalidate();
      return true;
    },
    update,
    transition,
    configure,
    resize,
    setMask,
    morph(id, patch, options = {}) {
      return transition(id, patch, { ...options, liquid: true });
    },
    setSource(image) {
      upload(image);
      invalidate();
    },
    setLight(x, y) {
      check();
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new RangeError("Invalid light position");
      light = { x, y };
      invalidate();
    },
    render() {
      check();
      draw();
    },
    materialize(id, options = {}) {
      const s = shapes.find((s) => s.id === id);
      if (!s) throw new Error("Unknown shape");
      const scale = nominalScales.get(id) ?? (s.scale > 0.04 ? s.scale : 1);
      update(id, { scale: 0.03, opacity: 0 });
      return transition(id, { scale, opacity: 1 }, options);
    },
    dematerialize(id, options = {}) {
      const s = shapes.find((s) => s.id === id);
      if (!s) throw new Error("Unknown shape");
      const target = animations.get(id)?.to.scale ?? s.scale;
      if (target > 0.04) nominalScales.set(id, target);
      return transition(id, { scale: 0.03, opacity: 0 }, options);
    },
    getShape(id) {
      const s = shapes.find((s) => s.id === id);
      return s ? { ...s } : undefined;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stats() {
      return {
        draws: drawCount,
        blurBuilds: blurCount,
        activeAnimations: animations.size,
        pendingFrame: !!frame,
        shapes: shapes.length,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      for (const id of animations.keys()) cancel(id);
      listeners.clear();
      canvas.removeEventListener("webglcontextlost", contextLost);
      release();
    },
  };
}

/** Maps a semantic HTML button to a scene shape. Call sync() after layout changes. */
export function bindGlassControl(
  element,
  scene,
  { id, canvas, group = id, radius = 999 } = {},
) {
  const abort = new AbortController(),
    signal = abort.signal;
  let pressed = false;
  const sync = () => {
    const a = element.getBoundingClientRect(),
      b = canvas.getBoundingClientRect();
    scene.update(id, {
      x: a.left - b.left + a.width / 2,
      y: a.top - b.top + a.height / 2,
      width: a.width,
      height: a.height,
      radius: Math.min(radius, a.height / 2),
    });
  };
  const release = () => {
    if (pressed) {
      pressed = false;
      scene.transition(
        id,
        { scale: 1, opacity: 1 },
        { stiffness: 300, damping: 22 },
      );
    }
  };
  element.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || element.disabled) return;
      pressed = true;
      scene.transition(id, { scale: 1.065 }, { stiffness: 420, damping: 28 });
    },
    { signal },
  );
  for (const event of ["pointerup", "pointercancel", "blur"])
    window.addEventListener(event, release, { signal });
  element.addEventListener(
    "keydown",
    (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        pressed = true;
        scene.transition(id, { scale: 1.065 }, { stiffness: 420, damping: 28 });
      }
    },
    { signal },
  );
  element.addEventListener("keyup", release, { signal });
  window.addEventListener("resize", sync, { signal });
  sync();
  return {
    sync,
    dispose() {
      abort.abort();
      release();
    },
  };
}
