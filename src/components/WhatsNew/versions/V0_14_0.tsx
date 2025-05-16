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
          "Access all your past conversations in one place with the new Memory Dashboard. Search your memories using natural language and view them in either a list or interactive network graph.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Streamlined Navigation",
        description:
          "The Scripts screen has been replaced by the Memory Dashboard, making it easier to find and revisit your conversations.",
      },
      {
        type: "fixed",
        title: "Memory Network Graph",
        description: "The Memory Network Graph performance has been improved.",
      },
      {
        type: "improved",
        title: "Significantly Faster App Launch",
        description:
          "The app now launches much faster thanks to a greatly reduced app size, making your experience smoother from the very start.",
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
