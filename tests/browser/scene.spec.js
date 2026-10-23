import { test, expect } from "@playwright/test";
test("shared material merges shapes, caches blur and goes idle", async ({
  page,
}) => {
  await page.goto("/demo/optics.html");
  const r = await page.evaluate(async () => {
    const { createGlassScene } = await import("/src/scene.js");
    const c = document.createElement("canvas");
    c.width = 144;
    c.height = 80;
    const source = document.createElement("canvas");
    source.width = 144;
    source.height = 80;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "#aabbcc";
    ctx.fillRect(0, 0, 144, 80);
    const s = createGlassScene(c, source, {
      renderBackground: false,
      merge: 0,
      pixelRatio: 1,
    });
    s.setShapes([
      {
        id: "a",
        x: 40,
        y: 40,
        width: 48,
        height: 48,
        radius: 24,
        group: "same",
      },
      {
        id: "b",
        x: 104,
        y: 40,
        width: 48,
        height: 48,
        radius: 24,
        group: "same",
      },
    ]);
    s.render();
    const gl = c.getContext("webgl2"),
      pixel = new Uint8Array(4);
    gl.readPixels(72, 40, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const separate = pixel[3];
    s.configure({ merge: 40 });
    s.render();
    gl.readPixels(72, 40, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const merged = pixel[3];
    const builds = s.stats().blurBuilds;
    s.setLight(0.3, 0.7);
    s.setLight(0.4, 0.6);
    await new Promise((r) => setTimeout(r, 50));
    const cached = s.stats().blurBuilds === builds;
    const a = s.transition("a", { x: 44 }, { stiffness: 300, damping: 26 });
    await new Promise((r) => setTimeout(r, 50));
    const b = s.transition("a", { x: 40 }, { stiffness: 300, damping: 26 });
    const canceled = await a,
      finished = await b;
    await new Promise((r) => setTimeout(r, 60));
    const before = s.stats();
    await new Promise((r) => setTimeout(r, 80));
    const idle =
      s.stats().draws === before.draws &&
      !before.pendingFrame &&
      !before.activeAnimations;
    s.dispose();
    let disposed = false;
    try {
      s.render();
    } catch {
      disposed = true;
    }
    return { separate, merged, cached, canceled, finished, idle, disposed };
  });
  expect(r).toMatchObject({
    separate: 0,
    cached: true,
    canceled: false,
    finished: true,
    idle: true,
    disposed: true,
  });
  expect(r.merged).toBeGreaterThan(200);
});
test("cached blur preserves source orientation", async ({ page }) => {
  await page.goto("/demo/macos.html");
  const pixels = await page.evaluate(async () => {
    const { createGlassScene } = await import("/src/scene.js");
    const source = document.createElement("canvas");
    source.width = 128;
    source.height = 128;
    const c = source.getContext("2d");
    c.fillStyle = "red";
    c.fillRect(0, 0, 128, 64);
    c.fillStyle = "blue";
    c.fillRect(0, 64, 128, 64);
    const out = document.createElement("canvas");
    out.width = 128;
    out.height = 128;
    const scene = createGlassScene(out, source, {
      frost: 1,
      thickness: 0,
      tint: [0, 0, 0, 0],
      renderBackground: true,
      pixelRatio: 1,
    });
    scene.setShapes([
      { id: "all", x: 64, y: 64, width: 128, height: 128, radius: 0 },
    ]);
    scene.render();
    const gl = out.getContext("webgl2"),
      top = new Uint8Array(4),
      bottom = new Uint8Array(4);
    gl.readPixels(64, 112, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, top);
    gl.readPixels(64, 16, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
    scene.dispose();
    return { top: [...top], bottom: [...bottom] };
  });
  expect(pixels.top[0]).toBeGreaterThan(pixels.top[2] + 150);
  expect(pixels.bottom[2]).toBeGreaterThan(pixels.bottom[0] + 150);
});

test("optical variants, morphology and materialization settle without idle frames", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo/optics.html");
  await page.waitForFunction(() => !!window.OrbitOptics?.scene);
  await page.locator("#variant").selectOption("clear");
  await page.locator("#morph").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.OrbitOptics.scene.getShape("a").width),
    )
    .toBe(260);
  await page.locator("#materialize").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.OrbitOptics.scene.stats().activeAnimations),
    )
    .toBe(0);
  await page.waitForTimeout(80);
  const before = await page.evaluate(
    () => window.OrbitOptics.scene.stats().draws,
  );
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => window.OrbitOptics.scene.stats().draws),
  ).toBe(before);
  expect(errors).toEqual([]);
});
