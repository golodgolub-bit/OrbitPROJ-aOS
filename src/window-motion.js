/** OrbitPROJ. / aOS by @qqDUCK. Independent mesh, not Apple's private equations. */
import { clamp, lerp } from "./motion.js";
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const validRect = (r) =>
  r &&
  ["left", "top", "width", "height"].every((k) => Number.isFinite(r[k])) &&
  r.width > 0 &&
  r.height > 0;

/** Two-phase taper and collapse; supports all three documented Dock positions. */
export function genieMesh(
  source,
  target,
  progress,
  { edge = "bottom", slices = 48 } = {},
) {
  if (
    !validRect(source) ||
    !validRect(target) ||
    !Number.isFinite(progress) ||
    !Number.isInteger(slices) ||
    slices < 4 ||
    slices > 128 ||
    !["bottom", "left", "right"].includes(edge)
  )
    throw new RangeError("Invalid window geometry");
  const horizontal = edge !== "bottom",
    p = clamp(progress, 0, 1),
    collapse = smooth((p - 0.22) / 0.78);
  const normalize = (r) =>
    horizontal
      ? { left: r.top, top: r.left, width: r.height, height: r.width }
      : r;
  const s = normalize(source),
    t = normalize(target),
    point = (a, b) => (horizontal ? { x: b, y: a } : { x: a, y: b });
  const line = (u) => {
    const proximity = edge === "left" ? 1 - u : u;
    const pull = smooth((p - (1 - proximity) * 0.42) / 0.58),
      width = lerp(s.width, t.width, pull),
      center = lerp(s.left + s.width / 2, t.left + t.width / 2, pull);
    const y = lerp(s.top + s.height * u, t.top + t.height * u, collapse);
    return [point(center - width / 2, y), point(center + width / 2, y)];
  };
  const result = [];
  for (let i = 0; i < slices; i++) {
    const u = i / slices,
      v = (i + 1) / slices,
      [a, b] = line(u),
      [d, c] = line(v);
    const sourceQuad = horizontal
      ? [
          { x: source.width * u, y: 0 },
          { x: source.width * u, y: source.height },
          { x: source.width * v, y: source.height },
          { x: source.width * v, y: 0 },
        ]
      : [
          { x: 0, y: source.height * u },
          { x: source.width, y: source.height * u },
          { x: source.width, y: source.height * v },
          { x: 0, y: source.height * v },
        ];
    result.push({ source: sourceQuad, destination: [a, b, c, d] });
  }
  return result;
}

