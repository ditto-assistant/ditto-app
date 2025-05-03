import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Scripts",
        description:
          "Ditto now automatically opens and plays scripts in the canvas when they are created. This improves the user experience by eliminating the need to manually open scripts after they are generated.",
      },
    ],
  },
]

const V0_11_65 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_65
