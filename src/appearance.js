/** OrbitPROJ. / aOS by @qqDUCK. Semantic appearance, independent of markup. */
export const appearanceProfile = Object.freeze({
  id: "macos-tahoe-26",
  evidence: "Public Apple HIG and macOS Tahoe 26 support documentation",
  fidelity:
    "Independent implementation; numeric values are estimates, not Apple constants",
  liquidVariants: Object.freeze(["regular", "clear"]),
  standardVariants: Object.freeze(["ultraThin", "thin", "regular", "thick"]),
});

export function concentricRadius(outerRadius, inset) {
  if (
    ![outerRadius, inset].every(Number.isFinite) ||
    outerRadius < 0 ||
    inset < 0
  )
    throw new RangeError("Invalid concentric geometry");
  return Math.max(0, outerRadius - inset);
}
const linear = (n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
export function relativeLuminance(rgb) {
  if (
    !Array.isArray(rgb) ||
    rgb.length !== 3 ||
    !rgb.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
  )
    throw new RangeError("RGB must contain three values from 0 to 1");
  return (
    0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2])
  );
}
export function contrastRatio(a, b) {
  const x = relativeLuminance(a),
    y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Explicit backdrop information; large surfaces keep their selected scheme. */
export function resolveMaterial({
  family = "liquid",
  variant = "regular",
  scheme = "light",
  size = "compact",
  backdrop = [0.8, 0.8, 0.8],
  reduceTransparency = false,
  increaseContrast = false,
} = {}) {
  if (
    !["liquid", "standard"].includes(family) ||
    !(
      family === "liquid"
        ? appearanceProfile.liquidVariants
        : appearanceProfile.standardVariants
    ).includes(variant)
  )
    throw new RangeError("Unknown material family/variant");
  if (
    !["light", "dark"].includes(scheme) ||
    !["compact", "large"].includes(size)
  )
    throw new RangeError("Unknown material context");
  const luminance = relativeLuminance(backdrop),
    adaptive = family === "liquid" && variant === "regular";
  const dark =
    adaptive && size === "compact" ? luminance < 0.22 : scheme === "dark";
  const ink = dark ? "#f7f7fa" : "#161619";
  const alpha =
    family === "liquid"
      ? variant === "clear"
        ? 0.08
        : 0.66
      : { ultraThin: 0.22, thin: 0.42, regular: 0.65, thick: 0.88 }[variant];
  return Object.freeze({
    family,
    variant,
    scheme: dark ? "dark" : "light",
    adaptive,
    foreground:
      variant === "clear" && !reduceTransparency && !increaseContrast
        ? "#ffffff"
        : ink,
    fill: reduceTransparency
      ? dark
        ? "#252527"
        : "#ededee"
      : `rgb(${dark ? "28 28 31" : "247 247 249"} / ${increaseContrast ? Math.max(alpha, 0.88) : alpha})`,
    blur: reduceTransparency
      ? 0
      : family === "standard"
        ? { ultraThin: 10, thin: 16, regular: 22, thick: 28 }[variant]
        : variant === "clear"
          ? 4
          : 20,
    dimming:
      variant === "clear" &&
      family === "liquid" &&
      luminance > 0.5 &&
      !reduceTransparency &&
      !increaseContrast
        ? 0.35
        : 0,
    border: increaseContrast
      ? dark
        ? "#9b9ba2"
        : "#54545a"
      : dark
        ? "rgb(255 255 255 / .20)"
        : "rgb(255 255 255 / .60)",
    shadowOpacity: adaptive ? 0.08 + (1 - luminance) * 0.12 : 0.08,
  });
}

export function createAppearance({
  root = document.documentElement,
  platform = "macos",
  scheme = "auto",
  reduceMotion = "auto",
  reduceTransparency = "auto",
  increaseContrast = "auto",
} = {}) {
  const validate = (s) => {
    if (
      !["macos", "ios"].includes(s.platform) ||
      !["auto", "light", "dark"].includes(s.scheme) ||
      !["auto", true, false].includes(s.reduceMotion) ||
      !["auto", true, false].includes(s.reduceTransparency) ||
      !["auto", true, false].includes(s.increaseContrast)
    )
      throw new RangeError("Invalid appearance preferences");
  };
  validate({
    platform,
    scheme,
    reduceMotion,
    reduceTransparency,
    increaseContrast,
  });
  let disposed = false,
    settings = {
      platform,
      scheme,
      reduceMotion,
      reduceTransparency,
      increaseContrast,
    };
  const edges = new Set();
  const registrations = new Map(),
    queries = {
      dark: matchMedia("(prefers-color-scheme: dark)"),
      motion: matchMedia("(prefers-reduced-motion: reduce)"),
      transparency: matchMedia("(prefers-reduced-transparency: reduce)"),
      contrast: matchMedia("(prefers-contrast: more)"),
    };
  const previousAttributes = new Map(
    [
      "data-aos-platform",
      "data-aos-scheme",
      "data-aos-reduce-motion",
      "data-aos-reduce-transparency",
      "data-aos-increase-contrast",
    ].map((k) => [k, root.getAttribute(k)]),
  );
  const preference = (value, query) =>
    value === "auto" ? query.matches : !!value;
  const state = () => ({
    platform: settings.platform,
    scheme:
      settings.scheme === "auto"
        ? queries.dark.matches
          ? "dark"
          : "light"
        : settings.scheme,
    reduceMotion: preference(settings.reduceMotion, queries.motion),
    reduceTransparency: preference(
      settings.reduceTransparency,
      queries.transparency,
    ),
    increaseContrast: preference(settings.increaseContrast, queries.contrast),
  });
  const render = (element, options) => {
    const current = state(),
      resolved = resolveMaterial({ ...options, ...current });
    element.dataset.aosSurface = options.family || "liquid";
    element.dataset.aosVariant = options.variant || "regular";
    element.dataset.aosSurfaceScheme = resolved.scheme;
    for (const [name, value] of Object.entries({
      "--aos-surface-fill": resolved.fill,
      "--aos-surface-ink": resolved.foreground,
      "--aos-surface-blur": resolved.blur + "px",
      "--aos-surface-border": resolved.border,
      "--aos-shadow-opacity": resolved.shadowOpacity,
      "--aos-dimming": resolved.dimming,
    }))
      element.style.setProperty(name, String(value));
    return resolved;
  };
  const refresh = () => {
    if (disposed) return;
    const s = state();
    root.dataset.aosPlatform = s.platform;
    root.dataset.aosScheme = s.scheme;
    root.dataset.aosReduceMotion = String(s.reduceMotion);
    root.dataset.aosReduceTransparency = String(s.reduceTransparency);
    root.dataset.aosIncreaseContrast = String(s.increaseContrast);
    for (const [el, r] of registrations) render(el, r.options);
  };
  for (const q of Object.values(queries)) q.addEventListener("change", refresh);
  refresh();
  return {
    state,
    configure(next) {
      if (disposed) throw new Error("Appearance disposed");
      const updated = { ...settings, ...next };
      validate(updated);
      settings = updated;
      refresh();
    },
    surface(element, options = {}) {
      if (disposed) throw new Error("Appearance disposed");
      if (registrations.has(element)) throw new Error("Surface already bound");
      const originalStyle = element.getAttribute("style"),
        attrs = [
          "data-aos-surface",
          "data-aos-variant",
          "data-aos-surface-scheme",
        ].map((k) => [k, element.getAttribute(k)]);
      const record = { options: { ...options } };
      render(element, record.options);
      registrations.set(element, record);
      let released = false;
      record.dispose = () => {
        if (released) return;
        released = true;
        registrations.delete(element);
        if (originalStyle === null) element.removeAttribute("style");
        else element.setAttribute("style", originalStyle);
        for (const [k, v] of attrs)
          if (v === null) element.removeAttribute(k);
          else element.setAttribute(k, v);
      };
      return {
        update(next) {
          if (released) throw new Error("Surface disposed");
          const nextOptions = { ...record.options, ...next };
          const result = render(element, nextOptions);
          record.options = nextOptions;
          return result;
        },
        dispose: record.dispose,
      };
    },
    scrollEdge(scroller, edge, { side = "top", extent = 48 } = {}) {
      if (disposed) throw new Error("Appearance disposed");
      if (
        !["top", "bottom"].includes(side) ||
        !Number.isFinite(extent) ||
        extent <= 0
      )
        throw new RangeError("Invalid scroll edge");
      const old = edge.getAttribute("style"),
        oldAttr = edge.getAttribute("data-aos-scroll-edge");
      edge.dataset.aosScrollEdge = side;
      edge.style.setProperty("--aos-edge-extent", extent + "px");
      let frame = 0;
      const update = () => {
        frame = 0;
        const distance =
          side === "top"
            ? scroller.scrollTop
            : scroller.scrollHeight -
              scroller.clientHeight -
              scroller.scrollTop;
        edge.style.setProperty(
          "--aos-edge-opacity",
          String(Math.min(1, Math.max(0, distance) / extent)),
        );
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });
      const observer = new ResizeObserver(onScroll);
      observer.observe(scroller);
      update();
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        edges.delete(release);
        cancelAnimationFrame(frame);
        observer.disconnect();
        scroller.removeEventListener("scroll", onScroll);
        if (old === null) edge.removeAttribute("style");
        else edge.setAttribute("style", old);
        if (oldAttr === null) edge.removeAttribute("data-aos-scroll-edge");
        else edge.setAttribute("data-aos-scroll-edge", oldAttr);
      };
      edges.add(release);
      return release;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const q of Object.values(queries))
        q.removeEventListener("change", refresh);
      for (const r of [...registrations.values()]) r.dispose();
      for (const release of [...edges]) release();
      for (const [k, v] of previousAttributes)
        if (v === null) root.removeAttribute(k);
        else root.setAttribute(k, v);
    },
  };
}
