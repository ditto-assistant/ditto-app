import { DEFAULT_PREFERENCES } from "../constants";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

type Model = string; // This should match the type from "../constants"
type TextCallback = (text: string) => void;

interface ImageGenerationPreferences {
  model: string;
  size: {
    wh: string;
  };
}

interface PromptRequestBody {
  userID: string;
  userPrompt: string;
  systemPrompt: string;
  model: Model;
  imageURL: string;
}

/**
 * Sends a prompt to the LLM and returns the response.
 *
 * @async
 * @function promptLLM
 * @param {string} userPrompt - The user's prompt.
 * @param {string} systemPrompt - The system's prompt.
 * @param {Model} [model='gemini-1.5-flash'] - The model to use for the LLM.
 * @param {string} [imageURL=''] - The URL of the image to use for the LLM.
 * @param {TextCallback} textCallback - A callback function that handles the text as it comes in.
 * @returns {Promise<string>} A promise that resolves to the LLM's response.
 * @throws {Error} If there's an error during the LLM call.
 */
export async function promptLLM(
  userPrompt: string,
  systemPrompt: string,
  model: Model = "gemini-1.5-flash",
  imageURL: string = "",
  textCallback: TextCallback | null = null
): Promise<string> {
  console.log("Sending prompt to LLM: ", model);
  let responseMessage = "";
  let retries = 0;
  const maxRetries = 3;
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return "Error: Unable to get LLM response";
  }
  if (!tok.ok) {
    return "Error: Unable to get LLM response";
  }
  while (retries < maxRetries) {
    try {
      const requestBody: PromptRequestBody = {
        userID: tok.ok.userID,
        userPrompt,
        systemPrompt,
        model,
        imageURL
      };
      const response = await fetch(routes.prompt, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Check for payment required error
      if (response.status === 402) {
        return "Error: Payment Required. Please check your token balance.";
      }

      // Handle other error statuses
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle the response stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Process the response as a whole for now
        if (textCallback) {
          textCallback(chunk);
        }
        
        responseMessage += chunk;
      }
      
      console.log(`✅ [LLM] Completed streaming, total length: ${responseMessage.length} chars`);
      return responseMessage;
    } catch (error) {
      console.error("Error in promptLLM:", error);
      retries++;
      console.log("Retry: ", retries);

      // If it's a payment error, return immediately
      if (
        (error instanceof Error && error.message?.includes("402")) ||
        (error instanceof Error && error.message?.includes("Payment Required"))
      ) {
        return "Error: Payment Required. Please check your token balance.";
      }
    }
  }
  console.error("Error in promptLLM: Max retries reached.");
  return "An error occurred. Please try again.";
}

/**
 * Generates an image using OpenAI's DALL-E API.
 *
 * @async
 * @function openaiImageGeneration
 * @param {string} prompt - The prompt for image generation.
 * @param {ImageGenerationPreferences} preferences - The preferences for image generation.
 * @returns {Promise<string>} A promise that resolves to the generated image URL.
 * @throws {Error} If there's an error during the image generation process.
 */
export async function openaiImageGeneration(
  prompt: string,
  preferences: ImageGenerationPreferences = DEFAULT_PREFERENCES.imageGeneration
): Promise<string> {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return "Error: Unable to get image generation";
  }
  if (!tok.ok) {
    return "Error: Unable to get image generation";
  }
  const response = await fetch(routes.imageGeneration, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok.ok.token}`,
    },
    body: JSON.stringify({
      userID: tok.ok.userID,
      prompt,
      model: preferences.model,
      size: preferences.size.wh,
    }),
  });
  return await response.text();
}
