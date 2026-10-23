import { test } from "node:test";
import assert from "node:assert/strict";
import { springState, ribbonRows } from "../src/motion.js";
for (const damping of [8, 2 * Math.sqrt(240), 50]) {
  test(`spring initial conditions and convergence, damping ${damping}`, () => {
    const initial = springState(0, 3, 8, { damping, velocity: 4 });
    assert.ok(Math.abs(initial.value - 3) < 1e-10);
    assert.ok(Math.abs(initial.velocity - 4) < 1e-10);
    const end = springState(20, 3, 8, { damping, velocity: 4 });
    assert.ok(Math.abs(end.value - 8) < 1e-6);
    assert.ok(Math.abs(end.velocity) < 1e-6);
  });
}
test("spring velocity agrees with numerical derivative", () => {
  for (const damping of [8, 2 * Math.sqrt(240), 50]) {
    const o = { damping, velocity: -2 },
      t = 0.17,
      h = 1e-6;
    const derivative =
      (springState(t + h, 0, 1, o).value - springState(t - h, 0, 1, o).value) /
      (2 * h);
    assert.ok(Math.abs(derivative - springState(t, 0, 1, o).velocity) < 1e-5);
  }
});
test("invalid spring rejected", () =>
  assert.throws(() => springState(0, 0, 1, { mass: 0 }), RangeError));
test("ribbon endpoints and finite intermediate geometry", () => {
  const a = { left: 10, top: 20, width: 500, height: 300 },
    b = { left: 600, top: 700, width: 48, height: 48 };
  const first = ribbonRows(a, b, 0),
    last = ribbonRows(a, b, 1);
  assert.equal(first[0].x, a.left);
  assert.equal(first[0].width, a.width);
  assert.equal(last[0].x, b.left);
  assert.equal(last[0].width, b.width);
  assert.equal(last[0].y, b.top);
  for (let p = 0; p <= 1; p += 0.025)
    for (const row of ribbonRows(a, b, p))
      for (const n of Object.values(row)) assert.ok(Number.isFinite(n));
  assert.throws(() => ribbonRows({ ...a, width: 0 }, b, 0.5));
});
