import { collection, addDoc } from "firebase/firestore";
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

import { getShortTermMemory, getLongTermMemory } from "./memory";
import { downloadOpenscadScript, downloadHTMLScript } from "./agentTools";
import { db, saveScriptToFirestore, grabConversationHistoryCount } from "./firebase";

const mode = import.meta.env.MODE;

/**
 * Send a prompt to Ditto.
 */
export const sendPrompt = async (userID, firstName, prompt, image, userPromptEmbedding) => {
  try {
    localStorage.setItem("idle", "false");
    let allTokensInput = "";
    let allTokensOutput = "";
    handleInitialization(prompt);

    // fetch user prompt embedddings
    // let userPromptEmbedding = await textEmbed(prompt);

    if (userPromptEmbedding === "") {
      localStorage.removeItem("thinking");
      localStorage.setItem("idle", "true");
      return "An error occurred while processing your request. Please try again.";
    }

    // do the above three with a promise.all
    const allResponses = await Promise.all([
      fetchMemories(userID, userPromptEmbedding), // fetch memories
      getRelevantExamples(userPromptEmbedding, 5), // fetch relevant examples
      fetchScriptDetails() // fetch script details
    ]);

    const [memories, examplesString, scriptDetails] = allResponses;
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

    // print constructed prompt in green
    console.log("%c" + constructedPrompt, "color: green");
    allTokensInput += constructedPrompt
    let imageTokens = 0;
    if (image) {
      imageTokens = 765;
    }
    allTokensInput += imageTokens
    const response = await promptLLM(
      constructedPrompt,
      systemTemplate(),
      "gemini-1.5-flash",
      image
    );
    allTokensOutput += response

    let finalResponse = await processResponse(
      response,
      prompt,
      userPromptEmbedding,
      userID,
      scriptContents,
      scriptName,
      image,
      allTokensInput,
      allTokensOutput
    );

    localStorage.setItem("idle", "true");

    return finalResponse;
  } catch (e) {
    localStorage.removeItem("thinking");
    localStorage.setItem("idle", "true");
    console.error(e);
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

const processResponse = async (
  response,
  prompt,
  embedding,
  userID,
  scriptContents,
  scriptName,
  image,
  allTokensInput,
  allTokensOutput
) => {
  // print response in yellow
  console.log("%c" + response, "color: yellow");
  let isValidResponse = true;
  // check if response is blank ""
  let errorMessage = "Response Error: please check your internet connection or token balance.";
  if (response === errorMessage) {
    isValidResponse = false;
    response = errorMessage;
  }
  if (response.includes("<OPENSCAD>") && isValidResponse) {
    return await handleScriptGeneration(
      response,
      "<OPENSCAD>",
      openscadTemplate,
      openscadSystemTemplate,
      downloadOpenscadScript,
      "openSCAD",
      scriptContents,
      scriptName,
      embedding,
      prompt,
      userID,
      image,
      allTokensInput,
      allTokensOutput
    );
  } else if (response.includes("<HTML_SCRIPT>") && isValidResponse) {
    return await handleScriptGeneration(
      response,
      "<HTML_SCRIPT>",
      htmlTemplate,
      htmlSystemTemplate,
      downloadHTMLScript,
      "webApps",
      scriptContents,
      scriptName,
      embedding,
      prompt,
      userID,
      image,
      allTokensInput,
      allTokensOutput
    );
  } else if (response.includes("<IMAGE_GENERATION>") && isValidResponse) {
    // handle image generation
    const query = response.split("<IMAGE_GENERATION>")[1];
    const imageURL = await openaiImageGeneration(query);
    // const newImageURL = await uploadGeneratedImageToFirebaseStorage(imageURL, userID);
    // console.log("Image Response: ", imageResponse);
    let newresponse = `Image Task: ${query}\n![DittoImage](${imageURL})`;
    saveToMemory(userID, prompt, newresponse, embedding).catch((e) => {
      console.error("Error saving to memory: ", e);
    });
    const timestamp = Date.now();
    saveToLocalStorage(prompt, newresponse, timestamp).catch((e) => {
      console.error("Error saving to local storage: ", e);
    });
    localStorage.removeItem("thinking");
    return newresponse;
  } else if (response.includes("<GOOGLE_SEARCH>") && isValidResponse) {
    // handle google search
    const query = response.split("<GOOGLE_SEARCH>")[1].split("\n")[0].trim();
    const googleSearchResponse = await googleSearch(query);
    let searchResults = "Google Search Query: " + query + "\n" + googleSearchResponse;
    const googleSearchAgentTemplate = googleSearchTemplate(prompt, searchResults);
    // print the prompt in green
    console.log("%c" + googleSearchAgentTemplate, "color: green");
    allTokensInput += googleSearchAgentTemplate
    const googleSearchAgentResponse = await promptLLM(googleSearchAgentTemplate, googleSearchSystemTemplate(), "gemini-1.5-flash");
    // print the response in yellow
    console.log("%c" + googleSearchAgentResponse, "color: yellow");
    allTokensOutput += googleSearchAgentResponse
    // check if <WEBSITE> is in the response
    let newresponse = "Google Search Query: " + query + "\n\n" + googleSearchAgentResponse;
    saveToMemory(userID, prompt, newresponse, embedding).catch((e) => {
      console.error("Error saving to memory: ", e);
    });
    const timestamp = Date.now();
    saveToLocalStorage(prompt, newresponse, timestamp).catch((e) => {
      console.error("Error saving to local storage: ", e);
    });
    localStorage.removeItem("thinking");
    return newresponse;
  } else if (response.includes("<GOOGLE_HOME>") && isValidResponse) {
    // handle Home Assistant task
    const query = response.split("<GOOGLE_HOME>")[1];
    let success = await handleHomeAssistantTask(query);
    let newresponse;
    if (success) {
      newresponse = `Home Assistant Task: ${query}\n\nTask completed successfully.`;
    } else {
      newresponse = `Home Assistant Task: ${query}\n\nTask failed.`;
    }
    saveToMemory(userID, prompt, newresponse, embedding).catch((e) => {
      console.error("Error saving to memory: ", e);
    });
    const timestamp = Date.now();
    saveToLocalStorage(prompt, newresponse, timestamp).catch((e) => {
      console.error("Error saving to local storage: ", e);
    });
    localStorage.removeItem("thinking");
    return newresponse;
  }
  else {
    saveToMemory(userID, prompt, response, embedding).catch((e) => {
      console.error("Error saving to memory: ", e);
    });
    const timestamp = Date.now();
    saveToLocalStorage(prompt, response, timestamp).catch((e) => {
      console.error("Error saving to local storage: ", e);
    });
    localStorage.removeItem("thinking");
    return response;
  }
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
  embedding,
  prompt,
  userID,
  image,
  allTokensInput,
  allTokensOutput
) => {
  const query = response.split(tag)[1];
  const constructedPrompt = templateFunction(query, scriptContents);
  // print constructed prompt in green
  console.log("%c" + constructedPrompt, "color: green");
  allTokensInput = constructedPrompt
  let imageTokens = 0;
  if (image) {
    imageTokens = 765;
  }
  allTokensInput += imageTokens
  const scriptResponse = await promptLLM(
    constructedPrompt,
    systemTemplateFunction(),
    "gemini-1.5-pro",
    image
  );
  /// print the response in yellow
  console.log("%c" + scriptResponse, "color: yellow");
  allTokensOutput = scriptResponse
  let errorMessage = "Response Error: please check your internet connection or token balance.";
  if (scriptResponse === errorMessage) {
    return errorMessage;
  }
  const cleanedScript = cleanScriptResponse(scriptResponse);
  if (scriptName === "") {
    // generate the script name
    let scriptToNameConstructedPrompt = scriptToNameTemplate(cleanedScript, query);
    // print the prompt in green
    console.log("%c" + scriptToNameConstructedPrompt, "color: green");
    allTokensInput += scriptToNameConstructedPrompt
    const scriptToNameResponse = await promptLLM(
      scriptToNameConstructedPrompt,
      scriptToNameSystemTemplate(),
      "gemini-1.5-flash"
    );
    // print the response in yellow
    console.log("%c" + scriptToNameResponse, "color: yellow");
    allTokensOutput += scriptToNameResponse
    // strip any whitespace from the response or the Script Name: part
    scriptName = scriptToNameResponse.trim().replace("Script Name:", "").trim();
  }
  const fileName = downloadFunction(cleanedScript, scriptName);
  let fileNameNoExt = fileName;
  // find file ext on the end (ignoring .'s in the filename) and remove
  if (fileName.includes(".")) {
    // get the contents to the left of the last '.'
    fileNameNoExt = fileName.substring(0, fileName.lastIndexOf(".")); // remove the file extension
  }
  let scriptTypeToWords = scriptType === "webApps" ? "HTML" : "OpenSCAD";
  const newResponse =
    `**${scriptTypeToWords} Script Generated and Downloaded.**\n- Task:` +
    query;
  saveScriptToFirestore(userID, cleanedScript, scriptType, fileNameNoExt).catch((e) => {
    console.error("Error saving to firestore: ", e);
  });
  handleWorkingOnScript(cleanedScript, fileNameNoExt, scriptType);
  saveToMemory(userID, prompt, newResponse, embedding).catch((e) => {
    console.error("Error saving to memory: ", e);
  });
  const timestamp = Date.now();
  saveToLocalStorage(prompt, newResponse, timestamp).catch((e) => {
    console.error("Error saving to local storage: ", e);
  });
  localStorage.removeItem("thinking");
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
  } catch (e) {
    console.error(
      "Error adding document to Firestore memory collection: ",
      e
    );
  }
};

const saveToLocalStorage = async (prompt, response, timestamp) => {
  const prompts = loadFromLocalStorage("prompts", []);
  const responses = loadFromLocalStorage("responses", []);
  const timestamps = loadFromLocalStorage("timestamps", []);
  let userID = localStorage.getItem("userID");
  let histCount = await grabConversationHistoryCount(userID);
  if (mode === "development") {
    console.log("Hist Count: ", histCount);
  }
  prompts.push(prompt);
  responses.push(response);
  timestamps.push(timestamp);
  localStorage.setItem("prompts", JSON.stringify(prompts));
  localStorage.setItem("responses", JSON.stringify(responses));
  localStorage.setItem("timestamps", JSON.stringify(timestamps));

  // histCount++;
  localStorage.setItem("histCount", histCount);
};

const loadFromLocalStorage = (key, defaultValue) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
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