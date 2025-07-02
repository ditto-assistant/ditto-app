import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Subject-Based Memory Browser",
        description:
          "Browse your memories by topics with the new subject selector. Search, rename, and organize your knowledge graph subjects with ease.",
      },
      {
        type: "new",
        title: "Enhanced Memory Search",
        description:
          "Toggle between traditional search and subject-based browsing. Memories within subjects are now sorted chronologically with improved match scoring.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Mobile Experience",
        description:
          "Better PWA support for iOS with proper safe area handling and touch-friendly controls. Long-press to edit subjects on mobile devices.",
      },
      {
        type: "improved",
        title: "Memory Management",
        description:
          "Better handling of memory operations with improved loading states and error recovery throughout the app.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Account Management",
        description:
          "Improved account deletion process with better error handling and user data cleanup.",
      },
      {
        type: "fixed",
        title: "Cross-Platform Compatibility",
        description:
          "Fixed issues with Android compatibility while enhancing the iOS experience.",
      },
    ],
  },
]

const V0_15_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_0
