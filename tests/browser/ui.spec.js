import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo/macos.html");
  await page.waitForFunction(() => !!window.OrbitDemo);
});
test("menu bar opens with keyboard, skips disabled commands and restores focus", async ({
  page,
}) => {
  const trigger = page.locator('[aria-controls="file-menu"]');
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('[data-command="open"]').filter({ visible: true }).first(),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#file-menu [data-command="close"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#file-menu")).toBeHidden();
});
test("moving across menu bar switches only while a menu is open", async ({
  page,
}) => {
  const file = page.locator('[aria-controls="file-menu"]'),
    view = page.locator('[aria-controls="view-menu"]');
  await file.hover();
  await expect(page.locator("#file-menu")).toBeHidden();
  await file.click();
  await view.hover();
  await expect(page.locator("#file-menu")).toBeHidden();
  await expect(page.locator("#view-menu")).toBeVisible();
  await page.locator(".document-heading").click();
  await expect(page.locator("#view-menu")).toBeHidden();
});
test("submenus support arrows, radio state and independent appearance", async ({
  page,
}) => {
  await page.locator('[aria-controls="view-menu"]').click();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#appearance-menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-aos-scheme", "dark");
  await expect(
    page.locator('#appearance-menu [data-command="dark"]'),
  ).toHaveAttribute("aria-checked", "true");
});
test("typeahead and menu actions do not activate disabled commands", async ({
  page,
}) => {
  await page.locator('[aria-controls="app-menu"]').click();
  await page.keyboard.press("s");
  await expect(
    page.locator('#app-menu [data-command="settings"]'),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#settings")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[aria-controls="file-menu"]').click();
  await page
    .locator("#file-menu [aria-disabled=true]")
    .first()
    .dispatchEvent("click");
  await expect(page.locator("#file-menu")).toBeVisible();
});
test("nonmodal system panel closes with Escape and returns focus", async ({
  page,
}) => {
  await page.locator("#control-trigger").click();
  await expect(page.locator("#control-center")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#control-trigger")).toBeFocused();
  await page.locator("#date-trigger").click();
  await expect(page.locator("#notifications")).toBeVisible();
  await page.locator(".document-heading").click();
  await expect(page.locator("#notifications")).toBeHidden();
});
test("Genie minimize and restore use a snapshot and preserve focus", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.locator("#minimize").click();
  await expect(page.locator("[data-aos-window-animation]")).toBeVisible();
  await expect(page.locator("#library-window")).toBeHidden();
  await expect(page.locator("#dock-library")).toBeFocused();
  await page.locator("#dock-library").click();
  await expect(page.locator("#library-window")).toBeVisible();
  await expect(page.locator("#minimize")).toBeFocused();
  expect(errors).toEqual([]);
});
test("reduced motion does not create animation overlays", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#minimize").click();
  await expect(page.locator("#library-window")).toBeHidden();
  await expect(page.locator("[data-aos-window-animation]")).toHaveCount(0);
  await page.locator("#dock-library").click();
  await expect(page.locator("#minimize")).toBeFocused();
});
test("no passive pointer magnification or material lighting", async ({
  page,
}) => {
  await page.locator("#dock-library").hover();
  expect(
    await page
      .locator("#dock-library")
      .evaluate((el) => el.style.getPropertyValue("--aos-dock-scale")),
  ).toBe("");
  await page.locator(".document-heading").hover();
  await expect(page.locator("canvas")).toHaveCount(0);
});
test("scroll edge updates and appearance disposal restores owned state", async ({
  page,
}) => {
  await page.locator("#document-scroll").evaluate((el) => (el.scrollTop = 100));
  await expect
    .poll(() =>
      page
        .locator("#scroll-edge")
        .evaluate((el) => el.style.getPropertyValue("--aos-edge-opacity")),
    )
    .toBe("1");
  const result = await page.evaluate(async () => {
    const { createAppearance } = await import("/src/index.js");
    const root = document.createElement("div"),
      surface = document.createElement("div");
    surface.style.color = "red";
    root.append(surface);
    document.body.append(root);
    const app = createAppearance({ root });
    app.surface(surface);
    app.dispose();
    const r = {
      style: surface.getAttribute("style"),
      surface: surface.hasAttribute("data-aos-surface"),
      root: root.hasAttribute("data-aos-platform"),
    };
    root.remove();
    return r;
  });
  expect(result).toEqual({ style: "color: red;", surface: false, root: false });
});
test("cancellation during capture and disposal do not hide the app", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createWindowTransitions } = await import("/src/index.js");
    const el = document.createElement("div"),
      target = document.createElement("button");
    Object.assign(el.style, { width: "100px", height: "80px" });
    document.body.append(el, target);
    const c = createWindowTransitions({
      element: el,
      target,
      capture: () => new Promise(() => {}),
    });
    const pending = c.minimize();
    c.cancel();
    const canceled = await pending;
    const before = { hidden: el.hidden, inert: el.inert, state: c.state };
    const second = c.minimize();
    c.dispose();
    await second;
    const after = { hidden: el.hidden, inert: el.inert };
    el.remove();
    target.remove();
    return { canceled, before, after };
  });
  expect(result).toEqual({
    canceled: false,
    before: { hidden: false, inert: false, state: "visible" },
    after: { hidden: false, inert: false },
  });
});
test("Scale cancellation removes overlay and restores visibility", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const c = window.OrbitDemo.transitions;
    c.configure({ effect: "scale", duration: 1000 });
    const promise = c.minimize();
    while (!document.querySelector("[data-aos-window-animation]"))
      await new Promise((r) => requestAnimationFrame(r));
    c.cancel();
    const done = await promise;
    return {
      done,
      state: c.state,
      visibility: document.querySelector("#library-window").style.visibility,
      overlays: document.querySelectorAll("[data-aos-window-animation]").length,
    };
  });
  expect(result).toEqual({
    done: false,
    state: "visible",
    visibility: "",
    overlays: 0,
  });
});
test("menu and panel disposers restore application markup", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { bindMenuBar, bindSystemPanel } = await import("/src/index.js");
    const wrapper = document.createElement("div");
    wrapper.innerHTML =
      '<nav><button data-aos-menu-trigger aria-controls="test-menu">Test</button></nav><div id="test-menu" role="menu"><button role="menuitem">Action</button></div><button id="test-trigger">Panel</button><div id="test-panel">Contents</div>';
    document.body.append(wrapper);
    const before = wrapper.innerHTML;
    const a = bindMenuBar(wrapper.querySelector("nav"));
    a.open(wrapper.querySelector("button"));
    a.dispose();
    const b = bindSystemPanel(wrapper.querySelector("#test-panel"), {
      trigger: wrapper.querySelector("#test-trigger"),
    });
    b.open();
    b.dispose();
    const same = wrapper.innerHTML === before;
    wrapper.remove();
    return same;
  });
  expect(result).toBe(true);
});
test("narrow screen fits viewport and keeps menu reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('[aria-controls="view-menu"]').click();
  await expect(page.locator("#view-menu")).toBeVisible();
  const r = await page.locator("#view-menu").boundingBox();
  expect(r.x + r.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await page.locator("#minimize").click();
  await expect(page.locator("#library-window")).toBeHidden();
});
test("opaque appearance passes automated accessibility rules", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.OrbitDemo.appearance.configure({ reduceTransparency: true }),
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("Genie falls back to Canvas 2D when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl" ? null : get.call(this, type, ...args);
    };
  });
  await page.reload();
  await page.waitForFunction(() => !!window.OrbitDemo);
  await page.locator("#minimize").click();
  await expect(page.locator("#library-window")).toBeHidden();
  await expect(page.locator("#dock-library")).toBeFocused();
  await page.locator("#dock-library").click();
  await expect(page.locator("#minimize")).toBeFocused();
});
