import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Memory Network Subjects Button",
        description:
          "Fixed the subjects button in memory viewers to properly display related topics and subjects. The button now correctly shows memory connections and subject relationships.",
      },
    ],
  },
]

const V0_15_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_1
