import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Memory Dashboard",
        description:
          "Access your conversation memories through the new Memory Dashboard, available from the Ditto Menu button. Search through your past conversations and view them in either list or network graph format.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Memory Visualization",
        description:
          "The new Memory Dashboard features an interactive network visualization that lets you explore relationships between related memories and see how they connect.",
      },
      {
        type: "improved",
        title: "Memory Search",
        description:
          "Search your memories using natural language and see results sorted by relevance, making it easier to find past conversations.",
      },
    ],
  },
  {
    title: "UI Updates",
    features: [
      {
        type: "improved",
        title: "Menu Reorganization",
        description:
          "We've replaced the Scripts screen with the more powerful Memory Dashboard, streamlining access to your conversation history.",
      },
    ],
  },
]

const V0_14_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_0
