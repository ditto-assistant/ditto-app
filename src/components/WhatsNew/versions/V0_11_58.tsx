import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for version 0.11.58
const sections: Section[] = [
  {
    title: "Navigation Improvements",
    features: [
      {
        type: "improved",
        title: "Bottom Navigation",
        description:
          "We've moved the main navigation elements to the bottom of the screen for easier access, especially on mobile devices.",
      },
      {
        type: "improved",
        title: "Centered Home Button",
        description:
          "The Ditto logo button is now centered at the bottom of the screen, serving as a home button for better usability.",
      },
      {
        type: "improved",
        title: "Script Indicator",
        description:
          "Scripts are now displayed as a compact icon in the bottom bar, showing the script name and options when tapped.",
      },
    ],
  },
  {
    title: "User Experience",
    features: [
      {
        type: "new",
        title: "Sliding Menus",
        description:
          "Added upward sliding menus for both the Ditto button and script indicator, making options more accessible.",
      },
      {
        type: "improved",
        title: "One-Handed Use",
        description:
          "Repositioning these controls to the bottom of the screen makes the app easier to use with one hand.",
      },
      {
        type: "improved",
        title: "Cleaner Interface",
        description:
          "Removed floating elements from the top of the screen for a cleaner, more focused chat experience.",
      },
    ],
  },
]

// Version details component for v0.11.58
const V0_11_58 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_58
