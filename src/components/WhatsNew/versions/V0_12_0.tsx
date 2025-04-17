import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Subscription Plans",
        description:
          "Choose from multiple subscription tiers to enhance your Ditto experience, with both monthly and yearly options available.",
      },
      {
        type: "new",
        title: "Token System",
        description:
          "Purchase and manage tokens for additional usage when you need a boost in capabilities.",
      },
      {
        type: "new",
        title: "Subscription Management",
        description:
          "Easily manage your subscription status, view current plan details, and access the customer portal.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced User Profile",
        description:
          "User profiles now include subscription status and token balance information.",
      },
      {
        type: "improved",
        title: "Error Handling",
        description:
          "Better error handling for payment-related operations and subscription status checks.",
      },
    ],
  },
];

const V0_12_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_12_0;
