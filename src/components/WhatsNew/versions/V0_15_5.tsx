import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Simplified & Seamless Memory Dashboard Search",
        description:
          "Completely redesigned the memory dashboard search experience to be more intuitive and seamless. The new consolidated search lets you find memories and explore related subjects in one unified interface. Search results now persist while you browse subjects, and clearing your search brings everything back to the default view - making memory exploration effortless and natural.",
      },
    ],
  },
]

const V0_15_5 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_5
