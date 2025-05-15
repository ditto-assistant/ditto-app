import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Visual Refresh",
        description:
          "Brand new look for the bottom toolbar with elegant shadows and animations.",
      },
      {
        type: "new",
        title: "New Avatars",
        description:
          "Updated Ditto and user avatars with a fresh, modern design.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Buttons",
        description:
          "Refreshed buttons with a new rounded design and interactive effects for a more engaging experience.",
      },
    ],
  },
]

const V0_13_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_13_1
