# OrbitPROJ. / aOS by @qqDUCK — foundation API

Import from `@qqduck/aos`; CSS from `@qqduck/aos/styles.css`. All controllers operate on application-owned DOM. Dispose them before removing their DOM. Bind only one controller to each region.

## Appearance

`createAppearance({root,platform:'macos',scheme:'auto',reduceMotion:'auto',reduceTransparency:'auto',increaseContrast:'auto'})` returns `state()`, `configure(options)`, `surface`, `scrollEdge`, `dispose`. Preferences accept `true`, `false` or `'auto'`. Scheme accepts `'auto'`, `'light'`, `'dark'`. `platform:'ios'` selects the iOS palette; optional navigation and sheet controllers are documented in [ios.en.md](ios.en.md).

`surface(element,{family,variant,size,backdrop})` returns `{update,dispose}`. Liquid variants are **regular/clear**. Standard variants are **ultraThin/thin/regular/thick**. Do not use a standard variant as a Liquid Glass variant. `size:'compact'` allows Regular to switch scheme from the supplied RGB backdrop; `'large'` preserves the selected app scheme. `backdrop` is three normalized sRGB values, supplied by your app; pixels are not automatically sampled. Update it after relevant content changes. The threshold and alpha values are estimates, not Apple's algorithm. `clear` assumes bright foreground content over controlled media; verify contrast. CSS fallback provides blur/tint, not optical refraction. Explicitly import the GPU renderer for optics.

`resolveMaterial(options)` is a pure resolver, returning foreground, fill, blur, dimming, border and shadow values. It accepts explicit light/dark/accessibility state. `relativeLuminance`, `contrastRatio`, `concentricRadius(outer,inset)` are pure utilities. A concentric corner is `max(0,outer-inset)`.

`scrollEdge(scroller,edge,{side:'top',extent:48})` controls a masked blur as content moves behind an edge. App positions the edge in a relative container. Side may be top or bottom. Returns a disposer. Scroll events coalesce into one requested frame. Resize is observed. Callers must refresh layout when their own content changes; the binding does not observe every DOM mutation.

Root disposal also releases registered surfaces and scroll edges and restores owned inline state. Don't modify those same inline properties concurrently. Accessibility settings in native hosts may not reach CSS media queries; offer explicit app preferences.

## Menus

```html
<nav id="bar" class="aos-menubar" aria-label="Application">
  <button data-aos-menu-trigger aria-controls="file">File</button>
</nav>
<div id="file" class="aos-menu" role="menu" hidden>
  <button role="menuitem" data-command="open">Open… <kbd>⌘O</kbd></button>
  <div role="separator"></div>
  <button role="menuitem" aria-disabled="true">Save</button>
</div>
```

`bindMenuBar(bar,{onCommand:({id,item,event})=>{},onOpen:({trigger,menu})=>{}})` returns `open(trigger,{focus,last})`, `close({focus})`, `isOpen` and `dispose`. Menu panels must already exist and have unique IDs. `onOpen` can refresh enabled/checked state from your application. Keep status icons and ordinary buttons **outside** the `role=menubar` region.

Use `[data-aos-submenu][aria-controls]` on a menuitem for a submenu. Arrows navigate, Home/End reach ends, Enter/Space activate, Escape closes one submenu or the menu chain. Typing searches enabled labels; use `data-label` to override the searchable text. Tab closes the chain. Clicking outside closes it. Pointer movement switches top-level menus only while a menu is open. Disabled commands stay visible and cannot activate. Check/radio state is owned by the app: update `aria-checked` after its command. The library does not execute shortcuts, reserve global keys or implement OS Services. Bind command shortcuts in your app; use Ctrl on Windows and Command on macOS as appropriate. `<kbd>` is only a displayed hint.

## Window chrome and Dock

`bindWindowChrome(window,{onClose,onMinimize,onZoom,onMove})` forwards actions from `[data-aos-window-action="close|minimize|zoom"]`. `[data-aos-titlebar]` emits `{dx,dy,event}` while dragged; controls inside it don't start dragging. Host applies/clamps movement and decides what close/zoom means. The binding does not grant OS window access or implement full screen/tiling. Button hover symbols in CSS are an approximation, not SF Symbols.

`bindDock(dock,{onActivate,magnification:false,scale:1.45,radius:110})` forwards `data-app` activation. Magnification is off unless explicitly configured. `configure({magnification:true})` changes this preference. The app owns icons and `data-running`. Disposing removes listeners and owned scale values.

`bindSystemPanel(panel,{trigger,onOpen,onClose})` anchors an existing nonmodal dialog to a trigger. It exposes open/close/isOpen/dispose, outside-click dismissal, Escape, resize placement and focus restoration. It supplies no Wi-Fi, notification, media or hardware services.

## Window motion

```js
const motion = createWindowTransitions({
  element: yourWindow,
  target: yourDockIcon,
  capture: async ({ element, signal }) => yourCapture(element, signal),
  effect: "genie",
  edge: "bottom",
  duration: 620,
});
await motion.minimize();
await motion.restore();
motion.dispose();
```

The capture callback returns a loaded canvas, image or ImageBitmap containing your own window. It is called per transition. Keep geometry stable while capturing/animating. The core does not capture arbitrary DOM or the desktop. `demo/snapshot.js` is a demo-only foreignObject capture for its self-contained markup; it is not a general screenshot API. It may omit external assets, backdrop pixels and advanced CSS. Supply a native/app-specific snapshot in production. The caller owns ImageBitmap lifetime.

The Genie mesh uses one WebGL texture pass when available, with a Canvas 2D fallback. Scale uses Canvas 2D. Temporary GPU resources are released after the transition. Snapshots must be origin-clean and fit the device texture limits.

Effects: `'genie'` (two-phase nonlinear mesh) and `'scale'`. Edge: `'bottom'|'left'|'right'`. Genie equations and duration are **independent estimates**, not Apple's private implementation. `state` reports visible/minimizing/minimized/restoring. Concurrent requests return false. `cancel()` aborts capture wait or animation and restores the prior state. Resize cancels an active overlay. `configure({effect,edge,duration,reducedMotion})` is allowed while idle. `dispose()` aborts work and restores original hidden/inert/visibility. Completion moves focus to the Dock target or the previous window control. Targets must be focusable. Reduced motion finishes without a canvas overlay.

`animateWindow(snapshot,sourceRect,targetRect,options)` is the low-level overlay function. It accepts signal, reverse, duration, reducedMotion and onFrame; returns true on completion, false on cancellation. It does not change DOM visibility. `genieMesh(source,target,progress,{edge,slices:48})` returns pure texture and destination quads. Geometry is viewport CSS pixels. New snapshot work during capture must honor the supplied AbortSignal to release its own resources.

## Migration from 0.2

Root `enhance/configure/minimizeTo/ribbonTo/toast` moved to `@qqduck/aos/controls`; old CSS moved to the `@qqduck/aos/controls.css` export. They are compatibility helpers, not the foundation. The optional scene only accepts `regular` and `clear`; remove `clock`/`thick` Liquid Glass presets. Use explicit custom optical values when required. The primary demo is `demo/macos.html`; `demo/optics.html` shows renderer operations. See [optical API](material.en.md).
