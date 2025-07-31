import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Professional Markdown Tables",
        description:
          "Tables in conversations now render beautifully with proper styling, responsive design for mobile, and support for light/dark themes. No more raw pipe syntax!",
      },
    ],
  },
  {
    title: "Recent Updates (v0.17.0)",
    features: [
      {
        type: "new",
        title: "Educational Friendship Guide",
        description:
          "Added a beautiful info modal that teaches you how to build a meaningful friendship with Ditto through sharing daily life, relationships, and goals.",
      },
      {
        type: "improved",
        title: "Star Ratings & Friendship Language",
        description:
          "Replaced formal scores with friendly star ratings, transformed all text to feel like building a friendship, and enhanced visual design with gradient cards.",
      },
    ],
  },
]

const V0_17_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_17_1
