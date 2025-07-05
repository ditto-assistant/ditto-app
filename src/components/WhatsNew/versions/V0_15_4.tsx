import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "UI Layout Improvements",
    features: [
      {
        type: "improved",
        title: "Redesigned Top Bar",
        description:
          "Moved the animated Ditto logo to the top center and reorganized buttons - Feedback is now easily accessible on the top-left, while Settings remains on the top-right for a cleaner, more intuitive layout.",
      },
      {
        type: "improved",
        title: "Streamlined Chat Actions",
        description:
          "Chat message actions (Copy, Memories, Delete) are now integrated directly into message bubbles next to the Tags button, making them easier to find and use without cluttering the interface.",
      },
      {
        type: "improved",
        title: "Enhanced Bottom Bar",
        description:
          "Added a dedicated Memories button in the bottom center for quick access to your conversation history, while keeping the familiar Expand/Media buttons on the left and Send/Stop on the right.",
      },
    ],
  },
  {
    title: "User Experience Enhancements",
    features: [
      {
        type: "improved",
        title: "Simplified Interface",
        description:
          "Removed redundant dropdown menus and made avatars purely visual, reducing cognitive load while preserving all functionality through more intuitive direct action buttons.",
      },
      {
        type: "improved",
        title: "Better Visual Consistency",
        description:
          "Maintained the beloved rainbow gradient animation on the Ditto logo while ensuring consistent button styling, hover effects, and spacing throughout the interface.",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Mobile Toast Positioning",
        description:
          "Fixed positioning issues with reward notifications on Android PWA, ensuring they appear correctly with proper spacing from the top of the screen.",
      },
    ],
  },
]

const V0_15_4 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_4
