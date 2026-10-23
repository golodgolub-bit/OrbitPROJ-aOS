/** OrbitPROJ. / aOS by @qqDUCK. In-app navigation; independent motion estimates. */
const restoreAttributes = (element, names) => {
  const values = names.map((name) => [name, element.getAttribute(name)]);
  return () =>
    values.forEach(([name, value]) =>
      value === null
        ? element.removeAttribute(name)
        : element.setAttribute(name, value),
    );
};
const reduce = (value) =>
  value === "auto"
    ? matchMedia("(prefers-reduced-motion: reduce)").matches
    : !!value;
const bounded = (n) => Math.min(1, Math.max(0, n));

export function createNavigationStack(
  root,
  { initial, onChange = () => {}, duration = 360, reducedMotion = "auto" } = {},
) {
  const pages = new Map(
    [...root.querySelectorAll(":scope > [data-aos-page]")].map((el) => [
      el.dataset.aosPage,
      el,
    ]),
  );
  if (
    !pages.size ||
    pages.size !== root.querySelectorAll(":scope > [data-aos-page]").length
  )
    throw new Error("Navigation pages require unique IDs");
  initial ??= pages.keys().next().value;
  if (!pages.has(initial) || !Number.isFinite(duration) || duration < 0)
    throw new RangeError("Invalid navigation options");
  let stack = [initial],
    active = null,
    disposed = false;
  const scrolls = new Map(),
    focuses = new Map(),
    originalRoot = restoreAttributes(root, [
      "data-aos-navigation",
      "aria-busy",
    ]);
  const originals = [...pages.values()].map((el) =>
    restoreAttributes(el, ["hidden", "inert", "tabindex", "style"]),
  );
  root.dataset.aosNavigation = "";
  for (const el of pages.values()) el.tabIndex = -1;
  const scroller = (page) => page.querySelector("[data-aos-scroll]") || page;
  const current = () => pages.get(stack.at(-1));
  const check = () => {
    if (disposed) throw new Error("Navigation disposed");
  };
  const settle = () => {
    for (const [id, el] of pages) {
      el.hidden = id !== stack.at(-1);
      el.inert = id !== stack.at(-1);
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
      el.style.removeProperty("z-index");
    }
    root.setAttribute("aria-busy", "false");
  };
  const save = () => {
    const el = current();
    scrolls.set(stack.at(-1), scroller(el).scrollTop);
    if (el.contains(document.activeElement))
      focuses.set(stack.at(-1), document.activeElement);
  };
  const focus = () => {
    const previous = focuses.get(stack.at(-1));
    (previous?.isConnected
      ? previous
      : current().querySelector("[data-aos-page-focus]") || current()
    ).focus({ preventScroll: true });
  };
  const notify = () => onChange({ id: stack.at(-1), stack: [...stack] });
  const prepare = (from, to) => {
    from.hidden = false;
    to.hidden = false;
    from.inert = true;
    to.inert = true;
    root.setAttribute("aria-busy", "true");
    scroller(to).scrollTop = scrolls.get(to.dataset.aosPage) || 0;
  };
  const frames = (isBack, p) => {
    const rtl = getComputedStyle(root).direction === "rtl",
      sign = rtl ? -1 : 1,
      width = root.getBoundingClientRect().width;
    return isBack
      ? {
          from: `translateX(${width * p * sign}px)`,
          to: `translateX(${-width * 0.3 * (1 - p) * sign}px)`,
          opacity: 0.72 + 0.28 * p,
        }
      : {
          from: `translateX(${-width * 0.3 * p * sign}px)`,
          to: `translateX(${width * (1 - p) * sign}px)`,
          opacity: 1 - 0.28 * p,
        };
  };
  const animate = async (from, to, isBack, start, end, commit) => {
    const token = {
      animations: [],
      cancel() {
        for (const a of this.animations) a.cancel();
      },
    };
    active = token;
    const a = frames(isBack, start),
      b = frames(isBack, end);
    from.style.zIndex = isBack ? "2" : "1";
    to.style.zIndex = isBack ? "1" : "2";
    try {
      if (!reduce(reducedMotion) && duration > 0) {
        const options = {
          duration: Math.max(70, duration * Math.abs(end - start)),
          easing: "cubic-bezier(.22,.7,.2,1)",
          fill: "both",
        };
        token.animations = [
          from.animate(
            [
              { transform: a.from, opacity: isBack ? 1 : a.opacity },
              { transform: b.from, opacity: isBack ? 1 : b.opacity },
            ],
            options,
          ),
          to.animate(
            [
              { transform: a.to, opacity: isBack ? a.opacity : 1 },
              { transform: b.to, opacity: isBack ? b.opacity : 1 },
            ],
            options,
          ),
        ];
        await Promise.all(token.animations.map((a) => a.finished));
      }
      if (active !== token || disposed) return false;
      if (commit) commit();
      return true;
    } catch (error) {
      if (error.name !== "AbortError") throw error;
      return false;
    } finally {
      token.cancel();
      if (active === token) {
        active = null;
        if (!disposed) settle();
      }
    }
  };
  const navigate = async (id, back = false, replace = false) => {
    check();
    if (active) return false;
    if (!pages.has(id)) throw new RangeError("Unknown navigation page");
    if (id === stack.at(-1)) return true;
    if (!back && stack.includes(id))
      throw new Error("Page already in navigation stack");
    save();
    const from = current(),
      to = pages.get(id);
    prepare(from, to);
    const ok = await animate(from, to, back, 0, 1, () => {
      stack = back
        ? stack.slice(0, -1)
        : replace
          ? [...stack.slice(0, -1), id]
          : [...stack, id];
    });
    if (ok && !disposed) {
      focus();
      notify();
    }
    return ok;
  };
  settle();
  return {
    push: (id) => navigate(id),
    replace: (id) => navigate(id, false, true),
    pop() {
      check();
      return stack.length > 1
        ? navigate(stack.at(-2), true)
        : Promise.resolve(false);
    },
    reset(id = initial) {
      check();
      if (!pages.has(id)) throw new RangeError("Unknown navigation page");
      active?.cancel();
      active = null;
      stack = [id];
      settle();
      focus();
      notify();
    },
    get stack() {
      return [...stack];
    },
    get busy() {
      return !!active;
    },
    cancel() {
      check();
      active?.cancel();
      active = null;
      settle();
    },
    beginBackGesture() {
      check();
      if (active || stack.length < 2) return null;
      save();
      const from = current(),
        to = pages.get(stack.at(-2));
      prepare(from, to);
      let progress = 0,
        ended = false;
      const token = {
        cancel() {
          ended = true;
          active = null;
          settle();
        },
      };
      active = token;
      from.style.zIndex = "2";
      to.style.zIndex = "1";
      const update = (value) => {
        if (ended) return;
        progress = bounded(value);
        const f = frames(true, progress);
        from.style.transform = f.from;
        to.style.transform = f.to;
        to.style.opacity = String(f.opacity);
      };
      update(0);
      return {
        update,
        async finish(commit) {
          if (ended || active !== token) return false;
          ended = true;
          active = null;
          const ok = await animate(
            from,
            to,
            true,
            progress,
            commit ? 1 : 0,
            commit
              ? () => {
                  stack = stack.slice(0, -1);
                }
              : null,
          );
          if (ok && !disposed) {
            focus();
            if (commit) notify();
          }
          return ok;
        },
        cancel() {
          if (active === token) token.cancel();
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active?.cancel();
      active = null;
      originals.forEach((fn) => fn());
      originalRoot();
    },
  };
}

/** Explicit edge gesture. Vertical scrolling and controls keep their own input. */
export function bindBackGesture(root, navigation, { edgeWidth = 24 } = {}) {
  if (!Number.isFinite(edgeWidth) || edgeWidth <= 0)
    throw new RangeError("Invalid edge width");
  let drag = null;
  const old = root.style.touchAction;
  root.style.touchAction = "pan-y";
  const down = (e) => {
    if (
      e.pointerType !== "touch" ||
      e.button !== 0 ||
      navigation.busy ||
      navigation.stack.length < 2 ||
      e.target.closest("input,textarea,select,[contenteditable=true]")
    )
      return;
    const r = root.getBoundingClientRect(),
      rtl = getComputedStyle(root).direction === "rtl",
      distance = rtl ? r.right - e.clientX : e.clientX - r.left;
    if (distance < 0 || distance > edgeWidth) return;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      last: e.clientX,
      time: e.timeStamp,
      velocity: 0,
      rtl,
      gesture: null,
      width: r.width,
    };
  };
  const move = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const sign = drag.rtl ? -1 : 1,
      dx = (e.clientX - drag.x) * sign,
      dy = e.clientY - drag.y;
    if (!drag.gesture) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag = null;
        return;
      }
      if (dx < 8) return;
      drag.gesture = navigation.beginBackGesture();
      if (!drag.gesture) {
        drag = null;
        return;
      }
      root.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
    drag.velocity =
      ((e.clientX - drag.last) * sign) / Math.max(1, e.timeStamp - drag.time);
    drag.last = e.clientX;
    drag.time = e.timeStamp;
    drag.progress = bounded(dx / drag.width);
    drag.gesture.update(drag.progress);
  };
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    if (root.hasPointerCapture(e.pointerId))
      root.releasePointerCapture(e.pointerId);
    d.gesture?.finish(
      e.type === "pointerup" && (d.progress > 0.33 || d.velocity > 0.45),
    );
  };
  root.addEventListener("pointerdown", down);
  root.addEventListener("pointermove", move, { passive: false });
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("lostpointercapture", end);
  return {
    dispose() {
      const d = drag;
      drag = null;
      d?.gesture?.cancel();
      if (d && root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", end);
      root.removeEventListener("pointercancel", end);
      root.removeEventListener("lostpointercapture", end);
      root.style.touchAction = old;
    },
  };
}

