import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Profile Icon in Settings",
        description:
          "Your profile icon is now easily accessible in the main settings area",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Streamlined Model Settings",
        description:
          "Removed the programmer tab from model settings to simplify the interface",
      },
      {
        type: "improved",
        title: "Performance Enhancements",
        description: "Under-the-hood improvements for a smoother experience",
      },
    ],
  },
]

const V0_14_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_3
