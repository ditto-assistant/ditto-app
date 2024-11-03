import { collection, addDoc, vector } from "firebase/firestore";
import { promptLLM, textEmbed, openaiImageGeneration, getRelevantExamples } from "../api/LLM";
import { googleSearch } from "../api/searchEngine";
import { handleHomeAssistantTask } from "./agentTools";

// import { huggingFaceEmbed } from "../ditto/modules/huggingFaceChat";
import {
  mainTemplate,
  systemTemplate,
} from "../ditto/templates/mainTemplate";
import {
  openscadTemplate,
  openscadSystemTemplate,
} from "../ditto/templates/openscadTemplate";
import {
  htmlTemplate,
  htmlSystemTemplate,
} from "../ditto/templates/htmlTemplate";
import {
  scriptToNameSystemTemplate,
  scriptToNameTemplate,
} from "../ditto/templates/scriptToNameTemplate";
import {
  googleSearchTemplate,
  googleSearchSystemTemplate,
} from "../ditto/templates/googleSearchTemplate";

import updaterAgent from "./updaterAgent";

import { getShortTermMemory, getLongTermMemory } from "./memory";
import { downloadOpenscadScript, downloadHTMLScript } from "./agentTools";
import { db, saveScriptToFirestore, grabConversationHistoryCount, getModelPreferencesFromFirestore } from "./firebase";

const mode = import.meta.env.MODE;

/**
 * Send a prompt to Ditto.
 */
