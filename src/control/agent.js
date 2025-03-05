import { promptLLM, promptLLMV2 } from "../api/LLM";
import {
  mainTemplate,
  systemTemplate,
} from "../control/templates/mainTemplate";
import {
  openscadTemplate,
  openscadSystemTemplate,
} from "../control/templates/openscadTemplate";
import {
  htmlTemplate,
  htmlSystemTemplate,
} from "../control/templates/htmlTemplate";
import { downloadOpenscadScript, downloadHTMLScript } from "./agentTools";
import { handleScriptGeneration } from "./agentflows/scriptFlow";
import { handleImageGeneration } from "./agentflows/imageFlow";
import { handleGoogleSearch } from "./agentflows/searchFlow";
// Home Assistant removed
import { modelSupportsImageAttachments } from "@/types/llm";
import { getMemories } from "@/api/getMemories";
import { saveResponse } from "@/api/saveResponse";
import { createPrompt } from "@/api/createPrompt";
import { searchExamples } from "@/api/searchExamples";

/**@typedef {import("@/types/llm").ModelPreferences} ModelPreferences */

/**
 * Sends a prompt to Ditto.
 * @param {string} userID - The user's ID.
 * @param {string} firstName - The user's first name.
 * @param {string} prompt - The user's prompt.
 * @param {string} image - The user's image.
 * @param {ModelPreferences} preferences - The user's preferences.
 * @param {function} refetch - Whether to refetch the conversation history.
 * @param {boolean} isPremiumUser - Whether the user is a premium user.
 * @param {function} streamingCallback - A callback for streaming response chunks.
 * @param {string} optimisticId - The ID of the optimistic message update.
 * @param {function} finalizeMessage - A function to finalize a message.
 */
export const sendPrompt = async (
  userID,
  firstName,
  prompt,
  image,
  preferences,
  refetch,
  isPremiumUser = false,
  streamingCallback = null,
  optimisticId = null,
  finalizeMessage = null,
) => {
  try {
    // Create a thinking indicator in localStorage to show we're processing
    // This is read by other components to show a loading state
    const thinkingObject = {
      prompt,
      timestamp: Date.now(),
    };
    localStorage.setItem("thinking", JSON.stringify(thinkingObject));

    // Create prompt in backend
    const { ok: pairID, err } = await createPrompt(prompt);
    if (err) {
      throw new Error(err);
    }
    if (!pairID) {
      throw new Error("No pairID");
    }

    console.log("preferences", preferences);
    const [memories, examplesString, scriptDetails] = await Promise.all([
      getMemories(
        {
          userID,
          longTerm: {
            nodeCounts: preferences.memory.longTermMemoryChain,
            pairID,
          },
          shortTerm: {
            k: preferences.memory.shortTermMemoryCount,
          },
          stripImages: true,
        },
        "text/plain",
      ),
      searchExamples(pairID),
      fetchScriptDetails(),
    ]);
    if (memories.err) {
      throw new Error(memories.err);
    }
    if (!memories.ok) {
      throw new Error("No memories found");
    }
    if (examplesString.err) {
      throw new Error(examplesString.err);
    }
    if (!examplesString.ok) {
      throw new Error("No examples found");
    }

    const { scriptName, scriptType, scriptContents } = scriptDetails;

    const constructedPrompt = mainTemplate(
      memories.ok,
      examplesString.ok,
      firstName,
      new Date().toISOString(),
      prompt,
      scriptName,
      scriptType,
      preferences.tools,
    );

    console.log("%c" + constructedPrompt, "color: green");

    let mainAgentModel = preferences.mainModel;
    if (image && !modelSupportsImageAttachments(mainAgentModel)) {
      if (isPremiumUser) {
        mainAgentModel = "claude-3-5-sonnet";
      } else {
        mainAgentModel = "llama-3-2";
      }
    }

    // Create a simple callback to update the optimistic message
    const textCallback = streamingCallback
      ? (text) => streamingCallback(text)
      : null;

    // Get the response from the LLM using the V2 endpoint with SSE streaming
    let response = await promptLLMV2(
      constructedPrompt,
      systemTemplate(),
      mainAgentModel,
      image,
      textCallback,
    );

    const toolTriggers = [
      "<OPENSCAD>",
      "<HTML_SCRIPT>",
      "<IMAGE_GENERATION>",
      "<GOOGLE_SEARCH>",
    ];

    let toolTriggered = false;
    for (const trigger of toolTriggers) {
      if (response.includes(trigger)) {
        // Remove closing tag that matches the trigger
        response = response.replace(`</${trigger.slice(1)}`, "");
        toolTriggered = true;

        // If we have an optimistic message, finalize it with the current response
        // before tool processing begins
        if (optimisticId && finalizeMessage) {
          finalizeMessage(optimisticId, response);
        }

        await processResponse(
          response,
          prompt,
          pairID,
          userID,
          scriptContents,
          scriptName,
          image,
          memories,
          preferences,
          refetch,
          optimisticId,
          finalizeMessage,
        );
        break;
      }
    }

    // If no tool was triggered, handle the complete response
    if (!toolTriggered) {
      // Save the response to the backend
      await saveResponse(pairID, response);

      // Finalize the optimistic message if we have one
      // Note: finalizeMessage already includes a refetch, so we don't need to do it again
      if (optimisticId && finalizeMessage) {
        finalizeMessage(optimisticId, response);
      } else if (refetch) {
        // Only refetch if we're not using optimistic updates (fallback)
        // Small delay to ensure the previous operations complete
        setTimeout(() => {
          console.log(
            "🔄 [Agent] Triggering fallback refetch (no optimistic update)",
          );
          refetch();
        }, 300);
      }
    }

    saveToLocalStorage(prompt, response, Date.now(), pairID);

    localStorage.setItem("idle", "true");
    return response;
  } catch (error) {
    console.error("Error in sendPrompt:", error);

    // Remove thinking indicator
    localStorage.removeItem("thinking");

    if (refetch) {
      refetch();
    }

    throw error;
  } finally {
    // Always remove the thinking indicator when done
    localStorage.removeItem("thinking");
  }
};

