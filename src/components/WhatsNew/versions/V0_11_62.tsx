import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Send Message",
        description: "Fixed sending messages to Ditto!",
      },
    ],
  },
]

const V0_11_62 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_62
