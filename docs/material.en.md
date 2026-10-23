# OrbitPROJ. / aOS by @qqDUCK: material API

Import from `@qqduck/aos/scene`. WebGL2 is required. `createGlassScene(canvas,source,options)` returns null without a context. Use CSS glass as fallback.

## Scene and source

Source: loaded HTMLCanvasElement, HTMLImageElement or ImageBitmap, at most 4096×4096. It contains the **background before glass**. It stretches across the scene, so preserve aspect ratio. No HTML/native/desktop capture is included. Refresh explicitly with `scene.setSource(source)`.

Options: material (`clear`, `regular`), quality (`lite`, `balanced`, `rich`), renderBackground (false by default), merge (24), pixelRatio (device DPR capped at 1.5 initially, absolute cap 2). Coordinates are CSS pixels relative to the canvas. x/y are shape **centers**. `renderBackground:false` outputs a transparent premultiplied glass layer.

```js
scene.setShapes([
  {
    id: "a",
    group: "toolbar",
    x: 80,
    y: 60,
    width: 64,
    height: 64,
    radius: 32,
  },
  {
    id: "b",
    group: "toolbar",
    x: 170,
    y: 60,
    width: 120,
    height: 64,
    radius: 32,
  },
]);
```

A shape accepts id, group, x, y, width, height, radius, opacity (0..1), scale, frost and optional tint RGBA (0..1). Maximum **12 shapes**. Same-group shapes blend by polynomial smooth minimum. `merge` controls blend distance. Different groups remain separate. Use matching tint/frost within a group to avoid seams. This is an analytic union, not fluid simulation.

## Optics

`scene.configure({material:'clear',thickness:24})` changes the material.

| Parameter  | Meaning                                   |
| ---------- | ----------------------------------------- |
| ior        | Refraction ratio >=1, presets around 1.45 |
| thickness  | Displacement scale in CSS pixels          |
| bevel      | Edge profile width >=1 CSS pixel          |
| dispersion | Red/blue texture sampling separation      |
| roughness  | Directional highlight width               |
| frost      | Sharp/blurred background mix              |
| reflection | Rim/specular intensity                    |
| shadow     | Exterior shadow strength                  |
| tint       | [red,green,blue,opacity], each 0..1       |

The shader uses signed-distance normals, refracted texture coordinates, a Fresnel term and directional highlights. Balanced/rich blur runs in two separable passes at half source resolution and is cached. Source or quality changes invalidate it. Moving shapes/light or changing thickness/tint reuses it. Lite skips blur and optical shading. These are independent parameters, not Apple's constants or a ray tracer.

## Transitions

```js
await scene.transition("a", { x: 240, scale: 1.08 });
await scene.morph("a", { width: 320, height: 280, radius: 36 });
await scene.dematerialize("a");
await scene.materialize("a");
```

`transition` interpolates numeric geometry with an analytic spring. `morph` adds a rounded lens profile during expansion/contraction. Options: stiffness, damping, mass, reducedMotion, liquid. Reduced motion follows the current media query by default. Interrupting the same ID preserves current velocity. The old promise resolves false, completion resolves true. `update(id,patch)` applies immediately and cancels that shape's animation. `setShapes` replaces the scene and cancels all shape animations.

Materialize expands from a small shape and opacity 0. Dematerialize contracts/fades. The app coordinates semantic element visibility and navigation. `subscribe(callback)` runs after a draw and returns unsubscribe. Use `getShape(id)` to place/fade DOM content. It returns a copy. No content is automatically captured or rendered into the glass.

## Text and alpha masks

```js
const field = createTextField("OrbitPROJ.", {
  width: 1200,
  height: 600,
  font: '200 520px "Segoe UI",sans-serif',
  range: 48,
});
scene.setShapes([{ id: "wordmark", x: 500, y: 250, width: 900, height: 430 }]);
scene.setMask("wordmark", field);
```

