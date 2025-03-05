# Ditto App - Development Guide

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

## Code Style Guidelines

- **Formatting**: 2 spaces, double quotes, ES5 trailing commas
- **TypeScript**: Strict mode enabled, use explicit types for function params and returns
- **React**: Functional components with hooks, avoid class components
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **CSS**: Component-specific CSS files with the same name as the component
- **Error Handling**: Use try/catch for async operations, provide meaningful error messages
- **Imports**: Group imports by external libs first, then internal modules
- **Components**: Keep components focused on a single responsibility
