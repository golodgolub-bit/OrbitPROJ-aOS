import { createAppearance } from "../src/index.js";
import {
  createNavigationStack,
  bindBackGesture,
  bindNavigationBar,
  bindTabBar,
  createSheet,
} from "../src/ios.js";
const $ = (s) => document.querySelector(s),
  appearance = createAppearance({ platform: "ios", scheme: "light" });
const navigation = createNavigationStack($("#navigation"));
const gesture = bindBackGesture($("#navigation"), navigation);
const title = bindNavigationBar(
  $("#library-bar"),
  $('[data-aos-page="library"]'),
);
appearance.surface($("#tab-bar"), {
  family: "liquid",
  variant: "regular",
  size: "large",
  backdrop: [0.95, 0.95, 0.97],
});
const tabs = bindTabBar($("#tab-bar"), {
  onSelect: ({ id }) => {
    for (const name of ["library", "guide"])
      $("#" + name + "-pane").hidden = name !== id;
  },
});
const sheet = createSheet($("#sheet"), {
  onChange: ({ index }) =>
    ($("#detent-status").textContent = index ? "Large" : "Medium"),
});
const descriptions = {
  navigation: [
    "Navigation",
    "Push, pop, interactive back gestures, scroll preservation and focus restoration.",
    "const navigation = createNavigationStack(root);\nawait navigation.push('detail');\nawait navigation.pop();",
  ],
  materials: [
    "Materials",
    "Standard content materials are separate from Liquid Glass Regular and Clear.",
    "appearance.surface(sidebar, {\n  family:'standard', variant:'thin'\n});",
  ],
  motion: [
    "Window motion",
    "Genie and Scale operate inside your application. The operating system controls its own taskbar and Launcher transitions.",
    "const motion = createWindowTransitions({\n element, target, capture\n});\nawait motion.minimize();",
  ],
  reference: [
    "Reference",
    "Public Apple guidance supplies behavior references. The renderer, metrics and trajectories are independent approximations.",
    "No Apple source, fonts, symbols,\nwallpapers or sounds are bundled.",
  ],
};
for (const button of document.querySelectorAll("[data-route]"))
  button.addEventListener("click", () => {
    const [heading, copy, code] = descriptions[button.dataset.route];
    $("#detail-title").textContent = heading;
    $("#detail-heading").textContent = heading;
    $("#detail-copy").textContent = copy;
    $("#detail-code").textContent = code;
    navigation.push("detail");
  });
$("#back").addEventListener("click", () => navigation.pop());
for (const id of ["#open-sheet", "#settings-sheet"])
  $(id).addEventListener("click", () => sheet.open());
$("#close-sheet").addEventListener("click", () => sheet.close());
window.addEventListener(
  "pagehide",
  () => {
    sheet.dispose();
    tabs.dispose();
    title.dispose();
    gesture.dispose();
    navigation.dispose();
    appearance.dispose();
  },
  { once: true },
);
window.OrbitIOS = { navigation, gesture, title, tabs, sheet, appearance };
