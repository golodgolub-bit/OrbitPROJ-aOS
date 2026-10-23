import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
// Start npm run demo separately. These images are the actual application output.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:4173/demo/macos.html");
  await page.waitForFunction(() => !!window.OrbitDemo);
  await page.screenshot({ path: "assets/appearance.png" });
  await page.locator('[aria-controls="file-menu"]').click();
  await page.screenshot({ path: "assets/menus.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    window.OrbitDemo.appearance.configure({ scheme: "dark" }),
  );
  await page.screenshot({ path: "assets/appearance-dark.png" });
  await page.goto("http://127.0.0.1:4173/demo/optics.html");
  await page.waitForFunction(() => !!window.OrbitOptics?.scene);
  await page.locator("#glass").screenshot({ path: "assets/optics.png" });
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/demo/ios.html');
  await page.waitForFunction(()=>!!window.OrbitIOS);
  await page.screenshot({path:'assets/ios.png'});
} finally {
  await browser.close();
}
