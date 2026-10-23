# OrbitPROJ. / aOS by @qqDUCK — integration

## Choose an integration

Use the library inside an app-owned HTML screen. One WebView for a coherent screen is preferable to a WebView per control. This release does not include native Compose, WinUI, Flutter or Unity renderers. CSS blur only sees content in the WebView; GPU optics only sees the explicitly provided source texture. Neither captures other applications or the desktop.

The source ZIP includes demo, examples and native host projects. The `.tgz` is the JavaScript/CSS library. It does not install a Windows theme, Android launcher or system service.

## Install and mount

```sh
npm install ./qqduck-aos-0.4.0.tgz
```

With a bundler:

```js
import { createAppearance, bindMenuBar, bindWindowChrome } from "@qqduck/aos";
import "@qqduck/aos/styles.css";
const appearance = createAppearance({ root: document.querySelector("#app") });
const sidebar = appearance.surface(document.querySelector("#sidebar"), {
  family: "standard",
  variant: "thin",
  size: "large",
});
```

Mount your own markup first, then bind menus or chrome. All menu panel IDs must exist before binding. Route `onCommand({id})` to your app's command dispatcher. Apply CSS class names only to the regions you want styled. Standard materials and Liquid Glass are separate families. Use opaque content surfaces beneath text-heavy documents. Use `concentricRadius` when nesting corners.

Call each controller's `dispose()` on unmount. `appearance.dispose()` releases its own surfaces and scroll edges. React: see [Appearance.tsx](../examples/react/Appearance.tsx). There is no global DOM enhancer in the root API. The library does not detect newly mounted regions, persist preferences or own your routing.

No bundler: serve the complete `src/` folder with your application. Link `src/appearance.css` and import `src/index.js` by relative URL. Keep adjacent modules together. Browsers don't resolve bare npm package names without an import map/bundler. [Minimal example](../examples/vanilla/index.html).

## Windows

Prerequisites: .NET 8 SDK and Microsoft Edge WebView2 Evergreen Runtime.

From the source repository root:

```sh
node scripts/sync-hosts.mjs
dotnet run --project platforms/windows/aOS.Windows.csproj
```

The source host starts `demo/macos.html`. Replace this entry URL with your own HTML screen. Assets are mapped to `https://aos.local`, with host objects/web messaging disabled, permissions denied, new windows blocked and top-level navigation restricted to that origin. The user profile lives under LocalApplicationData/aOS/WebView2.

For an existing WPF project, adapt `platforms/windows/MainWindow.xaml.cs`. For WinUI, use its WebView2 and equivalent CoreWebView2 settings; no WinUI binary is provided. When a native bridge is necessary, design app-specific typed messages and validate their origin and payload. This host intentionally has no general command executor.

Publish a folder release:

```sh
dotnet publish platforms/windows/aOS.Windows.csproj -c Release -r win-x64 --self-contained true -o artifacts/windows
```

Ship the entire output folder including Assets. WebView2 runtime installation, signing and installer packaging belong to your app release. The library's Genie animation operates on app-owned content inside the WebView; it does not replace the OS animation of a real top-level HWND.

## Android

Prerequisites: Android Studio or Android SDK Platform 35/Build Tools 35.0.0 and JDK 17. Source uses minSdk 26, compile/target 35, Gradle 8.11.1, AGP 8.9.2, AndroidX WebKit 1.14.0. These are pinned build inputs, not a claim of current store policy compliance.

```sh
node scripts/sync-hosts.mjs
```

Open `platforms/android` in Android Studio and sync. Run on API 26+ with an updated Android System WebView. CLI, from `platforms/android`:

```bat
gradlew.bat assembleDebug
```

On macOS/Linux use `./gradlew assembleDebug`. Output: `app/build/outputs/apk/debug`. Debug APK compilation passed in [GitHub CI](https://github.com/golodgolub-bit/OrbitPROJ-aOS/actions/runs/40005278667) with JDK 17 and Android SDK 35. Physical-device behavior is not verified.

`MainActivity.java` uses WebViewAssetLoader on `https://appassets.androidplatform.net/assets/ui/`. It loads `demo/macos.html`; replace that entry with your app screen. File/content access and mixed content are disabled; no INTERNET permission or native JS bridge is present. Keep the asset loader, origin restriction, system insets and lifecycle cleanup when embedding into an Activity/Fragment. The demo's Control Center tiles are a layout preview and do not alter hardware settings. The library does not control Android Launcher/app transitions.

Before production, choose your application ID, current target SDK requirements, signing configuration and release variant. Test with the actual WebView version, TalkBack, text scaling, keyboard/touch, reduced motion/transparency and the weakest supported device. Android API level alone doesn't establish CSS/WebGL support.

## Window snapshots

Use `createWindowTransitions` with `capture({element,signal})`, returning your own canvas/image/ImageBitmap. Capture is an application boundary, not a hidden dependency on a screenshot service. Abort expensive capture work when signal aborts. `cancel()` and `dispose()` ignore late captures. App geometry must remain stable during the transition. Use `effect:'scale'` when mesh deformation is inappropriate; respect explicit reduced-motion settings.

The demo's `snapshot.js` copies its controlled HTML into an SVG foreignObject and rasterizes it. This does not guarantee support for external images, web fonts, native controls or background blur. Replace it with a snapshot method suited to your rendering framework. [API contract](api.en.md).

## Accessibility, fonts and performance

Use real semantic elements above any GPU canvas. A canvas is not a text input, range or accessibility tree. Labels, focus rings and action states belong to your DOM. Keep status extras outside the menubar role. Persist app preferences yourself, and explicitly configure them when native accessibility settings are not forwarded to WebView media queries.

Typography references local Segoe UI Variable/Segoe UI, Roboto and system-ui. No San Francisco font is bundled. If your project is licensed to use a font on its target platform, set `--aos-font`; font loading/distribution remains your responsibility.

Limit blurred areas, nested surfaces, DPR and snapshot resolution. Load `@qqduck/aos/scene` only when optics are needed. There are no production runtime packages or permanent idle frame loop. WebView runtime, textures and frame costs still need device measurement. [Performance](performance.md), [validation](validation.md), [reference](reference.en.md).
