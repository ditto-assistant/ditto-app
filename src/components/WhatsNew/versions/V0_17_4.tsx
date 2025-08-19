import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Subject Satellite Visualization",
        description:
          "Memory network now displays related subjects as satellite nodes around each memory, showing you the key topics and connections at a glance",
      },
      {
        type: "new",
        title: "Enhanced Memory Details Modal",
        description:
          "Click on any memory node to see comprehensive statistics and details, with easy access to the original chat conversation",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Mobile-Friendly Design",
        description:
          "Enhanced touch interactions and responsive layouts make the memory network work beautifully on all devices",
      },
    ],
  },
]

const V0_17_4 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_17_4
