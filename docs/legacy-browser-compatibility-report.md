# Legacy Browser Compatibility Report

_Date: {{DATE}}_

## Scope

This document audits the current Ditto **frontend** for features that can break, or entirely prevent, the application from loading on **older iOS Safari and other legacy browsers**. The immediate motivation is user-reported blank screens on iPhones running Safari ≤ iOS 14.

## 1 Build Pipeline & Targets

| Area          | Current state                                 | Risk for legacy                                                                                                                                                                                                        | Recommended action                                                                                                                                                                                            |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundler**   | Vite (esbuild transpilation)                  | Default Vite config targets `esnext` meaning **no transpilation of modern syntax** (e.g. `??`, `?.`, class fields, top-level `await`) for legacy Safari. Safari ≤ 14 will **fail at parse-time ➜ blank white screen**. | 1. Install `@vitejs/plugin-legacy`.<br>2. Add to `vite.config.ts`: `legacy({ targets: ['defaults', 'not IE 11', 'Safari >= 11'] })`.<br>3. Verify that `browserslist` in `package.json` matches the same set. |
| **Polyfills** | None added explicitly                         | Even with transpilation, runtime APIs such as `Promise.allSettled`, `intl/locale`, `IntersectionObserver`, etc. may be missing.                                                                                        | 1. Enable `modernPolyfills: true` in legacy plugin.<br>2. Add `core-js`/`polyfill-.io` fallback for Safari 12–13 if we detect unsupported.                                                                    |
| **CSS**       | Tailwind + custom CSS using `dvh`, `svh` etc. | Older Safari (< 15.4) **ignores** these units → fallback chain in `.app` class is valid. **No crash.**                                                                                                                 | No action needed; we already provide `vh`/`svh` fallback.                                                                                                                                                     |

## 2 Source-Code Features That Need Transpilation

| Feature                           | First supported in Safari | Found in code                                  | Impact                     |
| --------------------------------- | ------------------------- | ---------------------------------------------- | -------------------------- |
| Optional chaining `?.`            | 13.1                      | **Yes** (e.g. `user?.data`)                    | Parse error → blank screen |
| Nullish coalescing `??`           | 13.1                      | **Yes** (e.g. `balance.data?.balanceRaw ?? 0`) | Same                       |
| Class fields / static class props | 14                        | Appears in several hooks/components            | Same                       |
| Top-level `await`                 | 15                        | Not found but watch out                        | —                          |
| Private class fields `#`          | 15                        | Not found                                      | —                          |

**Bottom-line:** Any iOS < 13.1 must receive transpiled bundles.

## 3 Runtime APIs / Polyfills

| API                       | Safari support         | Usage example                     | Required polyfill?         |
| ------------------------- | ---------------------- | --------------------------------- | -------------------------- |
| `IntersectionObserver`    | 12.2                   | Chat lazy-load images             | Add polyfill for 12.0–12.1 |
| `Intl.RelativeTimeFormat` | 14                     | Not currently used                | —                          |
| `AbortController`         | 12.0                   | Used by `sendPrompt` cancellation | Provide ponyfill for ≤ 11  |
| `navigator.vibrate`       | 9.3 but behind gesture | Used for haptics – fails silently | Acceptable                 |

## 4 CSS / Layout Issues

| Feature                           | Safari support | Mitigation present                                  |
| --------------------------------- | -------------- | --------------------------------------------------- |
| `dvh` / `svh` units               | 16.4 / 15.4    | Fallback to `vh` ✅                                 |
| `scrollbar-color`                 | 13             | Used in `global.css`. Older Safari ignores, safe ✅ |
| `@custom-variant` (proposed spec) | _Non-standard_ | Only used by PostCSS plugin; compiled away ✅       |

## 5 Service-Worker / PWA

Older Safari (≤ iOS 11.3) does **not support** ServiceWorkers ➜ App will load as normal web page. No blocking issue.

## 6 Testing Matrix

Minimal set of devices/versions to test **after** implementing recommendations:

- iOS 12.5.7 Safari (iPhone 6) – lowest still receiving security updates
- iOS 13.7 Safari (iPhone 7) – first to parse optional chaining/ but still lacks some APIs
- iOS 14.8 Safari (iPhone 8) – modern events, no `dvh`
- Android 9 Chrome 96 (WebView) – ES2018 baseline

## 7 Action Plan (Priority-ordered)

1. **Transpile for legacy** – add `@vitejs/plugin-legacy` (priority P0).
2. **Polyfill critical APIs** – via same plugin or polyfill.io (P1).
3. Add an **unsupported-browser guard**: simple user-agent sniff for iOS < 11 shows a message instead of white screen (P2).
4. Continuous integration – run `cypress` E2E tests in SauceLabs for Safari 12/13 (P2).

## 8 References

- [Can I use – viewport unit variants](https://caniuse.com/viewport-unit-variants)
- Vite legacy plugin docs: <https://vitejs.dev/guide/build.html#browser-compatibility>

---

### Quick Fix Snippet

```ts
// vite.config.ts
import legacy from "@vitejs/plugin-legacy"
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "Safari >= 11"],
      modernPolyfills: true,
    }),
  ],
})
```

> Implement **step 1** and redeploy. Users on iOS 12–14 should load the app instead of a blank screen.
