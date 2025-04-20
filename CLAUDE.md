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

## Mobile & Cross-Platform UI Guidelines

- **iOS Safe Areas**: Use CSS variables (`--safe-area-top`, `--safe-area-bottom`, etc.) for iOS notch and home indicator space
- **Keyboard Behavior**:
  - For text inputs that should adjust to keyboard, use `position: relative` instead of `sticky/fixed`
  - Use `-webkit-fill-available` height for iOS viewport issues
  - `SendMessage.jsx` shows the correct pattern for keyboard-aware text inputs
- **Modal System**:
  - Custom Modal component supports dragging, resizing, and fullscreen
  - Built with Tailwind CSS and shadcn/ui primitives (Tabs)
  - Supports fully customizable headers with headerLeftContent and headerRightContent props
  - All modals are automatically fullscreen by default (fullScreen prop defaults to true)
  - Can be marked as notResizable to disable resize controls
  - Supports tabs with locked/premium content
- **Platform Detection**: Use `usePlatform` hook (`const { isMobile } = usePlatform()`) for platform-specific logic

## API Integration Patterns

- **Zod Schema Validation**:
  - Define Zod schemas for API response validation
  - Use `z.infer<typeof Schema>` for TypeScript type definitions
  - Handle validation errors gracefully with detailed error messages
- **React Query for Data Fetching**:
  - Use `useQuery` for single data fetching operations
  - Use `useInfiniteQuery` for paginated data with `getNextPageParam`
  - Implement custom hooks that abstract away the React Query implementation
- **API Endpoint Implementation**:
  - Create dedicated functions for each API endpoint in `src/api/`
  - Return a union type: `OkayType | Error` for clear error handling
  - Expose hooks in `src/hooks/` directory for components to consume
- **Pagination Pattern**:
  - Backend pagination uses `Paginated<T>` with `items`, `page`, `nextPage`, and `pageSize`
  - Frontend uses React Query's infinite query with `fetchNextPage` and `hasNextPage`
  - Flatten paginated data with `data?.pages.flatMap(page => page.items)`

## Creating New API Client Functions

When adding a new backend API endpoint, follow these steps to create a corresponding frontend client function:

1. **Create a New File in `src/api/`**:
   - Name it according to function (e.g., `updateUserPreferences.ts`)
   - Use existing files as templates (e.g., `getUser.ts`, `refreshSubscription.ts`)

2. **Define Response Schema with Zod**:
   ```typescript
   import { z } from "zod";

   // Define the response schema
   export const UpdateUserPreferencesResponseSchema = z.object({
     success: z.boolean(),
     // Add any other fields returned by the API
   });

   // Create type from schema
   export type UpdateUserPreferencesResponse = z.infer<typeof UpdateUserPreferencesResponseSchema>;
   ```

3. **Implement API Function**:
   ```typescript
   // Define payment required error as a constant if needed
   export const ErrorPaymentRequired = new Error("Payment required")

   export async function updateUserPreferences(
     userID: string,
     preferences: {
       preferredMainModel?: string;
       preferredProgrammerModel?: string;
       preferredImageModel?: string;
       theme?: "light" | "dark" | "system";
     }
   ): Promise<UpdateUserPreferencesResponse | Error> {
     try {
       const response = await fetch(`/api/v2/users/${userID}`, {
         method: "PATCH",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(preferences),
       });

       // Special error handling for payment issues
       if (response.status === 402) {
         return ErrorPaymentRequired;
       }

       if (!response.ok) {
         const errorText = await response.text();
         return new Error(`Failed to update preferences: HTTP ${response.status} - ${errorText}`);
       }

       // For endpoints returning 204 No Content
       if (response.status === 204) {
         return { success: true };
       }

       const data = await response.json();
       
       // Validate response with Zod
       const validatedData = UpdateUserPreferencesResponseSchema.safeParse(data);
       if (!validatedData.success) {
         console.error("Validation error:", validatedData.error);
         return new Error("Invalid response from server");
       }

       return validatedData.data;
     } catch (error) {
       console.error("Error updating user preferences:", error);
       return error instanceof Error 
         ? error 
         : new Error("Unknown error occurred");
     }
   }
   ```

4. **Create a Custom Hook in `src/hooks/`**:
   ```typescript
   // src/hooks/useUpdatePreferences.tsx
   import { useMutation, useQueryClient } from "@tanstack/react-query";
   import { updateUserPreferences, ErrorPaymentRequired } from "@/api/updateUserPreferences";
   import { useAuth } from "@/hooks/useAuth";
   import { toast } from "sonner";

   export function useUpdatePreferences() {
     const { user } = useAuth();
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: async (preferences: {
         preferredMainModel?: string;
         preferredProgrammerModel?: string;
         preferredImageModel?: string;
         theme?: "light" | "dark" | "system";
       }) => {
         if (!user?.uid) throw new Error("User not authenticated");
         
         const result = await updateUserPreferences(user.uid, preferences);
         
         // Check if result is an Error and throw it to trigger onError
         if (result instanceof Error) {
           throw result;
         }
         
         return result;
       },
       onSuccess: () => {
         toast.success("Preferences updated successfully");
         // Invalidate relevant queries to refresh data
         queryClient.invalidateQueries({ queryKey: ["userProfile"] });
       },
       onError: (error) => {
         // Special handling for payment errors
         if (error === ErrorPaymentRequired) {
           toast.error("Please add more tokens to your account");
           return;
         }
         
         // Generic error handling
         if (error instanceof Error) {
           toast.error(error.message);
         } else {
           toast.error("An unknown error occurred");
         }
       }
     });
   }
   ```

5. **Use the Hook in Components**:
   ```tsx
   import { useUpdatePreferences } from "@/hooks/useUpdatePreferences";

   function PreferencesComponent() {
     const { mutate: updatePreferences, isPending } = useUpdatePreferences();

     const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
       e.preventDefault();
       updatePreferences({
         theme: "dark",
         preferredMainModel: "gpt-4o",
       });
     };

     return (
       <form onSubmit={handleSubmit}>
         {/* Form fields */}
         <button type="submit" disabled={isPending}>
           {isPending ? "Updating..." : "Save Preferences"}
         </button>
       </form>
     );
   }
   ```

6. **Error Handling Best Practices**:
   - Return union types in the form of `SuccessType | Error` 
   - Use standard Error objects (`new Error("message")`) rather than custom error classes
   - Handle errors with `instanceof Error` checks
   - Define special case errors as constants where needed (e.g., `ErrorPaymentRequired`)
   - Use try/catch blocks and return errors rather than throwing them
   - Use React Query's error handling for mutations with `onError` callbacks
   - Display user-friendly error messages with toast notifications

## Project Roadmap

- MVP Development (Q1 2025): Core AI capabilities, memory algorithms, chat interface, brainstorming tools
- Enhanced Features (Q2 2025): Collaborative workspaces, emotional intelligence components
- Scaling and Optimization (Q3 2025): Advanced AI features, task automation, cross-platform integrations
- Community and Open Source Initiatives (Q4 2025): Building open-source community, expanding integrations
