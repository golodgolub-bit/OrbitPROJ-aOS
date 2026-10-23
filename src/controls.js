import { clamp, springState, ribbonRows } from "./motion.js";
export { clamp, lerp, springState, ribbonRows } from "./motion.js";

const reduced = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export function capabilities() {
  return {
    backdrop:
      typeof CSS !== "undefined" &&
      (CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)")),
    reducedMotion: reduced(),
    popover:
      typeof HTMLElement !== "undefined" &&
      "showPopover" in HTMLElement.prototype,
  };
}

/** No ticker remains after settling. Cancel resolves false, completion resolves true. */
export function animateSpring(
  update,
  {
    from = 0,
    to = 1,
    velocity = 0,
    stiffness = 240,
    damping = 26,
    mass = 1,
    epsilon = 0.001,
    maxDuration = 2,
    reducedMotion = reduced(),
  } = {},
) {
  springState(0, from, to, { stiffness, damping, mass, velocity });
  let frame = 0,
    done = false,
    resolve;
  const finished = new Promise((r) => {
    resolve = r;
  });
  const end = (ok) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    resolve(ok);
  };
  const cancel = () => end(false);
  if (reducedMotion) {
    update(to);
    end(true);
    return { cancel, finished };
  }
  const start = performance.now();
  const tick = (now) => {
    if (done) return;
    const t = (now - start) / 1000,
      state = springState(t, from, to, { stiffness, damping, mass, velocity });
    update(state.value);
    if (
      (Math.abs(state.value - to) < epsilon &&
        Math.abs(state.velocity) < epsilon) ||
      t >= maxDuration
    ) {
      update(to);
      end(true);
    } else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return { cancel, finished };
}

/** Explicit opt-ins override preferences only when passed. Auto follows media queries. */
export function configure({
  root = document.documentElement,
  quality = "balanced",
  theme = "auto",
  transparency = "auto",
} = {}) {
  if (
    !["lite", "balanced", "rich"].includes(quality) ||
    !["light", "dark", "auto"].includes(theme) ||
    !["auto", "off", "on"].includes(transparency)
  )
    throw new RangeError("Unknown glass configuration");
  root.dataset.aosQuality = quality;
  root.dataset.aosTheme = theme;
  root.dataset.aosTransparency = transparency;
}

const owners = new WeakMap();
/** Enhance static DOM. Call again after adding components, dispose on unmount. */
export function enhance(root = document) {
  const owned = [],
    all = (selector) => [
      ...(root instanceof Element && root.matches(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
  const register = (el, feature, setup) => {
    const features = owners.get(el) || new Map();
    if (features.has(feature)) return;
    const abort = new AbortController(),
      cleanup = setup(abort.signal) || (() => {});
    const release = () => {
      abort.abort();
      cleanup();
      features.delete(feature);
      if (!features.size) owners.delete(el);
    };
    features.set(feature, release);
    owners.set(el, features);
    owned.push(release);
  };
  for (const el of all("[data-aos]"))
    register(el, "light", (signal) => {
      let raf = 0,
        x = 50,
        y = 0;
      const schedule = (event) => {
        const r = el.getBoundingClientRect();
        x = clamp(
          ((event.clientX - r.left) / Math.max(1, r.width)) * 100,
          0,
          100,
        );
        y = clamp(
          ((event.clientY - r.top) / Math.max(1, r.height)) * 100,
          0,
          100,
        );
        if (!raf)
          raf = requestAnimationFrame(() => {
            el.style.setProperty("--aos-pointer-x", `${x}%`);
            el.style.setProperty("--aos-pointer-y", `${y}%`);
            raf = 0;
          });
      };
      const release = () => el.removeAttribute("data-pressed");
      el.addEventListener("pointermove", schedule, { signal, passive: true });
      el.addEventListener(
        "pointerdown",
        (e) => {
          if (e.button === 0 && !el.matches(":disabled")) {
            schedule(e);
            el.dataset.pressed = "";
          }
        },
        { signal },
      );
      for (const type of ["pointerup", "pointercancel", "blur"])
        window.addEventListener(type, release, { signal });
      el.addEventListener("pointerleave", release, { signal });
      return () => {
        cancelAnimationFrame(raf);
        release();
        el.style.removeProperty("--aos-pointer-x");
        el.style.removeProperty("--aos-pointer-y");
      };
    });
  for (const el of all("[data-aos-drag]"))
    register(el, "drag", (signal) => setupDrag(el, signal));
  for (const el of all("[data-aos-tabs]"))
    register(el, "tabs", (signal) => setupTabs(el, signal));
  for (const el of all("[data-aos-dock]"))
    register(el, "dock", (signal) => {
      const items = [...el.querySelectorAll("button, a")];
      let frame = 0,
        pointer = null;
      const reset = () => {
        pointer = null;
        cancelAnimationFrame(frame);
        frame = 0;
        items.forEach((i) => i.style.removeProperty("--aos-dock-scale"));
      };
      el.addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType === "touch" || reduced()) return;
          pointer = e.clientX;
          if (!frame)
            frame = requestAnimationFrame(() => {
              for (const i of items) {
                const r = i.getBoundingClientRect(),
                  d = Math.abs(pointer - r.left - r.width / 2);
                i.style.setProperty(
                  "--aos-dock-scale",
                  String(1 + 0.23 * Math.exp((-d * d) / 4500)),
                );
              }
              frame = 0;
            });
        },
        { signal, passive: true },
      );
      el.addEventListener("pointerleave", reset, { signal });
      return reset;
    });
  return () => {
    owned.splice(0).forEach((dispose) => dispose());
  };
}

