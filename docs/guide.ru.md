# OrbitPROJ. / aOS by @qqDUCK — подключение

## Выберите границу встраивания

Библиотека оформляет HTML-экран собственного приложения. Используйте один WebView на цельный экран, а не на каждую кнопку. Нативных рендереров Compose/WinUI/Flutter/Unity нет. CSS-размытие видит содержимое WebView, GPU — только переданную текстуру. Захвата других приложений и рабочего стола нет.

ZIP с исходниками содержит примеры, демо и проекты платформ. `.tgz` — пакет JavaScript/CSS. Установка не меняет системную тему Windows, Launcher Android и службы ОС.

## Установка и жизненный цикл

```sh
npm install ./qqduck-aos-0.4.0.tgz
```

В проекте со сборщиком:

```js
import { createAppearance, bindMenuBar, bindWindowChrome } from "@qqduck/aos";
import "@qqduck/aos/styles.css";
const appearance = createAppearance({ root: document.querySelector("#app") });
appearance.surface(document.querySelector("#sidebar"), {
  family: "standard",
  variant: "thin",
  size: "large",
});
```

Сначала смонтируйте разметку, затем привяжите меню и окно. ID всех панелей меню должны уже существовать. Передавайте `onCommand({id})` своему диспетчеру команд. Классы CSS применяйте к нужным областям. Standard и Liquid Glass — разные семейства. Текстовые документы размещайте на плотном фоне. `concentricRadius` рассчитывает согласованные вложенные углы.

При размонтировании вызывайте `dispose()` контроллеров. `appearance.dispose()` также снимает принадлежащие ему поверхности и края прокрутки. [React](../examples/react/Appearance.tsx). Основной API не обходит весь DOM и не наблюдает за новыми областями. Навигация, хранение предпочтений и состояние приложения остаются у вас.

Без сборщика: разместите всю папку `src/` рядом с приложением, подключите `src/appearance.css` и импортируйте `src/index.js` по относительному URL. Соседние модули должны сохранять расположение. Имена npm-пакетов в браузере требуют import map или сборщика. [Минимальный пример](../examples/vanilla/index.html).

## Windows

Нужны .NET 8 SDK и Microsoft Edge WebView2 Evergreen Runtime. Из корня исходников:

```sh
node scripts/sync-hosts.mjs
dotnet run --project platforms/windows/aOS.Windows.csproj
```

Оболочка открывает `demo/macos.html`. Замените URL на экран своего приложения. Ресурсы доступны через локальный `https://aos.local`; host objects и сообщения выключены, разрешения отклоняются, новые окна и внешние переходы заблокированы. Профиль находится в LocalApplicationData/aOS/WebView2.

Для WPF адаптируйте `platforms/windows/MainWindow.xaml.cs`. В WinUI используйте соответствующий WebView2 с теми же настройками CoreWebView2; готового WinUI-бинарника нет. Если нужен мост к нативному коду, создайте конкретные типизированные команды с проверкой origin и данных. Универсального исполнителя команд в оболочке нет.

Сборка папки для распространения:

```sh
dotnet publish platforms/windows/aOS.Windows.csproj -c Release -r win-x64 --self-contained true -o artifacts/windows
```

Передавайте всю папку, включая Assets. Установка WebView2, подпись и инсталлятор относятся к выпуску вашего приложения. Genie действует на собственное содержимое внутри WebView; системную анимацию настоящего HWND он не заменяет.

## Android

Нужны Android Studio либо Android SDK Platform 35/Build Tools 35.0.0 и JDK 17. В исходниках: minSdk 26, compile/target 35, Gradle 8.11.1, AGP 8.9.2, AndroidX WebKit 1.14.0. Версии закреплены для сборки; соответствие текущим правилам магазина отдельно не подтверждалось.

```sh
node scripts/sync-hosts.mjs
```

Откройте `platforms/android` в Android Studio, выполните sync и запуск на API 26+ с обновлённым Android System WebView. Через терминал из `platforms/android`:

```bat
gradlew.bat assembleDebug
```

В macOS/Linux: `./gradlew assembleDebug`. APK появится в `app/build/outputs/apk/debug`. В среде подготовки не было Android SDK: компиляция APK и работа на физическом устройстве не проверены.

`MainActivity.java` использует WebViewAssetLoader по адресу `https://appassets.androidplatform.net/assets/ui/`, стартовая страница — `demo/macos.html`. Замените её своим экраном. Доступ file/content и mixed content выключен; INTERNET и нативного JS-моста нет. Сохраните загрузчик ресурсов, ограничения origin, системные отступы и очистку жизненного цикла при переносе в Activity/Fragment. Плитки Control Center — только пример раскладки, они не меняют оборудование. Библиотека не управляет переходами Launcher и других приложений.

Перед выпуском задайте application ID, актуальные требования target SDK, подпись и release-вариант. Проверьте реальную версию WebView, TalkBack, масштаб текста, касания/клавиатуру, уменьшение движения/прозрачности и слабое поддерживаемое устройство. Один уровень Android API не определяет поддержку CSS/WebGL.

## Снимок окна

`createWindowTransitions` принимает `capture({element,signal})`, возвращающий ваш canvas/image/ImageBitmap. Снимок предоставляет приложение; скрытой зависимости от сервиса захвата нет. Отменяйте дорогую подготовку по AbortSignal. `cancel()` и `dispose()` игнорируют поздние результаты. Геометрия во время перехода должна оставаться стабильной. Используйте `'scale'`, если деформация не нужна, и передавайте явное предпочтение reduced motion.

`demo/snapshot.js` переносит автономную разметку примера в SVG foreignObject и растеризует её. Это не гарантирует отображение внешних картинок, веб-шрифтов, нативных контролов и фонового размытия. Подмените захват методом своего движка. [Контракт API](api.ru.md).

## Доступность, шрифты, нагрузка

Над GPU-canvas сохраняйте семантические HTML-элементы. Canvas не заменяет ввод, range и дерево доступности. Метки, фокус и состояния действий задаёт DOM. Значки статуса должны находиться вне menubar. Храните предпочтения сами и явно передавайте их, если настройки ОС не доходят до media queries WebView.

Шрифты: локальные Segoe UI Variable/Segoe UI, Roboto, system-ui. San Francisco не включён. Если у проекта есть разрешение использовать свой шрифт на выбранной платформе, задайте `--aos-font`; загрузка и распространение шрифта остаются у приложения.

Ограничивайте площадь размытия, вложения, DPR и разрешение снимков. Подключайте `@qqduck/aos/scene` только для оптики. Нет сторонних зависимостей времени исполнения и постоянного цикла кадров в покое. Стоимость WebView, текстур и кадров всё равно нужно замерять на устройстве. [Производительность](performance.md), [проверки](validation.md), [эталон](reference.ru.md).
