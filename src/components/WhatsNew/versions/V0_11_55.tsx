import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for version 0.11.55
const sections: Section[] = [
  {
    title: "UI Improvements",
    features: [
      {
        type: "new",
        title: "Redesigned App Header",
        description:
          "We've completely redesigned the app header to maximize screen space. The Ditto logo is now a floating circular button in the top left corner."
      },
      {
        type: "improved",
        title: "Slide-Out Menu",
        description:
          "Tapping or hovering over the Ditto logo reveals a slide-out menu with quick access to Feedback, Scripts, and Settings."
      },
      {
        type: "improved",
        title: "Script Actions Menu",
        description:
          "When a script is selected, it appears as a floating pill in the top right corner. Clicking it now opens a convenient slide-out menu with all script actions."
      }
    ]
  },
  {
    title: "Other Improvements",
    features: [
      {
        type: "improved",
        title: "More Vertical Space",
        description:
          "Removing the static header provides more vertical space for chat messages."
      },
      {
        type: "new",
        title: "Desktop Hover Menus",
        description:
          "On desktop, you can now simply hover over the Ditto logo to open the menu, making navigation faster and more intuitive."
      },
      {
        type: "improved",
        title: "Better Mobile Experience",
        description:
          "The new UI is optimized for mobile devices, with touch-friendly targets and smooth animations."
      }
    ]
  }
]

// Version details component for v0.11.55
const V0_11_55 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_55