function setupDrag(el, signal) {
  const handle = el.querySelector("[data-drag-handle]") || el;
  const boundary = el.parentElement;
  let active = null,
    x = 0,
    y = 0,
    motion;
  const apply = () => {
    el.style.setProperty("--aos-drag-x", `${x}px`);
    el.style.setProperty("--aos-drag-y", `${y}px`);
  };
  const limit = () => {
    if (!boundary) return;
    const p = boundary.getBoundingClientRect(),
      r = el.getBoundingClientRect();
    x = clamp(
      x,
      x + p.left - r.left,
      x + Math.max(p.left, p.right - r.width) - r.left,
    );
    y = clamp(
      y,
      y + p.top - r.top,
      y + Math.max(p.top, p.bottom - r.height) - r.top,
    );
    apply();
  };
  const end = () => {
    if (!active) return;
    const id = active.id;
    active = null;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    el.removeAttribute("data-dragging");
    const fromX = x,
      fromY = y;
    if (el.dataset.aosDrag === "return")
      motion = animateSpring((p) => {
        x = fromX * (1 - p);
        y = fromY * (1 - p);
        apply();
      });
    el.dispatchEvent(
      new CustomEvent("aos:dragend", { bubbles: true, detail: { x, y } }),
    );
  };
  handle.addEventListener(
    "pointerdown",
    (e) => {
      if (
        !e.isPrimary ||
        e.button !== 0 ||
        active ||
        e.target.closest("button, input, a, select, textarea")
      )
        return;
      motion?.cancel();
      active = { id: e.pointerId, px: e.clientX, py: e.clientY, x, y };
      handle.setPointerCapture(e.pointerId);
      el.dataset.dragging = "";
      e.preventDefault();
    },
    { signal },
  );
  handle.addEventListener(
    "pointermove",
    (e) => {
      if (!active || e.pointerId !== active.id) return;
      x = active.x + e.clientX - active.px;
      y = active.y + e.clientY - active.py;
      apply();
      limit();
    },
    { signal },
  );
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    handle.addEventListener(type, end, { signal });
  window.addEventListener("blur", end, { signal });
  window.addEventListener(
    "resize",
    () => {
      end();
      limit();
    },
    { signal },
  );
  handle.addEventListener(
    "keydown",
    (e) => {
      const delta = e.shiftKey ? 24 : 8;
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          e.key,
        )
      )
        return;
      e.preventDefault();
      motion?.cancel();
      if (e.key === "Home") x = y = 0;
      if (e.key === "ArrowLeft") x -= delta;
      if (e.key === "ArrowRight") x += delta;
      if (e.key === "ArrowUp") y -= delta;
      if (e.key === "ArrowDown") y += delta;
      apply();
      limit();
    },
    { signal },
  );
  return () => {
    motion?.cancel();
    active = null;
    el.removeAttribute("data-dragging");
    el.style.removeProperty("--aos-drag-x");
    el.style.removeProperty("--aos-drag-y");
  };
}

function setupTabs(el, signal) {
  const tabs = [...el.querySelectorAll("[role=tab]")];
  const activate = (tab) => {
    if (tab.disabled || tab.getAttribute("aria-disabled") === "true") return;
    for (const t of tabs) {
      const chosen = t === tab;
      t.setAttribute("aria-selected", String(chosen));
      t.tabIndex = chosen ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !chosen;
    }
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab), { signal });
    tab.addEventListener(
      "keydown",
      (e) => {
        const enabled = tabs.filter(
          (t) => !t.disabled && t.getAttribute("aria-disabled") !== "true",
        );
        const vertical = el.getAttribute("aria-orientation") === "vertical";
        const previous = vertical ? "ArrowUp" : "ArrowLeft",
          next = vertical ? "ArrowDown" : "ArrowRight";
        const rtl = getComputedStyle(el).direction === "rtl" && !vertical;
        if (![previous, next, "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const i = enabled.indexOf(tab),
          delta = (e.key === next ? 1 : -1) * (rtl ? -1 : 1);
        const target =
          e.key === "Home"
            ? enabled[0]
            : e.key === "End"
              ? enabled.at(-1)
              : enabled[(i + delta + enabled.length) % enabled.length];
        target?.focus();
        if (target) activate(target);
      },
      { signal },
    );
  });
  const first =
    tabs.find(
      (t) => t.getAttribute("aria-selected") === "true" && !t.disabled,
    ) || tabs.find((t) => !t.disabled);
  if (first) activate(first);
}

