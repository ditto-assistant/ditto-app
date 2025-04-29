# Challenges with `vis-network` State Preservation in React Tabs

This document outlines the difficulties encountered while trying to preserve the visual state (node positions, zoom, pan) of a `vis-network` graph within a React component that uses a tabbed interface (`MemoryNetwork.tsx` inside a `Modal` component with shadcn `Tabs`).

## Problem Statement

Switching from the "Network View" tab to another tab (e.g., "Table View") and back caused the `vis-network` graph to either disappear entirely or reset its layout, losing any user interactions like node dragging or zooming.

## Goal

The initial goal was to ensure that when a user switched back to the "Network View" tab, the graph reappeared in the _exact_ same state (node positions, zoom level, view center) as they left it.

## Attempts and Challenges

Several approaches were attempted, revealing challenges related to React's lifecycle, state management, ref timing, and the behavior of `vis-network` when its container is manipulated.

### Attempt 1: Update Existing Instance (`setSize`, `redraw`)

- **Approach:** Keep the `vis-network` instance alive in a `useRef` when the tab becomes inactive. When the tab becomes active again, call `network.setSize()` and `network.redraw()` on the existing instance.
- **Challenge:** This failed. The graph often didn't reappear. The likely cause was that the underlying tab component (shadcn `Tabs` / Radix UI) unmounted the inactive tab's content, destroying the network's container `div`. Even if it only used `display: none`, calling `setSize/redraw` on an instance whose container was hidden and then re-shown didn't reliably restore the rendering context.

### Attempt 2: `IntersectionObserver` + State Persistence (`storePositions`, `getViewPosition`)

- **Approach:**
  - When leaving the network tab, save node positions using `network.storePositions()` (updates the underlying `DataSet`) and save the view using `network.getViewPosition()`/`network.getScale()` into another `useRef`.
  - When returning to the tab, use an `IntersectionObserver` to detect when the container `div` becomes visible.
  - Inside the observer callback, update the _existing_ network instance: disable physics, call `setSize`/`redraw`, and use `network.moveTo()` to restore the saved view.
- **Challenge:** This led to infinite loops. Debugging revealed:
  - **Ref Timing:** The `useEffect` hook often ran before the `containerRef` was populated after the tab switch, causing the observer setup to fail.
  - **Dependency Loops:** Including `.current` values of refs (like `containerRef`, `nodesDatasetRef`) in the `useEffect` dependency array caused loops as ref values changed during render cycles.
  - **Unstable Callbacks:** Even after fixing ref dependencies, loops persisted. This strongly suggested that callback dependencies (like `handleDeleteNode` derived from `useMemoryDeletion` and `useMemoryNetwork` hooks) were being recreated on every render, causing the main network effect to rerun constantly.

### Attempt 3: Abandon State Preservation

- **Approach:** Due to the persistent dependency loops and the complexity introduced by trying to fight the component lifecycle and potentially unstable hooks, the goal of preserving the exact state was abandoned.
- **Solution:** Implement a simpler create/destroy lifecycle:
  - Create a `new Network` instance _only_ when the network tab is active and its container `div` is ready.
  - Rely on the initial physics simulation and `network.fit()` to lay out the graph each time the tab is shown.
  - Ensure the network instance is explicitly destroyed (`network.destroy()`) in the `useEffect` cleanup when the tab becomes inactive or the component unmounts.
- **Outcome:** This resolved the disappearing graph and the infinite loops, providing a stable, albeit not state-preserving, user experience.

## Conclusion

Preserving the state of complex third-party libraries like `vis-network` that manage their own DOM elements (like Canvas) within dynamic React structures (like Tabs that unmount content) can be challenging. Issues often arise from mismatches between the library's internal state/rendering and React's rendering lifecycle, ref timing, and dependency management in hooks. In this case, the instability of dependencies derived from other custom hooks proved too difficult to debug quickly, leading to the adoption of a simpler, stateless (from the perspective of layout preservation) approach.
