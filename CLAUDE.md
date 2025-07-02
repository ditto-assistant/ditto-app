# Ditto App - Development Guide

## Essential Commands

- Build: `bun run build`
- Dev server: assume the user is running their dev server already
- Lint: `bun run lint` or `bun lint`
- Fix linting: `bun lint-fix`
- Format: `bun run format`

## Version Update Flow

1. Check current version in `package.json`
2. Check branch changes against main using `git diff main --name-only` to identify what changed
3. Bump version in `package.json` (e.g., from 0.13.0 to 0.13.1)
4. Run: `bun run generate:whats-new` to create new version file
5. Edit the newly generated file at `src/components/WhatsNew/versions/Vx_xx_xx.tsx`:
   - Focus on user-facing changes and benefits
   - Create user-friendly descriptions of visual updates or features
   - Organize into relevant sections (New Features, Improvements, Bug Fixes)
   - Avoid technical implementation details in release notes
6. Run: `bun run format` to ensure consistent formatting
7. Run: `bun run depcheck` to check for unused dependencies
8. Use `git add .` to stage all changes
9. Create descriptive commit (if no files are staged, prompt the user); Do not mention Claude

## Project Structure

- **src/api/**: API client code and external service integrations
  - API endpoints with Zod validation (e.g., `services.ts`, `getBalance.ts`)
  - Result type pattern for error handling
- **src/components/**: Reusable UI components, organized by function
- **src/components/ui/**: Low-level, generic UI components (buttons, modals, etc.)
- **src/control/**: Core application logic, agent functionality, and flow controllers
- **src/control/templates/**: Templates used for different agent capabilities
- **src/hooks/**: Custom React hooks for shared functionality
  - Data fetching hooks with React Query
  - Pagination hooks (e.g., `useServices.tsx`)
- **src/screens/**: Top-level page components
- **src/styles/**: Global CSS, variables, and platform-specific styling
- **src/types/**: TypeScript type definitions
- **src/utils/**: Utility functions and helpers

## Key Files & Components

- **src/App.tsx**: Main application component with router configuration
- **src/components/ChatFeed.jsx**: Main conversation display component
- **src/components/ComposeModal.tsx**: Modal for composing longer messages
- **src/components/SendMessage.jsx**: Primary user input component
- **src/components/ui/modals/Modal.tsx**: Core resizable modal component with tab support, draggable and resizable windows
- **src/hooks/useModal.tsx**: Central hook for managing modal state throughout the app
- **src/control/agent.js**: Core agent logic and orchestration
- **src/hooks/useConversationHistory.tsx**: Manages conversation state and history
- **src/firebaseConfig.js**: Firebase configuration and initialization
- **src/styles/variables.css**: Global CSS variables for consistent theming

## React Patterns

- **Context Providers**: Used for global state (e.g., ComposeProvider, AuthProvider)
- **Custom Hooks**: Encapsulate complex logic and state management
- **Functional Components**: All components use functional style with hooks
- **Modal System**:
  - Centralized modal management via useModal hook
  - Modals are tracked by ID in a global state system
  - Modal windows automatically close when not needed, avoiding state persistence issues
- **Component Composition**: UI built through composition of smaller components

## Code Style Guidelines

- **Formatting**: 2 spaces, double quotes, ES5 trailing commas
- **TypeScript**: Strict mode enabled, use explicit types for function params and returns
- **React**: Functional components with hooks, avoid class components
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **UI Components**: Use shadcn/ui components (install with `bun shadcn add <component>`)
- **CSS**: Utility classes with Tailwind, avoid component-specific CSS files
- **Error Handling**: Use try/catch for async operations, provide meaningful error messages
- **Imports**: Group imports by external libs first, then internal modules
- **Components**: Keep components focused on a single responsibility
- **Icons**: Use Lucide React for icons (`import { Icon } from "lucide-react"`)
- **Toasts**: Use Sonner for toast notifications (`import { toast } from "sonner"`)

## UI Migration Best Practices

- **Preservation of Scroll Behavior**: For components with complex scroll behavior (like ChatFeed):
  - Preserve custom scroll implementations that handle infinite scrolling, position maintenance, and dynamic content loading
  - Use a hybrid approach: keep core scroll functionality CSS while applying Tailwind for non-scroll-related styling
  - Document preserved CSS files with explanatory comments
- **CSS Transition Strategy**:

  - Replace component-specific CSS files with Tailwind utility classes when possible
  - Use `cn()` utility from `lib/utils.ts` for conditional class names
  - Consolidate global animation keyframes into Tailwind or custom plugins
  - Review and refactor global CSS in `src/styles/` to prevent Tailwind utility overrides

- **Component Conversion**:
  - Convert JSX components to TypeScript with proper interfaces and type definitions
  - Replace MUI and other UI libraries with shadcn/ui equivalents
  - Follow the pattern in components like ChatMessage.tsx and SendMessage.tsx for proper shadcn integration
  - For complex components, use existing custom components (e.g., Modal.tsx) rather than shadcn primitives
