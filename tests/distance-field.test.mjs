import { test } from "node:test";
import assert from "node:assert/strict";
import { createDistanceField } from "../src/distance-field.js";
test("distance field has correct sign and Euclidean distance", () => {
  const w = 9,
    h = 9,
    mask = new Uint8Array(w * h);
  mask[4 * w + 4] = 255;
  const f = createDistanceField(mask, w, h, { range: 8 });
  assert.ok(f.data[40] < 128);
  assert.ok(f.data[0] > 128);
  const decoded = (f.data[1 * w + 0] / 255 - 0.5) * 16;
  assert.ok(Math.abs(decoded - 5) < 0.08);
});
test("mask holes remain outside and uniform masks are finite", () => {
  const mask = new Uint8Array(25).fill(255);
  mask[12] = 0;
  const f = createDistanceField(mask, 5, 5);
  assert.ok(f.data[12] > 128);
  assert.ok(f.data[0] < 128);
  assert.ok(
    createDistanceField(new Uint8Array(16), 4, 4).data.every((n) => n === 255),
  );
  assert.ok(
    createDistanceField(new Uint8Array(16).fill(255), 4, 4).data.every(
      (n) => n === 0,
    ),
  );
});
test("invalid fields rejected", () => {
  assert.throws(() => createDistanceField(new Uint8Array(4), 3, 3));
  assert.throws(() =>
    createDistanceField(new Uint8Array(4), 2, 2, { range: 0 }),
  );
});
