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
- [x] Preserve auto-scroll functionality
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

## Implementation Progress (Updated May 2025)

### Completed Components (✅)

#### 1. ChatMessage.tsx (✅)

- Replaced legacy CSS with Tailwind-only layout and shadcn/ui components
- Removed `ChatMessage.css` and migrated bubble + avatar to Tailwind
- Simplified flex logic: outer `flex-col` for vertical stacking, inner margin for avatar placement
- Implemented shadcn/ui components: Avatar, Card, DropdownMenu
- Added animation classes for smooth message entry

#### 2. SendMessage.tsx (✅)

- Migrated to TypeScript with proper type definitions
- Implemented shadcn/ui components: Button, Textarea, DropdownMenu, Card, Avatar, Tooltip
- Added auto-resizing `<Textarea>` up to 200px height with overflow handling
- Ensured mobile keyboard behavior works correctly
- Integrated with all hooks and contexts

#### 3. MemoryNodeModal.tsx (✅)

- Converted to TypeScript
- Using shadcn/ui Button components
- Using custom Modal component instead of shadcn Dialog
- Using Tailwind classes for styling
- No remaining MUI dependencies

#### 4. HomeScreen.tsx (✅)

- Converted to TypeScript
- Using Tailwind classes for layout elements
- Removed HomeScreen.css completely
- Camera overlay functionality is fully implemented
- Preserves fullscreen editing capability

### Partially Completed Components (⚠️)

#### 1. TokenModal.tsx (⚠️)

- Converted to TypeScript
- Using shadcn/ui Button component
- Using custom Modal component
- Still has TokenModal.css to migrate
- Still using Framer Motion animations

#### 2. CheckoutForm.tsx (⚠️)

- Converted to TypeScript
- Using shadcn/ui Button component
- Still has CheckoutForm.css to migrate
- Preserves form validation functionality

#### 3. ImageViewer.tsx (⚠️)

- Converted to TypeScript
- Using custom Modal component
- Still has ImageViewer.css to migrate
- Needs shadcn/ui Button components for controls
- Preserves zoom and pan functionality

#### 4. MarkdownRenderer.tsx (⚠️)

- Converted to TypeScript
- Intentionally retaining MarkdownRenderer.css for complex markdown styling
- Contains specialized styling for code blocks, tables, and other markdown elements
- May need partial Tailwind migration while preserving essential markdown styling

#### 5. DittoCanvasModal.tsx (⚠️)

- Converted to TypeScript
- Using shadcn/ui Button components
- Using custom Modal component
- Still has DittoCanvasModal.css to migrate
- Preserves draggable/resizable behavior

#### 6. MemoryNetwork.tsx (⚠️)

- Converted to TypeScript
- Still has MemoryNetwork.css to migrate
- Using custom Modal component
- Preserves visualization functionality
- Needs shadcn/ui components for UI elements outside visualization

#### 7. ChatFeed.jsx (⚠️)

- Retaining `ChatFeed.css` intentionally for complex scroll behavior
- Custom `CustomScrollToBottom` component handles important scroll behaviors that shadcn's ScrollArea cannot
- Per our scroll-behavior-best-practices, using native scrolling for infinite scrolling and position maintenance
- Added consistent vertical spacing in message container
- Still needs TypeScript conversion and partial shadcn integration where appropriate

### Not Started Components (❌)

#### 1. FullScreenEditor.jsx (❌)

- Still in JSX format
- Still has FullScreenEditor.css
- Still using MUI components (Button, IconButton, Tooltip)
- Needs conversion to TypeScript and shadcn/ui components

#### 2. ScriptsOverlay.jsx (❌)

- Still in JSX format
- Still has ScriptsOverlay.css
- Using custom Modal component but needs other shadcn/ui components
- Needs conversion to TypeScript

### MUI Removal Status (❌)

- MUI dependencies are still present in package.json:
  - @mui/material
  - @emotion/react
  - @emotion/styled
