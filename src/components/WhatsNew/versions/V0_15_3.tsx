import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Link Color Contrast",
        description:
          "Improved link color contrast in light mode for better visibility and accessibility - links now stand out more clearly from regular text",
      },
    ],
  },
]

const V0_15_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_3
