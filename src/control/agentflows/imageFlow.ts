import { openaiImageGeneration } from "../../api/LLM";
import { ModelPreferences } from "@/types/llm";

/**
 * Handles image generation flow
 */
export const handleImageGeneration = async (
  response: string,
  preferences: ModelPreferences,
) => {
  const query = response.split("<IMAGE_GENERATION>")[1];
  const imageURL = await openaiImageGeneration(
    query,
    preferences.imageGeneration,
  );
  if (imageURL instanceof Error) {
    return imageURL;
  }
  return `Image Task: ${query}\n![DittoImage](${imageURL})`;
};
