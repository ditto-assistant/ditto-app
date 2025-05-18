import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Memory Search",
        description:
          "Memory search results now display in a hierarchical format, making it easier to understand relationships between connected memories.",
      },
      {
        type: "improved",
        title: "Better Memory Relevance",
        description:
          "Improved memory indexing algorithm provides more accurate and relevant search results when exploring your conversation history.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Memory Search Ranking",
        description:
          "Fixed memory search ranking to properly prioritize the most relevant results at each hierarchy level.",
      },
    ],
  },
]

const V0_14_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_1
