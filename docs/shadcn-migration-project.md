# Shadcn UI Migration Project

## Overview

This migration plan outlines the process of replacing competing UI libraries and custom components with shadcn/ui primitives. The goal is to create a more consistent UI experience, reduce bundle size, and improve maintainability for the Ditto app before releasing version 0.13.0 with new AI models.

## Priority Levels

- **Critical** - Must be completed for 0.13.0 release
- **High** - Should be completed if time permits
- **Medium** - Can be deferred to post-release if necessary
- **Low** - Nice to have, can be handled in subsequent releases

## Phase 1: Core UI Components (Critical)

1. **SendMessage Component**

   - Replace custom CSS with Tailwind classes
   - Integrate with shadcn Button and Input components
   - Ensure mobile behavior is preserved
   - Convert from JSX to TSX

2. **TokenModal**

   - Remove MUI dependencies
   - Use existing custom Modal component and shadcn Button components
   - Preserve subscription tier functionality

3. **ChatMessage**
   - Migrate to Tailwind with preserved animations
   - Maintain styling but use shadcn primitives where possible
   - Replace Framer Motion animations with shadcn/ui transitions

## Phase 2: User Experience Components (High)

1. **CheckoutForm**

   - Remove MUI Button dependencies
   - Ensure proper form validation
   - Use shadcn Form components

2. **ImageViewer**

   - Convert to shadcn primitives
   - Maintain zoom and pan functionality

3. **MarkdownRenderer**
   - Optimize for consistency with shadcn typography
   - Preserve code highlighting functionality

## Phase 3: Complex UI Components (High)

1. **DittoCanvasModal**

   - Remove MUI dependencies
   - Convert to shadcn primitives
   - Ensure draggable/resizable behavior works

2. **ChatFeed**
   - Preserve complex scrolling behavior
   - Maintain animations
   - Use Tailwind for styling
   - Convert from JSX to TSX

## Phase 4: Screen-Level Components (Medium)

1. **HomeScreen**

   - Convert layout to Tailwind
   - Remove any remaining MUI components
   - Ensure responsive design
   - Convert from JSX to TSX

2. **FullScreenEditor**

   - Replace MUI components
   - Ensure editor functionality is maintained

3. **ScriptsOverlay**
   - Use existing custom Modal component
   - Convert to Tailwind styling
   - Maintain current functionality

## Phase 5: Visualization Components (Medium)

1. **MemoryNetwork**

   - Preserve visualization functionality
   - Convert surrounding UI to shadcn

2. **MemoryNodeModal**
   - Use existing custom Modal component
   - Convert to Tailwind styling

## Phase 6: MUI Removal (Critical)

1. **Find and replace all remaining MUI components**

   - Button → shadcn Button
   - TextField → shadcn Input
   - Menu → shadcn DropdownMenu
   - Tabs → shadcn Tabs

2. **Remove MUI dependencies from package.json:**
   - @mui/material
   - @mui/icons-material
   - @emotion/react
   - @emotion/styled

## Implementation Guidelines

1. **For each component:**

   - First, analyze the current component's functionality
   - Create a new version using shadcn primitives
   - Test thoroughly on both desktop and mobile
   - Ensure all functionality is preserved
   - Update imports in dependent components

2. **CSS Migration:**

   - Replace component CSS files with Tailwind classes
   - Use `cn()` utility for conditional classes
   - Maintain animations where needed
   - Ensure mobile responsiveness

3. **Testing:**
   - Test each component after migration
   - Verify mobile behavior works correctly
   - Check for responsive design issues
   - Validate all functionality is preserved

## Final Checklist

- All MUI dependencies removed from package.json
- No component-specific CSS files remaining
- All components using shadcn primitives or Tailwind
- Bundle size reduced
- All tests passing
- Mobile functionality working correctly
- Theme system intact and working

## Note on Modal Components

Our custom Modal component (`src/components/ui/modals/Modal.tsx`) is a core piece of the UI that already uses shadcn primitives. It provides important functionality like resizing and dragging that the standard shadcn Dialog component does not offer. All modal-based components should use this custom Modal component rather than converting to the standard shadcn Dialog.

## Current UI Structure

Based on the codebase and screenshots, Ditto features a chat interface with:

- A dark theme chat interface
- User messages aligned to the right in blue bubbles
- Ditto (assistant) messages aligned to the left in dark gray bubbles
- Avatar images for both user and Ditto
- A bottom message input area with:
  - Expandable text area
  - Media attachment options
  - Ditto logo button (menu)
  - Send button

## Detailed Implementation Plan

### Phase 1: Initial Setup (Critical)

1. **SendMessage.jsx → SendMessage.tsx**

   - Replace CSS classes with Tailwind
   - Use shadcn/ui components:
     - `Button` for send and media buttons
     - `Textarea` for input field
     - `DropdownMenu` for media attachment options
     - `ScrollArea` for message history
   - Preserve mobile functionality
   - Replace Framer Motion with shadcn/ui transitions and animations
   - Types to add:
     - Props interface
     - Event handlers
     - State types
   - Keep the existing context integrations

2. **ChatMessage.tsx**

   - Already TypeScript, needs UI conversion
   - Replace custom CSS with Tailwind
   - Use shadcn/ui components:
     - `Avatar` for user and Ditto avatars
     - `Card` for message bubbles
     - `Button` for action menu items
   - Replace Framer Motion with shadcn/ui transitions and animations
   - Maintain message types and timestamps

