/** OrbitPROJ. / aOS by @qqDUCK. App-owned geometry and shared rendering. */
import { createGlassScene } from "./scene.js";
export function createGlassContainer(
  canvas,
  source,
  { spacing = 24, ...options } = {},
) {
  if (!Number.isFinite(spacing) || spacing < 0)
    throw new RangeError("Invalid glass spacing");
  const scene = createGlassScene(canvas, source, {
    ...options,
    merge: spacing,
  });
  if (!scene) return null;
  const entries = new Map();
  let frame = 0,
    disposed = false,
    viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
  const check = () => {
    if (disposed) throw new Error("Glass container disposed");
  };
  const geometry = (element, radius) => {
    const a = element.getBoundingClientRect(),
      b = canvas.getBoundingClientRect();
    if (!a.width || !a.height || !b.width || !b.height)
      throw new RangeError(
        "Glass elements and canvas must have visible geometry",
      );
    const sx = canvas.clientWidth / b.width,
      sy = canvas.clientHeight / b.height;
    return {
      x: (a.left - b.left + a.width / 2) * sx,
      y: (a.top - b.top + a.height / 2) * sy,
      width: a.width * sx,
      height: a.height * sy,
      radius: Math.min(radius, (a.width * sx) / 2, (a.height * sy) / 2),
    };
  };
  const sync = (id) => {
    check();
    if (
      canvas.clientWidth &&
      canvas.clientHeight &&
      (viewport.width !== canvas.clientWidth ||
        viewport.height !== canvas.clientHeight)
    ) {
      viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
      scene.resize(
        viewport.width,
        viewport.height,
        Math.min(devicePixelRatio || 1, 1.5),
      );
    }
    const candidates =
      id === undefined ? [...entries.values()] : [entries.get(id)];
    for (const entry of candidates) {
      if (!entry) throw new Error("Unknown glass identity");
      if (entry.moving || !entry.element.isConnected) continue;
      const patch = geometry(entry.element, entry.radius),
        shape = scene.getShape(entry.id);
      if (Object.entries(patch).some(([k, v]) => Math.abs(v - shape[k]) > 0.05))
        scene.update(entry.id, patch);
    }
  };
  const flush = () => {
    frame = 0;
    if (disposed) return;
    const r = canvas.getBoundingClientRect();
    if (r.width && r.height) sync();
  };
  const invalidate = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(flush);
  };
  const observer = new ResizeObserver(invalidate);
  observer.observe(canvas);
  const observe = (old, element) => {
    if (old && !Array.from(entries.values()).some((e) => e.element === old))
      observer.unobserve(old);
    observer.observe(element);
  };
  document.addEventListener("scroll", invalidate, true);
  window.addEventListener("resize", invalidate);
  const api = {
    scene,
    register(
      id,
      element,
      { group = id, radius = 999, appear = false, ...shape } = {},
    ) {
      check();
      if (typeof id !== "string" || !id || entries.has(id))
        throw new Error("Glass identity must be unique");
      if (!Number.isFinite(radius) || radius < 0)
        throw new RangeError("Invalid glass radius");
      const patch = geometry(element, radius);
      scene.addShape({ ...shape, ...patch, id, group });
      const entry = { id, element, radius, group, epoch: 0, moving: false };
      entries.set(id, entry);
      observer.observe(element);
      if (appear) scene.materialize(id);
      return {
        move: (element, options) => api.move(id, element, options),
        sync: () => sync(id),
        remove: (options) => api.remove(id, options),
      };
    },
    async move(
      id,
      element,
      { transition = "matchedGeometry", ...spring } = {},
    ) {
      check();
      if (!["matchedGeometry", "materialize", "none"].includes(transition))
        throw new RangeError("Unknown glass transition");
      const entry = entries.get(id);
      if (!entry) throw new Error("Unknown glass identity");
      const patch = geometry(element, entry.radius),
        token = ++entry.epoch,
        old = entry.element;
      entry.element = element;
      entry.moving = true;
      observe(old, element);
      try {
        let result = true;
        if (transition === "materialize") {
          result = await scene.dematerialize(id, spring);
          if (!result || disposed || entry.epoch !== token) return false;
          scene.update(id, { ...patch, scale: 1 });
          result = await scene.materialize(id, spring);
        } else if (transition === "none") scene.update(id, patch);
        else result = await scene.morph(id, patch, spring);
        return result && !disposed && entry.epoch === token;
      } finally {
        if (!disposed && entry.epoch === token) {
          entry.moving = false;
          invalidate();
        }
      }
    },
    async remove(id, { animate = true, ...spring } = {}) {
      check();
      const entry = entries.get(id);
      if (!entry) return false;
      const token = ++entry.epoch;
      entry.moving = true;
      if (animate) {
        const ok = await scene.dematerialize(id, spring);
        if (!ok || disposed || token !== entry.epoch) return false;
      }
      if (disposed) return false;
      entries.delete(id);
      if (
        !Array.from(entries.values()).some((e) => e.element === entry.element)
      )
        observer.unobserve(entry.element);
      scene.removeShape(id);
      return true;
    },
    sync,
    configure({ spacing, ...next }) {
      check();
      if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
        throw new RangeError("Invalid glass spacing");
      scene.configure({
        ...next,
        ...(spacing === undefined ? {} : { merge: spacing }),
      });
    },
    setSource(source) {
      check();
      scene.setSource(source);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("scroll", invalidate, true);
      window.removeEventListener("resize", invalidate);
      entries.clear();
      scene.dispose();
    },
  };
  return api;
}
