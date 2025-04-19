import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "PWA Update Detection",
        description:
          "Improved update detection from hourly to every 15 minutes, ensuring you get the latest features sooner.",
      },
      {
        type: "improved",
        title: "iOS Compatibility",
        description:
          "Enhanced iOS support for compose modal with proper safe area insets, ensuring a better experience on iPhone.",
      },
    ],
  },
]

const V0_11_63 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_63