export function bindNavigationBar(
  bar,
  scroller,
  { collapseDistance = 48 } = {},
) {
  if (!Number.isFinite(collapseDistance) || collapseDistance <= 0)
    throw new RangeError("Invalid title collapse distance");
  const reset = restoreAttributes(bar, ["style", "data-aos-navigation-bar"]);
  bar.dataset.aosNavigationBar = "";
  let frame = 0;
  const update = () => {
    frame = 0;
    bar.style.setProperty(
      "--aos-title-collapse",
      String(bounded(scroller.scrollTop / collapseDistance)),
    );
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  scroller.addEventListener("scroll", onScroll, { passive: true });
  const observer = new ResizeObserver(onScroll);
  observer.observe(scroller);
  update();
  return {
    update,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      reset();
    },
  };
}

export function bindTabBar(
  bar,
  { onSelect = () => {}, selected, scroller, minimizeOnScroll = false } = {},
) {
  const tabs = [...bar.querySelectorAll('[role="tab"]')];
  if (!tabs.length) throw new Error("Tab bar requires tabs");
  if (
    tabs.some((el) => !(el.dataset.tab || el.id)) ||
    new Set(tabs.map((el) => el.dataset.tab || el.id)).size !== tabs.length
  )
    throw new Error("Tabs require unique IDs");
  const originals = tabs.map((el) =>
      restoreAttributes(el, ["aria-selected", "tabindex"]),
    ),
    reset = restoreAttributes(bar, [
      "role",
      "data-aos-tab-bar",
      "data-aos-minimized",
    ]);
  bar.setAttribute("role", "tablist");
  bar.dataset.aosTabBar = "";
  let disposed = false,
    last = scroller?.scrollTop || 0,
    travel = 0;
  const select = (id, { focus = true, notify = true } = {}) => {
    if (disposed) throw new Error("Tab bar disposed");
    const chosen = tabs.find((el) => el.dataset.tab === id || el.id === id);
    if (!chosen) throw new RangeError("Unknown tab");
    for (const el of tabs) {
      el.setAttribute("aria-selected", String(el === chosen));
      el.tabIndex = el === chosen ? 0 : -1;
    }
    bar.dataset.aosMinimized = "false";
    if (focus) chosen.focus();
    if (notify) onSelect({ id: chosen.dataset.tab || chosen.id, item: chosen });
  };
  const click = (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tabs.includes(tab)) select(tab.dataset.tab || tab.id);
  };
  const key = (e) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const rtl = getComputedStyle(bar).direction === "rtl",
      delta =
        (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) *
        (rtl ? -1 : 1);
    let next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : delta
            ? (index + delta + tabs.length) % tabs.length
            : null;
    if (next !== null) {
      e.preventDefault();
      select(tabs[next].dataset.tab || tabs[next].id);
    }
  };
  const scroll = () => {
    const y = Math.max(0, scroller.scrollTop),
      delta = y - last;
    last = y;
    if (!minimizeOnScroll) return;
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    if (y < 16 || travel < -16) bar.dataset.aosMinimized = "false";
    else if (travel > 32 && !bar.contains(document.activeElement))
      bar.dataset.aosMinimized = "true";
  };
  bar.addEventListener("click", click);
  bar.addEventListener("keydown", key);
  scroller?.addEventListener("scroll", scroll, { passive: true });
  const activeTab = tabs.find(
    (el) => el.getAttribute("aria-selected") === "true",
  );
  const initial =
    selected ||
    (activeTab && (activeTab.dataset.tab || activeTab.id)) ||
    tabs[0].dataset.tab ||
    tabs[0].id;
  select(initial, { focus: false, notify: false });
  return {
    select,
    dispose() {
      if (disposed) return;
      disposed = true;
      bar.removeEventListener("click", click);
      bar.removeEventListener("keydown", key);
      scroller?.removeEventListener("scroll", scroll);
      originals.forEach((fn) => fn());
      reset();
    },
  };
}