export const sendPrompt = async (userID, firstName, prompt, image, userPromptEmbedding, updateConversation) => {
  try {
    // Add the user's message to the conversation
    const userMessage = { sender: "User", text: prompt, timestamp: Date.now(), pairID: null };
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
      pairID: null // Initialize pairID
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

    // Get model preferences
    const modelPreferences = await getModelPreferencesFromFirestore(userID);

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
      scriptType
    );
    const mainAgentModel = image ? "claude-3-5-sonnet" : modelPreferences.mainModel;

    // Prepare to update the assistant's message as the response streams in
    let updatedText = "";
    let toolTriggered = false;

    // Streaming callback
    let buffer = "";
    let wordQueue = [];
    let isProcessing = false;

    const WORD_DELAY_MS = 25; // Speed up to 25ms between words

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
            "<GOOGLE_HOME>"
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
                updateConversation
              );
              return;
            }
          }
        }
        return;
      }
      isProcessing = true;

      const word = wordQueue.shift();
      updatedText += word;

      // Update the assistant's message in the conversation
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: updatedText,
          isTyping: false
        };
        return { ...prevState, messages };
      });

      // Schedule the next word
      setTimeout(processNextWord, WORD_DELAY_MS);
    };

    const finalizeResponse = async (responseText) => {
      const docId = await saveToMemory(userID, prompt, responseText, userPromptEmbedding);

      // Update conversation with docId and pairID
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 2] = {
          ...messages[messages.length - 2],
          pairID: docId
        };
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: responseText,
          isTyping: false,
          docId: docId,
          pairID: docId
        };
        return { ...prevState, messages };
      });

      saveToLocalStorage(prompt, responseText, Date.now(), docId);
    };

    const streamingCallback = (chunk) => {
      buffer += chunk;

      // Split buffer into words including whitespace
      const words = buffer.split(/(\s+)/);
      buffer = words.pop(); // Keep any incomplete word in the buffer
      wordQueue.push(...words);

      if (!isProcessing) {
        processNextWord();
      }
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

    // Only save to memory if no tool was triggered
    if (!toolTriggered) {
      const docId = await saveToMemory(userID, prompt, response, userPromptEmbedding);
      
      // Update conversation with docId and pairID
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 2] = {
          ...messages[messages.length - 2],
          pairID: docId
        };
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: response,
          isTyping: false,
          docId: docId,
          pairID: docId
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

const handleInitialization = (prompt) => {
  localStorage.setItem("thinking", JSON.stringify({ prompt: prompt }));
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

const generateScriptName = async (script, query) => {
  const scriptToNameConstructedPrompt = scriptToNameTemplate(script, query);
  console.log("%c" + scriptToNameConstructedPrompt, "color: green");
  let scriptToNameResponse = await promptLLM(
    scriptToNameConstructedPrompt,
    scriptToNameSystemTemplate(),
    "gemini-1.5-flash"
  );
  
  // Check for API error and retry once
  if (scriptToNameResponse.includes("error sending request: error response from API: status 500")) {
    console.log("API error detected, retrying script name generation...");
    scriptToNameResponse = await promptLLM(
      scriptToNameConstructedPrompt,
      scriptToNameSystemTemplate(),
      "gemini-1.5-flash"
    );
    if (scriptToNameResponse.includes("error sending request: error response from API: status 500")) {
      console.log("Second attempt failed, defaulting to 'App Name Here'");
      scriptToNameResponse = "App Name Here";
    }
  }

  // Check user balance
  if (scriptToNameResponse.includes("user balance is:")) {
    alert("Please add more Tokens in Settings to continue using this app.");
    scriptToNameResponse = "App Name Here";
  }
  
  // print the response in yellow
  console.log("%c" + scriptToNameResponse, "color: yellow");
  // strip any whitespace from the response or the Script Name: part
  return scriptToNameResponse.trim().replace("Script Name:", "").trim();
};

const processResponse = async (
  response,
  prompt,
  userPromptEmbedding,
  userID,
  scriptContents,
  scriptName,
  image,
  memories,
  updateConversation
) => {
  console.log("%c" + response, "color: yellow");
  let isValidResponse = true;
  let errorMessage = "Error: Payment Required. Please check your token balance.";
  
  if (response === errorMessage || response.includes("402") || response.includes("Payment Required")) {
    isValidResponse = false;
    response = errorMessage;
    
    // Update conversation with error message
    updateConversation((prevState) => {
      const messages = [...prevState.messages];
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        text: errorMessage,
        isTyping: false,
        isError: true
      };
      return { ...prevState, messages };
    });
    
    return errorMessage;
  }

  const updateMessageWithToolStatus = async (status, type, finalResponse = null) => {
    try {
      // Only save to memory when the tool is complete
      if (status === "complete" && finalResponse) {
        const docId = await saveToMemory(userID, prompt, finalResponse, userPromptEmbedding);
        
        // Update conversation with docId and pairID
        updateConversation((prevState) => {
          const messages = [...prevState.messages];
          messages[messages.length - 2] = {
            ...messages[messages.length - 2],
            pairID: docId
          };
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            text: finalResponse,
            toolStatus: status,
            toolType: type,
            isTyping: false,
            showToolBadge: true,
            docId: docId,
            pairID: docId
          };
          return { ...prevState, messages };
        });

        saveToLocalStorage(prompt, finalResponse, Date.now(), docId);
      } else {
        // Just update the UI state for non-complete statuses
        updateConversation((prevState) => {
          const messages = [...prevState.messages];
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            text: finalResponse || response,
            toolStatus: status,
            toolType: type,
            isTyping: false,
            showToolBadge: true
          };
          return { ...prevState, messages };
        });
      }
    } catch (error) {
      console.error('Error in updateMessageWithToolStatus:', error);
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          text: errorMessage,
          isTyping: false,
          isError: true
        };
        return { ...prevState, messages };
      });
    }
  };

  if (response.includes("<OPENSCAD>") && isValidResponse) {
    const query = response.split("<OPENSCAD>")[1];
    await updateMessageWithToolStatus("Generating OpenSCAD Script...", "openscad");
    const finalResponse = await handleScriptGeneration(
      response,
      "<OPENSCAD>",
      openscadTemplate,
      openscadSystemTemplate,
      downloadOpenscadScript,
      "openSCAD",
      scriptContents,
      scriptName,
      userPromptEmbedding,
      prompt,
      userID,
      image,
      memories,
      updateConversation
    );
    const displayResponse = `**OpenSCAD Script Generated and Downloaded.**\n- Task: ${query}`;
    await updateMessageWithToolStatus("complete", "openscad", displayResponse);
    return displayResponse;
  } else if (response.includes("<HTML_SCRIPT>") && isValidResponse) {
    const query = response.split("<HTML_SCRIPT>")[1];
    await updateMessageWithToolStatus("Generating HTML Script...", "html");
    const finalResponse = await handleScriptGeneration(
      response,
      "<HTML_SCRIPT>",
      htmlTemplate,
      htmlSystemTemplate,
      downloadHTMLScript,
      "webApps",
      scriptContents,
      scriptName,
      userPromptEmbedding,
      prompt,
      userID,
      image,
      memories,
      updateConversation
    );
    const displayResponse = `**HTML Script Generated and Downloaded.**\n- Task: ${query}`;
    await updateMessageWithToolStatus("complete", "html", displayResponse);
    return displayResponse;
  } else if (response.includes("<IMAGE_GENERATION>") && isValidResponse) {
    const query = response.split("<IMAGE_GENERATION>")[1];
    await updateMessageWithToolStatus("Generating Image...", "image");
    const imageURL = await openaiImageGeneration(query);
    const finalResponse = `Image Task: ${query}\n![DittoImage](${imageURL})`;
    await updateMessageWithToolStatus("complete", "image", finalResponse);
    return finalResponse;
  } else if (response.includes("<GOOGLE_SEARCH>") && isValidResponse) {
    const query = response.split("<GOOGLE_SEARCH>")[1].split("\n")[0].trim();
    await updateMessageWithToolStatus("Searching Google...", "search");
    const googleSearchResponse = await googleSearch(query);
    let searchResults = "Google Search Query: " + query + "\n" + googleSearchResponse;
    const googleSearchAgentTemplate = googleSearchTemplate(prompt, searchResults);
    const googleSearchAgentResponse = await promptLLM(
      googleSearchAgentTemplate, 
      googleSearchSystemTemplate(), 
      "gemini-1.5-flash"
    );
    const finalResponse = "Google Search Query: " + query + "\n\n" + googleSearchAgentResponse;
    await updateMessageWithToolStatus("complete", "search", finalResponse);
    return finalResponse;
  } else if (response.includes("<GOOGLE_HOME>") && isValidResponse) {
    const query = response.split("<GOOGLE_HOME>")[1];
    await updateMessageWithToolStatus("Executing Home Assistant Task...", "home");
    let success = await handleHomeAssistantTask(query);
    const finalResponse = success ? 
      `Home Assistant Task: ${query}\n\nTask completed successfully.` :
      `Home Assistant Task: ${query}\n\nTask failed.`;
    await updateMessageWithToolStatus(success ? "complete" : "failed", "home", finalResponse);
    return finalResponse;
  }

  return response;
};

