import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo/ios.html");
  await page.waitForFunction(() => !!window.OrbitIOS);
});
test("push and pop preserve scroll and the originating control focus", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const before = await page.evaluate(() => {
    const root = document.querySelector('[data-aos-page="library"]'),
      button = root.querySelector('[data-route="navigation"]');
    root.scrollTop = 85;
    button.focus({ preventScroll: true });
    const position = root.scrollTop;
    button.click();
    return position;
  });
  await expect(page.locator("#detail-heading")).toBeFocused();
  expect(await page.evaluate(() => window.OrbitIOS.navigation.stack)).toEqual([
    "library",
    "detail",
  ]);
  await page.locator("#back").click();
  await expect(page.locator('[data-route="navigation"]')).toBeFocused();
  expect(
    await page
      .locator('[data-aos-page="library"]')
      .evaluate((el) => el.scrollTop),
  ).toBe(before);
  expect(errors).toEqual([]);
});
test("interactive back can cancel and can commit without losing the stack", async ({
  page,
}) => {
  await page.locator('[data-route="navigation"]').click();
  await expect(page.locator("#detail-heading")).toBeFocused();
  const canceled = await page.evaluate(async () => {
    const gesture = window.OrbitIOS.navigation.beginBackGesture();
    gesture.update(0.45);
    await gesture.finish(false);
    return window.OrbitIOS.navigation.stack;
  });
  expect(canceled).toEqual(["library", "detail"]);
  const committed = await page.evaluate(async () => {
    const gesture = window.OrbitIOS.navigation.beginBackGesture();
    gesture.update(0.6);
    await gesture.finish(true);
    return window.OrbitIOS.navigation.stack;
  });
  expect(committed).toEqual(["library"]);
  await expect(page.locator('[data-route="navigation"]')).toBeFocused();
});
test("tab navigation preserves each section and accepts keyboard selection", async ({
  page,
}) => {
  await page.locator('[data-route="materials"]').click();
  await expect(page.locator("#detail-heading")).toBeFocused();
  await page.locator("#library-tab").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#guide-pane")).toBeVisible();
  await expect(page.locator("#guide-tab")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#detail-heading")).toHaveText("Materials");
  expect(await page.evaluate(() => window.OrbitIOS.navigation.stack)).toEqual([
    "library",
    "detail",
  ]);
});
test("large title collapses on content scrolling and does not run an idle ticker", async ({
  page,
}) => {
  await page
    .locator('[data-aos-page="library"]')
    .evaluate((el) => (el.scrollTop = 120));
  await expect
    .poll(() =>
      page
        .locator("#library-bar")
        .evaluate((el) => el.style.getPropertyValue("--aos-title-collapse")),
    )
    .toBe("1");
});
test("sheet detents support grabber click and keyboard, Escape restores focus", async ({
  page,
}) => {
  await page.locator("#open-sheet").click();
  await expect(page.locator("#sheet")).toBeVisible();
  const handle = page.locator("[data-aos-sheet-handle]");
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(handle).toHaveAttribute("aria-valuenow", "2");
  await expect(page.locator("#detent-status")).toHaveText("Large");
  await handle.click();
  await expect(handle).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).toBeHidden();
  await expect(page.locator("#open-sheet")).toBeFocused();
});
test("nondismissible sheets retain modality on Escape", async ({ page }) => {
  await page.evaluate(async () => {
    const { createSheet } = await import("/src/ios.js");
    window.OrbitIOS.sheet.dispose();
    window.fixedSheet = createSheet(document.querySelector("#sheet"), {
      dismissible: false,
    });
    window.fixedSheet.open();
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).toBeVisible();
  await page.evaluate(() => window.fixedSheet.close());
  await expect(page.locator("#sheet")).toBeHidden();
});
test("navigation cancellation and disposal restore the original markup", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createNavigationStack } = await import("/src/ios.js");
    const root = document.createElement("div");
    root.style.cssText = "width:300px;height:200px";
    root.innerHTML =
      '<section data-aos-page="a"><button>Start</button></section><section data-aos-page="b" hidden>Next</section>';
    document.body.append(root);
    const snapshot = () =>
      JSON.stringify(
        [...root.children].map((el) => ({
          hidden: el.hidden,
          inert: el.inert,
          tabindex: el.getAttribute("tabindex"),
          style: el.style.cssText,
        })),
      );
    const before = snapshot(),
      n = createNavigationStack(root, { duration: 1000 }),
      pending = n.push("b");
    n.cancel();
    const canceled = await pending,
      stack = n.stack;
    n.dispose();
    const restored =
      snapshot() === before &&
      !root.hasAttribute("data-aos-navigation") &&
      !root.hasAttribute("aria-busy");
    root.remove();
    return { canceled, stack, restored };
  });
  expect(result).toEqual({ canceled: false, stack: ["a"], restored: true });
});
test("reduced motion completes navigation with no live web animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-route="motion"]').click();
  await expect(page.locator("#detail-heading")).toBeFocused();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});
test("iOS layout fits narrow screens and passes selected accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    window.OrbitIOS.appearance.configure({ reduceTransparency: true }),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("shared glass identity follows DOM geometry and restores after materialization", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createGlassContainer } = await import("/src/glass-container.js");
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0;width:600px;height:300px";
    host.innerHTML =
      '<canvas style="width:600px;height:300px"></canvas><div id="glass-from" style="position:absolute;left:20px;top:20px;width:80px;height:44px"></div><div id="glass-to" style="position:absolute;left:300px;top:80px;width:200px;height:160px"></div>';
    document.body.append(host);
    const source = document.createElement("canvas");
    source.width = 600;
    source.height = 300;
    source.getContext("2d").fillRect(0, 0, 600, 300);
    const c = createGlassContainer(host.querySelector("canvas"), source);
    const id = c.register("shared", host.querySelector("#glass-from"));
    const moved = await id.move(host.querySelector("#glass-to"), {
      reducedMotion: true,
    });
    const shape = c.scene.getShape("shared");
    await c.scene.dematerialize("shared", { reducedMotion: true });
    await c.scene.materialize("shared", { reducedMotion: true });
    const scale = c.scene.getShape("shared").scale;
    const materialized = await id.move(host.querySelector("#glass-from"), {
      transition: "materialize",
      reducedMotion: true,
    });
    const finalScale = c.scene.getShape("shared").scale,
      removed = await id.remove({ animate: false });
    const count = c.scene.stats().shapes;
    c.dispose();
    host.remove();
    return {
      moved,
      width: shape.width,
      height: shape.height,
      x: shape.x,
      scale,
      materialized,
      finalScale,
      removed,
      count,
    };
  });
  expect(result).toEqual({
    moved: true,
    width: 200,
    height: 160,
    x: 400,
    scale: 1,
    materialized: true,
    finalScale: 1,
    removed: true,
    count: 0,
  });
});
test("adding/removing another shape does not cancel an existing transition", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createGlassScene } = await import("/src/scene.js");
    const canvas = document.createElement("canvas"),
      source = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    source.width = 200;
    source.height = 100;
    const scene = createGlassScene(canvas, source);
    scene.addShape({ id: "a", x: 40, y: 50, width: 40, height: 40 });
    const motion = scene.transition("a", { x: 100 }, { reducedMotion: false });
    scene.addShape({ id: "b", x: 150, y: 50, width: 30, height: 30 });
    scene.removeShape("b");
    const finished = await motion;
    const x = scene.getShape("a").x;
    scene.dispose();
    return { finished, x };
  });
  expect(result).toEqual({ finished: true, x: 100 });
});
