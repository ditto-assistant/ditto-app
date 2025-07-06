import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "Discover Your Personality With Ditto",
        description:
          "Ever wondered what your conversations reveal about who you are? Ditto now creates a personalized personality profile based on how you chat! Learn about your communication style, what motivates you, and how you make decisions - all from your natural conversations. It's like having a personal insight coach that gets to know the real you.",
      },
      {
        type: "new",
        title: "State-of-the-Art Image Creation",
        description:
          "Creating images just got so much easier! Simply describe what you want and Ditto automatically picks the perfect size and style for your idea. Want a sunset? It knows to make it wide. A portrait? It'll make it tall. Just tell it what you're imagining and watch the magic happen.",
      },
      {
        type: "new",
        title: "Crystal Clear Text in Images",
        description:
          "Need words in your images? They'll actually be readable now! Whether you want a logo, sign, or any text in your pictures, Ditto creates crisp, clear lettering that looks professional. No more blurry or jumbled text - just beautiful, readable results.",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "More Reliable Personality Updates",
        description:
          "Your personality insights now update smoothly in the background without any interruptions. No more waiting or getting stuck - everything just works seamlessly as you chat.",
      },
      {
        type: "improved",
        title: "Less Clutter, More Magic",
        description:
          "We've cleaned up the settings by removing options you don't need anymore. Image creation is now fully automatic, so you can focus on being creative instead of tweaking settings.",
      },
      {
        type: "improved",
        title: "Personality Insights Get Better Over Time",
        description:
          "The more you chat with Ditto, the more accurate your personality profile becomes! After about 30 conversations, you'll start seeing really insightful and personalized results that truly reflect who you are.",
      },
    ],
  },
]

const V0_16_0 = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
)

export default V0_16_0
