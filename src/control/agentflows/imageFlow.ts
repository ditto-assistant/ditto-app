import { openaiImageGeneration } from "../../api/LLM"

/**
 * Handles image generation flow
 */
export const handleImageGeneration = async (response: string) => {
  const query = response.split("<IMAGE_GENERATION>")[1]
  const imageURL = await openaiImageGeneration(query)
  if (imageURL instanceof Error) {
    return imageURL
  }
  return `Image Task: ${query}\n![DittoImage](${imageURL})`
}
