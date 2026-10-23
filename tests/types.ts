import {
  enhance,
  configure,
  animateSpring,
  ribbonRows,
  minimizeTo,
  ribbonTo,
  toast,
} from "../src/controls.js";
import {
  createGlassScene,
  createTextField,
  type GlassScene,
} from "../src/scene.js";
function material(canvas: HTMLCanvasElement, source: HTMLCanvasElement) {
  const scene: GlassScene | null = createGlassScene(canvas, source);
  scene?.setShapes([{ id: "a", x: 50, y: 40, width: 80, height: 40 }]);
  scene?.setMask("a", createTextField("aOS"));
  return scene?.morph("a", { width: 160, height: 100, radius: 30 });
}
void material;
configure({ quality: "lite", transparency: "off" });
const cleanup: () => void = enhance(document);
const motion = animateSpring((value) => console.log(value), { damping: 24 });
const result: Promise<boolean> = motion.finished;
const rows = ribbonRows(
  { left: 0, top: 0, width: 100, height: 100 },
  { left: 0, top: 0, width: 10, height: 10 },
  0.5,
);
async function integration(
  source: HTMLElement,
  target: HTMLElement,
  canvas: HTMLCanvasElement,
) {
  const restore = await minimizeTo(source, target);
  await restore();
  await ribbonTo(
    canvas,
    source.getBoundingClientRect(),
    target.getBoundingClientRect(),
  );
}
toast("Ready");
cleanup();
void result;
void rows;
void integration;

import {
  createAppearance,
  bindMenuBar,
  bindWindowChrome,
  bindDock,
  createWindowTransitions,
  genieMesh,
} from "../src/index.js";
function appearanceIntegration(
  root: HTMLElement,
  bar: HTMLElement,
  panel: HTMLElement,
  target: HTMLElement,
  canvas: HTMLCanvasElement,
) {
  const appearance = createAppearance({ root });
  const surface = appearance.surface(panel, {
    family: "standard",
    variant: "thin",
  });
  surface.update({ backdrop: [0.2, 0.4, 0.8] });
  const menus = bindMenuBar(bar, {
    onCommand: ({ id, item }) => {
      item.dataset.command = id;
    },
  });
  const chrome = bindWindowChrome(panel, {
    onMove: ({ dx }) => console.log(dx),
  });
  const dock = bindDock(root);
  const transition = createWindowTransitions({
    element: panel,
    target,
    capture: async ({ signal }) => {
      void signal;
      return canvas;
    },
  });
  transition.configure({ effect: "scale", duration: 400, reducedMotion: true });
  const mesh = genieMesh(
    { left: 0, top: 0, width: 300, height: 200 },
    { left: 300, top: 500, width: 40, height: 40 },
    0.5,
    { edge: "left" },
  );
  transition.dispose();
  menus.dispose();
  chrome.dispose();
  dock.dispose();
  appearance.dispose();
  return mesh;
}
void appearanceIntegration;

import {
  createNavigationStack,
  bindBackGesture,
  bindNavigationBar,
  bindTabBar,
  createSheet,
} from "../src/ios.js";
import { createGlassContainer } from "../src/glass-container.js";
function iosIntegration(
  root: HTMLElement,
  bar: HTMLElement,
  dialog: HTMLDialogElement,
  canvas: HTMLCanvasElement,
) {
  const n = createNavigationStack(root, { reducedMotion: true });
  const gesture = bindBackGesture(root, n);
  const b = bindNavigationBar(bar, root);
  const tabs = bindTabBar(bar, { onSelect: ({ id }) => console.log(id) });
  const sheet = createSheet(dialog, { detents: [0.5, 1] });
  sheet.snap(1);
  const glass = createGlassContainer(canvas, canvas);
  const registration = glass?.register("navigation", bar);
  registration?.move(root, { transition: "matchedGeometry" });
  glass?.scene.addShape({ id: "b", x: 30, y: 30, width: 40, height: 40 });
  glass?.scene.removeShape("b");
  glass?.dispose();
  sheet.dispose();
  tabs.dispose();
  b.dispose();
  gesture.dispose();
  n.dispose();
}
void iosIntegration;
