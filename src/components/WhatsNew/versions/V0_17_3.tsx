import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Memory Stats Module",
        description:
          "Ditto now automatically includes your top 15 conversation subjects and memory count in the system prompt, helping the AI understand your interests and conversation patterns better. This intelligent context sharing improves response relevance without any action required from you.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Subject Context",
        description:
          "The system now provides richer subject information including descriptions when available, giving the AI deeper understanding of your conversation topics and improving the quality of responses.",
      },
      {
        type: "improved",
        title: "Developer Console Logging",
        description:
          "Added comprehensive logging for memory stats in development mode, making it easier to verify and debug the memory context system.",
      },
    ],
  },
]

const V0_17_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_17_3
