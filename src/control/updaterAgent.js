import { promptLLM } from "../api/LLM";
import {
  programmerAgentPlanner,
  programmerAgentTaskCoder,
  programmerAgentTaskApplier,
  programmerAgentContinuer,
  htmlSystemTemplate,
} from "../ditto/templates/agentUpdaterTemplates";

export default async function updaterAgent(
  prompt,
  scriptContents,
  programmerModel,
  skipPlanner,
) {
  try {
    // Step 1: Design tasks using the planner
    const taskWriteup = await promptLLM(
      programmerAgentPlanner(prompt, scriptContents),
      htmlSystemTemplate(),
      "gemini-1.5-pro",
    ); // The somewhat important model, which plans the tasks

    // Step 2: Generate code snippets from task writeup
    const codeSnippets = await promptLLM(
      programmerAgentTaskCoder(taskWriteup, scriptContents),
      htmlSystemTemplate(),
      programmerModel,
    ); // The most important model, which does the actual coding

    // Step 3: Apply code snippets to script
    let finalScript = await promptLLM(
      programmerAgentTaskApplier(codeSnippets, scriptContents),
      htmlSystemTemplate(),
    ); // defaults to gemini-1.5-flash for a fast applier

    // Clean up the script by removing markdown code block markers
    let key = "```html";
    if (finalScript.includes("```javascript")) {
      key = "```javascript";
    } else if (finalScript.includes("```css")) {
      key = "```css";
    }
    let useContinuer = false;
    finalScript = finalScript.split(key)[1];
    // check if the ``` substring is present
    if (finalScript.includes("```")) {
      finalScript = finalScript.split("```")[0];
    } else {
      console.log("Script is not finished generating, using the continuer...");
      useContinuer = true;
    }

    if (useContinuer) {
      // Snip the last 10% of the script to nearest newline
      const finalScriptSnipped = finalScript.slice(
        0,
        -Math.floor(finalScript.length * 0.1),
      );
      const snippedToNewline = finalScriptSnipped
        .split("\n")
        .slice(0, -1)
        .join("\n");

      // Use continuer to complete the script
      console.log("Using the continuer...");
      const continuedScript = await promptLLM(
        programmerAgentContinuer(codeSnippets, snippedToNewline),
        htmlSystemTemplate(),
      ); // default to gemini-1.5-flash for continuer

      // Extract the content between markdown code block markers
      key = "```html";
      if (continuedScript.includes("```javascript")) {
        key = "```javascript";
      } else if (continuedScript.includes("```css")) {
        key = "```css";
      }

      const continuedContent = continuedScript
        .split(key)[1]
        .split("```")[0]
        .trim();

      // Combine the snipped script with the continued content
      finalScript = snippedToNewline + continuedContent;
    }

    return finalScript;
  } catch (error) {
    console.error("Error in agentUpdater:", error);
    throw error;
  }
}
