import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const groups = {
  foundation: [
    "index.js",
    "appearance.js",
    "macos.js",
    "window-motion.js",
    "motion.js",
    "appearance.css",
  ],
  optics: [
    "scene.js",
    "scene-shaders.js",
    "distance-field.js",
    "control-bindings.js",
    "motion.js",
  ],
  compatibility: ["controls.js", "styles.css", "motion.js"],
  lens: ["lens.js"],
  ios: ["ios.js", "ios.css"],
  glassContainer: ["glass-container.js"],
};
for (const [name, files] of Object.entries(groups)) {
  let raw = 0,
    gzip = 0;
  for (const file of files) {
    const bytes = await readFile(new URL("../src/" + file, import.meta.url));
    raw += bytes.length;
    gzip += gzipSync(bytes).length;
  }
  console.log(
    `${name}: ${raw} raw bytes / ${gzip} gzip bytes (individual files)`,
  );
  if (name === "foundation" && gzip > 20000) {
    console.error("Foundation exceeds 20 KB source gzip budget");
    process.exitCode = 1;
  }
}
