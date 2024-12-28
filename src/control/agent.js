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
import { getShortTermMemory, getLongTermMemory } from "./memory";
import { downloadOpenscadScript, downloadHTMLScript } from "./agentTools";
import { handleScriptGeneration } from "./agentflows/scriptFlow";
import { handleImageGeneration } from "./agentflows/imageFlow";
import { handleGoogleSearch } from "./agentflows/searchFlow";
import { handleHomeAssistant } from "./agentflows/homeFlow";
import { modelSupportsImageAttachments } from "@/types/llm";
import { saveMessagePairToMemory } from "./firebase";
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
      fetchMemories(userID, userPromptEmbedding),
      getRelevantExamples(userPromptEmbedding, 5),
      fetchScriptDetails(),
    ]);

    const { shortTermMemory, longTermMemory } = memories;
    const { scriptName, scriptType, scriptContents } = scriptDetails;

    const constructedPrompt = mainTemplate(
      longTermMemory,
      shortTermMemory,
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

    // Prepare to update the assistant's message as the response streams in
    let updatedText = "";

    // Streaming callback
    let buffer = "";
    let wordQueue = [];
    let isProcessing = false;

    const WORD_DELAY_MS = 12;

    const processNextWord = async () => {
      if (wordQueue.length === 0) {
        isProcessing = false;

        // Check for tool triggers in the complete response when streaming is done
        if (!toolTriggered && updatedText) {
          const toolTriggers = [
            "<OPENSCAD>",
            "<HTML_SCRIPT>",
            "<IMAGE_GENERATION>",
            "<GOOGLE_SEARCH>",
            "<GOOGLE_HOME>",
          ];

          for (const trigger of toolTriggers) {
            if (updatedText.includes(trigger) && !toolTriggered) {
              toolTriggered = true;
              await processResponse(
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

          // Only update the UI state here, don't save to memory yet
          updateConversation((prevState) => {
            const messages = [...prevState.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              text: updatedText,
              isTyping: false,
            };
            return { ...prevState, messages };
          });
        }
        return;
      }
      isProcessing = true;

      const word = wordQueue.shift();
      updatedText += word;

      // Update the assistant's message in the conversation without saving to Firestore
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: updatedText,
          isTyping: false,
        };
        return { ...prevState, messages };
      });

      // Schedule the next word
      setTimeout(processNextWord, WORD_DELAY_MS);
    };

    const finalizeResponse = async (responseText) => {
      const docId = await saveMessagePairToMemory(
        userID,
        prompt,
        responseText,
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
          text: responseText,
          isTyping: false,
          docId: docId,
          pairID: docId,
        };
        return { ...prevState, messages };
      });

      saveToLocalStorage(prompt, responseText, Date.now(), docId);
    };

    const streamingCallback = (chunk) => {
      // Check if this is the first chunk of a new message
      const isNewMessage = !buffer && !wordQueue.length;

      // Don't stream if we've detected a tool trigger
      if (toolTriggered) return;

      // Dispatch the streaming event with the chunk and isNewMessage flag
      const event = new CustomEvent("responseStreamUpdate", {
        detail: {
          chunk,
          isNewMessage,
        },
      });
      window.dispatchEvent(event);
    };

    // Call the LLM with the streaming callback
    const response = await promptLLM(
      constructedPrompt,
      systemTemplate(),
      mainAgentModel,
      image,
      streamingCallback
    );

    // Process any remaining text
    if (buffer.length > 0) {
      wordQueue.push(buffer);
      buffer = "";
      if (!isProcessing) {
        processNextWord();
      }
    }

    // Wait for all words to be processed
    while (wordQueue.length > 0 || isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, WORD_DELAY_MS));
    }

    // Check for tool triggers before saving
    const toolTriggers = [
      "<OPENSCAD>",
      "<HTML_SCRIPT>",
      "<IMAGE_GENERATION>",
      "<GOOGLE_SEARCH>",
      "<GOOGLE_HOME>",
    ];

    const hasTrigger = toolTriggers.some((trigger) =>
      response.includes(trigger)
    );

    // Only save to memory if no tool trigger is found
    if (!hasTrigger && response) {
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

const fetchMemories = async (userID, embedding) => {
  // if embedding is ""
  if (embedding === "") {
    return { embedding: "", shortTermMemory: "", longTermMemory: "" };
  }
  // const embedding = await huggingFaceEmbed(prompt); // TODO: use bert embeddings locally instead of OpenAI or huggingface API
  const shortTermMemory = await getShortTermMemory(userID, 5);
  const longTermMemory = await getLongTermMemory(userID, embedding, 5);
  return { shortTermMemory, longTermMemory };
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
