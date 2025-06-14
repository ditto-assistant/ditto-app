import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "iOS PWA Bottom Spacing",
        description:
          "Fixed excessive bottom spacing in the app when installed as a PWA on iPhone devices with home indicators",
      },
    ],
  },
]

const V0_14_6 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_6
