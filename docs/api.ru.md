# OrbitPROJ. / aOS by @qqDUCK — API оформления

Импорт: `@qqduck/aos`, стили: `@qqduck/aos/styles.css`. Контроллеры подключаются к разметке приложения. Для каждой области используйте один контроллер; освобождайте его перед удалением DOM.

## Материалы и предпочтения

`createAppearance({root,platform:'macos',scheme:'auto',reduceMotion:'auto',reduceTransparency:'auto',increaseContrast:'auto'})` возвращает `state()`, `configure`, `surface`, `scrollEdge`, `dispose`. Предпочтения: `true`, `false`, `'auto'`. Тема: `'auto'`, `'light'`, `'dark'`. Значение `platform:'ios'` выбирает палитру; контроллеры навигации и панелей подключаются отдельно: [ios.ru.md](ios.ru.md).

`surface(element,{family,variant,size,backdrop})` возвращает `{update,dispose}`. У Liquid Glass варианты **regular/clear**, у стандартного материала **ultraThin/thin/regular/thick**. Это разные семейства. `size:'compact'` разрешает Regular менять светлую/тёмную схему по переданному фону. `'large'` сохраняет тему приложения. `backdrop` — три значения sRGB от 0 до 1; приложение передаёт и обновляет их само. Автоматического захвата фона нет. Порог и прозрачности приблизительные. Для Clear нужен контролируемый фон и проверка контраста. CSS даёт размытие и тонирование, а не оптическое преломление. Оптика подключается через отдельный GPU-модуль.

`resolveMaterial(options)` — чистая функция выбора foreground/fill/blur/dimming/border/shadow. Принимает явно заданную тему и доступность. `relativeLuminance`, `contrastRatio`, `concentricRadius(outer,inset)` — чистые утилиты; вложенный радиус равен `max(0,outer-inset)`.

`scrollEdge(scroller,edge,{side:'top',extent:48})` регулирует маску размытия при уходе содержимого под край. `side` — top/bottom. Приложение размещает край в контейнере с относительным позиционированием. Возвращается функция освобождения. События прокрутки объединяются в кадр, размер отслеживается. За изменением всего DOM контроллер не наблюдает.

`appearance.dispose()` также освобождает поверхности и края, возвращает сохранённые inline-значения. Не изменяйте те же свойства параллельно. Настройки доступности Windows/Android могут не попасть в media queries WebView; предусмотрите явные настройки приложения.

## Меню

```html
<nav id="bar" class="aos-menubar" aria-label="Приложение">
  <button data-aos-menu-trigger aria-controls="file">File</button>
</nav>
<div id="file" class="aos-menu" role="menu" hidden>
  <button role="menuitem" data-command="open">Open… <kbd>⌘O</kbd></button>
  <div role="separator"></div>
  <button role="menuitem" aria-disabled="true">Save</button>
</div>
```

`bindMenuBar(bar,{onCommand:({id,item,event})=>{},onOpen:({trigger,menu})=>{}})` возвращает `open(trigger,{focus,last})`, `close({focus})`, `isOpen`, `dispose`. Панели с уникальными ID должны существовать до привязки. В `onOpen` обновляйте доступность и отметки команд. Системные значки и обычные кнопки держите вне области `role=menubar`.

Подменю: `data-aos-submenu` и `aria-controls` на menuitem. Стрелки перемещают фокус, Home/End переходят к краям, Enter/Space вызывают команду, Escape закрывает один уровень либо всё меню. Ввод букв ищет доступный пункт; `data-label` переопределяет текст поиска. Tab и нажатие вне меню закрывают цепочку. Указатель переключает верхние меню только при уже открытом меню. Недоступные команды видны и не вызываются. Состояния checkbox/radio принадлежат приложению: обновляйте `aria-checked` после команды. Контроллер не регистрирует глобальные сочетания и не реализует OS Services. Подсказка `<kbd>` ничего не выполняет. Сочетания назначает приложение с учётом Ctrl/Command.

## Окно, Dock, панели

`bindWindowChrome(window,{onClose,onMinimize,onZoom,onMove})` передаёт действия элементов `[data-aos-window-action="close|minimize|zoom"]`. Область `[data-aos-titlebar]` при перетаскивании выдаёт `{dx,dy,event}`; контролы внутри не начинают drag. Приложение применяет смещение, границы и смысл закрытия/zoom. Доступа к системным окнам нет; full screen и tiling не реализованы. Символы кнопок — CSS-приближение, не SF Symbols.

`bindDock(dock,{onActivate,magnification:false,scale:1.45,radius:110})` передаёт активацию по `data-app`. Увеличение по умолчанию выключено; включается через `configure({magnification:true})`. Значки и `data-running` задаёт приложение. `dispose()` снимает обработчики и возвращает масштаб.

`bindSystemPanel(panel,{trigger,onOpen,onClose})` привязывает готовую немодальную панель к якорю. Методы: open/close/isOpen/dispose; закрытие снаружи и по Escape, размещение при resize, возврат фокуса. Реальных служб Wi-Fi, уведомлений, звука и оборудования нет.

## Сворачивание и восстановление

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

`capture` возвращает загруженный canvas, image или ImageBitmap с содержимым собственного окна. Вызывается для каждого перехода. Геометрия должна оставаться стабильной. Ядро не снимает произвольный DOM и рабочий стол. `demo/snapshot.js` — частный foreignObject-снимок автономной разметки примера, а не универсальный захват. Внешние ресурсы, фон позади стекла и сложный CSS могут отсутствовать. В рабочем проекте передавайте снимок из своего приложения/нативного хоста. ImageBitmap освобождает вызывающая сторона.

Сетка Genie использует один текстурный проход WebGL; при его отсутствии есть Canvas 2D. Scale работает через Canvas 2D. Временные GPU-ресурсы освобождаются после перехода. Снимок должен быть origin-clean и укладываться в лимит текстуры устройства.

Эффекты: `'genie'` — двухфазная нелинейная сетка; `'scale'` — масштабирование. Цель: `'bottom'|'left'|'right'`. Формулы и время приблизительные, закрытая реализация Apple не скопирована. `state`: visible/minimizing/minimized/restoring. Конкурирующий запрос возвращает false. `cancel()` прерывает ожидание снимка либо анимацию, возвращая прежнее состояние. Resize отменяет активный слой. `configure({effect,edge,duration,reducedMotion})` применяется в покое. `dispose()` отменяет работу и восстанавливает исходные hidden/inert/visibility. После завершения фокус переходит к значку Dock либо прежнему контролу окна. Цель должна принимать фокус. При reduced motion слой canvas не создаётся. Поставщик снимка должен учитывать AbortSignal для освобождения своих ресурсов.

`animateWindow(snapshot,sourceRect,targetRect,options)` — низкоуровневая анимация без изменения DOM-видимости; signal/reverse/duration/reducedMotion/onFrame. true означает завершение, false — отмену. `genieMesh(source,target,progress,{edge,slices:48})` возвращает чистую геометрию четырёхугольников. Координаты — CSS-пиксели viewport.

## Переход с 0.2

Старые `enhance/configure/minimizeTo/ribbonTo/toast` перенесены в `@qqduck/aos/controls`; прежние стили — `@qqduck/aos/controls.css`. Это совместимость с прежними контролами. В оптике оставлены варианты regular/clear; clock/thick удалены из Liquid Glass. Для особого эффекта задавайте оптические параметры явно. Основной пример — `demo/macos.html`, операции рендерера — `demo/optics.html`. [API оптики](material.ru.md).
