# OrbitPROJ. / aOS by @qqDUCK — reference profile

Reference: macOS Tahoe 26 and the public Liquid Glass design model. Sources checked 22 October 2026. These references establish observable structure and API concepts, not the private rendering implementation.

| Public reference                                                                                                   | Library mapping                                                                                                    | Fidelity boundary                                                                      |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Apple HIG: menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)                  | App menu, File/Edit/View/Window/Help ordering in the example; separators, unavailable commands and shortcut labels | App supplies its menu contents; metrics and fonts differ                               |
| [macOS 26 menu bar](https://support.apple.com/en-gb/guide/mac-help/mchlp1446/26/mac/26)                            | App menus on the left, status extras on the right                                                                  | In-app reproduction, not a system menu bar                                             |
| [Desktop & Dock settings](https://support.apple.com/en-gb/guide/mac-help/mchlp1119/26/mac/26)                      | Genie/Scale choices, bottom/left/right target support, optional magnification                                      | Mesh equations, timing and scale profile are estimated                                 |
| [HIG materials](https://developer.apple.com/design/human-interface-guidelines/materials)                           | Liquid Glass Regular/Clear; separate standard content materials                                                    | CSS fallback and independent GPU optics; not Apple renderer                            |
| [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)                                         | Explicit backdrop contrast; compact Regular may change scheme; large surfaces preserve scheme                      | Backdrop RGB is app supplied; threshold, blur, reflection and adaptation are estimated |
| [Custom glass in SwiftUI](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views) | Shared scene sampling, same-group unions, morph/materialize operations, explicit interaction bindings              | Explicit DOM identity mapping; no native SwiftUI layout engine                         |
| [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)       | Scroll-edge layer and concentric radius utility                                                                    | Independent CSS approximation; host supplies geometry                                  |

The example's menus use normal application conventions. Its module list, branding and Appearance submenu are application content, not a claim that Finder has those commands. The system-like controls in Control Center/Notification Center are secondary **layout previews** without native services. The requested upper area is the menu bar and its dropdowns; it is the primary reference area.

## Values that are not measured Apple constants

The 28px menu bar, 12px menu corner radius, 14px window radius, 620ms default window transition, spring parameters, compact luminance threshold, material alphas, refractive index and deformation profile are implementation choices. A same-device video comparison has not established them as exact. The API exposes optics and geometry so a host can calibrate a known target. Avoid describing the current package as a full or pixel-perfect Apple clone.

## Explicit gaps

No complete iOS navigation/layout catalog, SF font distribution, SF Symbols, native OS services, Mission Control/Stage Manager, window tiling/full-screen management, multi-window desktop compositor, live native backdrop capture, HDR/wide-color refraction, automatic layout-diff engine or all screen-reader/device/browser verification. Window minimization is not generic browser-tab closing. See [coverage](coverage.md) for implemented behavior and [validation](validation.md) for evidence.

Reference media supplied by the user stays local and is not packaged. Repository visuals show this implementation only.

Additional iOS references: [toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [sheets](https://developer.apple.com/design/human-interface-guidelines/sheets). Implemented subset: [English](ios.en.md) / [Русский](ios.ru.md).