3. **ChatFeed.jsx → ChatFeed.tsx**
   - Convert to TypeScript
   - Implement `ScrollArea` for scrolling
   - Maintain auto-scroll behavior
   - Types to add:
     - Message interfaces
     - Scroll behavior handlers
     - State types
   - Preserve animations and loading states

### Phase 2: Home Screen (High)

1. **HomeScreen.jsx → HomeScreen.tsx**
   - Convert to TypeScript
   - Implement layout with Tailwind
   - Integrate converted components
   - Types to add:
     - Props interface
     - State types
     - Event handlers
   - Preserve camera functionality
   - Maintain fullscreen editing capability

## Component Breakdown Tasks

### SendMessage.tsx ✅

- [x] Create SendMessageProps interface
- [x] Convert useState hooks with proper typing
- [x] Replace form element with Tailwind styling
- [x] Replace input with shadcn Textarea
- [x] Convert buttons to shadcn Button
- [x] Implement DropdownMenu for attachments
- [x] Preserve media attachment functionality
- [x] Maintain sales pitch component styling
- [x] Test mobile-specific behavior

### ChatFeed.tsx (Partial)

- [ ] Create necessary TypeScript interfaces
- [ ] Implement ScrollArea for message container
- [ ] Convert CustomScrollToBottom to use shadcn primitives
- [ ] Preserve auto-scroll functionality
- [ ] Maintain loading indicators
- [ ] Implement message grouping logic
- [x] Fix scroll-to-bottom button styling and behavior
- [x] Fix message context menu actions (copy/memories/delete)

### ChatMessage.tsx ✅

- [x] Replace div containers with shadcn Card where appropriate
- [x] Convert avatar to shadcn Avatar
- [x] Implement action menu with shadcn DropdownMenu
- [x] Convert custom buttons to shadcn Button
- [x] Replace Framer Motion with shadcn/ui transitions and animations
- [x] Preserve timestamps and styling

### HomeScreen.tsx

- [ ] Create HomeScreenProps interface
- [ ] Convert component to TypeScript
- [ ] Replace layout divs with Tailwind classes
- [ ] Integrate camera overlay with shadcn components
- [ ] Preserve fullscreen editing functionality
- [ ] Maintain suspense fallback

## References

- shadcn/ui documentation: https://ui.shadcn.com/
- Custom Modal implementation (to be used instead of Dialog): src/components/ui/modals/Modal.tsx
- Tailwind documentation: https://tailwindcss.com/docs

## Implementation Progress

### 1. ChatMessage.tsx (Completed)

- Replaced legacy CSS with Tailwind-only layout and shadcn/ui components
- Removed `ChatMessage.css` and migrated bubble + avatar to Tailwind
- Simplified flex logic: outer `flex-col` for vertical stacking, inner margin for avatar placement
- Scoped and cleaned up global margin resets to allow component margins

### 2. ChatFeed.jsx → ChatFeed.tsx (Partial)

- Added central `gap` in `.messages-container` for consistent vertical spacing
- Removed per-item `mb-2` and override hacks in CSS
- Scoped scroll container logic while preserving infinite-scroll and custom ScrollToBottom behavior
- Updated global CSS to remove aggressive universal margin/padding reset

### 3. SendMessage.tsx (In Progress)

- Switched away from unused `SendMessage.css`, adopting Tailwind classes
- Implemented auto-resizing `<Textarea>` up to 200px height, toggling `overflow-y-auto` when content exceeds limit
- Ensured mobile keyboard remains open while scrolling inside message composer

---

> **Next Steps:**
>
> - Complete full TypeScript conversion of `ChatFeed.jsx` and migrate to Tailwind/shadcn primitives
> - Remove remaining component-specific CSS files (`ChatFeed.css`, `SendMessage.css`)
> - Validate responsiveness and test keyboard/scroll interactions on mobile

_Documentation updated to capture the CSS cleanup, layout refactoring, and component migrations completed today._

## Pending CSS Conflicts & TODOs

Several legacy CSS files still apply broad or component-specific styles that can override or conflict with Tailwind utilities:

- **src/styles/components.css**: Defines global classes for headers, modals, editors, and filter groups. These hard-coded display/flex and padding rules will override Tailwind's utility classes.
- **src/styles/buttons.css**: Provides custom button styling (padding, border-radius, transitions) on non-Tailwind classes (`.icon-button`, `.app-icon`, etc.), which may clash with shadcn/ui `Button` variants.
- **src/styles/animations.css**: Contains keyframes (`spin`, `windUp`, etc.) and animation utility selectors that duplicate or conflict with `tw-animate-css` and Tailwind's built-in animation classes.
- **src/styles/layouts/**: Any layout-specific CSS (flex containers, margins) could override responsive Tailwind utilities.
- **src/screens/HomeScreen.css** and **ChatFeed.css**: These component-level CSS files define layout, padding, and scroll behavior that should be replaced by Tailwind and shadcn primitives.

> **TODOs:**
>
> - [ ] Migrate `components.css` rules into Tailwind utility classes or shadcn component props, then delete the file.
> - [ ] Replace `buttons.css` with shadcn `Button` component variants and remove residual CSS.
> - [ ] Consolidate animation keyframes in `animations.css` into Tailwind or `tw-animate-css`, then remove unused definitions.
> - [ ] Audit `layouts/` CSS and integrate into component-level Tailwind styles; remove legacy layout files.
> - [ ] Convert `HomeScreen.css` and `ChatFeed.css` to Tailwind-based styling and delete the CSS files once migration is validated.

With these tasks done, Tailwind and shadcn/ui primitives will fully control the visual styling without overrides from legacy CSS.