- MUI components still in use in FullScreenEditor and potentially other components

---

## Next Steps

### Critical Priority:

- Convert `ChatFeed.jsx` to TypeScript while **preserving** the custom scroll behavior
- Complete Phase 6: Remove MUI dependencies from package.json once all components are migrated

### High Priority:

- Migrate remaining CSS files to Tailwind for TokenModal, CheckoutForm, ImageViewer, DittoCanvasModal
- Replace custom buttons with shadcn/ui Button in ImageViewer and MarkdownRenderer
- Selectively migrate MarkdownRenderer.css while preserving essential markdown styling

### Medium Priority:

- Convert FullScreenEditor and ScriptsOverlay to TypeScript
- Replace MUI components in FullScreenEditor with shadcn/ui equivalents
- Complete remaining component migrations to use more Tailwind classes

### Migration Approach for Complex Components:

- For ChatFeed and MarkdownRenderer: Follow the recommendation in scroll-behavior-best-practices.md to use a hybrid approach that preserves essential functionality while migrating to TypeScript and using Tailwind for non-critical styling

_Documentation updated May 2025 to reflect current migration status._

## Pending CSS Conflicts & TODOs

Several legacy CSS files still apply broad or component-specific styles that can override or conflict with Tailwind utilities:

- **src/styles/components.css**: Defines global classes for headers, modals, editors, and filter groups. These hard-coded display/flex and padding rules will override Tailwind's utility classes.
- **src/styles/buttons.css**: Provides custom button styling (padding, border-radius, transitions) on non-Tailwind classes (`.icon-button`, `.app-icon`, etc.), which may clash with shadcn/ui `Button` variants.
- **src/styles/animations.css**: Contains keyframes (`spin`, `windUp`, etc.) and animation utility selectors that duplicate or conflict with `tw-animate-css` and Tailwind's built-in animation classes.
- **src/styles/layouts/**: Any layout-specific CSS (flex containers, margins) could override responsive Tailwind utilities.
- **src/screens/HomeScreen.css**: Component-level CSS defining layout and padding that should be migrated to Tailwind classes.
- **src/components/\*.css**: Several remaining component CSS files that need to be evaluated.

> **TODOs:**
>
> - [ ] Migrate `components.css` rules into Tailwind utility classes or shadcn component props, then delete the file.
> - [ ] Replace `buttons.css` with shadcn `Button` component variants and remove residual CSS.
> - [ ] Consolidate animation keyframes in `animations.css` into Tailwind or `tw-animate-css`, then remove unused definitions.
> - [ ] Audit `layouts/` CSS and integrate into component-level Tailwind styles; remove legacy layout files.
> - [ ] Convert `HomeScreen.css` to Tailwind-based styling and delete the CSS file once migration is validated.
> - [ ] Review other component CSS files and maintain only those essential for complex behaviors (e.g., `ChatFeed.css`).
> - [ ] Create custom Tailwind variants for specialized functionality that can't be easily achieved with utility classes.

### Special Considerations for Custom Scroll Behavior

Based on our scroll-behavior-best-practices documentation, we should approach scrolling components with care:

1. **Intentionally Preserve**: Retain custom scroll implementations (like in `ChatFeed.jsx`) that handle:
   - Infinite scrolling with position maintenance
   - Dynamic content loading at the top
   - Keyboard appearance adjustments on mobile
   - Image loading scroll position handling

2. **Selective Migration**: For these components, use a hybrid approach:
   - Keep core scroll functionality with its CSS
   - Apply Tailwind for non-scroll-related styling
   - Convert to TypeScript for type safety
   - Use shadcn components for UI elements that don't impact scrolling

3. **Documentation**: For any preserved CSS file, add a comment explaining why it's being maintained.

With this approach, we'll achieve a balance between modern styling architecture and reliable user experience for complex interactions.
