# OrbitPROJ. / aOS by @qqDUCK — validation / проверка

23 October 2026. Version 0.4.0 preview. Local tests ran on Windows; GitHub CI also checked Linux web/Android builds and Windows compilation. Results do not establish all-device behavior or full Apple fidelity.

23 октября 2026. Версия 0.4.0 preview, локальная проверка на Windows; GitHub CI также проверил Web/Android на Linux и сборку Windows. Это не проверка всех устройств и не подтверждение полного совпадения с Apple.

| Check / Проверка              | Evidence / Результат                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure math / Математика        | 15 Node tests: springs, SDF, luminance, material families, concentric radius and Genie endpoints/continuity for three Dock edges                                                 |
| Browser / Браузер             | 29 Chromium tests: iOS push/pop, interactive back, tabs, large-title collapse, sheet detents, modality, navigation cleanup, shared glass identities, incremental shapes; menus/submenus/typeahead/disabled commands, panels, focus, Genie/Scale, cancel/dispose, reduced motion, narrow layout, optics, cache/idle, Canvas 2D fallback |
| Types / Типы                  | TypeScript 7.0.2: foundation and optical API integration signatures checked                                                                                                      |
| Accessibility / Доступность   | Axe 4.14.0 selected WCAG A/AA rules: no violations in the opaque main example; not complete WCAG or screen-reader certification                                                  |
| Visuals / Внешний вид         | Light/dark desktop, menu, optics, intermediate Genie frame, EN/RU README previews inspected                                                                                      |
| Layout / Вёрстка              | 390px narrow viewport, 1100×760 viewport fit, scroll edge and menu placement checked                                                                                             |
| Windows                       | WPF Release, .NET SDK 8.0.426: 0 warnings, 0 errors. Runtime device checks pending                                                                                               |
| Android                       | Debug APK assembleDebug succeeded in GitHub CI: Gradle 8.11.1, JDK 17, SDK 35. Physical-device checks pending                                                     |
| Package / Пакет               | Local 0.4.0 .tgz and public GitHub main installed into fresh consumers; foundation, iOS, glass container, scene and CSS exports checked; local consumer type check passed                                               |
| Documentation / Документация  | 75 local Markdown links/images checked; EN/RU previews rendered locally                                                                                                          |
| GitHub media / Медиа          | PNGs and a 32-frame 960×663 GIF, 727,922 bytes; uploaded README cover and GIF opened and visually checked on github.com                                                                        |
| Foundation / Основа           | 54,153 raw bytes / 16,206 gzip bytes                                                                                                                                             |
| Optional optics / Оптика      | 35,274 raw bytes / 11,611 gzip bytes including shared motion                                                                                                                     |
| Compatibility / Совместимость | 28,741 raw bytes / 8,567 gzip bytes; separate import                                                                                                                             |
| iOS navigation + CSS | 27,051 raw bytes / 7,359 gzip bytes; optional import |
| Glass container binding | 6,218 raw bytes / 1,931 gzip bytes; optional addition to optics |
| Simple lens / Линза           | 5,847 raw bytes / 2,155 gzip bytes; separate import                                                                                                                              |

Gzip numbers sum individually compressed source files, without minification. Modules overlap in shared motion code. These numbers exclude WebView/native runtime, snapshots, textures, application content and development tools. They are not measured memory, battery or frame-time results.

Размер gzip — сумма отдельно сжатых исходников без минификации; общий motion пересекается между группами. WebView, снимки, текстуры, содержимое приложения и инструменты разработки не включены. Это не замер памяти, батареи или времени кадра.

Not established: exact Apple geometry/optics/timing, complete Liquid Glass coverage, full iOS layouts, native Windows runtime behavior, Android device behavior, physical GPU frame time, battery/memory budgets, Narrator/TalkBack, all browsers or complete WCAG compliance. [GitHub CI](https://github.com/golodgolub-bit/OrbitPROJ-aOS/actions/runs/40005278667) passed web tests, Windows Release compilation and Android debug APK compilation on commit 6c27e7d. The downloadable 0.4.0 package records the earlier packaging checks; this page includes subsequent publication checks. The npm registry package is not published. User reference footage is not packaged.

Не подтверждены точная геометрия/оптика/время Apple, полное покрытие Liquid Glass и iOS, нативный запуск Windows, запуск на устройствах Android, кадры/батарея/память физических устройств, Narrator/TalkBack, все браузеры и полное соответствие WCAG. [GitHub CI](https://github.com/golodgolub-bit/OrbitPROJ-aOS/actions/runs/40005278667) успешно проверил Web, Release-сборку Windows и Debug APK Android на коммите 6c27e7d. Устанавливаемый пакет 0.4.0 содержит результаты на момент упаковки; эта страница дополнена последующими проверками публикации. Пакет в реестре npm не опубликован. Пользовательские референсы не включены.
