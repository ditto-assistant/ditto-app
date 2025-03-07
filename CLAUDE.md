# Ditto App - Development Guide

## Business Overview

Ditto Teams is an AI-powered platform for individuals and small businesses that facilitates ideation, creativity, and emotional support. Our core technology is built around advanced long-term memory algorithms that improve the relevancy of every interaction with Ditto, creating truly personalized experiences that evolve over time.

The application integrates into everyday workflows through various communication channels (email, SMS, messaging platforms) and features:

- **Advanced long-term memory algorithms** that continuously improve interaction relevance
- AI-powered brainstorming with personalized prompts
- Emotional support features for processing thoughts and challenges
- Collaborative workspaces for team productivity
- Customizable knowledge base integration
- Automatic knowledge base creation for small businesses

## Licensing Model

Ditto uses a dual-licensing approach:

- **Apache License 2.0**: For individuals and businesses with <$1M annual revenue
- **Commercial License**: Required for organizations with >$1M annual revenue

Contributions to the repository are covered under MIT-0 (MIT No Attribution) Contributor License Agreement.

## Essential Commands

- Build: `bun run build` or `vite build`
- Dev server: `bun run start`
- Preview: `vite preview`
- Lint: `bun lint` or `eslint . --ext .ts,.tsx,.js,.jsx`
- Fix linting: `bun lint-fix` or `eslint . --ext .ts,.tsx,.js,.jsx --fix`
- Format: `bun run format` or `prettier --write "**/*.{ts,tsx,js,jsx,md,json,css}" --config .prettierrc`

## Version Update Flow

1. Bump version in `package.json`
2. Run: `bun run generate:whats-new` to create new version file
3. Edit the newly generated file at `src/components/WhatsNew/versions/Vx_xx_xx.tsx`
4. Run: `bun run format` to ensure consistent formatting
5. Run: `bun run depcheck` to check for unused dependencies
6. Use `git add .` to stage all changes
7. Create descriptive commit (if no files are staged, prompt the user)

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
- **src/control/agent.js**: Core agent logic and orchestration
- **src/hooks/useConversationHistory.tsx**: Manages conversation state and history
- **src/firebaseConfig.js**: Firebase configuration and initialization
- **src/styles/variables.css**: Global CSS variables for consistent theming

## React Patterns

- **Context Providers**: Used for global state (e.g., ComposeProvider, AuthProvider)
- **Custom Hooks**: Encapsulate complex logic and state management
- **Functional Components**: All components use functional style with hooks
- **Modal System**: Centralized modal management via useModal hook
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
- **Modal Positioning**: For full-screen modals, avoid fixed positioning for footer elements on iOS
- **Platform Detection**: Use `usePlatform` hook (`const { isMobile } = usePlatform()`) for platform-specific logic

## Project Roadmap

- MVP Development (Q1 2025): Core AI capabilities, memory algorithms, chat interface, brainstorming tools
- Enhanced Features (Q2 2025): Collaborative workspaces, emotional intelligence components
- Scaling and Optimization (Q3 2025): Advanced AI features, task automation, cross-platform integrations
- Community and Open Source Initiatives (Q4 2025): Building open-source community, expanding integrations
