/** Demo-only rasterization of this app's self-contained markup. No external resources. */
export async function snapshotElement(element, signal) {
  const rect = element.getBoundingClientRect(),
    clone = element.cloneNode(true),
    source = [element, ...element.querySelectorAll("*")],
    destination = [clone, ...clone.querySelectorAll("*")];
  source.forEach((el, i) => {
    const css = getComputedStyle(el);
    destination[i].setAttribute(
      "style",
      Array.from(css, (key) => `${key}:${css.getPropertyValue(key)}`).join(";"),
    );
    destination[i].removeAttribute("id");
  });
  Object.assign(clone.style, {
    position: "relative",
    inset: "auto",
    transform: "none",
    margin: "0",
    width: rect.width + "px",
    height: rect.height + "px",
    maxHeight: "none",
    minHeight: "0",
    visibility: "visible",
  });
  // ForeignObject does not preserve scroll offsets: translate the clipped content.
  source.forEach((el, i) => {
    if (el.scrollTop || el.scrollLeft) {
      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        transform: `translate(${-el.scrollLeft}px,${-el.scrollTop}px)`,
      });
      while (destination[i].firstChild)
        wrapper.append(destination[i].firstChild);
      destination[i].append(wrapper);
    }
  });
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  if (signal?.aborted) throw new DOMException("Capture aborted", "AbortError");
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas;
}