Text uses a locally available or licensed font. No font is bundled. `createDistanceField(alpha,width,height,{range})` accepts Uint8Array alpha. An antialiased Euclidean distance transform runs in O(pixel count). Cache fields: this is CPU setup work. A scene accepts **one mask**, up to 2048×2048. Material text is rasterized, not selectable. Supply an accessible text equivalent outside the canvas.

## Native HTML bindings

All return `{sync,dispose}`. Call sync after app layout/programmatic changes. Call dispose on unmount before disposing the scene.

| Binding                                                    | Behavior                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bindGlassControl(button,scene,{id,canvas})`               | Maps a button rect to a shape, pointer/keyboard press response, resize tracking                 |
| `bindGlassRange(input,scene,{id,canvas,size:30})`          | Thumb from native min/max/value, expands on interaction, native events/keyboard and RTL mapping |
| `bindGlassSelection(container,scene,{id,canvas,selected})` | Shape follows selected tab/radio label, responds to click/change/keyup                          |

Selection defaults to `[aria-selected="true"], input:checked + span`. The app owns tab semantics. For a GPU range, the app draws its track, hides the native visual thumb and preserves the hit area and focus indicator. See `demo/optics.js`. These bindings do not create native OS controls. Use one canvas/scene for a coherent group, not a GL context or WebView per button.

## Lifecycle

- `resize(width,height,pixelRatio)` changes backing resolution. DPR 0.5..2.
- `setLight(x,y)` uses normalized scene coordinates, Y down. Redraws coalesce.
- `render()` forces one draw. It does not start a permanent loop.
- `stats()` reports draws, blurBuilds, activeAnimations, pendingFrame, shapes.
- `dispose()` cancels pending work/promises and releases textures, FBOs, buffers, shaders and programs.

Recreate the scene after WebGL context restoration. Coordinate resize/scroll/unmount with active transitions. Sources must be loaded and same-origin or CORS authorized. Device memory, frame time, native WebView overhead and screen-reader checks remain integration requirements.

## Shared DOM identities / Общие идентичности DOM

```js
import { createGlassContainer } from "@qqduck/aos/glass";
const container = createGlassContainer(canvas, backdrop, { spacing: 24 });
const identity = container?.register("navigation", yourElement, {
  group: "toolbar",
  radius: 24,
});
await identity?.move(yourExpandedElement, { transition: "matchedGeometry" });
await identity?.move(yourOtherElement, { transition: "materialize" });
await identity?.remove();
container?.dispose();
```

The container owns its scene and maps stable IDs to supplied DOM bounds. It does not create UI controls or move your DOM. Same-group effects share the source/blur and union distance (`spacing`). `move` interpolates a known identity, `materialize` explicitly disappears/reappears; it is not SwiftUI's layout engine. Canvas CSS width/height must be constrained. Resize/scroll tracking updates idle geometry, with no permanent polling. Layout should remain stable during a transition. Source pixels are still explicit. `sync(id?)`, `configure({spacing,...optics})`, `setSource(source)` are available. Registrations return move/sync/remove. Dispose the container after its bindings.

Контейнер владеет сценой и связывает постоянные ID с границами переданного DOM. Он не создаёт контролы и не двигает разметку. Группы используют общий фон/размытие и расстояние слияния spacing. move интерполирует известную идентичность; materialize явно скрывает/показывает её. Это не движок layout SwiftUI. Ограничьте CSS-размер canvas. Resize/scroll обновляют геометрию в покое без постоянного опроса; во время перехода layout должен оставаться стабильным. Пиксели фона передаются явно. Доступны sync(id?), configure({spacing,...optics}), setSource(source); регистрация возвращает move/sync/remove.

Low-level scenes also expose `addShape(shape)` and `removeShape(id)` without canceling unrelated transitions. Materialization restores the saved nonzero scale after dematerialization. / В сцене доступны addShape/removeShape без отмены чужих переходов. После исчезновения появление возвращает сохранённый ненулевой масштаб.
