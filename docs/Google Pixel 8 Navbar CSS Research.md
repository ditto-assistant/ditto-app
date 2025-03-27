<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# 

---

# Research, I have a google pixel 8 and I need to know the CSS property in chrome, where I can detect the size of the system navbar. As I currently have UI that's hidden behind this navbar (which it's not an issue on PWA mode)

To detect the size of the system navbar on your Google Pixel 8 and ensure your UI is not hidden behind it, you can use the `viewport-segment` CSS property in Chrome. This property allows you to account for the presence of system UI elements, including the navigation bar.

## Viewport Segments

Chrome 135 and later versions support edge-to-edge content, which means the viewport extends into areas previously occupied by system UI[^6]. To handle this change and prevent content from being hidden behind the navigation bar, you can use the following CSS:

```css
@media (horizontal-viewport-segments: 1) {
  body {
    padding-bottom: env(viewport-segment-bottom 0 0);
  }
}
```

This CSS code adds padding to the bottom of the body element equal to the height of the navigation bar[^6]. The `viewport-segment-bottom` environment variable provides the exact size of the bottom system UI element.

## Alternative Approach

If you're using an earlier version of Chrome or need a more universal solution, you can use the `safe-area-inset-bottom` environment variable:

```css
body {
  padding-bottom: env(safe-area-inset-bottom);
}
```

This approach ensures that your content is not obscured by the navigation bar across different devices and Chrome versions.

Remember that these solutions are specifically for web content viewed in the browser. In PWA mode, the system navigation bar typically doesn't overlap with your content, which is why you're not experiencing issues in that mode[^4].

It's important to test your implementation across different devices and Chrome versions to ensure consistent behavior. Additionally, keep an eye out for updates to Chrome's handling of edge-to-edge content, as this area is actively evolving[^6].

<div style="text-align: center">⁂</div>

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