const fetchScriptDetails = () => {
  const workingOnScript = localStorage.getItem("workingOnScript");
  let scriptName = "",
    scriptType = "",
    scriptContents = "";

  if (workingOnScript) {
    const workingOnScriptObject = JSON.parse(workingOnScript);
    scriptName = workingOnScriptObject.script;
    scriptContents = workingOnScriptObject.contents;
    scriptType = workingOnScriptObject.scriptType;
  }
  return { scriptName, scriptType, scriptContents };
};

export const processResponse = async (
  response,
  prompt,
  pairID,
  userID,
  scriptContents,
  scriptName,
  image,
  memories,
  preferences,
  refetch,
  optimisticId = null,
  finalizeMessage = null,
) => {
  console.log("%c" + response, "color: yellow");

  // Handle payment/error cases
  if (response.includes("402") || response.includes("Payment Required")) {
    const errorMessage =
      "Error: Payment Required. Please check your token balance.";

    // Update optimistic message if available
    if (optimisticId && finalizeMessage) {
      finalizeMessage(optimisticId, errorMessage);
    } else if (refetch) {
      refetch();
    }
    return errorMessage;
  }

  const updateMessageWithToolStatus = async (
    pairID,
    status,
    type,
    finalResponse = null,
    optimisticId = null,
    finalizeMessage = null,
    isStreaming = false,
  ) => {
    try {
      // For completed responses with a final result
      if (status === "complete" && finalResponse) {
        await saveResponse(pairID, finalResponse);

        // Update optimistic message if available
        if (optimisticId && finalizeMessage) {
          // Mark as final message with a flag that will allow cleanup
          finalizeMessage(optimisticId, finalResponse);

          // Trigger a refetch after saving the final tool response
          setTimeout(() => {
            console.log(
              `🔄 [Agent] Triggering refetch after tool completion: ${optimisticId}`,
            );
            refetch();

            // Remove the optimistic message after the refetch completes
            setTimeout(() => {
              console.log(
                `🧹 [Agent] Removing tool message after refetch: ${optimisticId}`,
              );
              if (finalizeMessage) {
                // Force message removal by sending special finalizing signal
                // This will be handled by useConversationHistory
                finalizeMessage(optimisticId, finalResponse, true);
              }
            }, 1000);
          }, 800);
        } else if (refetch) {
          refetch();
        }

        saveToLocalStorage(prompt, finalResponse, Date.now(), pairID);
      } else {
        // For in-progress status updates
        const statusText = status.endsWith("...") ? status : `${status}`;

        // Update optimistic message with status if available
        if (optimisticId && finalizeMessage) {
          // For in-progress updates, we want to show both the response and the status
          const currentText = finalResponse || response;
          const statusLine = `\n\n*${type ? `${type}: ` : ""}${statusText}*`;

          // Remove any previous status messages
          const textWithoutStatus = currentText.replace(
            /\n\n\*(?:.*?): .*?\*$/s,
            "",
          );

          // Keep isOptimistic flag true during tool processing to prevent premature removal
          finalizeMessage(optimisticId, textWithoutStatus + statusLine);
        }
      }
    } catch (error) {
      console.error("Error updating message with tool status:", error);
    }
  };

  try {
    // Handle OpenSCAD script generation
    if (response.includes("<OPENSCAD>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Generating OpenSCAD Script...",
        "openscad",
        null,
        optimisticId,
        finalizeMessage,
      );
      const finalResponse = await handleScriptGeneration({
        response,
        tag: "<OPENSCAD>",
        templateFunction: openscadTemplate,
        systemTemplateFunction: openscadSystemTemplate,
        downloadFunction: downloadOpenscadScript,
        scriptType: "openSCAD",
        scriptContents,
        scriptName,
        prompt,
        userID,
        image,
        memories,
        preferences,
      });
      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "openscad",
        finalResponse,
        optimisticId,
        finalizeMessage,
      );
      return finalResponse;
    }

    // Handle HTML script generation
    if (response.includes("<HTML_SCRIPT>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Generating HTML Script...",
        "html",
        null,
        optimisticId,
        finalizeMessage,
      );
      const finalResponse = await handleScriptGeneration({
        response,
        tag: "<HTML_SCRIPT>",
        templateFunction: htmlTemplate,
        systemTemplateFunction: htmlSystemTemplate,
        downloadFunction: downloadHTMLScript,
        scriptType: "webApps",
        scriptContents,
        scriptName,
        prompt,
        userID,
        image,
        memories,
        preferences,
      });
      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "html",
        finalResponse,
        optimisticId,
        finalizeMessage,
      );
      return finalResponse;
    }

    // Handle image generation
    if (response.includes("<IMAGE_GENERATION>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Generating Image",
        "image",
        null,
        optimisticId,
        finalizeMessage,
      );
      const finalResponse = await handleImageGeneration(response, preferences);
      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "image",
        finalResponse,
        optimisticId,
        finalizeMessage,
      );
      return finalResponse;
    }

    // Handle Google search
    if (response.includes("<GOOGLE_SEARCH>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Searching Google",
        "search",
        null,
        optimisticId,
        finalizeMessage,
      );

      // Start with the response that contains the first agent's output
      // This will show any content after the <GOOGLE_SEARCH> tag
      const lastResponse = response;

      // For tracking the cumulative streamed text so far
      let cumulativeStreamedText = "";

      // Set up a streaming callback that updates the message in real-time
      const streamingCallback = (text) => {
        if (optimisticId && finalizeMessage) {
          // Append the new chunk to our cumulative text
          cumulativeStreamedText += text;

          // For the Google search agent, we want to stream its response
          // after the query part, appending to the existing message
          finalizeMessage(
            optimisticId,
            lastResponse + "\n\n" + cumulativeStreamedText,
            false, // Not final yet
            true, // Indicate this is a streaming update
          );
        }
      };

      // Call Google search with streaming capability
      const finalResponse = await handleGoogleSearch(
        response,
        prompt,
        preferences,
        streamingCallback, // Pass the streaming callback
      );

      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "search",
        finalResponse,
        optimisticId,
        finalizeMessage,
      );
      return finalResponse;
    }

    // Home Assistant functionality removed

    return response;
  } catch (error) {
    console.error("Error in processResponse:", error);
    const errorMessage = "An error occurred while processing your request.";
    await updateMessageWithToolStatus(
      pairID,
      "failed",
      null,
      errorMessage,
      optimisticId,
      finalizeMessage,
    );
    return errorMessage;
  }
};

const saveToLocalStorage = (prompt, response, timestamp, pairID) => {
  const prompts = loadFromLocalStorage("prompts", []);
  const responses = loadFromLocalStorage("responses", []);
  const timestamps = loadFromLocalStorage("timestamps", []);
  const pairIDs = loadFromLocalStorage("pairIDs", []);

  if (!pairIDs.includes(pairID)) {
    // Ensure no duplicates
    prompts.push(prompt);
    responses.push(response);
    timestamps.push(timestamp);
    pairIDs.push(pairID);
    localStorage.setItem("prompts", JSON.stringify(prompts));
    localStorage.setItem("responses", JSON.stringify(responses));
    localStorage.setItem("timestamps", JSON.stringify(timestamps));
    localStorage.setItem("pairIDs", JSON.stringify(pairIDs));
  }
};

const loadFromLocalStorage = (key, defaultValue) => {
  const storedValue = localStorage.getItem(key);
  return storedValue ? JSON.parse(storedValue) : defaultValue;
};
