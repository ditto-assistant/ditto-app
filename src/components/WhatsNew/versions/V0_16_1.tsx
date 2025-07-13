import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Personality Assessment Display",
        description:
          "Personality assessment cards now show visual previews of your results, including interactive pentagon charts for Big Five, personality type badges for MBTI, and style indicators for DISC assessments. View your key traits at a glance before diving into full results.",
      },
    ],
  },
]

const V0_16_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_16_1
