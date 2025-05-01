<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

#

---

# Research: Handling Mobile Browser UI (URL Bar) and System Navigation Bar (Pixel 8 Example)

When developing web applications, especially full-screen experiences like chat apps, handling the space occupied by both the mobile browser's dynamic UI (like the top URL bar) and the operating system's navigation bar (like the bottom gesture bar or buttons on a Pixel 8) is crucial. This document outlines effective CSS techniques.

## The Challenge: Dynamic Viewport Height and OS Navigation

1.  **Dynamic Browser UI:** Mobile browsers often have UI elements like the URL bar that appear and disappear as the user scrolls. This changes the actual visible height of the viewport. Using `100vh` (100% of the viewport height) often refers to the _largest_ possible height (when the URL bar is hidden), causing layouts to extend off-screen when the bar is visible.
2.  **OS Navigation Bar:** Devices like the Google Pixel 8 have a system navigation bar at the bottom (for gestures or buttons). Content needs to be padded correctly to avoid being obscured by this bar.

## Solution Part 1: Handling Dynamic Browser UI with `svh`

Modern CSS introduced new viewport units to address the dynamic height issue:

- `svh`: "Small Viewport Height" - 1% of the viewport height when dynamic toolbars _are_ visible.
- `lvh`: "Large Viewport Height" - 1% of the viewport height when dynamic toolbars _are not_ visible.
- `dvh`: "Dynamic Viewport Height" - 1% of the viewport height, which changes dynamically as toolbars appear/disappear.

For layouts that need to fit entirely within the visible area _at all times_, `100svh` is often the best choice.

**Example Implementation (HomeScreen.tsx):**
Replacing `h-screen` (Tailwind for `height: 100vh`) with `h-[100svh]` (Tailwind for `height: 100svh`) on the main app container ensures it resizes correctly when the browser's URL bar is shown or hidden.

```tsx
// Example: src/screens/HomeScreen.tsx
<div className="app h-[100svh] fixed inset-0 touch-pan-y flex flex-col">
  {/* ... rest of the app */}
</div>
```

## Solution Part 2: Handling the OS Navigation Bar with `safe-area-inset-bottom`

While `100svh` addresses the browser UI, you still need to account for the persistent OS navigation bar at the bottom. The `env(safe-area-inset-bottom)` CSS environment variable provides the height of this bottom inset.

Apply this as padding to the container whose bottom edge should avoid the navigation bar.

**Example Implementation (platform/android.css or ios.css):**

```css
/* Apply padding to the container holding the scrollable content and the bottom input bar */
.main-content-flex {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Fallback for older Android versions if needed */
@supports not (padding-bottom: env(safe-area-inset-bottom)) {
  .main-content-flex {
    padding-bottom: var(
      --android-nav-height
    ); /* Define --android-nav-height elsewhere */
  }
}

/* Ensure padding is removed in PWA/standalone mode where safe areas might be handled differently */
@media all and (display-mode: standalone) {
  .main-content-flex {
    padding-bottom: 0 !important;
  }
}
```

## Other Considerations (Viewport Segments - Less Common Now)

Older approaches or specifications like `viewport-segment-bottom` (`env(viewport-segment-bottom 0 0)`) also exist to query geometry obscured by UI elements. However, the combination of `svh`/`lvh`/`dvh` units for dynamic browser UI and `safe-area-inset-*` for OS intrusions generally provides a more robust and widely supported solution today.

## Summary

- Use `100svh` for the height of main containers that need to fit the _smallest_ visible area accounting for dynamic browser toolbars.
- Use `env(safe-area-inset-bottom)` (applied as padding or margin) to avoid content overlapping the _OS_ navigation bar.
- Test thoroughly in different browser modes (standard vs. PWA/standalone) and on different devices.

Remember that these solutions are specifically for web content viewed in the browser or as a PWA. In PWA mode, the exact behavior of safe areas and viewport units might differ slightly, often requiring less manual padding as the OS handles the layout more directly.

<div style="text-align: center">⁂</div>

_Original research references may still contain useful context but focus on older or alternative methods._

[^1]: https://www.lambdatest.com/blog/css-scale-property/

[^2]: https://stackoverflow.com/questions/15654409/detect-browser-size-and-apply-css-for-every-resolution

[^3]: https://www.androidpolice.com/android-15-problems-solutions/

[^4]: https://www.reddit.com/r/GooglePixel/comments/15c0urx/how_to_hide_the_navigation_bar/

[^5]: https://www.androidheadlines.com/2024/10/android-15-brought-a-swipe-back-gesture-bug-to-the-pixel-8-pro.html

[^6]: https://developer.chrome.com/docs/css-ui/edge-to-edge

[^7]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_view/Viewport_concepts

[^8]: https://www.youtube.com/watch?v=AiUIDwZFU7Q

[^9]: https://stackoverflow.com/questions/78536072/text-inside-safeareaview-hidden-behind-pixel-8-pro-camera-notch

[^10]: https://blisk.io/devices/details/google-pixel-8

[^11]: https://developer.chrome.com/docs/devtools/css/reference

[^12]: https://www.youtube.com/watch?v=iRF3eJinvXE

[^13]: https://stackoverflow.com/questions/52848856/100vh-height-when-address-bar-is-shown-chrome-mobile

[^14]: https://www.youtube.com/watch?v=75ml4GAjbn8

[^15]: https://developer.android.com/develop/ui/views/layout/immersive

[^16]: https://www.youtube.com/watch?v=5lMAAkIWU9M

[^17]: https://nothing.community/en/d/1693-hide-gesture-navigation-bar

[^18]: https://stackoverflow.com/questions/67154896/creating-navbar-with-css-grid

[^19]: https://stackoverflow.com/questions/27348336/how-to-change-system-navigation-bar-color

[^20]: https://www.youtube.com/watch?v=i96miHefikU

[^21]: https://xdaforums.com/t/remove-navbar-gesture-pill-and-more-for-pixel-6-pro.4357937/page-8
