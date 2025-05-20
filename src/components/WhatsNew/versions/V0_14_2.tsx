import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
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
