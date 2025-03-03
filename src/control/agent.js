import { promptLLM } from "../api/LLM";
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
import { handleHomeAssistant } from "./agentflows/homeFlow";
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
 * @param {function} updateConversation - A function that updates the conversation.
 * @param {ModelPreferences} preferences - The user's preferences.
 * @param {boolean} refetch - Whether to refetch the conversation history.
 * @param {boolean} isPremiumUser - Whether the user is a premium user.
 */
export const sendPrompt = async (
  userID,
  firstName,
  prompt,
  image,
  updateConversation,
  preferences,
  refetch,
  isPremiumUser = false
) => {
  try {
    // Create a thinking indicator in localStorage to show we're processing
    // This is read by other components to show a loading state
    const thinkingObject = {
      prompt,
      timestamp: Date.now(),
    };
    localStorage.setItem("thinking", JSON.stringify(thinkingObject));

    // With our new backend-driven approach, we don't need to manually update the conversation UI
    // The refetch in the useConversationHistory hook will handle this

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
        "text/plain"
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
      preferences.tools
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

    let response = await promptLLM(
      constructedPrompt,
      systemTemplate(),
      mainAgentModel,
      image
    );
    const toolTriggers = [
      "<OPENSCAD>",
      "<HTML_SCRIPT>",
      "<IMAGE_GENERATION>",
      "<GOOGLE_SEARCH>",
      "<GOOGLE_HOME>",
    ];
    let toolTriggered = false;
    for (const trigger of toolTriggers) {
      if (response.includes(trigger)) {
        // Remove closing tag that matches the trigger
        response = response.replace(`</${trigger.slice(1)}`, "");
        toolTriggered = true;
        await processResponse(
          response,
          prompt,
          pairID,
          userID,
          scriptContents,
          scriptName,
          image,
          memories,
          updateConversation,
          preferences,
          refetch
        );
        break;
      }
    }
    // If no tool was triggered, handle the complete response
    if (!toolTriggered) {
      await saveResponse(pairID, response);
      // Update conversation with docId and pairID if updateConversation is provided
      // Otherwise, rely on refetch to update the UI
      if (updateConversation) {
        updateConversation((prevState) => {
          const messages = [...prevState.messages];
          messages[messages.length - 2] = {
            ...messages[messages.length - 2],
            pairID,
          };
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            text: response,
            isTyping: false,
            docId: pairID,
            pairID: pairID,
          };
          return { ...prevState, messages };
        });
      } else if (refetch) {
        // If updateConversation is not provided but refetch is, use refetch
        refetch();
      }
    }

    saveToLocalStorage(prompt, response, Date.now(), pairID);

    localStorage.setItem("idle", "true");
    return response;
  } catch (error) {
    console.error("Error in sendPrompt:", error);

    // Remove thinking indicator
    localStorage.removeItem("thinking");

    // For backward compatibility, if updateConversation is provided
    if (updateConversation) {
      updateConversation((prevState) => ({
        ...prevState,
        is_typing: false,
        messages: prevState.messages.map((msg, i) => {
          if (i === prevState.messages.length - 1 && msg.isTyping) {
            return {
              ...msg,
              text: "Sorry, something went wrong. Please try again.",
              isTyping: false,
            };
          }
          return msg;
        }),
      }));
    } else if (refetch) {
      // If updateConversation is not provided but refetch is, use refetch
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
  updateConversation,
  preferences,
  refetch
) => {
  console.log("%c" + response, "color: yellow");

  // Handle payment/error cases
  if (response.includes("402") || response.includes("Payment Required")) {
    const errorMessage =
      "Error: Payment Required. Please check your token balance.";
    if (updateConversation) {
      updateConversation((prevState) => ({
        ...prevState,
        messages: prevState.messages.map((msg, i) =>
          i === prevState.messages.length - 1
            ? { ...msg, text: errorMessage, isTyping: false, isError: true }
            : msg
        ),
      }));
    } else if (refetch) {
      // If updateConversation is not provided but refetch is, use refetch
      refetch();
    }
    return errorMessage;
  }

  const updateMessageWithToolStatus = async (
    pairID,
    status,
    type,
    finalResponse = null
  ) => {
    try {
      if (status === "complete" && finalResponse) {
        await saveResponse(pairID, finalResponse);

        if (updateConversation) {
          updateConversation((prevState) => {
            const messages = [...prevState.messages];
            messages[messages.length - 2] = {
              ...messages[messages.length - 2],
              pairID: pairID,
            };
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              text: finalResponse,
              toolType: type,
              isTyping: false,
              showToolBadge: true,
              docId: pairID,
              pairID: pairID,
              toolStatus: null,
              showTypingDots: false,
            };
            return { ...prevState, messages };
          });
        } else if (refetch) {
          // If updateConversation is not provided but refetch is, use refetch
          refetch();
        }

        saveToLocalStorage(prompt, finalResponse, Date.now(), pairID);
      } else {
        const statusText = status.endsWith("...") ? status : `${status}`;
        if (updateConversation) {
          updateConversation((prevState) => {
            const messages = [...prevState.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              text: finalResponse || response,
              toolStatus: status !== "complete" ? statusText : null,
              toolType: type,
              isTyping: false,
              showToolBadge: true,
              showTypingDots: status !== "complete" && status !== "failed",
            };
            return { ...prevState, messages };
          });
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
        "openscad"
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
        finalResponse
      );
      return finalResponse;
    }

    // Handle HTML script generation
    if (response.includes("<HTML_SCRIPT>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Generating HTML Script...",
        "html"
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
        finalResponse
      );
      return finalResponse;
    }

    // Handle image generation
    if (response.includes("<IMAGE_GENERATION>")) {
      await updateMessageWithToolStatus(pairID, "Generating Image", "image");
      const finalResponse = await handleImageGeneration(response, preferences);
      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "image",
        finalResponse
      );
      return finalResponse;
    }

    // Handle Google search
    if (response.includes("<GOOGLE_SEARCH>")) {
      await updateMessageWithToolStatus(pairID, "Searching Google", "search");
      const finalResponse = await handleGoogleSearch(
        response,
        prompt,
        preferences
      );
      await updateMessageWithToolStatus(
        pairID,
        "complete",
        "search",
        finalResponse
      );
      return finalResponse;
    }

    // Handle Home Assistant tasks
    if (response.includes("<GOOGLE_HOME>")) {
      await updateMessageWithToolStatus(
        pairID,
        "Executing Home Assistant Task",
        "home"
      );
      const finalResponse = await handleHomeAssistant(response);
      await updateMessageWithToolStatus(
        pairID,
        finalResponse.includes("failed") ? "failed" : "complete",
        "home",
        finalResponse
      );
      return finalResponse;
    }

    return response;
  } catch (error) {
    console.error("Error in processResponse:", error);
    const errorMessage = "An error occurred while processing your request.";
    await updateMessageWithToolStatus(pairID, "failed", null, errorMessage);
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
