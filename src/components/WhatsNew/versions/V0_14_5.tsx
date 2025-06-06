import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Email Verification",
        description:
          "New users now receive email verification during account creation to ensure secure access to their accounts",
      },
      {
        type: "new",
        title: "Password Reset",
        description:
          "Forgot your password? New password reset functionality lets you regain access to your account via email",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
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
          "Fixed an issue where new users couldn't complete account creation due to email verification problems. Existing users were not affected.",
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
