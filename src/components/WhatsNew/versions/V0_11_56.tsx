import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

// Define sections for version 0.11.56
const sections: Section[] = [
  {
    title: "Menu Enhancements",
    features: [
      {
        type: "new",
        title: "Menu Hover Behavior",
        description:
          "On desktop, the menu now opens when you hover over the Ditto logo button and closes when your cursor moves away from both the logo and menu.",
      },
      {
        type: "new",
        title: "Menu Pinning",
        description:
          "Clicking the Ditto logo will now 'pin' the menu open. A colored indicator at the top of the menu shows it's pinned. Click again or click anywhere else to unpin.",
      },
      {
        type: "improved",
        title: "Smoother Transitions",
        description:
          "We've improved the menu's hover behavior to create a more seamless and intuitive navigation experience on desktop.",
      },
    ],
  },
  {
    title: "Other Improvements",
    features: [
      {
        type: "improved",
        title: "User Experience",
        description:
          "Better mouse hover detection between menu and button for a more reliable experience.",
      },
      {
        type: "improved",
        title: "Menu Visibility",
        description:
          "The visual indicator for pinned menus makes it clear when a menu will stay open and when it will automatically close.",
      },
    ],
  },
];

// Version details component for v0.11.56
const V0_11_56 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_11_56;
