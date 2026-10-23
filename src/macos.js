/** OrbitPROJ. / aOS by @qqDUCK. Controllers attach to application-owned markup. */
const enabled = (el) =>
  el.getAttribute("aria-disabled") !== "true" && !el.disabled && !el.hidden;
const items = (menu) =>
  [...menu.querySelectorAll('[role^="menuitem"]')].filter(
    (el) => el.closest('[role="menu"]') === menu && enabled(el),
  );
const snapshot = (el, names) => {
  const attrs = names.map((k) => [k, el.getAttribute(k)]);
  return () => {
    for (const [k, v] of attrs)
      v === null ? el.removeAttribute(k) : el.setAttribute(k, v);
  };
};
function position(panel, anchor, submenu = false) {
  const r = anchor.getBoundingClientRect();
  panel.style.left = "0px";
  panel.style.top = "0px";
  const p = panel.getBoundingClientRect(),
    gap = 4;
  let x = submenu ? r.right + gap : r.left,
    y = submenu ? r.top : r.bottom + gap;
  if (x + p.width > innerWidth - 8)
    x = submenu ? r.left - p.width - gap : innerWidth - p.width - 8;
  if (y + p.height > innerHeight - 8) y = innerHeight - p.height - 8;
  panel.style.left = Math.max(8, x) + "px";
  panel.style.top = Math.max(8, y) + "px";
}

