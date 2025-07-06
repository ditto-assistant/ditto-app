import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Unified Search Experience",
        description:
          "Consolidated the memories dashboard search into a single, intuitive search bar. Now when you search, you'll see both matching memories and related subjects together, making it easier to discover connections and find what you're looking for.",
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
