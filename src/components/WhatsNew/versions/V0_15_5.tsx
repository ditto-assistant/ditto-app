import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Unified Memory Dashboard Search",
        description:
          "Streamlined the search experience by consolidating two separate search bars into one intuitive interface. Now when you search for memories, you'll also see related subjects automatically - making it easier to discover connections and explore your knowledge base seamlessly.",
      },
    ],
  },
]

const V0_15_5 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_15_5