/** DOM contraction. Returns a restore function; it owns only visibility/inert state. */
export async function minimizeTo(
  source,
  target,
  { duration = 540, reducedMotion = reduced() } = {},
) {
  if (source.hidden) throw new Error("Source is already hidden");
  const a = source.getBoundingClientRect(),
    b = target.getBoundingClientRect();
  if (!a.width || !a.height || !b.width || !b.height)
    throw new RangeError("Visible source and target required");
  const wasInert = source.inert,
    previousFocus = document.activeElement;
  const transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(${b.width / a.width}, ${b.height / a.height})`;
  const run = async (reverse) => {
    if (reducedMotion) return;
    const frames = [
      {
        transform: "none",
        opacity: 1,
        borderRadius: getComputedStyle(source).borderRadius,
      },
      { transform, opacity: 0.08, borderRadius: "40px" },
    ];
    const animation = source.animate(reverse ? frames.reverse() : frames, {
      duration,
      easing: "cubic-bezier(.32,.06,.2,1)",
      fill: "none",
    });
    try {
      await animation.finished;
    } catch {
    } finally {
      animation.cancel();
    }
  };
  source.inert = true;
  await run(false);
  source.hidden = true;
  target.focus({ preventScroll: true });
  let restored = false;
  return async () => {
    if (restored) return;
    restored = true;
    source.hidden = false;
    // Recompute current geometry for restored layouts by using a new animation.
    const current = source.getBoundingClientRect(),
      dest = target.getBoundingClientRect();
    if (!reducedMotion) {
      const tr = `translate(${dest.left + dest.width / 2 - current.left - current.width / 2}px, ${dest.top + dest.height / 2 - current.top - current.height / 2}px) scale(${dest.width / current.width}, ${dest.height / current.height})`;
      const anim = source.animate(
        [
          { transform: tr, opacity: 0.08 },
          { transform: "none", opacity: 1 },
        ],
        { duration, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
      try {
        await anim.finished;
      } catch {
      } finally {
        anim.cancel();
      }
    }
    source.inert = wasInert;
    if (
      previousFocus instanceof HTMLElement &&
      previousFocus.isConnected &&
      source.contains(previousFocus)
    )
      previousFocus.focus({ preventScroll: true });
  };
}

/** Mesh-like row warp for an app-provided snapshot. HTML capture is not included. */
export async function ribbonTo(
  snapshot,
  sourceRect,
  targetRect,
  {
    duration = 680,
    slices = 32,
    reverse = false,
    reducedMotion = reduced(),
  } = {},
) {
  if (reducedMotion) return;
  if (!snapshot.width || !snapshot.height)
    throw new RangeError("Snapshot must have dimensions");
  const layer = document.createElement("canvas"),
    dpr = Math.min(devicePixelRatio || 1, 2);
  layer.width = innerWidth * dpr;
  layer.height = innerHeight * dpr;
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "2147483646",
  });
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  const ctx = layer.getContext("2d");
  if (!ctx) {
    layer.remove();
    return;
  }
  ctx.scale(dpr, dpr);
  const start = performance.now();
  try {
    await new Promise((resolve) => {
      const frame = (now) => {
        const p = clamp((now - start) / Math.max(1, duration), 0, 1),
          progress = reverse ? 1 - p : p;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (const row of ribbonRows(
          sourceRect,
          targetRect,
          progress,
          slices,
        )) {
          ctx.drawImage(
            snapshot,
            0,
            (row.sy / sourceRect.height) * snapshot.height,
            snapshot.width,
            (row.sh / sourceRect.height) * snapshot.height,
            row.x,
            row.y,
            row.width,
            row.height,
          );
        }
        if (p >= 1) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  } finally {
    layer.remove();
  }
}

export function toast(message, { duration = 3200, root = document.body } = {}) {
  const node = document.createElement("div");
  node.className = "aos-toast aos-surface";
  node.setAttribute("role", "status");
  node.textContent = message;
  root.append(node);
  let timer = setTimeout(() => node.remove(), duration);
  return () => {
    clearTimeout(timer);
    node.remove();
  };
}
