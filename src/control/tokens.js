// Import the necessary function from the tiktoken library
import { encodingForModel } from "js-tiktoken";

// Function to calculate the number of tokens
export function countTokens(inputString) {
  // Get the encoding used by the model, for example, GPT-4 Turbo
  const enc = encodingForModel("gpt-4-turbo-preview");

  // Encode the input string to get the tokens
  const tokens = enc.encode(inputString);

  // Return the count of tokens
  return tokens.length;
}
