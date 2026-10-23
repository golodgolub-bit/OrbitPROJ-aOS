# OrbitPROJ. / aOS by @qqDUCK — performance / производительность

The foundation has no runtime packages or permanent polling/animation loop. Menus update on input/resize; scroll-edge work is coalesced. Magnification is opt-in. Window motion creates one temporary viewport canvas with DPR capped at 1.5, renders only while transitioning and removes it on completion/cancel/resize/disposal. The Genie mesh uses one WebGL draw per frame (Canvas 2D fallback); resources are explicitly released. Snapshot capture is application-supplied and may dominate cost.

В основе нет сторонних зависимостей времени исполнения и постоянного опроса/цикла кадров. Меню обновляются по событиям, края прокрутки объединяют работу по кадрам. Увеличение Dock включается явно. Анимация окна создаёт временный canvas с DPR до 1,5 и удаляет его после завершения/отмены/resize/dispose. Genie рисует сетку одним проходом WebGL (есть Canvas 2D); временные ресурсы явно освобождаются. Подготовка снимка остаётся у приложения и может быть самой дорогой частью.

GPU optics is a separate import. One source texture, two cached half-resolution blur passes, one material pass, up to 12 SDF shapes and one custom mask. Source/quality changes rebuild blur; geometry/light changes reuse it. Transitions share a scheduler and stop after settling. Lite skips optical shading and blur. Distance fields are CPU setup work and should be cached.

GPU-оптика подключается отдельно: текстура источника, два кэшированных прохода размытия в половинном разрешении, один проход материала, до 12 SDF-фигур и одна маска. Изменение источника/качества пересчитывает размытие; геометрия и свет используют кэш. После затухания переходов кадры прекращаются. Lite пропускает оптику/размытие. Поля расстояний рассчитываются на CPU при подготовке и требуют кэширования.

CSS materials still cost GPU time. Use a shared toolbar backdrop, bounded surfaces, opaque document areas and restrained DPR. Avoid stacking glass on glass or blurring full-screen live video. No automatic hardware-quality detection is provided. Give users explicit accessibility/performance preferences when appropriate.

CSS-размытие тоже нагружает GPU. Используйте общий фон панели инструментов, ограниченные поверхности, плотный фон документа и умеренный DPR. Не накладывайте стекло на стекло и не размывайте полноэкранное видео без замеров. Автоматического определения мощности устройства нет.

`npm run size` reports raw bytes and sum of individually gzipped source modules. These are source transfer sizes, not minified bundle numbers, process memory, battery usage or frame times. Tree shaking and omitting optional modules reduce what your app loads. Images in the package are README media and not loaded by library imports.

Размеры `npm run size` — исходники и сумма отдельно сжатых модулей. Они не означают размер процесса, расход батареи или время кадра. Необязательные модули не загружаются основным импортом. Медиа README не подключаются кодом библиотеки.

Before release record device/OS/WebView/GPU/DPR/power mode. Measure warmed release builds during scrolling, repeated minimize/restore and morphing. Report median/p95 frame time, long frames, peak memory and thermal/power behavior. Test the weakest supported physical device and Narrator/TalkBack separately. A target such as p95 <16.7ms at 60Hz is a budget, **not a measurement**. [Actual validation](validation.md).

Перед выпуском фиксируйте устройство/ОС/WebView/GPU/DPR/питание. Замеряйте прогретую release-сборку при прокрутке, сворачивании/восстановлении и морфинге. Нужны медиана/p95 кадра, длинные кадры, память, нагрев и энергозатраты. Слабое устройство и скринридеры проверяются отдельно. p95 <16,7 мс при 60 Гц — цель, а не результат замера. [Проверки](validation.md).