const handleScriptGeneration = async (
  response,
  tag,
  templateFunction,
  systemTemplateFunction,
  downloadFunction,
  scriptType,
  scriptContents,
  scriptName,
  userPromptEmbedding,
  prompt,
  userID,
  image,
  memories,
  updateConversation
) => {
  const query = response.split(tag)[1];
  const constructedPrompt = templateFunction(query, scriptContents, memories.longTermMemory, memories.shortTermMemory);
  
  let scriptResponse = "";
  
  // Don't save the "Generating..." message to Firestore
  updateConversation((prevState) => {
    const messages = [...prevState.messages];
    messages[messages.length - 1] = {
      ...messages[messages.length - 1],
      text: `**${scriptType === "webApps" ? "HTML" : "OpenSCAD"} Script Generation**\n- Task: ${query}`,
      toolStatus: "Generating...",
      toolType: scriptType.toLowerCase(),
      isTyping: false,
      showToolBadge: true
    };
    return { ...prevState, messages };
  });

  if (scriptContents === "") {
    scriptResponse = await promptLLM(
      constructedPrompt,
      systemTemplateFunction(),
      "gemini-1.5-flash",
      image,
      () => {}  // Prevent streaming updates
    );
  } else {
    scriptResponse = await updaterAgent(prompt, scriptContents, "gemini-1.5-flash", true);
  }

  const cleanedScript = cleanScriptResponse(scriptResponse);
  if (scriptName === "") {
    scriptName = await generateScriptName(cleanedScript, query);
  }

  const fileName = downloadFunction(cleanedScript, scriptName);
  let fileNameNoExt = fileName.substring(0, fileName.lastIndexOf("."));
  let scriptTypeToWords = scriptType === "webApps" ? "HTML" : "OpenSCAD";
  
  await saveScriptToFirestore(userID, cleanedScript, scriptType, fileNameNoExt);
  handleWorkingOnScript(cleanedScript, fileNameNoExt, scriptType);
  
  const newResponse = `**${scriptTypeToWords} Script Generated and Downloaded.**\n- Task: ${query}`;
  
  // Return the response without saving to memory - let updateMessageWithToolStatus handle that
  return newResponse;
};

