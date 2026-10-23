/** Exact squared Euclidean distance transform, O(width * height). */
function edtLine(input, output, count, sites, intersections) {
  let k = 0;
  sites[0] = 0;
  intersections[0] = -1e30;
  intersections[1] = 1e30;
  for (let q = 1; q < count; q++) {
    let s;
    do {
      const p = sites[k];
      s = (input[q] + q * q - (input[p] + p * p)) / (2 * q - 2 * p);
      if (s <= intersections[k]) k--;
      else break;
    } while (k >= 0);
    if (k < 0) {
      k = 0;
      sites[0] = q;
      intersections[0] = -1e30;
      intersections[1] = 1e30;
    } else {
      k++;
      sites[k] = q;
      intersections[k] = s;
      intersections[k + 1] = 1e30;
    }
  }
  k = 0;
  for (let q = 0; q < count; q++) {
    while (intersections[k + 1] < q) k++;
    const d = q - sites[k];
    output[q] = d * d + input[sites[k]];
  }
}
function transform(mask, width, height, inside) {
  const data = new Float64Array(width * height),
    max = Math.max(width, height),
    line = new Float64Array(max),
    out = new Float64Array(max),
    sites = new Int32Array(max),
    cuts = new Float64Array(max + 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = mask[y * width + x] / 255,
        d = 0.5 - a;
      line[x] = inside
        ? a === 1
          ? 0
          : a === 0
            ? 1e12
            : Math.max(0, d) ** 2
        : a === 0
          ? 0
          : a === 1
            ? 1e12
            : Math.min(0, d) ** 2;
    }
    edtLine(line, out, width, sites, cuts);
    for (let x = 0; x < width; x++) data[y * width + x] = out[x];
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) line[y] = data[y * width + x];
    edtLine(line, out, height, sites, cuts);
    for (let y = 0; y < height; y++) data[y * width + x] = out[y];
  }
  return data;
}
/** Alpha mask in, linearly filterable R8 signed distance texture out. */
export function createDistanceField(alpha, width, height, { range = 32 } = {}) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4194304 ||
    alpha.length !== width * height ||
    !Number.isFinite(range) ||
    range <= 0
  )
    throw new RangeError("Invalid mask dimensions or range");
  const toInside = transform(alpha, width, height, true),
    toOutside = transform(alpha, width, height, false),
    data = new Uint8Array(alpha.length);
  for (let i = 0; i < data.length; i++) {
    const d = Math.sqrt(toInside[i]) - Math.sqrt(toOutside[i]);
    data[i] = Math.round(Math.max(0, Math.min(1, 0.5 + d / (2 * range))) * 255);
  }
  return { data, width, height, range };
}
/** Rasterize your own text with a local or licensed font. No font files bundled. */
export function createTextField(
  text,
  {
    width = 720,
    height = 320,
    font = '200 290px "Arial Narrow", Arial, sans-serif',
    padding = 12,
    range = 32,
  } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  const m = ctx.measureText(text),
    scaleX = (width - 2 * padding) / Math.max(1, m.width),
    scaleY =
      (height - 2 * padding) /
      Math.max(
        1,
        (m.actualBoundingBoxAscent || height * 0.6) +
          (m.actualBoundingBoxDescent || height * 0.2),
      );
  ctx.translate(width / 2, height / 2);
  ctx.scale(scaleX, scaleY * 0.9);
  ctx.fillText(text, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data,
    alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
  return createDistanceField(alpha, width, height, { range });
}
