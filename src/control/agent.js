import { promptLLM, textEmbed, getRelevantExamples } from "../api/LLM";
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
import { saveMessagePairToMemory } from "./firebase";
import { getMemories } from "@/api/getMemories";
/**@typedef {import("@/types/llm").ModelPreferences} ModelPreferences */

// Add this near the top of the file with other constants
let toolTriggered = false;

/**
 * Sends a prompt to Ditto.
 * @param {string} userID - The user's ID.
 * @param {string} firstName - The user's first name.
 * @param {string} prompt - The user's prompt.
 * @param {string} image - The user's image.
 * @param {string} userPromptEmbedding - The user's prompt embedding.
 * @param {function} updateConversation - A function that updates the conversation.
 * @param {ModelPreferences} preferences - The user's preferences.
 */
export const sendPrompt = async (
  userID,
  firstName,
  prompt,
  image,
  userPromptEmbedding,
  updateConversation,
  preferences
) => {
  try {
    // Reset tool trigger state at the start of each prompt
    toolTriggered = false;

    // Add the user's message to the conversation
    const userMessage = {
      sender: "User",
      text: prompt,
      timestamp: Date.now(),
      pairID: null,
    };
    updateConversation((prevState) => ({
      ...prevState,
      messages: [...prevState.messages, userMessage],
    }));

    // Add a placeholder for the assistant's response with typing indicator
    const assistantMessage = {
      sender: "Ditto",
      text: "",
      timestamp: Date.now(),
      isTyping: true,
      docId: null,
      pairID: null,
    };

    updateConversation((prevState) => ({
      ...prevState,
      messages: [...prevState.messages, assistantMessage],
    }));

    // Initialize the conversation update
    updateConversation((prevState) => ({
      ...prevState,
      is_typing: true,
    }));

    const [memories, examplesString, scriptDetails] = await Promise.all([
      getMemories(
        {
          userID,
          longTerm: {
            nodeCounts: [10],
            vector: userPromptEmbedding,
          },
          shortTerm: {
            k: 10,
          },
          stripImages: true,
        },
        "text/plain"
      ),
      getRelevantExamples(userPromptEmbedding, 5),
      fetchScriptDetails(),
    ]);
    if (memories.err) {
      throw new Error(memories.err);
    }

    const { scriptName, scriptType, scriptContents } = scriptDetails;

    const constructedPrompt = mainTemplate(
      memories.ok,
      examplesString,
      firstName,
      new Date().toISOString(),
      prompt,
      scriptName,
      scriptType,
      preferences.tools
    );

    console.log("%c" + constructedPrompt, "color: green");

    let mainAgentModel = preferences.mainModel;
    // Use Llama if the model doesn't support image attachments
    if (image && !modelSupportsImageAttachments(mainAgentModel)) {
      mainAgentModel = "llama-3-2";
    }

    let updatedText = "";

    // Streaming callback
    const streamingCallback = (chunk) => {
      if (toolTriggered) return; // Skip if tool already triggered
      
      // Append to updatedText
      updatedText += chunk;
      
      // Check for tool triggers early
      const toolTriggers = [
        "<OPENSCAD>",
        "<HTML_SCRIPT>",
        "<IMAGE_GENERATION>",
        "<GOOGLE_SEARCH>",
        "<GOOGLE_HOME>",
      ];

      // Early tool detection
      for (const trigger of toolTriggers) {
        if (updatedText.includes(trigger)) {
          toolTriggered = true;
          processResponse(
            updatedText,
            prompt,
            userPromptEmbedding,
            userID,
            scriptContents,
            scriptName,
            image,
            memories,
            updateConversation,
            preferences
          );
          return;
        }
      }

      // Dispatch chunk for streaming UI
      const event = new CustomEvent("responseStreamUpdate", {
        detail: {
          chunk,
          isNewMessage: !updatedText || updatedText === chunk,
        },
      });
      window.dispatchEvent(event);
    };

    // LLM call with streaming
    const response = await promptLLM(
      constructedPrompt,
      systemTemplate(),
      mainAgentModel,
      image,
      streamingCallback
    );

    // If no tool was triggered, handle the complete response
    if (!toolTriggered) {
      const docId = await saveMessagePairToMemory(
        userID,
        prompt,
        response,
        userPromptEmbedding
      );

      // Update conversation with docId and pairID
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 2] = {
          ...messages[messages.length - 2],
          pairID: docId,
        };
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: response,
          isTyping: false,
          docId: docId,
          pairID: docId,
        };
        return { ...prevState, messages };
      });

      saveToLocalStorage(prompt, response, Date.now(), docId);
    }

    localStorage.setItem("idle", "true");
    return response;
  } catch (e) {
    console.error(e);
    updateConversation((prevState) => ({ ...prevState, is_typing: false }));
    return "An error occurred while processing your request. Please try again.";
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
  userPromptEmbedding,
  userID,
  scriptContents,
  scriptName,
  image,
  memories,
  updateConversation,
  preferences
) => {
  toolTriggered = true;

  console.log("%c" + response, "color: yellow");

  // Handle payment/error cases
  if (response.includes("402") || response.includes("Payment Required")) {
    const errorMessage =
      "Error: Payment Required. Please check your token balance.";
    updateConversation((prevState) => ({
      ...prevState,
      messages: prevState.messages.map((msg, i) =>
        i === prevState.messages.length - 1
          ? { ...msg, text: errorMessage, isTyping: false, isError: true }
          : msg
      ),
    }));
    return errorMessage;
  }

  const updateMessageWithToolStatus = async (
    status,
    type,
    finalResponse = null
  ) => {
    try {
      if (status === "complete" && finalResponse) {
        // Generate a new embedding for the final response
        const responseEmbedding = await textEmbed(finalResponse);

        // Save the final processed response to memory with the embedding
        const docId = await saveMessagePairToMemory(
          userID,
          prompt,
          finalResponse,
          responseEmbedding || userPromptEmbedding
        );

        updateConversation((prevState) => {
          const messages = [...prevState.messages];
          messages[messages.length - 2] = {
            ...messages[messages.length - 2],
            pairID: docId,
          };
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            text: finalResponse,
            toolType: type,
            isTyping: false,
            showToolBadge: true,
            docId: docId,
            pairID: docId,
            toolStatus: null,
            showTypingDots: false,
          };
          return { ...prevState, messages };
        });

        saveToLocalStorage(prompt, finalResponse, Date.now(), docId);
      } else {
        const statusText = status.endsWith("...") ? status : `${status}`;
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
    } catch (error) {
      console.error("Error in updateMessageWithToolStatus:", error);
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: errorMessage,
          isTyping: false,
          isError: true,
        };
        return { ...prevState, messages };
      });
    }
  };

  try {
    // Handle OpenSCAD script generation
    if (response.includes("<OPENSCAD>")) {
      await updateMessageWithToolStatus(
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
        userPromptEmbedding,
        prompt,
        userID,
        image,
        memories,
        updateConversation,
        preferences,
      });
      await updateMessageWithToolStatus("complete", "openscad", finalResponse);
      return finalResponse;
    }

    // Handle HTML script generation
    if (response.includes("<HTML_SCRIPT>")) {
      await updateMessageWithToolStatus("Generating HTML Script...", "html");
      const finalResponse = await handleScriptGeneration({
        response,
        tag: "<HTML_SCRIPT>",
        templateFunction: htmlTemplate,
        systemTemplateFunction: htmlSystemTemplate,
        downloadFunction: downloadHTMLScript,
        scriptType: "webApps",
        scriptContents,
        scriptName,
        userPromptEmbedding,
        prompt,
        userID,
        image,
        memories,
        updateConversation,
        preferences,
      });
      await updateMessageWithToolStatus("complete", "html", finalResponse);
      return finalResponse;
    }

    // Handle image generation
    if (response.includes("<IMAGE_GENERATION>")) {
      await updateMessageWithToolStatus("Generating Image", "image");
      const finalResponse = await handleImageGeneration(response, preferences);
      await updateMessageWithToolStatus("complete", "image", finalResponse);
      return finalResponse;
    }

    // Handle Google search
    if (response.includes("<GOOGLE_SEARCH>")) {
      await updateMessageWithToolStatus("Searching Google", "search");
      const finalResponse = await handleGoogleSearch(
        response,
        prompt,
        preferences
      );
      await updateMessageWithToolStatus("complete", "search", finalResponse);
      return finalResponse;
    }

    // Handle Home Assistant tasks
    if (response.includes("<GOOGLE_HOME>")) {
      await updateMessageWithToolStatus(
        "Executing Home Assistant Task",
        "home"
      );
      const finalResponse = await handleHomeAssistant(response);
      await updateMessageWithToolStatus(
        finalResponse.includes("failed") ? "failed" : "complete",
        "home",
        finalResponse
      );
      return finalResponse;
    }

    toolTriggered = false;
    return response;
  } catch (error) {
    console.error("Error in processResponse:", error);
    const errorMessage = "An error occurred while processing your request.";
    await updateMessageWithToolStatus("failed", null, errorMessage);
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
