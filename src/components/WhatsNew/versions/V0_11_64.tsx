import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Reorganized Application Icons",
        description:
          "Icons are now better organized into clear categories (round, square, clear) for improved maintenance and consistency across platforms."
      },
      {
        type: "improved",
        title: "Automated Icon Generation",
        description:
          "Added a new script to automatically generate all required icon sizes and formats from source images."
      }
    ]
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Icon Path References",
        description:
          "Fixed icon path references throughout the application to match the new directory structure."
      }
    ]
  }
]

const V0_11_64 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_64
