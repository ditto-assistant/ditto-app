import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Exciting New Models",
        description:
          "Access powerful new AI models that bring fresh capabilities and smarter conversations to Ditto.",
      },
      {
        type: "new",
        title: "Fresh Visual Experience",
        description:
          "Enjoy a completely refreshed look and feel that makes interacting with Ditto more intuitive and delightful.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Smoother Interactions",
        description:
          "Everything feels more responsive and fluid as you chat, navigate, and explore your memories.",
      },
      {
        type: "improved",
        title: "Refined Memory Visualization",
        description:
          "See your memory connections with greater clarity and beauty through our enhanced visualization.",
      },
      {
        type: "new",
        title: "Adjustable Font Size",
        description:
          "Customize your reading experience with small, medium, or large text options in the Settings panel.",
      },
      {
        type: "new",
        title: "Message Stop Button",
        description:
          "Easily stop any AI response mid-generation with our new stop button, and keep the partial response for reference.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Rock-Solid Stability",
        description:
          "We've squashed bugs and polished rough edges throughout the app for a more reliable experience.",
      },
    ],
  },
]

const V0_13_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
    <div className="mt-6 text-center">
      <p className="mb-2">We&apos;d love to hear from you!</p>
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSeG3aEOYCgcLHTNQUN1DT9c0_-cghIvG-PWfw7AIFweELMubQ/viewform"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
      >
        Share your thoughts and help us improve Ditto
      </a>
    </div>
  </div>
)

export default V0_13_0
