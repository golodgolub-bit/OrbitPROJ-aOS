import { createGlassScene } from "../src/scene.js";
const canvas = document.querySelector("#glass"),
  source = document.createElement("canvas");
source.width = 960;
source.height = 360;
const ctx = source.getContext("2d"),
  g = ctx.createLinearGradient(0, 0, 960, 360);
g.addColorStop(0, "#d4dee8");
g.addColorStop(0.5, "#96acbf");
g.addColorStop(1, "#d9c7b4");
ctx.fillStyle = g;
ctx.fillRect(0, 0, 960, 360);
ctx.strokeStyle = "#475e7780";
ctx.lineWidth = 1;
for (let x = 0; x < 960; x += 24) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, 360);
  ctx.stroke();
}
for (let y = 0; y < 360; y += 24) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(960, y);
  ctx.stroke();
}
ctx.fillStyle = "#243d59";
ctx.font = "600 100px system-ui";
ctx.fillText("OrbitPROJ.", 52, 218);
const scene = createGlassScene(canvas, source, {
  material: "regular",
  renderBackground: true,
  pixelRatio: 1,
});
let merged = false,
  expanded = false;
if (!scene) document.querySelector("#fallback").hidden = false;
else {
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    scene.resize(r.width, r.height, Math.min(devicePixelRatio, 1.5));
    scene.setShapes([
      {
        id: "a",
        x: r.width * 0.4,
        y: r.height * 0.5,
        width: 120,
        height: 90,
        radius: 45,
        group: "shared",
      },
      {
        id: "b",
        x: r.width * 0.65,
        y: r.height * 0.5,
        width: 90,
        height: 90,
        radius: 45,
        group: "shared",
      },
    ]);
  };
  resize();
  document
    .querySelector("#variant")
    .addEventListener("change", (e) =>
      scene.configure({ material: e.target.value }),
    );
  document.querySelector("#morph").addEventListener("click", () => {
    expanded = !expanded;
    scene.morph(
      "a",
      expanded
        ? { width: 260, height: 220, radius: 32 }
        : { width: 120, height: 90, radius: 45 },
    );
  });
  document.querySelector("#merge").addEventListener("click", () => {
    merged = !merged;
    scene.transition("b", { x: canvas.clientWidth * (merged ? 0.5 : 0.65) });
  });
  document.querySelector("#materialize").addEventListener("click", async () => {
    await scene.dematerialize("a");
    await scene.materialize("a");
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      scene.dispose();
    },
    { once: true },
  );
}
window.OrbitOptics = { scene };
