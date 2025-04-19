import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for version 0.11.57
const sections: Section[] = [
  {
    title: "CSS Improvements",
    features: [
      {
        type: "improved",
        title: "CSS Organization",
        description:
          "We've consolidated multiple component-specific CSS files into global stylesheets, reducing the number of files and improving maintainability.",
      },
      {
        type: "improved",
        title: "Consistent Styling",
        description:
          "Replaced hardcoded color values with CSS variables for more consistent theming and easier future customization.",
      },
      {
        type: "improved",
        title: "Performance Optimization",
        description:
          "Removed redundant CSS rules and simplified style definitions to improve page load performance and reduce CSS bundle size.",
      },
      {
        type: "new",
        title: "Component Base Classes",
        description:
          "Introduced reusable base classes with class specificity for UI elements like headers (.header.app), buttons (.icon-button.app), and spinners (.spinner.button).",
      },
    ],
  },
  {
    title: "UI Changes",
    features: [
      {
        type: "improved",
        title: "Modal Styles",
        description:
          "Improved modal design with more consistent spacing, colors, and responsiveness across all devices.",
      },
      {
        type: "improved",
        title: "Button Consistency",
        description:
          "Unified button styling across the application for a more professional and cohesive look and feel.",
      },
      {
        type: "improved",
        title: "Mobile Experience",
        description:
          "Enhanced mobile-specific styles for better touch interactions and improved usability on smaller screens.",
      },
      {
        type: "new",
        title: "Media Query Standardization",
        description:
          "Added standardized breakpoints for responsive design across all components (mobile: 480px, tablet: 768px, desktop: 769px), making our CSS more maintainable.",
      },
    ],
  },
]

// Version details component for v0.11.57
const V0_11_57 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_57
