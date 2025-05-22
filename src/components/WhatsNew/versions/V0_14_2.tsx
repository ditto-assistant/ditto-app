import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Better iOS Compatibility",
        description:
          "Enhanced support for older iOS devices with optimized viewport handling and improved accessibility.",
      },
      {
        type: "improved",
        title: "Reduced App Size",
        description:
          "Streamlined codebase and removed unused components to deliver a more efficient app experience.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Fullscreen Compose Modal",
        description:
          "Fixed an issue where the send button could be hidden when typing very long messages in the fullscreen compose editor.",
      },
    ],
  },
]

const V0_14_2 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_2
