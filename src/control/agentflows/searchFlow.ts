import { googleSearch } from "../../api/searchEngine";
import { promptLLM } from "../../api/LLM";
import {
  googleSearchTemplate,
  googleSearchSystemTemplate,
} from "../templates/googleSearchTemplate";
import { ModelPreferences } from "@/types/llm";
/**
 * Handles Google search flow
 */
export const handleGoogleSearch = async (
  response: string,
  prompt: string,
  preferences: ModelPreferences
) => {
  const query = response.split("<GOOGLE_SEARCH>")[1].split("\n")[0].trim();
  const googleSearchResponse = await googleSearch(query);

  let searchResults =
    "Google Search Query: " + query + "\n" + googleSearchResponse;
  const googleSearchAgentTemplate = googleSearchTemplate(prompt, searchResults);

  console.log("%c" + googleSearchAgentTemplate, "color: green");

  const googleSearchAgentResponse = await promptLLM(
    googleSearchAgentTemplate,
    googleSearchSystemTemplate(),
    preferences.mainModel
  );

  console.log("%c" + googleSearchAgentResponse, "color: yellow");

  return "Google Search Query: " + query + "\n\n" + googleSearchAgentResponse;
};
