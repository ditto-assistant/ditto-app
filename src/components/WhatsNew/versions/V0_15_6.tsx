import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Custom Token Drop Animation",
        description:
          "Added smooth and engaging animations when tokens are earned, providing better visual feedback for rewards and achievements.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Unified Memory Dashboard Search",
        description:
          "Streamlined the search experience by consolidating two separate search bars into one intuitive interface. Now when you search for memories, you'll also see related subjects automatically - making it easier to discover connections and explore your knowledge base seamlessly.",
      },
      {
        type: "improved",
        title: "Optimized Screen Real Estate",
        description:
          "Improved the default display by showing 5 subjects instead of 10, creating a cleaner interface with better focus on the most relevant content.",
      },
    ],
  },
]

const V0_15_6 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_6
