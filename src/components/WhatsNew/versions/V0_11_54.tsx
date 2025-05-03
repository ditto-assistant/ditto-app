import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for version 0.11.54
const sections: Section[] = [
  {
    title: "App Updates Overhaul",
    features: [
      {
        type: "new",
        title: "App Update Notifications",
        description:
          "You'll now be notified when a new version is available, so you don't miss out on the latest features.",
      },
      {
        type: "improved",
        title: "Better Error Handling",
        description:
          "When using an outdated version, you'll be prompted to update instead of seeing cryptic errors.",
      },
      {
        type: "new",
        title: "What's New Dialog",
        description:
          "After updating, you'll see what's new in each version to stay informed of all improvements.",
      },
    ],
  },
  {
    title: "Other Improvements",
    features: [
      {
        type: "improved",
        title: "Performance Enhancements",
        description:
          "We've optimized the app for faster load times and smoother interactions.",
      },
      {
        type: "fixed",
        title: "Bug Fixes",
        description:
          "Various bugs have been squashed to improve your experience.",
      },
    ],
  },
]

// Version details component for v0.11.54
const V0_11_54 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_54
