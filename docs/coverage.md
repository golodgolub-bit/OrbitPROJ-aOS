# OrbitPROJ. / aOS by @qqDUCK — coverage / покрытие

Version 0.4.0. Independent implementation. Complete Apple parity is not claimed. / Самостоятельная реализация; полное совпадение с Apple не заявлено.

| Feature / Функция                      | Available / Доступно                                                       | Limit / Граница                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Menu bar / Строка меню                 | Headless menus, submenus, disabled states, keyboard, typeahead, focus      | App-owned commands, estimated metrics; no native global menu                           |
| Standard materials / Обычные материалы | ultraThin, thin, regular, thick                                            | CSS blur/tint approximation                                                            |
| Liquid Glass                           | Regular, Clear; shared GPU source and blur; refraction, rim                | Independent shader; no private Apple compositor                                        |
| Adaptive contrast / Контраст           | Explicit backdrop RGB resolver, compact/large distinction                  | No automatic native/DOM sampling or per-glyph vibrancy                                 |
| Concentric corners / Углы              | Radius utility                                                             | Host owns layout                                                                       |
| Scroll edge / Край прокрутки           | Top/bottom masked CSS blur                                                 | Not Apple compositor algorithm                                                         |
| Morph/union / Морфинг/слияние          | SDF groups, interruption-aware springs, materialize/dematerialize          | 12 shapes, one mask per scene; explicit DOM identity mapping; no automatic layout diff |
| Interaction / Взаимодействие           | Explicit press, range and selection bindings                               | No default pointer light; app owns semantics and gestures                              |
| Window chrome / Окно                   | Action callbacks, titlebar drag deltas, active styles                      | No native zoom/tiling/full-screen controller                                           |
| Genie / Scale                          | Nonlinear mesh / scale; reverse, cancel, reduced motion; three Dock edges  | Snapshot required; equations/timing approximate; in-app only                           |
| Dock                                   | Activate, running style, opt-in magnification                              | No OS taskbar/Launcher replacement                                                     |
| Status panels / Панели                 | Anchored panel controller and secondary layout previews                    | No actual Control Center, notifications or hardware service                            |
| Typography / Шрифты                    | Local Segoe UI/Roboto/system-ui; --aos-font                                | SF Pro/SF Symbols not bundled                                                          |
| iOS                                    | Push/pop, interactive back driver, large titles, tabs, modal sheet detents | No complete iOS component/layout/gesture catalog                                       |
| Windows                                | WPF WebView2 source host                                                   | Compilation checked; runtime pending                                                   |
| Android                                | Java WebViewAssetLoader source host                                        | Debug APK compiled in GitHub CI; device runtime pending                                                    |
| GitHub                                 | README with committed PNG/GIF                                              | No live JS demo within README; publication status is verified separately                             |

Read [reference EN](reference.en.md) / [эталон RU](reference.ru.md), [API EN](api.en.md) / [API RU](api.ru.md), and [validation](validation.md). The rendering modules do not provide an Apple asset/font license or operating-system privileges.
