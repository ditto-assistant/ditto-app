import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "UI Updates",
    features: [
      {
        type: "improved",
        title: "Memory Search Results",
        description:
          "Search results in the Memory Dashboard now display as chat bubbles, making it easier to view and interact with your conversation history.",
      },
      {
        type: "improved",
        title: "Bottom Bar Design",
        description:
          "Updated design of the bottom navigation bar for a cleaner, more modern look.",
      },
      {
        type: "improved",
        title: "New Avatar Designs",
        description:
          "Refreshed avatar designs for both user and Ditto, providing a more polished visual experience.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Memory Graph View",
        description:
          "Fixed and optimized the graph visualization in Memory Dashboard for better performance and usability.",
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
