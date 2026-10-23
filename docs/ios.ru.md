# OrbitPROJ. / aOS by @qqDUCK — навигация в стиле iOS

Необязательный модуль оформляет переходы собственного приложения. Он не заменяет системную навигацию Android и не содержит UIKit/SwiftUI. Размеры и движение приблизительные. Эталоны Apple: [панели инструментов](https://developer.apple.com/design/human-interface-guidelines/toolbars), [вкладки](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

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

Разметку задаёт приложение. Для переменных цветов используйте `createAppearance({platform:'ios'})`. Шрифты остаются локальными. [Работающий пример](../demo/ios.html).

## Стек экранов

В контейнере с заданным размером разместите прямые дочерние области `data-aos-page="id"` с уникальными ID. Области переиспользуются; контроллер не загружает страницы и не меняет URL. Внутри можно обозначить прокрутку `[data-aos-scroll]`, иначе прокручивается сама область. `[data-aos-page-focus]` указывает элемент начального фокуса; он должен принимать фокус.

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

`push`, `replace`, `pop` возвращают Promise: true при завершении, false при занятости/отмене или pop из корня. Нельзя повторно поместить уже активный ID в стек. `reset(id)` отменяет переход и начинает новый стек. `stack` — копия массива, `busy` — наличие перехода. `cancel()` возвращает прежнее устойчивое состояние. `dispose()` восстанавливает принадлежащие контроллеру hidden/inert/tabindex/style. Не изменяйте эти свойства параллельно.

Входящий экран сдвигается поверх предыдущего, при возврате — обратное движение с параллаксом. Уходящее содержимое становится inert. Прокрутка и фокус сохраняются по экранам. При reduced motion активной анимации нет. RTL меняет направление движения. Время и величина параллакса — параметры реализации, не константы Apple.

`bindBackGesture(root,navigation,{edgeWidth:24})` явно включает сенсорный жест от ведущего края. Он уступает вертикальной прокрутке и редактируемым контролам, поддерживает завершение/отмену, захват указателя и RTL. Системным жестом Back в Android он не является. Сохраните настоящую кнопку Back. Для своего распознавателя доступен `navigation.beginBackGesture()` с `update(progress)`, `finish(commit)`, `cancel()`.

## Верхняя панель и вкладки

`bindNavigationBar(bar,scroller,{collapseDistance:48})` обновляет `--aos-title-collapse` при прокрутке. CSS использует `[data-aos-large-title]` и `[data-aos-compact-title]`. Методы: `update()`/`dispose()`. Заголовки, действия и размещение задаёте вы. Контроллер не собирает toolbar и не захватывает фон.

`bindTabBar(bar,{selected,onSelect,scroller,minimizeOnScroll:false})` привязывает готовые `[role=tab]` с уникальными data-tab или ID. Он обновляет aria-selected/tabindex, выдаёт `onSelect({id,item})`; соответствующий tabpanel показывает приложение. Есть стрелки, Home/End и RTL. `select(id,{focus,notify})` меняет выбор программно. Сохраняйте отдельный стек каждой вкладки. Вкладки предназначены для разделов, а не команд; пустой раздел следует объяснить, не скрывая вкладку.

Сворачивание при прокрутке включается явно. При наличии scroller движение вниз компактирует панель, движение вверх или активация вкладки раскрывает её. Apple описывает этот режим для панели с аксессуаром; сам аксессуар задаёт приложение. По умолчанию режим выключен. CSS сохраняет возможность выбора с клавиатуры. Автоматических More/sidebar/search-вкладок нет.

## Панели sheets

Передайте закрытый `<dialog>` с подписанным `[data-aos-sheet-handle]` и явными Cancel/Done. Разместите dialog вне обрезающих контейнеров. Нативный `showModal()` удерживает фокус и делает фон неактивным.

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

Detents — строго возрастающие доли высоты (0,1]. Высота пересчитывается при изменении viewport и появлении клавиатуры. Ручка поддерживает перетаскивание, нажатие для переключения и ArrowUp/Down/Home/End. Escape/фон/свайп учитывают dismissible; приложение может запретить закрытие при несохранённых данных. `index` — текущая высота. После закрытия фокус возвращается к открывшему контролу. Явная команда close доступна и при dismissible false. Сейчас реализована **только модальная панель** с перетаскиванием за ручку; немодальный режим и автоматическое расширение прокруткой содержимого не реализованы.

Открывайте одну основную панель за раз. Нативных haptics, системных жестов, управления full screen и всего поведения UIKit нет. Проверяйте касания, доступность, IME и время кадра на целевых устройствах.
