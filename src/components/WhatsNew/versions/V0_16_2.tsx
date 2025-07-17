import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Better Header and Footer Colors",
        description:
          "Refreshed the header and footer with improved colors that look great in both light and dark themes",
      },
      {
        type: "improved",
        title: "Font Size Buttons Fixed in Dark Mode",
        description:
          "You can now clearly see which font size is selected when using dark mode - no more guessing!",
      },
      {
        type: "improved",
        title: "Improved Accessibility",
        description:
          "Enhanced screen reader support and keyboard navigation for a better experience for all users",
      },
    ],
  },
]

const V0_16_2 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_16_2
