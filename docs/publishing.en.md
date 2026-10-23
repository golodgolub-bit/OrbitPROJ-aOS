# OrbitPROJ. / aOS by @qqDUCK — releases

Repository: [golodgolub-bit/OrbitPROJ-aOS](https://github.com/golodgolub-bit/OrbitPROJ-aOS). The npm registry package is not published.

## Import

```sh
npm install github:golodgolub-bit/OrbitPROJ-aOS#main
```

Main changes over time. Replace main with a known commit SHA for reproducible installs. The [0.4.0 package](../releases/qqduck-aos-0.4.0.tgz) can also be downloaded and installed with `npm install ./qqduck-aos-0.4.0.tgz`. It contains the source modules, types, docs, examples and local demo, without native hosts or development tools.

## Future owner releases

Run `npm ci`, `npx playwright install chromium`, `npm run check` and the native host checks described in guide.en.md. Update package/host versions and documentation together. `npm pack` produces the installable archive; test it in a fresh consumer before committing a release package. Update README media from the current application. Keep generated build outputs and credentials out of source control.

CI checks the web package and compiles Windows/Android source. A successful compile is separate from runtime, accessibility and physical-device validation. Check validation.md for actual evidence.

The npm scope `@qqduck` must belong to the publisher before any registry release. Configure real repository metadata and authenticate your own npm account before `npm publish --access public`. This repository does not contain a registry token or perform npm publication.

Windows/Android application signing, current store requirements, installers and device testing remain part of the host app release. Native shells and integration steps are in [guide.en.md](guide.en.md).
