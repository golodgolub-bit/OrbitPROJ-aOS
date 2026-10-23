/** Native controls retain input semantics while a shared scene draws the thumb. */
const rect = (el, canvas) => {
  const a = el.getBoundingClientRect(),
    b = canvas.getBoundingClientRect();
  return {
    left: a.left - b.left,
    top: a.top - b.top,
    width: a.width,
    height: a.height,
  };
};
export function bindGlassRange(input, scene, { id, canvas, size = 30 } = {}) {
  const abort = new AbortController(),
    signal = abort.signal;
  let active = false;
  const sync = (animate = false) => {
    const r = rect(input, canvas),
      min = Number(input.min || 0),
      max = Number(input.max || 100),
      span = Math.max(0.0001, max - min),
      rtl = getComputedStyle(input).direction === "rtl";
    let p = Math.max(0, Math.min(1, (Number(input.value) - min) / span));
    if (rtl) p = 1 - p;
    const patch = {
      x: r.left + size / 2 + p * Math.max(0, r.width - size),
      y: r.top + r.height / 2,
      width: size,
      height: size,
      radius: size / 2,
    };
    if (animate)
      scene.transition(
        id,
        { ...patch, scale: active ? 1.4 : 1 },
        { stiffness: 700, damping: 44 },
      );
    else scene.update(id, patch);
  };
  const activate = () => {
    active = true;
    scene.transition(
      id,
      { scale: 1.4, opacity: 1 },
      { stiffness: 400, damping: 26 },
    );
  };
  const release = () => {
    if (!active) return;
    active = false;
    sync(false);
    scene.transition(id, { scale: 1 }, { stiffness: 300, damping: 22 });
  };
  input.addEventListener("input", () => sync(true), { signal });
  input.addEventListener("change", () => sync(true), { signal });
  input.addEventListener("pointerdown", activate, { signal });
  input.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key.startsWith("Arrow") ||
        ["Home", "End", "PageUp", "PageDown"].includes(e.key)
      )
        activate();
    },
    { signal },
  );
  input.addEventListener("keyup", release, { signal });
  for (const e of ["pointerup", "pointercancel", "blur"])
    window.addEventListener(e, release, { signal });
  window.addEventListener("resize", () => sync(), { signal });
  sync();
  return {
    sync,
    dispose() {
      abort.abort();
    },
  };
}
export function bindGlassSelection(
  container,
  scene,
  {
    id,
    canvas,
    selected = '[aria-selected="true"], input:checked + span',
    radius = 999,
  } = {},
) {
  const abort = new AbortController(),
    signal = abort.signal;
  const sync = (animate = true) => {
    const el = container.querySelector(selected);
    if (!el) return;
    const r = rect(el, canvas);
    if (!r.width || !r.height) return;
    const to = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      width: r.width,
      height: r.height,
      radius: Math.min(radius, r.height / 2),
      opacity: 1,
    };
    if (animate) scene.transition(id, to, { stiffness: 310, damping: 26 });
    else scene.update(id, to);
  };
  for (const e of ["click", "change", "keyup"])
    container.addEventListener(
      e,
      () =>
        queueMicrotask(() => {
          if (!signal.aborted) sync();
        }),
      { signal },
    );
  window.addEventListener("resize", () => sync(false), { signal });
  sync(false);
  return {
    sync,
    dispose() {
      abort.abort();
    },
  };
}
