import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Message Interface",
        description:
          "Redesigned button hub for a cleaner look and feel with improved positioning and spacing.",
      },
      {
        type: "improved",
        title: "Android Compatibility",
        description:
          "Fixed Android Chrome styling issues with the send message area, particularly when the URL bar is visible.",
      },
      {
        type: "improved",
        title: "Mobile UI Enhancements",
        description:
          "Better handling of safe areas and device-specific spacing for a more consistent experience across all platforms.",
      },
    ],
  },
];

const V0_11_66 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_11_66;