function triangle(ctx, image, src, dst, scaleX, scaleY) {
  const [a, b, c] = src.map((v) => ({ x: v.x * scaleX, y: v.y * scaleY })),
    [d, e, f] = dst;
  const determinant = a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y);
  if (Math.abs(determinant) < 1e-8) return;
  const coefficient = (key) => [
    (d[key] * (b.y - c.y) + e[key] * (c.y - a.y) + f[key] * (a.y - b.y)) /
      determinant,
    (d[key] * (c.x - b.x) + e[key] * (a.x - c.x) + f[key] * (b.x - a.x)) /
      determinant,
    (d[key] * (b.x * c.y - c.x * b.y) +
      e[key] * (c.x * a.y - a.x * c.y) +
      f[key] * (a.x * b.y - b.x * a.y)) /
      determinant,
  ];
  const x = coefficient("x"),
    y = coefficient("y");
  ctx.save();
  ctx.beginPath();
  // Overlap clip edges by a subpixel to prevent antialias cracks in the mesh.
  const center = { x: (d.x + e.x + f.x) / 3, y: (d.y + e.y + f.y) / 3 };
  const clip = [d, e, f].map((v) => {
    const dx = v.x - center.x,
      dy = v.y - center.y,
      length = Math.hypot(dx, dy) || 1;
    return { x: v.x + (dx / length) * 0.65, y: v.y + (dy / length) * 0.65 };
  });
  ctx.moveTo(clip[0].x, clip[0].y);
  ctx.lineTo(clip[1].x, clip[1].y);
  ctx.lineTo(clip[2].x, clip[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(x[0], y[0], x[1], y[1], x[2], y[2]);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function meshPainter(canvas, image, source) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  const shaders = [],
    program = gl.createProgram(),
    buffer = gl.createBuffer(),
    texture = gl.createTexture();
  const dispose = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  try {
    if (
      (image.width || image.naturalWidth) >
        gl.getParameter(gl.MAX_TEXTURE_SIZE) ||
      (image.height || image.naturalHeight) >
        gl.getParameter(gl.MAX_TEXTURE_SIZE)
    )
      throw new RangeError("Window snapshot exceeds device texture limit");
    for (const [type, code] of [
      [
        gl.VERTEX_SHADER,
        "attribute vec2 aPosition;attribute vec2 aUv;varying vec2 vUv;uniform vec2 uViewport;void main(){vUv=aUv;gl_Position=vec4((aPosition/uViewport*2.0-1.0)*vec2(1.0,-1.0),0.0,1.0);}",
      ],
      [
        gl.FRAGMENT_SHADER,
        "precision mediump float;varying vec2 vUv;uniform sampler2D uImage;void main(){gl_FragColor=texture2D(uImage,vUv);}",
      ],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("Window mesh shader compilation failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Window mesh program linking failed");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, offset] of [
      ["aPosition", 0],
      ["aUv", 8],
    ]) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 16, offset);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
    gl.uniform2f(
      gl.getUniformLocation(program, "uViewport"),
      innerWidth,
      innerHeight,
    );
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const vertices = new Float32Array(48 * 6 * 4);
    return {
      draw(mesh) {
        if (gl.isContextLost()) throw new Error("Window mesh context lost");
        let n = 0;
        for (const quad of mesh)
          for (const i of [0, 1, 2, 0, 2, 3]) {
            vertices[n++] = quad.destination[i].x;
            vertices[n++] = quad.destination[i].y;
            vertices[n++] = quad.source[i].x / source.width;
            vertices[n++] = quad.source[i].y / source.height;
          }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, n / 4);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Caller supplies a snapshot. The library never captures arbitrary DOM or the desktop. */
export function animateWindow(
  snapshot,
  source,
  target,
  {
    effect = "genie",
    edge = "bottom",
    duration = 620,
    reverse = false,
    reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
    signal,
    onFrame = () => {},
  } = {},
) {
  if (
    !validRect(source) ||
    !validRect(target) ||
    !["genie", "scale"].includes(effect) ||
    !Number.isFinite(duration) ||
    duration < 0 ||
    !["bottom", "left", "right"].includes(edge)
  )
    throw new RangeError("Invalid window animation");
  const sw = snapshot?.width || snapshot?.naturalWidth,
    sh = snapshot?.height || snapshot?.naturalHeight;
  if (!sw || !sh) throw new Error("A nonempty snapshot is required");
  if (signal?.aborted) return Promise.resolve(false);
  if (reducedMotion || duration === 0) {
    onFrame(reverse ? 0 : 1);
    return Promise.resolve(true);
  }
  const canvas = document.createElement("canvas"),
    ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.dataset.aosWindowAnimation = "";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "1000",
  });
  canvas.width = Math.round(innerWidth * ratio);
  canvas.height = Math.round(innerHeight * ratio);
  const painter =
    effect === "genie" ? meshPainter(canvas, snapshot, source) : null;
  const ctx = painter ? null : canvas.getContext("2d");
  if (!painter && !ctx) throw new Error("Canvas rendering unavailable");
  document.body.append(canvas);
  return new Promise((resolve, reject) => {
    let frame = 0,
      done = false;
    const start = performance.now();
    const finish = (result, error) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      painter?.dispose();
      canvas.remove();
      signal?.removeEventListener("abort", abort);
      window.removeEventListener("resize", abort);
      error ? reject(error) : resolve(result);
    };
    const abort = () => finish(false);
    signal?.addEventListener("abort", abort, { once: true });
    window.addEventListener("resize", abort, { once: true });
    const draw = (now) => {
      try {
        const elapsed = clamp((now - start) / duration, 0, 1),
          p = reverse ? 1 - elapsed : elapsed;
        if (painter) painter.draw(genieMesh(source, target, p, { edge }));
        else {
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
          if (effect === "scale") {
            const t = smooth(p);
            ctx.drawImage(
              snapshot,
              lerp(source.left, target.left, t),
              lerp(source.top, target.top, t),
              lerp(source.width, target.width, t),
              lerp(source.height, target.height, t),
            );
          } else
            for (const quad of genieMesh(source, target, p, { edge })) {
              const indices = [
                [0, 1, 2],
                [0, 2, 3],
              ];
              for (const ids of indices)
                triangle(
                  ctx,
                  snapshot,
                  ids.map((i) => quad.source[i]),
                  ids.map((i) => quad.destination[i]),
                  sw / source.width,
                  sh / source.height,
                );
            }
        }
        onFrame(p);
        if (elapsed >= 1) finish(true);
        else frame = requestAnimationFrame(draw);
      } catch (error) {
        finish(false, error);
      }
    };
    frame = requestAnimationFrame(draw);
  });
}

