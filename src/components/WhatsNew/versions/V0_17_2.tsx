import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Faster Default Model",
        description:
          "Experience lightning-fast responses with the latest OpenAI model as your new default assistant",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Memory System",
        description:
          "Your conversations are now more contextual with improved memory settings for better, more relevant responses",
      },
      {
        type: "improved",
        title: "Smarter AI Responses",
        description:
          "We've refined how Ditto communicates with you, resulting in more helpful and natural conversations",
      },
    ],
  },
]

const V0_17_2 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_17_2
