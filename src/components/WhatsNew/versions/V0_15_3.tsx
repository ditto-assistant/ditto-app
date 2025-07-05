import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "New Top Bar Design",
        description:
          "A sleek new top bar with quick access to memories and settings - brain icon for memories, settings icon for configuration, all with helpful tooltips",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Better Accessibility",
        description:
          "Improved screen reader support with proper ARIA labels and semantic HTML structure for the top bar",
      },
      {
        type: "improved",
        title: "Better Default Model",
        description:
          "New users now start with GPT-4.1 Mini as the default model, providing a much better chat experience compared to the previous Llama 4 Scout default",
      },
      {
        type: "improved",
        title: "Curated Model Selection",
        description:
          "Disabled many outdated models so that all model picker choices are high-quality, state-of-the-art options with less visual noise when choosing your model",
      },
    ],
  },
]

const V0_15_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_3
