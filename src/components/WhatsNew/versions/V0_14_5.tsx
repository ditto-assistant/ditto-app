import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Email Authentication",
        description:
          "Improved account creation process with better email verification flow and more reliable password reset functionality",
      },
      {
        type: "improved",
        title: "Streamlined Login Experience",
        description:
          "Simplified sign-in process with clearer error messages and better handling of email confirmation states",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Email Verification Issues",
        description:
          "Fixed problems with email confirmation not working properly during account creation",
      },
      {
        type: "fixed",
        title: "Password Reset Reliability",
        description:
          "Resolved issues where forgot password emails weren't being sent or processed correctly",
      },
    ],
  },
]

const V0_14_5 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_14_5
