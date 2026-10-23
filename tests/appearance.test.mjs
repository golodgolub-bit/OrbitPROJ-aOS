import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveMaterial,
  concentricRadius,
  relativeLuminance,
  contrastRatio,
  appearanceProfile,
} from "../src/appearance.js";
import { genieMesh } from "../src/window-motion.js";
test("material families are distinct and unsupported liquid variants are rejected", () => {
  assert.deepEqual(appearanceProfile.liquidVariants, ["regular", "clear"]);
  assert.throws(() => resolveMaterial({ variant: "clock" }));
  assert.throws(() => resolveMaterial({ variant: "thick" }));
  assert.equal(
    resolveMaterial({ family: "standard", variant: "thick" }).variant,
    "thick",
  );
});
test("compact regular glass adapts while a large surface keeps the app scheme", () => {
  assert.equal(
    resolveMaterial({ backdrop: [0, 0, 0], size: "compact" }).scheme,
    "dark",
  );
  assert.equal(
    resolveMaterial({ backdrop: [0, 0, 0], size: "large" }).scheme,
    "light",
  );
  assert.equal(resolveMaterial({ reduceTransparency: true }).blur, 0);
  assert.equal(
    resolveMaterial({ variant: "clear", backdrop: [1, 1, 1] }).dimming,
    0.35,
  );
});
test("sRGB luminance, contrast and nested radii", () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0);
  assert.equal(relativeLuminance([1, 1, 1]), 1);
  assert.equal(contrastRatio([0, 0, 0], [1, 1, 1]), 21);
  assert.equal(concentricRadius(20, 6), 14);
  assert.equal(concentricRadius(6, 20), 0);
  assert.throws(() => relativeLuminance([2, 0, 0]));
});
const source = { left: 30, top: 50, width: 800, height: 500 },
  target = { left: 600, top: 740, width: 44, height: 44 };
for (const edge of ["bottom", "left", "right"])
  test(`Genie ${edge}: endpoints, continuity and finite intermediate mesh`, () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
      const mesh = genieMesh(source, target, p, { edge });
      for (const quad of mesh)
        for (const v of quad.destination)
          assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
      if (p === 0 || p === 1) {
        const rect = p === 0 ? source : target;
        for (const quad of mesh)
          for (let i = 0; i < 4; i++) {
            assert.ok(
              Math.abs(
                quad.destination[i].x -
                  (rect.left + (quad.source[i].x / source.width) * rect.width),
              ) < 1e-8,
            );
            assert.ok(
              Math.abs(
                quad.destination[i].y -
                  (rect.top + (quad.source[i].y / source.height) * rect.height),
              ) < 1e-8,
            );
          }
      }
      for (let i = 1; i < mesh.length; i++) {
        assert.deepEqual(mesh[i - 1].destination[3], mesh[i].destination[0]);
        assert.deepEqual(mesh[i - 1].destination[2], mesh[i].destination[1]);
      }
    }
    assert.throws(() => genieMesh(source, target, NaN));
  });
