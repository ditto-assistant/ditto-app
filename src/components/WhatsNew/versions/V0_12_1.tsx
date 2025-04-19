import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Token Airdrop Notifications",
        description:
          "Get notified with a beautiful toast notification when you receive token airdrops",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Balance API Validation",
        description:
          "Added Zod schema validation to balance API responses for improved reliability",
      },
      {
        type: "improved",
        title: "Premium User Detection",
        description:
          "Simplified premium user detection based on plan tier rather than balance",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Model Dropdown Props",
        description: "Fixed unused props in ModelDropdown component",
      },
    ],
  },
];

const V0_12_1 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_12_1;