/** Owns visibility, inertness, cancellation and focus for an in-app window. */
export function createWindowTransitions({
  element,
  target,
  capture,
  effect = "genie",
  edge = "bottom",
  duration = 620,
  reducedMotion,
} = {}) {
  if (!element || !target || typeof capture !== "function")
    throw new Error(
      "Window element, Dock target and capture callback required",
    );
  let state = element.hidden ? "minimized" : "visible",
    disposed = false,
    active = null,
    focusBefore = null,
    lastSource = null;
  const original = {
    hidden: element.hidden,
    inert: element.inert,
    visibility: element.style.visibility,
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const paintState = () => {
    element.hidden = state === "minimized";
    element.inert = state === "minimized" || original.inert;
    element.style.visibility = original.visibility;
  };
  const run = async (minimize) => {
    if (disposed) throw new Error("Window transitions disposed");
    if (active) return false;
    if (state === (minimize ? "minimized" : "visible")) return true;
    const controller = new AbortController();
    active = controller;
    const before = state;
    if (minimize)
      focusBefore = element.contains(document.activeElement)
        ? document.activeElement
        : null;
    state = minimize ? "minimizing" : "restoring";
    try {
      element.hidden = false;
      element.inert = true;
      // Snapshot providers must honor signal; aborted late results are ignored.
      const aborted = new Promise((resolve) =>
        controller.signal.addEventListener("abort", () => resolve(null), {
          once: true,
        }),
      );
      const image = await Promise.race([
        Promise.resolve().then(() =>
          capture({ element, signal: controller.signal }),
        ),
        aborted,
      ]);
      if (!image || controller.signal.aborted || disposed) {
        state = before;
        return false;
      }
      const source = minimize
        ? box(element)
        : validRect(box(element))
          ? box(element)
          : lastSource;
      lastSource = source;
      const destination = box(target);
      element.style.visibility = "hidden";
      const ok = await animateWindow(image, source, destination, {
        effect,
        edge,
        duration,
        reducedMotion,
        signal: controller.signal,
        reverse: !minimize,
      });
      if (disposed) return false;
      state = ok ? (minimize ? "minimized" : "visible") : before;
      if (ok) {
        paintState();
        if (minimize) target.focus({ preventScroll: true });
        else if (focusBefore?.isConnected)
          focusBefore.focus({ preventScroll: true });
        else element.focus({ preventScroll: true });
      }
      return ok;
    } catch (error) {
      state = before;
      throw error;
    } finally {
      if (active === controller) active = null;
      if (!disposed) paintState();
    }
  };
  return {
    minimize: () => run(true),
    restore: () => run(false),
    get state() {
      return state;
    },
    configure(next) {
      if (disposed) throw new Error("Window transitions disposed");
      if (active)
        throw new Error("Cannot configure during a window transition");
      if (
        next.effect !== undefined &&
        !["genie", "scale"].includes(next.effect)
      )
        throw new RangeError("Unknown effect");
      if (
        next.edge !== undefined &&
        !["bottom", "left", "right"].includes(next.edge)
      )
        throw new RangeError("Unknown Dock edge");
      if (
        next.duration !== undefined &&
        (!Number.isFinite(next.duration) || next.duration < 0)
      )
        throw new RangeError("Invalid duration");
      effect = next.effect ?? effect;
      edge = next.edge ?? edge;
      duration = next.duration ?? duration;
      reducedMotion = next.reducedMotion ?? reducedMotion;
    },
    cancel() {
      active?.abort();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active?.abort();
      element.hidden = original.hidden;
      element.inert = original.inert;
      element.style.visibility = original.visibility;
    },
  };
}
