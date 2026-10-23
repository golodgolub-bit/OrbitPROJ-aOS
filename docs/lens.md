# Optional GPU lens / Дополнительная GPU-линза

```js
import { createGlassLens } from "@qqduck/aos/lens";
const lens = createGlassLens(outputCanvas, appOwnedCanvas, {
  radius: 48,
  strength: 22,
  blur: 1.5,
  rim: 38,
});
// null means WebGL2 is unavailable. Use CSS glass as fallback.
lens?.render({ pointerX: -0.3, pointerY: 0.6 });
// Refresh only after the app's source pixels change:
lens?.setSource(appOwnedCanvas);
lens?.render();
// On unmount:
lens?.dispose();
```

The separate `lens` entry point does not load when importing the core. It samples an app-provided, opaque canvas/image/ImageBitmap. The shader displaces texture coordinates near a rounded edge, applies a 9-tap blur, slight channel separation and directional specular lighting. It is an original approximation, not Apple's renderer or physical ray tracing. It does not read HTML behind the output canvas, the desktop or another app. Render the background scene once in a canvas and pass those pixels if you need a consistent lens effect.

Модуль `lens` не загружается при импорте ядра. Он работает с непрозрачным canvas/image/ImageBitmap вашего приложения. Шейдер смещает координаты текстуры у скруглённых краёв, применяет размытие из девяти выборок, небольшое разделение цветовых каналов и направленный блик. Это самостоятельное приближение, без реализации Apple и физической трассировки лучей. Модуль не захватывает HTML под canvas, рабочий стол и другие приложения.

Options use **canvas backing pixels**, except pointerX/Y (center-relative normalized light coordinates, Y upward). Keep canvas resolution bounded and preserve aspect ratio between source and output. Radius clamps to half the shorter side, strength/blur clamp at zero and rim at one. Rendering stretches the source across the output. Call `setSource` after source updates. Call `render` explicitly after updates or canvas resize. No permanent frame loop runs. Dispose releases GPU buffers, shaders, program and texture. Context loss requires disposing and creating a new renderer after context restoration. Snapshot images must be loaded and same-origin or CORS-authorized.

Единицы параметров — **пиксели внутреннего буфера canvas**. pointerX/Y задают положение света относительно центра в нормализованных координатах, Y направлен вверх. Ограничивайте разрешение и сохраняйте пропорции источника. После изменения источника вызовите `setSource`, затем `render`. После изменения размера canvas тоже нужен `render`. Постоянного цикла кадров нет. `dispose` освобождает GPU-ресурсы. После потери и восстановления контекста создайте новый рендерер. Изображения должны быть загружены и доступны с учётом origin/CORS.

Default values: radius 48, strength 22, blur 1.5, rim 38, pointerX -.3, pointerY .6. The module does not observe CSS quality settings. Your app should disable it in Lite mode and honor reduced motion for pointer-driven updates. Test memory and frame time on actual hardware. WebGL context creation may fail under driver, policy or device limits.

Модуль не отслеживает CSS-режим качества. В режиме Lite отключайте его в приложении и учитывайте уменьшение движения для бликов под указателем. Проверяйте память и время кадра на реальном устройстве. WebGL может быть недоступен из-за драйвера, политики или ограничений устройства.
