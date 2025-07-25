import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Educational Friendship Guide",
        description:
          "Added a beautiful info modal that teaches you how to build a meaningful friendship with Ditto through sharing daily life, relationships, goals, and being naturally yourself.",
      },
      {
        type: "new",
        title: "Unique Personality Metrics",
        description:
          "Each personality insight now shows meaningful metrics like Complexity %, Clarity %, and Adaptability % instead of repetitive conversation counts.",
      },
      {
        type: "new",
        title: "Star Ratings & Visual Results",
        description:
          "Replaced formal scores with friendly star ratings and beautiful progress bars with smooth animations for a more engaging experience.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Friendship-Focused Language",
        description:
          "Completely transformed all text to feel like building a friendship - 'Sync AI Personality' became 'Update Ditto's Understanding' and removed all formal assessment language.",
      },
      {
        type: "improved",
        title: "Friendly Assessment Names",
        description:
          "Rebranded personality tests with warmer names: 'Your Core Nature', 'How You See the World', and 'Your Connection Style' instead of technical terms.",
      },
      {
        type: "improved",
        title: "Enhanced Visual Design",
        description:
          "Results now display as friendly 'Insights' with gradient cards, meaningful labels like 'Direct Leader' instead of technical codes, and brain icons for personality types.",
      },
      {
        type: "improved",
        title: "Simplified Navigation",
        description:
          "Streamlined all buttons and labels - 'View Details' became 'Explore More', simplified back buttons, and changed 'Completed' to 'Discovered' for a more natural feel.",
      },
    ],
  },
]

const V0_17_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_17_0
