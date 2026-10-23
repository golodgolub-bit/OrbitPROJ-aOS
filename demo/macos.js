import { snapshotElement } from "./snapshot.js";
import {
  createAppearance,
  bindMenuBar,
  bindDock,
  bindWindowChrome,
  bindSystemPanel,
  createWindowTransitions,
} from "../src/index.js";
const $ = (s) => document.querySelector(s),
  appWindow = $("#library-window"),
  dockTarget = $("#dock-library"),
  cleanup = [];
const appearance = createAppearance({ scheme: "light" });
cleanup.push(() => appearance.dispose());
for (const el of document.querySelectorAll(
  ".aos-menu,.aos-control-tile,.aos-notification,.aos-dock",
))
  appearance.surface(el, {
    family: "liquid",
    variant: "regular",
    size: "large",
    backdrop: [0.7, 0.76, 0.82],
  });
appearance.surface($("#sidebar"), {
  family: "standard",
  variant: "thin",
  size: "large",
});
appearance.scrollEdge($("#document-scroll"), $("#scroll-edge"));
let movement = { x: 0, y: 0 },
  sidebarVisible = true;

const transitions = createWindowTransitions({
  element: appWindow,
  target: dockTarget,
  capture: ({ element, signal }) => snapshotElement(element, signal),
});
cleanup.push(() => transitions.dispose());
const show = async () => {
  if (transitions.state === "minimized") await transitions.restore();
  else if (appWindow.hidden) {
    appWindow.hidden = false;
    appWindow.inert = false;
  }
  appWindow.dataset.active = "true";
};
const minimize = () => transitions.minimize();
const close = () => {
  appWindow.hidden = true;
  appWindow.inert = true;
  dockTarget.dataset.running = "false";
  dockTarget.focus();
};
const zoom = () => {
  appWindow.classList.toggle("zoomed");
  movement = { x: 0, y: 0 };
  appWindow.style.transform = "";
};
const dock = bindDock($("#dock"), {
  onActivate: async ({ id }) => {
    if (id === "library") {
      await show();
      dockTarget.dataset.running = "true";
    }
  },
});
cleanup.push(() => dock.dispose());
const chrome = bindWindowChrome(appWindow, {
  onClose: close,
  onMinimize: minimize,
  onZoom: zoom,
  onMove: ({ dx, dy }) => {
    if (appWindow.classList.contains("zoomed")) return;
    const r = appWindow.getBoundingClientRect();
    const boundedX = Math.min(
      innerWidth - 80,
      Math.max(80 - r.width, r.left + dx),
    );
    const boundedY = Math.min(innerHeight - 100, Math.max(28, r.top + dy));
    movement.x += boundedX - r.left;
    movement.y += boundedY - r.top;
    appWindow.style.transform = `translate(${movement.x}px,${movement.y}px)`;
  },
});
cleanup.push(() => chrome.dispose());
const cc = bindSystemPanel($("#control-center"), {
    trigger: $("#control-trigger"),
    onOpen: () => {
      menus.close({ focus: false });
      notifications.close({ focus: false });
    },
  }),
  notifications = bindSystemPanel($("#notifications"), {
    trigger: $("#date-trigger"),
    onOpen: () => {
      menus.close({ focus: false });
      cc.close({ focus: false });
    },
  });
cleanup.push(
  () => cc.dispose(),
  () => notifications.dispose(),
);
const actions = {
  open: show,
  minimize,
  zoom,
  close,
  hide: close,
  settings: () => $("#settings").showModal(),
  about: () => $("#about").showModal(),
  search: () => $("#search").focus(),
  sidebar: ({ item }) => {
    sidebarVisible = !sidebarVisible;
    $("#sidebar").hidden = !sidebarVisible;
    $(".window-layout").style.gridTemplateColumns = sidebarVisible ? "" : "1fr";
    item.setAttribute("aria-checked", String(sidebarVisible));
  },
  "guide-en": () => (location.href = "../docs/guide.en.md"),
  "guide-ru": () => (location.href = "../docs/guide.ru.md"),
  reference: () => (location.href = "../docs/reference.en.md"),
};
for (const scheme of ["light", "dark", "auto"])
  actions[scheme] = () => {
    appearance.configure({ scheme });
    for (const el of document.querySelectorAll(
      "#appearance-menu [role=menuitemradio]",
    ))
      el.setAttribute("aria-checked", String(el.dataset.command === scheme));
  };
const menus = bindMenuBar($("#menubar"), {
  onCommand: (context) => actions[context.id]?.(context),
  onOpen: () => {
    cc.close({ focus: false });
    notifications.close({ focus: false });
  },
});
cleanup.push(() => menus.dispose());
$("#motion-effect").addEventListener("change", (e) =>
  transitions.configure({ effect: e.target.value }),
);
$("#magnification").addEventListener("change", (e) =>
  dock.configure({ magnification: e.target.checked }),
);
$("#transparency").addEventListener("change", (e) =>
  appearance.configure({ reduceTransparency: e.target.checked }),
);
$("#reduce-motion").addEventListener("change", (e) => {
  appearance.configure({ reduceMotion: e.target.checked });
  transitions.configure({ reducedMotion: e.target.checked });
});
$("#search").addEventListener("input", (e) => {
  const value = e.target.value.toLocaleLowerCase();
  let count = 0;
  for (const row of document.querySelectorAll("#module-list tr")) {
    row.hidden = !row.textContent.toLocaleLowerCase().includes(value);
    if (!row.hidden) count++;
  }
  $("#status").textContent = `${count} modules`;
});
for (const button of document.querySelectorAll("[data-location]"))
  button.addEventListener("click", () => {
    for (const el of document.querySelectorAll("[data-location]")) {
      el.classList.toggle("selected", el === button);
      el.removeAttribute("aria-current");
    }
    button.setAttribute("aria-current", "page");
    $("#location-title").textContent = button.dataset.location;
    $("#status").textContent =
      button.dataset.location === "Library"
        ? "6 modules"
        : `${button.dataset.location} · see integration guide`;
  });
$("#dismiss-notification").addEventListener("click", () => {
  $(".aos-notification").hidden = true;
  notifications.close();
});
// Ctrl is used on Windows/Android hardware keyboards. Native editing keys stay native.
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
  const target = e.target;
  if (
    target.closest("input,textarea,[contenteditable=true]") &&
    e.key.toLowerCase() !== "f"
  )
    return;
  const map = {
    m: minimize,
    o: show,
    w: close,
    f: () => $("#search").focus(),
    ",": () => $("#settings").showModal(),
  };
  if (map[e.key.toLowerCase()]) {
    e.preventDefault();
    map[e.key.toLowerCase()]();
  }
});
window.addEventListener(
  "pagehide",
  () => cleanup.reverse().forEach((fn) => fn()),
  { once: true },
);
window.OrbitDemo = { appearance, menus, transitions, dock, cc, notifications };
