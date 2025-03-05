import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

// Define sections for version 0.11.61
const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "What's New Modal",
        description:
          "Added automatic display of What's New modal after app updates to help you discover the latest features and improvements.",
      },
      {
        type: "new",
        title: "Enhanced User Feedback",
        description:
          "Added new feedback mechanisms to help us understand your needs better and improve the app faster.",
      },
    ],
  },
  {
    title: "User Interface Improvements",
    features: [
      {
        type: "improved",
        title: "Menu Button Positioning",
        description:
          "Moved menu buttons to the bottom of the screen for better reachability and improved one-handed use.",
      },
      {
        type: "improved",
        title: "Send Button Styling",
        description:
          "Updated send button styling for better visibility and consistent appearance across the app.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Email Authentication",
        description:
          "Fixed issues with sign up using email and password for more reliable account creation.",
      },
      {
        type: "fixed",
        title: "Compose Interface",
        description:
          "Fixed styling and layout issues in the compose interface for a cleaner writing experience.",
      },
    ],
  },
];

// Version details component for v0.11.61
const V0_11_61 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_11_61;