/** Standard menu ordering and command contents are supplied by the app. */
export function bindMenuBar(
  bar,
  { onCommand = () => {}, onOpen = () => {} } = {},
) {
  const triggers = [...bar.querySelectorAll("[data-aos-menu-trigger]")],
    menus = new Map(),
    restore = [];
  if (!triggers.length) throw new Error("Menu bar requires triggers");
  let chain = [],
    active = null,
    disposed = false,
    typeahead = "",
    typeTime = 0;
  const originalBar = snapshot(bar, ["role"]);
  bar.setAttribute("role", "menubar");
  restore.push(originalBar);
  const register = (trigger) => {
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls"),
    );
    if (!panel || panel.getAttribute("role") !== "menu")
      throw new Error("Every menu trigger must reference a role=menu");
    if (menus.has(trigger)) return;
    restore.push(
      snapshot(trigger, ["role", "aria-expanded", "aria-haspopup", "tabindex"]),
      snapshot(panel, ["hidden", "style", "tabindex"]),
    );
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("role", "menuitem");
    panel.hidden = true;
    panel.tabIndex = -1;
    menus.set(trigger, panel);
    for (const child of panel.querySelectorAll("[data-aos-submenu]"))
      register(child);
    for (const item of panel.querySelectorAll('[role^="menuitem"]')) {
      restore.push(snapshot(item, ["tabindex"]));
      item.tabIndex = -1;
    }
  };
  for (const trigger of triggers) register(trigger);
  triggers.forEach((el, i) => (el.tabIndex = i === 0 ? 0 : -1));
  const hideFrom = (index) => {
    for (const entry of chain.splice(index)) {
      entry.menu.hidden = true;
      entry.trigger.setAttribute("aria-expanded", "false");
    }
  };
  const close = ({ focus = true } = {}) => {
    const previous = active;
    hideFrom(0);
    active = null;
    typeahead = "";
    if (focus) previous?.focus();
  };
  const open = (trigger, { focus = true, last = false } = {}) => {
    if (disposed) throw new Error("Menu bar disposed");
    if (!menus.has(trigger) || !enabled(trigger)) return;
    const isTop = triggers.includes(trigger),
      parent = trigger.closest('[role="menu"]'),
      depth = isTop ? 0 : chain.findIndex((e) => e.menu === parent) + 1;
    if (!isTop && depth === 0) return;
    hideFrom(depth);
    if (isTop) {
      active = trigger;
      triggers.forEach((el) => (el.tabIndex = el === trigger ? 0 : -1));
    }
    const menu = menus.get(trigger);
    onOpen({ trigger, menu });
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    position(menu, trigger, !isTop);
    chain.push({ trigger, menu });
    if (focus) {
      const list = items(menu);
      (last ? list.at(-1) : list[0])?.focus();
      if (!list.length) menu.focus();
    }
  };
  const command = (item, event) => {
    if (!enabled(item)) return;
    if (menus.has(item)) {
      open(item);
      return;
    }
    close({ focus: true });
    onCommand({ id: item.dataset.command || "", item, event });
  };
  const click = (event) => {
    const trigger = event.target.closest("[data-aos-menu-trigger]");
    if (triggers.includes(trigger)) {
      event.preventDefault();
      active === trigger && chain.length ? close() : open(trigger);
      return;
    }
    const item = event.target.closest('[role^="menuitem"]');
    if (item && chain.some((e) => e.menu.contains(item))) {
      event.preventDefault();
      command(item, event);
    }
  };
  const hover = (event) => {
    if (!chain.length || event.pointerType === "touch") return;
    const trigger = event.target.closest("[data-aos-menu-trigger]");
    if (triggers.includes(trigger) && trigger !== active) {
      open(trigger, { focus: false });
      return;
    }
    const item = event.target.closest('[role^="menuitem"]');
    if (!item || !enabled(item)) return;
    const index = chain.findIndex(
      (e) => e.menu === item.closest('[role="menu"]'),
    );
    if (index < 0) return;
    item.focus({ preventScroll: true });
    if (menus.has(item)) open(item, { focus: false });
    else hideFrom(index + 1);
  };
  const key = (event) => {
    const focused = document.activeElement,
      topIndex = triggers.indexOf(focused),
      entry = chain.at(-1);
    if (!chain.length && topIndex < 0) return;
    const k = event.key;
    if (k === "Tab") {
      close({ focus: false });
      return;
    }
    if (k === "Escape") {
      event.preventDefault();
      if (chain.length > 1) {
        const last = chain.at(-1);
        hideFrom(chain.length - 1);
        last.trigger.focus();
      } else close();
      return;
    }
    if (topIndex >= 0) {
      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(k)) {
        event.preventDefault();
        const i =
          k === "Home"
            ? 0
            : k === "End"
              ? triggers.length - 1
              : (topIndex + (k === "ArrowRight" ? 1 : -1) + triggers.length) %
                triggers.length;
        triggers[i].focus();
        if (chain.length) open(triggers[i]);
      } else if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
        event.preventDefault();
        open(focused, { last: k === "ArrowUp" });
      }
      return;
    }
    if (!entry) return;
    const parentEntry =
      chain.find((e) => e.menu === focused.closest('[role="menu"]')) || entry;
    const list = items(parentEntry.menu),
      i = list.indexOf(focused);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(k)) {
      event.preventDefault();
      const n =
        k === "Home"
          ? 0
          : k === "End"
            ? list.length - 1
            : (i + (k === "ArrowDown" ? 1 : -1) + list.length) % list.length;
      list[n]?.focus();
    } else if (k === "ArrowRight") {
      event.preventDefault();
      if (menus.has(focused)) open(focused);
      else if (chain.length === 1)
        open(triggers[(triggers.indexOf(active) + 1) % triggers.length]);
    } else if (k === "ArrowLeft") {
      event.preventDefault();
      if (chain.length > 1) {
        const last = chain.at(-1);
        hideFrom(chain.length - 1);
        last.trigger.focus();
      } else
        open(
          triggers[
            (triggers.indexOf(active) - 1 + triggers.length) % triggers.length
          ],
        );
    } else if (k === "Enter" || k === " ") {
      event.preventDefault();
      command(focused, event);
    } else if (
      k.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = performance.now();
      typeahead = now - typeTime > 700 ? k : typeahead + k;
      typeTime = now;
      const text = typeahead.toLocaleLowerCase();
      const candidates = [...list.slice(i + 1), ...list.slice(0, i + 1)];
      const match = candidates.find((el) =>
        (el.dataset.label || el.textContent)
          .trim()
          .toLocaleLowerCase()
          .startsWith(text),
      );
      match?.focus();
    }
  };
  const outside = (event) => {
    if (
      !bar.contains(event.target) &&
      !chain.some((e) => e.menu.contains(event.target))
    )
      close({ focus: false });
  };
  const reflow = () => {
    for (const e of chain)
      position(e.menu, e.trigger, !triggers.includes(e.trigger));
  };
  document.addEventListener("click", click);
  document.addEventListener("pointerover", hover);
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", key);
  window.addEventListener("resize", reflow);
  window.addEventListener("blur", close);
  return {
    open,
    close,
    get isOpen() {
      return chain.length > 0;
    },
    dispose() {
      if (disposed) return;
      close({ focus: false });
      disposed = true;
      document.removeEventListener("click", click);
      document.removeEventListener("pointerover", hover);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("blur", close);
      for (const fn of restore.reverse()) fn();
    },
  };
}

/** Nonmodal panel anchored to a menu-bar extra. No system services are accessed. */
export function bindSystemPanel(
  panel,
  { trigger, onOpen = () => {}, onClose = () => {} },
) {
  if (!trigger) throw new Error("Panel trigger required");
  let opened = false,
    disposed = false;
  const resetPanel = snapshot(panel, ["style", "hidden", "tabindex"]),
    resetTrigger = snapshot(trigger, [
      "aria-controls",
      "aria-expanded",
      "aria-haspopup",
    ]);
  trigger.setAttribute("aria-controls", panel.id);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "dialog");
  panel.hidden = true;
  panel.tabIndex = -1;
  const layout = () => {
    if (!opened) return;
    position(panel, trigger);
    const r = trigger.getBoundingClientRect();
    panel.style.left =
      Math.max(
        8,
        Math.min(
          innerWidth - panel.offsetWidth - 12,
          r.right - panel.offsetWidth,
        ),
      ) + "px";
  };
  const close = ({ focus = true } = {}) => {
    if (!opened) return;
    opened = false;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (focus) trigger.focus();
    onClose();
  };
  const open = () => {
    if (disposed) throw new Error("Panel disposed");
    if (opened) return;
    opened = true;
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    layout();
    panel.focus({ preventScroll: true });
    onOpen();
  };
  const toggle = () => (opened ? close() : open());
  const outside = (e) => {
    if (opened && !panel.contains(e.target) && !trigger.contains(e.target))
      close({ focus: false });
  };
  const key = (e) => {
    if (opened && e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };
  trigger.addEventListener("click", toggle);
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", key);
  window.addEventListener("resize", layout);
  return {
    open,
    close,
    get isOpen() {
      return opened;
    },
    dispose() {
      if (disposed) return;
      close({ focus: false });
      disposed = true;
      trigger.removeEventListener("click", toggle);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", layout);
      resetPanel();
      resetTrigger();
    },
  };
}

