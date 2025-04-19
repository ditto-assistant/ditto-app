import React from "react"
import { VersionSection, Section } from "./VersionTemplate"

// Define sections for version 0.11.60
const sections: Section[] = [
  {
    title: "Performance Improvements",
    features: [
      {
        type: "improved",
        title: "Faster Message Loading",
        description:
          "Optimized message loading and rendering for smoother scrolling and better overall performance."
      },
      {
        type: "improved",
        title: "Reduced Memory Usage",
        description:
          "Implemented better memory management for long chat sessions, reducing app memory footprint."
      }
    ]
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Message Sync Issues",
        description:
          "Fixed occasional message sync issues that could cause messages to appear out of order."
      },
      {
        type: "fixed",
        title: "Script Loading",
        description:
          "Resolved issues with script loading and execution in certain edge cases."
      }
    ]
  },
  {
    title: "User Experience",
    features: [
      {
        type: "new",
        title: "Message Status Indicators",
        description:
          "Added clearer visual indicators for message status (sent, delivered, read) in the chat interface."
      },
      {
        type: "improved",
        title: "Error Handling",
        description:
          "Enhanced error messages and recovery options when network issues occur."
      }
    ]
  }
]

// Version details component for v0.11.60
const V0_11_60 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_11_60
