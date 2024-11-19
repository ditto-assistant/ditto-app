import { openaiImageGeneration } from "../../api/LLM";

/**
 * Handles image generation flow
 */
export const handleImageGeneration = async (response) => {
  const query = response.split("<IMAGE_GENERATION>")[1];
  const imageURL = await openaiImageGeneration(query);
  return `Image Task: ${query}\n![DittoImage](${imageURL})`;
}; 