/** Magnification is an explicit Dock preference, disabled by default. */
export function bindDock(
  dock,
  {
    magnification = false,
    scale = 1.45,
    radius = 110,
    onActivate = () => {},
  } = {},
) {
  if (
    !Number.isFinite(scale) ||
    scale < 1 ||
    !Number.isFinite(radius) ||
    radius <= 0
  )
    throw new RangeError("Invalid Dock geometry");
  const icons = [...dock.querySelectorAll("button,a")],
    old = icons.map((el) => el.style.getPropertyValue("--aos-dock-scale"));
  let enabledMagnification = !!magnification,
    frame = 0,
    x = 0;
  const reset = () =>
    icons.forEach((el) => el.style.removeProperty("--aos-dock-scale"));
  const render = () => {
    frame = 0;
    if (
      !enabledMagnification ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reset();
      return;
    }
    for (const el of icons) {
      const r = el.getBoundingClientRect(),
        distance = Math.abs(x - r.left - r.width / 2);
      el.style.setProperty(
        "--aos-dock-scale",
        String(1 + (scale - 1) * Math.max(0, 1 - distance / radius) ** 2),
      );
    }
  };
  const move = (e) => {
    if (e.pointerType === "touch" || !enabledMagnification) return;
    x = e.clientX;
    if (!frame) frame = requestAnimationFrame(render);
  };
  const leave = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    reset();
  };
  const click = (e) => {
    const item = e.target.closest("button,a");
    if (icons.includes(item))
      onActivate({ id: item.dataset.app || "", item, event: e });
  };
  dock.addEventListener("pointermove", move);
  dock.addEventListener("pointerleave", leave);
  dock.addEventListener("click", click);
  return {
    configure({ magnification: value }) {
      enabledMagnification = !!value;
      if (!value) leave();
    },
    dispose() {
      leave();
      dock.removeEventListener("pointermove", move);
      dock.removeEventListener("pointerleave", leave);
      dock.removeEventListener("click", click);
      icons.forEach((el, i) =>
        old[i]
          ? el.style.setProperty("--aos-dock-scale", old[i])
          : el.style.removeProperty("--aos-dock-scale"),
      );
    },
  };
}

/** Chrome actions are routed to the host app, never to the operating system. */
export function bindWindowChrome(
  element,
  {
    onClose = () => {},
    onMinimize = () => {},
    onZoom = () => {},
    onMove = () => {},
  } = {},
) {
  let drag = null;
  const bar = element.querySelector("[data-aos-titlebar]");
  const click = (e) => {
    const control = e.target.closest("[data-aos-window-action]");
    if (!element.contains(control)) return;
    ({ close: onClose, minimize: onMinimize, zoom: onZoom })[
      control?.dataset.aosWindowAction
    ]?.(e);
  };
  const down = (e) => {
    if (
      e.button !== 0 ||
      e.target.closest("button,a,input,select,textarea,[contenteditable=true]")
    )
      return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    bar.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    onMove({ dx: e.clientX - drag.x, dy: e.clientY - drag.y, event: e });
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const end = () => {
    drag = null;
  };
  const double = (e) => {
    if (!e.target.closest("button,a,input")) onZoom(e);
  };
  element.addEventListener("click", click);
  bar?.addEventListener("pointerdown", down);
  bar?.addEventListener("pointermove", move);
  bar?.addEventListener("pointerup", end);
  bar?.addEventListener("pointercancel", end);
  bar?.addEventListener("lostpointercapture", end);
  bar?.addEventListener("dblclick", double);
  return {
    dispose() {
      element.removeEventListener("click", click);
      bar?.removeEventListener("pointerdown", down);
      bar?.removeEventListener("pointermove", move);
      bar?.removeEventListener("pointerup", end);
      bar?.removeEventListener("pointercancel", end);
      bar?.removeEventListener("lostpointercapture", end);
      bar?.removeEventListener("dblclick", double);
      if (drag && bar?.hasPointerCapture(drag.id))
        bar.releasePointerCapture(drag.id);
      drag = null;
    },
  };
}
