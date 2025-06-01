import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Profile Customization",
        description:
          "You can now edit your first and last name in your profile settings for better personalization",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Reduced App Size",
        description:
          "Optimized app bundle size for faster loading and better performance across all devices",
      },
      {
        type: "improved",
        title: "Enhanced Image Upload",
        description:
          "Completely overhauled image upload system for more reliable photo sharing and better user experience",
      },
    ],
  },
]

const V0_14_4 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_4
