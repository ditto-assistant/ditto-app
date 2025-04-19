# App Update System

This directory contains components related to the app update notification system and the "What's New" feature that shows users what has changed in each version.

## Features

1. **Update Notifications**: Users are notified when a new version is available
2. **Forced Updates**: For outdated versions causing lazy loading errors
3. **What's New Dialog**: Shows version change details after updating
4. **Version-specific Content**: Each version can have its own component

## How to Add a New Version

When you release a new version of the app, follow these steps to create a "What's New" entry:

1. Create a new file in the `versions` directory. Name it using the format `V{version}.tsx` where `{version}` is the version number with dots replaced by underscores.

   Example: For version 1.2.3, create `V1_2_3.tsx`

2. Use the template structure from `VersionTemplate.tsx` to create your version component:

```tsx
import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for your version
const sections: Section[] = [
  {
    title: "Section Title",
    features: [
      {
        type: "new", // Options: "new", "improved", "fixed"
        title: "Feature Title",
        description: "Feature description"
      }
      // Add more features...
    ]
  }
  // Add more sections...
]

// Create and export your component
const V1_2_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V1_2_3
```

3. Update the `WhatsNew.tsx` file to include your new component:

```tsx
// Import all version components
import V1_2_3 from "./versions/V1_2_3"
// Other imports...

// Map versions to their components
const versionComponents: Record<string, React.ComponentType> = {
  "1.2.3": V1_2_3
  // Other versions...
}
```

## Testing the What's New Dialog

To test the What's New dialog for a specific version:

1. Import the `useWhatsNew` hook:

```tsx
import useWhatsNew from "@/hooks/useWhatsNew"
```

2. Use the hook and call the `openWhatsNew` function with the version you want to display:

```tsx
const { openWhatsNew } = useWhatsNew()

// Later in your code:
openWhatsNew("1.2.3") // Shows the What's New dialog for version 1.2.3
```

## Architecture

- `updateService.ts`: Core service that handles service worker registration, update detection, and notification
- `UpdateNotification.tsx`: Visual component that shows update notifications
- `WhatsNew.tsx`: Main component that manages the What's New dialog
- `useWhatsNew.tsx`: Hook to control the What's New dialog
- `useLazyLoadErrorHandler.tsx`: Hook that provides error boundaries for lazy loading errors
- `VersionTemplate.tsx`: Template and shared components for version screens