/** Native dialog provides modality/focus containment; the app supplies content. */
export function createSheet(
  dialog,
  {
    detents = [0.5, 1],
    initial = 0,
    dismissible = true,
    onChange = () => {},
    reducedMotion = "auto",
  } = {},
) {
  if (
    !(dialog instanceof HTMLDialogElement) ||
    !detents.length ||
    detents.some(
      (n, i) =>
        !Number.isFinite(n) ||
        n <= 0 ||
        n > 1 ||
        (i > 0 && n <= detents[i - 1]),
    ) ||
    !Number.isInteger(initial) ||
    initial < 0 ||
    initial >= detents.length
  )
    throw new RangeError("Invalid sheet configuration");
  const reset = restoreAttributes(dialog, ["style", "data-aos-sheet"]),
    handle = dialog.querySelector("[data-aos-sheet-handle]"),
    resetHandle = handle
      ? restoreAttributes(handle, [
          "role",
          "aria-valuemin",
          "aria-valuemax",
          "aria-valuenow",
          "tabindex",
          "touch-action",
          "style",
        ])
      : () => {};
  let index = initial,
    disposed = false,
    drag = null,
    returnFocus = null,
    entrance = null,
    suppressClick = false;
  dialog.dataset.aosSheet = "";
  const height = () =>
    Math.max(1, (visualViewport?.height || innerHeight) - 12);
  const sync = () => {
    dialog.style.setProperty(
      "--aos-sheet-height",
      height() * detents[index] + "px",
    );
    if (handle) {
      handle.setAttribute("role", "slider");
      handle.tabIndex = 0;
      handle.setAttribute("aria-valuemin", "1");
      handle.setAttribute("aria-valuemax", String(detents.length));
      handle.setAttribute("aria-valuenow", String(index + 1));
      handle.style.touchAction = "none";
    }
  };
  const snap = (next) => {
    if (disposed) throw new Error("Sheet disposed");
    if (!Number.isInteger(next) || next < 0 || next >= detents.length)
      throw new RangeError("Unknown sheet detent");
    index = next;
    sync();
    onChange({ index, fraction: detents[index] });
  };
  const close = () => {
    if (disposed) return;
    if (dialog.open) dialog.close();
  };
  const cancel = (e) => {
    if (!dismissible) e.preventDefault();
  };
  const closed = () => {
    const d = drag;
    drag = null;
    if (d && handle?.hasPointerCapture(d.id))
      handle.releasePointerCapture(d.id);
    entrance?.cancel();
    entrance = null;
    dialog.style.removeProperty("transform");
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  const down = (e) => {
    if (e.button !== 0) return;
    drag = {
      id: e.pointerId,
      y: e.clientY,
      start: height() * detents[index],
      latest: e.clientY,
    };
    handle.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.latest = e.clientY;
    const size = Math.min(
      height(),
      Math.max(80, drag.start + drag.y - e.clientY),
    );
    dialog.style.setProperty("--aos-sheet-height", size + "px");
  };
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    suppressClick = Math.abs(d.latest - d.y) > 5;
    if (handle.hasPointerCapture(e.pointerId))
      handle.releasePointerCapture(e.pointerId);
    if (e.type !== "pointerup") {
      sync();
      return;
    }
    const size = d.start + d.y - d.latest;
    if (dismissible && size < height() * detents[0] * 0.6) {
      close();
      return;
    }
    const next = detents.reduce(
      (best, v, i) =>
        Math.abs(v * height() - size) <
        Math.abs(detents[best] * height() - size)
          ? i
          : best,
      0,
    );
    snap(next);
  };
  const tap = () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    snap((index + 1) % detents.length);
  };
  const key = (e) => {
    if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      snap(
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? detents.length - 1
            : Math.min(
                detents.length - 1,
                Math.max(0, index + (e.key === "ArrowUp" ? 1 : -1)),
              ),
      );
    }
  };
  const outside = (e) => {
    if (dismissible && e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  };
  handle?.addEventListener("pointerdown", down);
  handle?.addEventListener("pointermove", move);
  handle?.addEventListener("pointerup", end);
  handle?.addEventListener("pointercancel", end);
  handle?.addEventListener("lostpointercapture", end);
  handle?.addEventListener("keydown", key);
  handle?.addEventListener("click", tap);
  dialog.addEventListener("cancel", cancel);
  dialog.addEventListener("close", closed);
  dialog.addEventListener("click", outside);
  window.addEventListener("resize", sync);
  visualViewport?.addEventListener("resize", sync);
  sync();
  return {
    open({ focus } = {}) {
      if (disposed) throw new Error("Sheet disposed");
      if (dialog.open) return;
      returnFocus = focus || document.activeElement;
      sync();
      dialog.showModal();
      if (!reduce(reducedMotion))
        entrance = dialog.animate(
          [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
          { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
    },
    close,
    snap,
    get index() {
      return index;
    },
    dispose() {
      if (disposed) return;
      const d = drag;
      drag = null;
      close();
      entrance?.cancel();
      entrance = null;
      disposed = true;
      handle?.removeEventListener("pointerdown", down);
      handle?.removeEventListener("pointermove", move);
      handle?.removeEventListener("pointerup", end);
      handle?.removeEventListener("pointercancel", end);
      handle?.removeEventListener("lostpointercapture", end);
      handle?.removeEventListener("keydown", key);
      handle?.removeEventListener("click", tap);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("close", closed);
      dialog.removeEventListener("click", outside);
      window.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("resize", sync);
      if (d && handle?.hasPointerCapture(d.id))
        handle.releasePointerCapture(d.id);
      resetHandle();
      reset();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    },
  };
}
