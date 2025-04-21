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

2. **TokenModal**

   - Remove MUI dependencies
   - Use existing custom Modal component and shadcn Button components
   - Preserve subscription tier functionality

3. **ChatMessage**
   - Migrate to Tailwind with preserved animations
   - Maintain styling but use shadcn primitives where possible
   - Keep Framer Motion animations for transitions

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

## Phase 4: Screen-Level Components (Medium)

1. **HomeScreen**

   - Convert layout to Tailwind
   - Remove any remaining MUI components
   - Ensure responsive design

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

## References

- shadcn/ui documentation: https://ui.shadcn.com/
- Custom Modal implementation (to be used instead of Dialog): src/components/ui/modals/Modal.tsx
- Tailwind documentation: https://tailwindcss.com/docs
