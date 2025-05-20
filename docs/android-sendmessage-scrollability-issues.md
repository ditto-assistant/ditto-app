# SendMessage Textarea Scrollability Issues on Android Chrome

This document catalogs **potential root causes** that can prevent the `SendMessage` textarea from scrolling when the virtual keyboard is open in **Android Chrome / PWA** environments. Each bullet includes a reference to the relevant lines in the code-base for quick investigation.

---

## 1. Global CSS Constraints

1. **`html, body` permanently fixed & overflow-hidden**  
   Locks the entire page height to the initial viewport and prevents any natural re-flow when the keyboard appears.

   ```23:33:src/styles/global.css
   html,
   body {
     height: 100%;
     overflow: hidden;
     position: fixed;
   }
   ```

2. **Duplicate `body` rule also sets `position: fixed` and `touch-action: pan-y`**  
   May block internal scrollable areas from receiving pan gestures.

   ```35:46:src/styles/global.css
   body {
     overflow-x: hidden;
     position: fixed;
     touch-action: pan-y;
   }
   ```

3. **`#root` container fixed & overflow-hidden**  
   Keeps the React tree at the original height even when Android shrinks the visual viewport after keyboard shows.

   ```48:58:src/styles/global.css
   #root {
     min-height: 100svh;
     height: 100%;
     position: fixed;
     overflow: hidden;
   }
   ```

4. **`.app` height uses static viewport units (`100vh`)**  
   `vh` is measured against the _layout_ viewport, not the visual viewport, so it ignores the keyboard height.

   ```60:65:src/styles/global.css
   .app {
     height: 100vh; /* legacy fallback */
     height: 100svh;
     height: 100dvh;
   }
   ```

---

## 2. Chat Feed Scroll Blocking

1. **Programmatic toggle of `.no-scroll` on `.messages-scroll-view`**  
   When the textarea is focused _and_ `autoScroll` is `true`, we explicitly disable scrolling on the chat feed **and** set `document.body.style.overflow = "hidden"` again.

   ```115:134:src/components/SendMessage.tsx
   if (isTextareaFocused && autoScroll) {
     chatScroll.classList.add("no-scroll");
     document.body.style.overflow = "hidden";
   } else {
     chatScroll.classList.remove("no-scroll");
   }
   ```

2. **`.no-scroll` CSS rule removes scroll & pan gestures**  
   On Android, removing `touch-action` from the scroll view can prevent the textarea from receiving scroll events.

   ```180:186:src/components/ChatFeed.css
   .messages-scroll-view.no-scroll {
     overflow-y: hidden;
     touch-action: none;
   }
   ```

---

## 3. Textarea-Specific Logic

1. **`autoResizeTextarea` caps height at 200 px**  
   Once max height is reached, the component sets `autoScroll=true`. Scroll should now be allowed inside the textarea.

   ```145:157:src/components/SendMessage.tsx
   const newHeight = Math.min(ta.scrollHeight, 200);
   ta.style.height = `${newHeight}px`;
   setAutoScroll(ta.scrollHeight > newHeight);
   ```

2. **`handleTouchMove` _prevents default_ when `autoScroll` is `true`**  
   This cancels the scroll gesture that we just tried to enable, effectively blocking scrolling on Android touch devices.

   ```137:145:src/components/SendMessage.tsx
   const handleTouchMove = (e) => {
     if (autoScroll) {
       e.preventDefault();
       e.stopPropagation();
     }
   }
   ```

3. **Textarea Tailwind classes** add both `overflow-y-auto` and `overscroll-y-contain` but only when `autoScroll` is true. Confirm that this dynamic class evaluation is working correctly on Android.

   ```470:484:src/components/SendMessage.tsx
   className={cn(
     "min-h-[64px] max-h-[200px]",
     autoScroll ? "overflow-y-auto overscroll-y-contain" : "overflow-y-hidden",
     "touch-pan-y"
   )}
   ```

---

## 4. Viewport Units vs. Android Keyboard

- Android Chrome shrinks the **visual viewport** when the keyboard is visible, but `vh` and `svh` remain tied to the **layout viewport** unless `dvh` is supported (Chrome 108+). The fixed-position `#root` and `.app` blocks continue to consume the full layout viewport height, covering the keyboard and preventing internal scroll areas from resizing.

---

## 5. Gesture Conflicts

1. **`touch-action: manipulation / none / pan-y` spread across multiple layers** (global, chat feed, textarea, follow button) may combine to block natural gesture routing on Android.
2. Multiple `e.preventDefault()` calls (in `handleTouchMove` and possibly other onScroll handlers) can interfere with nested scrolling contexts.

---

## 6. Next Steps / Experiments

1. **Remove `e.preventDefault()`** in `handleTouchMove` and retest on Android.
2. Replace `position: fixed` on `html`, `body`, and `#root` with `height: 100dvh` or responsive flex layout.
3. Move keyboard-height handling logic into a dedicated hook that listens for `visualViewport` resize events (supported in modern Chrome) and adjusts the `.app` height dynamically.
4. Ensure `.no-scroll` is applied **only** to the chat feed, not the whole document.
5. Use `touch-action: auto` on the textarea while scrolling is enabled.

---

**Last updated:** _2025-05-20_
