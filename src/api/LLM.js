import { DEFAULT_PREFERENCES, IMAGE_GENERATION_MODELS } from "../constants";
import { auth } from "../control/firebase";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

/**
 * Sends a prompt to the LLM and returns the response.
 *
 * @async
 * @function promptLLM
 * @param {string} userPrompt - The user's prompt.
 * @param {string} systemPrompt - The system's prompt.
 * @param {import("../constants").Model} [model='gemini-1.5-flash'] - The model to use for the LLM.
 * @param {string} [imageURL=''] - The URL of the image to use for the LLM.
 * @param {function} textCallback - A callback function that handles the text as it comes in.
 * @returns {Promise<string>} A promise that resolves to the LLM's response.
 * @throws {Error} If there's an error during the LLM call.
 */
export async function promptLLM(
  userPrompt,
  systemPrompt,
  model = "gemini-1.5-flash",
  imageURL = "",
  textCallback = null
) {
  console.log("Sending prompt to LLM: ", model);
  let responseMessage = "";
  let retries = 0;
  const maxRetries = 3;
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return "Error: Unable to get LLM response";
  }
  while (retries < maxRetries) {
    try {
      const requestBody = {
        userID: tok.ok.userID,
        userPrompt,
        systemPrompt,
        model,
        imageURL,
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
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (textCallback) {
          textCallback(chunk);
        }
        responseMessage += chunk;
      }
      return responseMessage;
    } catch (error) {
      console.error("Error in promptLLM:", error);
      retries++;
      console.log("Retry: ", retries);

      // If it's a payment error, return immediately
      if (
        error.message?.includes("402") ||
        error.message?.includes("Payment Required")
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
 * @returns {Promise<string>} A promise that resolves to the generated image URL.
 * @throws {Error} If there's an error during the image generation process.
 */
export async function openaiImageGeneration(
  prompt,
  preferences = DEFAULT_PREFERENCES.imageGeneration
) {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
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

/**
 * Embeds a text into a vector space.
 *
 * @async
 * @function textEmbed
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} A promise that resolves to an array of numbers representing the embedding.
 * @throws {Error} If there's an error during the embedding process.
 */
export async function textEmbed(text) {
  try {
    if (!auth.currentUser) {
      return "You are not logged in. Please log in to use this feature.";
    }
    const tok = await auth.currentUser.getIdToken();
    const userID = auth.currentUser.uid;
    const response = await fetch(routes.embed, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok}`,
      },
      body: JSON.stringify({
        userID,
        text,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    alert("Error. Please check your balance or contact support.");
    return [];
  }
}

/**
 * Retrieves relevant examples based on an embedding vector.
 *
 * @async
 * @function getRelevantExamples
 * @param {number[]} embedding - The embedding vector to use for similarity search.
 * @param {number} k - The number of relevant examples to retrieve.
 * @returns {Promise<string|string[]>} A promise that resolves to either:
 *   - A string containing an error message if there's an issue with authentication or the API call.
 *   - An array of strings representing the relevant examples if the call is successful.
 * @throws {Error} If there's an unexpected error during the API call.
 */
export async function getRelevantExamples(embedding, k) {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return "Error: Unable to get relevant examples";
  }
  try {
    const response = await fetch(routes.searchExamples, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        embedding,
        k,
        userID: tok.ok.userID,
      }),
    });
    return await response.text();
  } catch (error) {
    console.error(error);
    alert("Error. Please check your balance or contact support.");
    return [];
  }
}
