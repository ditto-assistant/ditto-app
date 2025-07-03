import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

const sections: Section[] = [
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Improved Light Mode Accessibility",
        description: "Fixed light mode readability issues where link text was barely visible on the sign-in screen. Links like 'Forgot your password?', 'Create one here', and 'Terms of Service' now have proper contrast for better accessibility.",
      },
    ],
  },
];

const V0_15_2 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default V0_15_2;
