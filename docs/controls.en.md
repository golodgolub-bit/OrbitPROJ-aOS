> Compatibility module: `@qqduck/aos/controls`, CSS: `@qqduck/aos/controls.css`. The primary API is documented in [api.en.md](api.en.md).

# API reference

All exports come from `@qqduck/aos`. CSS is separate: `@qqduck/aos/controls.css`. Definitions ship in `src/index.d.ts`.

| Function                                               | Contract                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enhance(root = document)`                             | Installs light, drag, dock and tab behavior on matching existing elements. Returns `dispose()`. Idempotent per element and feature. No MutationObserver |
| `configure({root, quality, theme, transparency})`      | Sets data attributes on root. Defaults: documentElement, balanced, auto, auto. Unknown values throw RangeError                                          |
| `capabilities()`                                       | Returns `{backdrop, reducedMotion, popover}`. Detection is feature based                                                                                |
| `animateSpring(update, options)`                       | Calls update with scalar values. Returns `{cancel, finished}`. `finished` resolves true on completion or false on cancel. Values can overshoot          |
| `springState(time, from, to, options)`                 | Pure analytic position/velocity. Handles underdamped, critically damped and overdamped cases. Seconds, CSS pixels                                       |
| `minimizeTo(source, target, options)`                  | Promise of async restore function. DOM scale contraction, not mesh. Hides source, sets inert, focuses target. Restore is one-shot                       |
| `ribbonTo(snapshot, sourceRect, targetRect, options)`  | Promise<void>. Row-slice canvas animation, removes temporary layer afterward. Does not change source visibility                                         |
| `ribbonRows(sourceRect, targetRect, progress, slices)` | Pure geometry. Rects use viewport CSS pixel coordinates. Progress clamped to 0..1. Slice count 4..96                                                    |
| `toast(message, {duration=3200, root=document.body})`  | Text-only status message. Returns dismiss function. Keep one toast visible for predictable placement                                                    |
| `clamp(value,min,max)`, `lerp(a,b,t)`                  | Scalar helpers                                                                                                                                          |

Spring defaults: `from:0, to:1, stiffness:240, damping:26, mass:1, velocity:0, epsilon:.001, maxDuration:2`. The spring stops at epsilon or maxDuration and writes the exact target. `reducedMotion` defaults to the current media query and jumps to the target. Stiffness, damping and mass must be finite and positive. `update` must not throw.

Minimize options: `duration:540` milliseconds, `reducedMotion` from system. Ribbon options: `duration:680`, `slices:32`, `reverse:false`, `reducedMotion` from system. Reduced motion skips animation. Callers own cancellation/unmount sequencing for these async effects. Canvas snapshots must already be loaded. Avoid huge images and tainted cross-origin content.

## Markup contracts

| Markup                                   | Behavior                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class="aos-button" data-aos`            | Button material and pointer lighting. Use `<button>` or a real link                                                                                                       |
| `class="aos-surface aos-clear" data-aos` | Clear surface. Other variants: aos-thick, aos-tinted                                                                                                                      |
| `data-aos-drag="return"`                 | Parent-bounded drag, spring back after release. `free` retains position                                                                                                   |
| `data-drag-handle`                       | Pointer capture and arrow/Home keyboard handler. Supply tabindex, role and label                                                                                          |
| `data-aos-tabs`                          | Container with role=tablist and role=tab buttons. Supply IDs, aria-controls, aria-selected, linked role=tabpanel nodes. Horizontal/vertical orientation and RTL supported |
| `data-aos-dock`                          | Pointer magnification for descendant buttons/links. No touch magnification                                                                                                |
| `.aos-switch input[type=checkbox]`       | Native checkbox with switch styling. Label the input                                                                                                                      |
| `.aos-range`                             | Native range input. Supply min/max/value and label                                                                                                                        |
| `.aos-segmented`                         | Radio inputs followed by spans inside labels. Radio group must have a shared name and accessible label                                                                    |
| `.aos-dialog.aos-sheet`                  | `<dialog>` styling. Call showModal() and use form method=dialog to close                                                                                                  |
| `.aos-menu[popover]`                     | Popover styling. Feature-detect before using showPopover/hidePopover                                                                                                      |

Drag dispatches a bubbling `aos:dragend` CustomEvent with `{x,y}`. The event reports release coordinates before any spring return completes. Other controls use native events (`click`, `input`, `change`). The library does not persist settings, call native APIs or send network requests.
