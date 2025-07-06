import { VersionSection, Section } from "./VersionTemplate"

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "AI Personality Insights",
        description:
          "Discover your unique psychological profile! Ditto now analyzes your conversation patterns to generate personalized Big Five, MBTI, and DISC personality assessments. Get deep insights into your communication style, decision-making patterns, and interpersonal tendencies - all powered by your actual conversations with AI.",
      },
      {
        type: "new",
        title: "State-of-the-Art Image Generation",
        description:
          "Now powered by OpenAI's brand new GPT-image-1 model! Image generation is fully automated - simply describe what you want, and the AI will automatically choose the best orientation (widescreen, square, or vertical) based on your prompt. You can also specify orientation by including words like 'landscape', 'portrait', or 'square' in your description.",
      },
      {
        type: "new",
        title: "Superior Text in Images",
        description:
          "The new GPT-image-1 model is significantly better at generating text within images. If you've been struggling to get clear, readable text in your generated images, this upgrade should solve those issues!",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Enhanced Personality Sync",
        description:
          "Personality assessments now run more reliably with improved rate limiting and conflict prevention. No more duplicate jobs or sync interruptions when switching between screens.",
      },
      {
        type: "improved",
        title: "Simplified Settings",
        description:
          "Removed manual image generation settings since everything is now handled automatically for the best results.",
      },
      {
        type: "improved",
        title: "Smarter Memory Analysis",
        description:
          "Your personality insights become more accurate as you have more conversations. The system requires at least 30 meaningful exchanges to generate reliable assessments.",
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
