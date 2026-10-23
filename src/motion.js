/** Pure, deterministic geometry and spring math. Units: seconds, CSS pixels. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Exact solution of a damped harmonic oscillator with a constant target. */
export function springState(
  time,
  from,
  to,
  { stiffness = 240, damping = 26, mass = 1, velocity = 0 } = {},
) {
  if (
    ![time, from, to, stiffness, damping, mass, velocity].every(
      Number.isFinite,
    ) ||
    mass <= 0 ||
    stiffness <= 0 ||
    damping <= 0
  )
    throw new RangeError("Invalid spring parameters");
  const t = Math.max(0, time),
    w = Math.sqrt(stiffness / mass),
    a = damping / (2 * mass),
    y = from - to;
  let x, v;
  if (Math.abs(a - w) < 1e-5) {
    const b = velocity + a * y,
      e = Math.exp(-a * t);
    x = e * (y + b * t);
    v = e * (b - a * (y + b * t));
  } else if (a < w) {
    const d = Math.sqrt(w * w - a * a),
      b = (velocity + a * y) / d,
      e = Math.exp(-a * t);
    x = e * (y * Math.cos(d * t) + b * Math.sin(d * t));
    v = -a * x + e * d * (-y * Math.sin(d * t) + b * Math.cos(d * t));
  } else {
    const d = Math.sqrt(a * a - w * w),
      r1 = -a + d,
      r2 = -a - d;
    const c1 = (velocity - r2 * y) / (r1 - r2),
      c2 = y - c1;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    v = r1 * c1 * Math.exp(r1 * t) + r2 * c2 * Math.exp(r2 * t);
  }
  return { value: to + x, velocity: v };
}

/** Row geometry for an original ribbon contraction, not Apple's private curve. */
export function ribbonRows(source, target, progress, slices = 32) {
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    target.width <= 0 ||
    target.height <= 0
  )
    throw new RangeError("Rects must have positive dimensions");
  const p = clamp(progress, 0, 1),
    t = p * p * (3 - 2 * p),
    result = [];
  const count = clamp(Math.round(slices), 4, 96);
  for (let i = 0; i < count; i++) {
    const y = i / count,
      y1 = (i + 1) / count;
    const pull = clamp(t * 1.45 - (1 - y) * 0.45, 0, 1);
    const shrink = pull * pull * (3 - 2 * pull);
    const width = lerp(source.width, target.width, shrink);
    const center = lerp(
      source.left + source.width / 2,
      target.left + target.width / 2,
      shrink,
    );
    result.push({
      sy: y * source.height,
      sh: source.height / count,
      x: center - width / 2,
      y: lerp(
        source.top + y * source.height,
        target.top + y * target.height,
        t,
      ),
      width,
      height: lerp(source.height * (y1 - y), target.height * (y1 - y), t) + 0.7,
    });
  }
  return result;
}
