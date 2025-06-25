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
   import { z } from "zod"

   // Define the response schema
   export const UpdateUserPreferencesResponseSchema = z.object({
     success: z.boolean(),
     // Add any other fields returned by the API
   })

   // Create type from schema
   export type UpdateUserPreferencesResponse = z.infer<
     typeof UpdateUserPreferencesResponseSchema
   >
   ```

3. **Implement API Function**:

   ```typescript
   // Define payment required error as a constant if needed
   export const ErrorPaymentRequired = new Error("Payment required")

   export async function updateUserPreferences(
     userID: string,
     preferences: {
       preferredMainModel?: string
       preferredProgrammerModel?: string
       preferredImageModel?: string
       theme?: "light" | "dark" | "system"
     }
   ): Promise<UpdateUserPreferencesResponse | Error> {
     try {
       const response = await fetch(`/api/v2/users/${userID}`, {
         method: "PATCH",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(preferences),
       })

       // Special error handling for payment issues
       if (response.status === 402) {
         return ErrorPaymentRequired
       }

       if (!response.ok) {
         const errorText = await response.text()
         return new Error(
           `Failed to update preferences: HTTP ${response.status} - ${errorText}`
         )
       }

       // For endpoints returning 204 No Content
       if (response.status === 204) {
         return { success: true }
       }

       const data = await response.json()

       // Validate response with Zod
       const validatedData = UpdateUserPreferencesResponseSchema.safeParse(data)
       if (!validatedData.success) {
         console.error("Validation error:", validatedData.error)
         return new Error("Invalid response from server")
       }

       return validatedData.data
     } catch (error) {
       console.error("Error updating user preferences:", error)
       return error instanceof Error
         ? error
         : new Error("Unknown error occurred")
     }
   }
   ```

4. **Create a Custom Hook in `src/hooks/`**:

   ```typescript
   // src/hooks/useUpdatePreferences.tsx
   import { useMutation, useQueryClient } from "@tanstack/react-query"
   import {
     updateUserPreferences,
     ErrorPaymentRequired,
   } from "@/api/updateUserPreferences"
   import { useAuth } from "@/hooks/useAuth"
   import { toast } from "sonner"

   export function useUpdatePreferences() {
     const { user } = useAuth()
     const queryClient = useQueryClient()

     return useMutation({
       mutationFn: async (preferences: {
         preferredMainModel?: string
         preferredProgrammerModel?: string
         preferredImageModel?: string
         theme?: "light" | "dark" | "system"
       }) => {
         if (!user?.uid) throw new Error("User not authenticated")

         const result = await updateUserPreferences(user.uid, preferences)

         // Check if result is an Error and throw it to trigger onError
         if (result instanceof Error) {
           throw result
         }

         return result
       },
       onSuccess: () => {
         toast.success("Preferences updated successfully")
         // Invalidate relevant queries to refresh data
         queryClient.invalidateQueries({ queryKey: ["userProfile"] })
       },
       onError: (error) => {
         // Special handling for payment errors
         if (error === ErrorPaymentRequired) {
           toast.error("Please add more tokens to your account")
           return
         }

         // Generic error handling
         if (error instanceof Error) {
           toast.error(error.message)
         } else {
           toast.error("An unknown error occurred")
         }
       },
     })
   }
   ```

5. **Use the Hook in Components**:

   ```tsx
   import { useUpdatePreferences } from "@/hooks/useUpdatePreferences"

   function PreferencesComponent() {
     const { mutate: updatePreferences, isPending } = useUpdatePreferences()

     const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
       e.preventDefault()
       updatePreferences({
         theme: "dark",
         preferredMainModel: "gpt-4o",
       })
     }

     return (
       <form onSubmit={handleSubmit}>
         {/* Form fields */}
         <button type="submit" disabled={isPending}>
           {isPending ? "Updating..." : "Save Preferences"}
         </button>
       </form>
     )
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
