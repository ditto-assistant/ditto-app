import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Interactive Pentagon Charts",
        description:
          "Big Five personality assessments now display as beautiful interactive pentagon radar charts, making it easy to visualize your personality profile at a glance. Each dimension (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) is clearly mapped with your scores.",
      },
      {
        type: "new",
        title: "Inline Result Previews",
        description:
          "No more tapping through each assessment to see your results! All personality assessments now show key insights directly in the main view - see your MBTI type, DISC styles, and Big Five traits without extra navigation.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Streamlined Assessment Layout",
        description:
          "Assessment cards are now more compact and informative, with shortened descriptions that focus on what matters most. The layout uses screen space more efficiently while maintaining visual appeal.",
      },
      {
        type: "improved",
        title: "Consistent Assessment Ordering",
        description:
          "Personality assessments now display in a logical order: Big Five first (with the cool pentagon), followed by MBTI, then DISC. This creates a better flow for understanding your complete personality profile.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Improved Visual Hierarchy",
        description:
          "Removed redundant header section that was taking up unnecessary space, creating a cleaner and more focused personality assessment experience.",
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
