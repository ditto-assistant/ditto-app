# Ditto App - Development Guide

## Business Overview

Ditto is a therapy-focused AI assistant that understands who YOU are, similar to NotebookLM but with a deep understanding of the individual user. Our platform helps individuals process thoughts, explore ideas, and receive personalized emotional support through meaningful conversations that evolve over time.

Our core technology is built around advanced long-term memory algorithms that enable Ditto to remember personal details, preferences, and past conversations, creating genuinely personalized experiences tailored to each user's unique needs and emotional context.

Key features include:

- **Personalized therapeutic conversations** powered by memory of your unique history
- **AI-powered reflective journaling** and thought processing
- **Emotional support companion** that adapts to your communication style
- **Research assistant** that remembers your interests and past explorations
- **Customizable knowledge integration** for personal growth
- **Personal development insights** based on conversation patterns

## Licensing Model

Ditto uses a dual-licensing approach:

- **Apache License 2.0**: For individuals and businesses with <$1M annual revenue
- **Commercial License**: Required for organizations with >$1M annual revenue

Contributions to the repository are covered under MIT-0 (MIT No Attribution) Contributor License Agreement.

## Essential Commands

- Build: `bun run build` or `vite build`
- Dev server: `bun run start`
- Preview: `vite preview`
- Lint: `bun run lint` or `bun lint`
- Fix linting: `bun run lint-fix` or `bun lint-fix`
- Format: `bun run format` or `prettier --write "**/*.{ts,tsx,js,jsx,md,json,css}" --config .prettierrc`

## Version Update Flow

1. Bump version in `package.json`
2. Run: `bun run generate:whats-new` to create new version file
3. Edit the newly generated file at `src/components/WhatsNew/versions/Vx_xx_xx.tsx`
4. Run: `bun run format` to ensure consistent formatting
5. Run: `bun run depcheck` to check for unused dependencies
6. Use `git add .` to stage all changes
7. Create descriptive commit (if no files are staged, prompt the user); Do not mention Claude

## Project Structure

- **src/api/**: API client code and external service integrations
- **src/components/**: Reusable UI components, organized by function
- **src/components/ui/**: Low-level, generic UI components (buttons, modals, etc.)
- **src/control/**: Core application logic, agent functionality, and flow controllers
- **src/control/templates/**: Templates used for different agent capabilities
- **src/hooks/**: Custom React hooks for shared functionality
- **src/screens/**: Top-level page components
- **src/styles/**: Global CSS, variables, and platform-specific styling
- **src/types/**: TypeScript type definitions
- **src/utils/**: Utility functions and helpers

## Key Files & Components

- **src/App.tsx**: Main application component with router configuration
- **src/components/ChatFeed.jsx**: Main conversation display component
- **src/components/ComposeModal.tsx**: Modal for composing longer messages
- **src/components/SendMessage.jsx**: Primary user input component
- **src/components/ui/modals/Modal.tsx**: Core modal component with standardized behavior
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
- **CSS**: Component-specific CSS files with the same name as the component
- **Error Handling**: Use try/catch for async operations, provide meaningful error messages
- **Imports**: Group imports by external libs first, then internal modules
- **Components**: Keep components focused on a single responsibility

## Mobile & Cross-Platform UI Guidelines

- **iOS Safe Areas**: Use CSS variables (`--safe-area-top`, `--safe-area-bottom`, etc.) for iOS notch and home indicator space
- **Keyboard Behavior**:
  - For text inputs that should adjust to keyboard, use `position: relative` instead of `sticky/fixed`
  - Use `-webkit-fill-available` height for iOS viewport issues
  - `SendMessage.jsx` shows the correct pattern for keyboard-aware text inputs
- **Modal System**:
  - All modals are automatically fullscreen by default (fullScreen prop defaults to true in Modal component)
  - For custom modal behavior, use the Modal component's props as needed
- **Platform Detection**: Use `usePlatform` hook (`const { isMobile } = usePlatform()`) for platform-specific logic

## Project Roadmap

- MVP Development (Q1 2025): Core AI capabilities, memory algorithms, chat interface, brainstorming tools
- Enhanced Features (Q2 2025): Collaborative workspaces, emotional intelligence components
- Scaling and Optimization (Q3 2025): Advanced AI features, task automation, cross-platform integrations
- Community and Open Source Initiatives (Q4 2025): Building open-source community, expanding integrations
