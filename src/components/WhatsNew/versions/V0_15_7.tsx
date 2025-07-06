import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "State-of-the-Art Image Generation",
        description:
          "Now powered by OpenAI's brand new GPT-image-1 model! Image generation is fully automated - simply describe what you want, and the AI will automatically choose the best orientation (widescreen, square, or vertical) based on your prompt. You can also specify orientation by including words like 'landscape', 'portrait', or 'square' in your description.",
      },
      {
        type: "new",
        title: "Superior Text in Images",
        description:
          "The new GPT-image-1 model is significantly better at generating text within images. If you've been struggling to get clear, readable text in your generated images, this upgrade should solve those issues!",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Simplified Settings",
        description:
          "Removed manual image generation settings since everything is now handled automatically for the best results.",
      },
    ],
  },
]

const V0_15_7 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_7
