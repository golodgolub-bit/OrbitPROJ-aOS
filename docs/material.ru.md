# OrbitPROJ. / aOS by @qqDUCK: API материала

Импорт из `@qqduck/aos/scene`. Требуется WebGL2. `createGlassScene(canvas,source,options)` возвращает null без контекста. Запасной вариант — CSS-материал.

## Сцена и источник

Источник: загруженный HTMLCanvasElement, HTMLImageElement или ImageBitmap до 4096×4096. Он содержит **фон до стекла**, растягивается на сцену, поэтому приложение сохраняет пропорции. Захвата HTML/нативных элементов/рабочего стола нет. Обновление явное: `scene.setSource(source)`.

Опции: material (`clear`, `regular`), quality (`lite`, `balanced`, `rich`), renderBackground (по умолчанию false), merge (24), pixelRatio (DPR устройства, исходно до 1.5, абсолютный предел 2). Координаты — CSS-пиксели относительно canvas. x/y — **центр** формы. `renderBackground:false` выводит прозрачный слой с premultiplied alpha.

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

Поля формы: id, group, x, y, width, height, radius, opacity (0..1), scale, frost, tint RGBA (0..1). Максимум **12 форм**. Одна группа объединяется через полиномиальный smooth minimum. `merge` задаёт расстояние объединения. Разные группы остаются отдельными. Внутри группы используйте одинаковые tint/frost, иначе возможен шов. Это аналитическое объединение, не симуляция жидкости.

## Оптика

Изменение: `scene.configure({material:'clear',thickness:24})`.

| Параметр   | Назначение                                         |
| ---------- | -------------------------------------------------- |
| ior        | Коэффициент преломления >=1, в пресетах около 1.45 |
| thickness  | Смещение текстуры в CSS-пикселях                   |
| bevel      | Ширина профиля кромки >=1 CSS-пикселя              |
| dispersion | Разделение выборок красного/синего каналов         |
| roughness  | Ширина направленного блика                         |
| frost      | Смешивание резкого и размытого фона                |
| reflection | Интенсивность отражения и блика                    |
| shadow     | Тень за пределами материала                        |
| tint       | [красный,зелёный,синий,непрозрачность], 0..1       |

В шейдере используются нормали поля расстояния, преломление координат текстуры, член Френеля и направленные блики. Два разделённых прохода размытия идут в половинном разрешении источника и кэшируются. Изменение источника или качества обновляет кэш. Движение форм/света, толщина и оттенок используют готовое размытие. Lite пропускает оптику и размытие. Параметры самостоятельные, без констант Apple и трассировки лучей.

## Переходы

```js
await scene.transition("a", { x: 240, scale: 1.08 });
await scene.morph("a", { width: 320, height: 280, radius: 36 });
await scene.dematerialize("a");
await scene.materialize("a");
```

`transition` меняет числовую геометрию аналитической пружиной. `morph` добавляет округлый профиль линзы при раскрытии/стягивании. Опции: stiffness, damping, mass, reducedMotion, liquid. Уменьшение движения по умолчанию следует media query. Новый переход того же ID сохраняет текущую скорость. Старый Promise возвращает false, завершённый — true. `update(id,patch)` меняет состояние сразу и отменяет движение этой формы. `setShapes` заменяет сцену и отменяет её анимации.

Materialize раскрывает малую форму с opacity 0. Dematerialize стягивает и скрывает материал. Семантической видимостью и навигацией управляет приложение. `subscribe(callback)` вызывается после отрисовки и возвращает отписку. Через `getShape(id)` размещайте/показывайте HTML-содержимое; метод возвращает копию. Содержимое автоматически не фотографируется и не переносится в стекло.

## Текст и маски

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

Шрифт локальный или лицензированный приложением, файлов шрифтов в наборе нет. `createDistanceField(alpha,width,height,{range})` принимает Uint8Array альфа-канала. Сглаженное евклидово преобразование работает за O(число пикселей). Кэшируйте поля: это работа CPU при подготовке. На сцену допускается **одна маска**, до 2048×2048. Такой текст растровый и не выделяется. Добавьте доступный текстовый эквивалент вне canvas.

## Привязки HTML

Возвращают `{sync,dispose}`. После своих изменений вёрстки/состояния вызывайте sync. При удалении сначала dispose привязок, затем сцены.

| Привязка                                                   | Поведение                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `bindGlassControl(button,scene,{id,canvas})`               | Положение настоящей кнопки, отклик мыши/клавиатуры, resize                 |
| `bindGlassRange(input,scene,{id,canvas,size:30})`          | Бегунок из min/max/value, увеличение при захвате, события/клавиатура и RTL |
| `bindGlassSelection(container,scene,{id,canvas,selected})` | Форма следует выбранной вкладке/radio по click/change/keyup                |

Селектор выбора по умолчанию: `[aria-selected="true"], input:checked + span`. Семантикой вкладок управляет приложение. Для GPU-ползунка приложение рисует дорожку, скрывает стандартный визуальный бегунок, сохраняет область ввода и фокус. Пример — `demo/optics.js`. Привязки не создают нативные контролы ОС. Используйте одну сцену для связанной группы, а не WebView/GL-контекст на каждую кнопку.

## Жизненный цикл

- `resize(width,height,pixelRatio)` меняет буфер. DPR 0.5..2.
- `setLight(x,y)` задаёт нормализованные координаты, Y вниз, объединяет перерисовки.
- `render()` рисует кадр без постоянного цикла.
- `stats()` выдаёт draws, blurBuilds, activeAnimations, pendingFrame, shapes.
- `dispose()` отменяет работу/обещания и освобождает текстуры, FBO, буферы, шейдеры, программы.

После восстановления потерянного контекста создайте сцену заново. Согласуйте resize/прокрутку/удаление с движением. Источники должны быть загружены и доступны по origin/CORS. Память, время кадра, затраты WebView и скринридеры проверяются в приложении.

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
