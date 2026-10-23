import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const output = path.resolve(
  process.env.AOS_CAPTURE_DIR || ".capture/window-motion",
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 760 },
    deviceScaleFactor: 1,
  });
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.goto("http://127.0.0.1:4173/demo/macos.html");
  await page.waitForFunction(() => !!window.OrbitDemo);
  await page.clock.pauseAt(new Date("2026-10-22T13:00:00Z"));
  await page.evaluate(() =>
    window.OrbitDemo.transitions.configure({ duration: 840 }),
  );
  let index = 0;
  const capture = () =>
    page.screenshot({
      path: path.join(output, `${String(index++).padStart(3, "0")}.png`),
    });
  for (let i = 0; i < 4; i++) await capture();
  for (const operation of ["minimize", "restore"]) {
    await page.evaluate((operation) => {
      window.captureFinished = false;
      window.OrbitDemo.transitions[operation]().then(
        () => (window.captureFinished = true),
      );
    }, operation);
    // Image decoding runs independently of the paused animation clock.
    for (let i = 0; i < 100; i++) {
      if (await page.locator("[data-aos-window-animation]").count()) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    if (!(await page.locator("[data-aos-window-animation]").count()))
      throw new Error("Window capture did not create an overlay");
    for (let i = 0; i < 15; i++) {
      await page.clock.runFor(60);
      await capture();
    }
    for (let i = 0; i < 5; i++) await capture();
  }
  console.log(`${index} frames: ${output}`);
} finally {
  await browser.close();
}