const cleanScriptResponse = (response) => {
  // add conditionals to not error out for each of the three operations above
  let cleanedScript = response;
  if (cleanedScript.includes("```")) {
    cleanedScript = cleanedScript.split("```")[1];
  }
  if (cleanedScript.includes("\n")) {
    cleanedScript = cleanedScript.split("\n").slice(1).join("\n");
  }
  if (cleanedScript.includes("```")) {
    cleanedScript = cleanedScript.split("```")[0];
  }
  return cleanedScript;
};

export const saveToMemory = async (
  userID,
  prompt,
  response,
  embedding
) => {
  try {
    if (mode === "development") {
      console.log("Creating memory collection with userID: ", userID);
    }
    const memoryRef = collection(db, "memory", userID, "conversations");
    if (mode === "development") {
      console.log("Memory collection reference: ", memoryRef);
    }
    const docRef = await addDoc(memoryRef, {
      prompt: prompt,
      response: response,
      embedding_vector: vector(embedding),
      embedding: embedding,
      timestamp: new Date(),
      timestampString: new Date().toISOString(),
    });
    if (mode === "development") {
      console.log(
        "Memory written to Firestore collection with ID: ",
        docRef.id
      );
    }
    return docRef.id;
  } catch (e) {
    console.error(
      "Error adding document to Firestore memory collection: ",
      e
    );
    return null;
  }
};

const saveToLocalStorage = (prompt, response, timestamp, pairID) => {
  const prompts = loadFromLocalStorage("prompts", []);
  const responses = loadFromLocalStorage("responses", []);
  const timestamps = loadFromLocalStorage("timestamps", []);
  const pairIDs = loadFromLocalStorage("pairIDs", []);
  
  if (!pairIDs.includes(pairID)) { // Ensure no duplicates
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

export const handleWorkingOnScript = (
  cleanedScript,
  filename,
  scriptType
) => {
  console.log("Handling working on script state...");
  const workingOnScriptJSONString = localStorage.getItem("workingOnScript");
  if (workingOnScriptJSONString) {
    const scriptName = JSON.parse(workingOnScriptJSONString).script;
    updateScriptInLocalStorage(scriptName, cleanedScript, scriptType);
    saveWorkingScript(scriptName, cleanedScript, scriptType);
  } else {
    const newScript = {
      script: filename,
      contents: cleanedScript,
      scriptType: scriptType,
    };
    localStorage.setItem("workingOnScript", JSON.stringify(newScript));
    saveScriptToLocalStorage(filename, cleanedScript, scriptType);
  }
};

const saveWorkingScript = (name, cleanedScript, scriptType) => {
  localStorage.setItem(
    "workingOnScript",
    JSON.stringify({ script: name, contents: cleanedScript, scriptType: scriptType })
  );
};

const updateScriptInLocalStorage = (scriptName, cleanedScript, scriptType) => {
  let scriptTypeObject = loadFromLocalStorage(scriptType, []);
  const scriptIndex = scriptTypeObject.findIndex(
    (script) => script.name === scriptName
  );
  scriptTypeObject[scriptIndex].content = cleanedScript;
  localStorage.setItem(scriptType, JSON.stringify(scriptTypeObject));
};

const saveScriptToLocalStorage = (filename, cleanedScript, scriptType) => {
  const scriptTypeObject = loadFromLocalStorage(scriptType, []);
  // check if already in and JUST update the content
  const scriptIndex = scriptTypeObject.findIndex(
    (script) => script.name === filename
  );
  if (scriptIndex !== -1) {
    scriptTypeObject[scriptIndex].content = cleanedScript;
    localStorage.setItem(scriptType, JSON.stringify(scriptTypeObject));
    return;
  }
  scriptTypeObject.push({
    id: Date.now(),
    name: filename,
    content: cleanedScript,
    scriptType: scriptType
  });
  localStorage.setItem(scriptType, JSON.stringify(scriptTypeObject));
};