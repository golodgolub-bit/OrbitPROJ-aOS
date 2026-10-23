# OrbitPROJ. / aOS by @qqDUCK — iOS-style navigation

This optional module implements app-owned navigation and presentation. It does not replace Android navigation services or include UIKit/SwiftUI. Motion and metrics are independent estimates. [Apple toolbar guidance](https://developer.apple.com/design/human-interface-guidelines/toolbars), [tabs](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

```js
import {
  createNavigationStack,
  bindBackGesture,
  bindNavigationBar,
  bindTabBar,
  createSheet,
} from "@qqduck/aos/ios";
import "@qqduck/aos/styles.css";
import "@qqduck/aos/ios.css";
```

The app supplies semantic markup. Set `createAppearance({platform:'ios'})` on the root to use the iOS color variables. Fonts remain local system fonts. [Runnable example](../demo/ios.html).

## Navigation stack

Place direct child regions with unique `data-aos-page="id"` under a sized root. Existing regions are reused; this API does not fetch pages or manage URLs. Each region can have a `[data-aos-scroll]` element; otherwise the region itself scrolls. `[data-aos-page-focus]` marks the preferred focus target, which must be focusable.

```js
const navigation = createNavigationStack(root, {
  initial: "library",
  reducedMotion: "auto",
  duration: 360,
  onChange: ({ id, stack }) => updateAppHeader(id),
});
await navigation.push("detail");
await navigation.pop();
```

`push`, `replace`, `pop` return a promise: true on completion, false when busy, canceled or already at the root for pop. Pushing an ID already in the active stack is rejected. `reset(id)` cancels motion and starts a new stack. `stack` returns a copy, `busy` reports a transition. `cancel()` returns to the previous settled view. Dispose restores owned hidden/inert/tabindex/style state. The app must avoid concurrent writes to those properties.

Push slides the incoming page over a parallax background; pop reverses the relationship. Outgoing content becomes inert. Scroll positions and focus targets are retained per page. Reduced motion completes without a running animation. Insets and direction follow your CSS; RTL reverses horizontal movement. The default duration/parallax are estimates, not Apple constants.

`bindBackGesture(root,navigation,{edgeWidth:24})` explicitly adds a touch-only leading-edge gesture. It yields to vertical scrolling and editable controls. It supports cancel and commit thresholds, pointer capture, RTL and cleanup. This is not Android's system back gesture. Provide a real Back button as an alternative. Manual gesture drivers can use `navigation.beginBackGesture()` and its `update(progress)`, `finish(commit)` and `cancel()` methods.

## Navigation bar and tabs

`bindNavigationBar(bar,scroller,{collapseDistance:48})` updates `--aos-title-collapse` from scroll offset. CSS styles `[data-aos-large-title]` and `[data-aos-compact-title]`. It returns `update()`/`dispose()`. The app owns the title text, actions and placement. It does not build a toolbar or capture its backdrop.

`bindTabBar(bar,{selected,onSelect,scroller,minimizeOnScroll:false})` binds existing `[role=tab]` elements with unique `data-tab` or IDs. It updates selection/tabindex and emits `onSelect({id,item})`; the app shows the corresponding tabpanel. Arrow keys, Home/End and RTL are supported. `select(id,{focus,notify})` allows programmatic selection. Preserve each tab's navigation state in your application. Do not use tabs for commands or disable tabs to represent empty content.

Scroll minimization is opt-in. If enabled with a scroller, scrolling down compacts the bar; upward scrolling or activating a tab expands it. Apple documents this behavior for tab bars with an accessory; the host owns the accessory and can leave the option off. The CSS retains keyboard-accessible tabs. No automatic More tab, sidebar conversion or system search tab is provided.

## Sheets

Supply a closed `<dialog>` with a labeled `[data-aos-sheet-handle]` and explicit Cancel/Done controls. The dialog should be outside containers that clip it. Native `showModal()` supplies focus containment and background inertness.

```js
const sheet = createSheet(dialog, {
  detents: [0.5, 1],
  initial: 0,
  dismissible: true,
  onChange: ({ index, fraction }) => saveDetent(index),
});
sheet.open();
sheet.snap(1);
sheet.close();
sheet.dispose();
```

Detents are strictly increasing fractions in (0,1]. Viewport resize/keyboard changes recalculate height. The grabber supports drag, click to cycle and ArrowUp/Down/Home/End. Escape/backdrop/swipe dismissal respects `dismissible`; the app can prevent dismissal for unsaved work. `index` is the current detent. Close restores the opening control's focus. App-owned explicit close remains available even with dismissible false. The current sheet API is **modal only** and supports grabber dragging; nonmodal presentation and automatic expansion from content scrolling are not implemented.

Keep one main sheet open at a time. Automatic native haptics, system gestures, full-screen presentation management and complete UIKit behavior are not included. Measure touch behavior, accessibility, IME and frame cost on the target device.
