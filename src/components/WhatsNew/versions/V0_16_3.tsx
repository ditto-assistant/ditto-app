import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Auto Scroll Behavior",
        description:
          "Chat feed now smartly snaps to the bottom and stops when you attempt to scroll, fixing the annoying bug where you can't scroll while Ditto is generating a response.",
      },
      {
        type: "improved",
        title: "Improved Message Interactions During Sync",
        description:
          "Message action buttons (copy, memory graph, delete) now remain visible while syncing, providing consistent access to message controls.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Safer Message Deletion",
        description:
          "Delete button is now disabled during sync operations to prevent accidental message deletions, with clear visual feedback showing when it's safe to delete.",
      },
    ],
  },
]

const V0_16_3 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_16_3
