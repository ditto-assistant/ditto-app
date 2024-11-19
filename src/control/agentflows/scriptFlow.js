import { saveScriptToFirestore } from "../firebase";
import { promptLLM } from "../../api/LLM";
import updaterAgent from "../agentflows/updaterAgentFlow";
import {
  scriptToNameTemplate,
  scriptToNameSystemTemplate,
} from "../templates/scriptToNameTemplate";

/**
 * Handles script generation flow (OpenSCAD or HTML)
 * @typedef {import("../../types").ModelPreferences} ModelPreferences
 * @param {Object} params - The parameters for script generation.
 * @param {string} params.response - The user's response to the script generation prompt.
 * @param {string} params.tag - The tag used to identify the script generation prompt.
 * @param {function} params.templateFunction - The function that constructs the script generation prompt.
 * @param {function} params.systemTemplateFunction - The function that constructs the system prompt for the script generation.
 * @param {function} params.downloadFunction - The function that downloads the generated script.
 * @param {string} params.scriptType - The type of script to generate.
 * @param {string} params.scriptContents - The contents of the script to generate.
 * @param {string} params.scriptName - The name of the script to generate.
 * @param {Array} params.memories - The memories of the user.
 * @param {Object} params.updateConversation - The function to update the conversation.
 * @param {ModelPreferences} params.preferences - The preferences of the user.
 */
export const handleScriptGeneration = async ({
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
  updateConversation,
  preferences,
}) => {
  const query = response.split(tag)[1];
  const constructedPrompt = templateFunction(
    query,
    scriptContents,
    memories.longTermMemory,
    memories.shortTermMemory
  );

  console.log("%c" + constructedPrompt, "color: green");

  let scriptResponse = "";

  if (scriptContents === "") {
    scriptResponse = await promptLLM(
      constructedPrompt,
      systemTemplateFunction(),
      preferences.programmerModel,
      image,
      () => {} // Prevent streaming updates
    );
    console.log("%c" + scriptResponse, "color: yellow");
  } else {
    scriptResponse = await updaterAgent(
      prompt,
      scriptContents,
      preferences.programmerModel,
      true
    );
    console.log("%c" + scriptResponse, "color: yellow");
  }

  const cleanedScript = cleanScriptResponse(scriptResponse);
  if (scriptName === "") {
    scriptName = await generateScriptName(cleanedScript, query);
  }

  const fileName = downloadFunction(cleanedScript, scriptName);
  let fileNameNoExt = fileName.substring(0, fileName.lastIndexOf("."));

  await saveScriptToFirestore(userID, cleanedScript, scriptType, fileNameNoExt);
  handleWorkingOnScript(cleanedScript, fileNameNoExt, scriptType);

  return `**${scriptType === "webApps" ? "HTML" : "OpenSCAD"} Script Generated and Downloaded.**\n- Task: ${query}`;
};

/**
 * Generates a name for the script based on its contents and query
 */
export const generateScriptName = async (script, query) => {
  const scriptToNameConstructedPrompt = scriptToNameTemplate(script, query);
  console.log("%c" + scriptToNameConstructedPrompt, "color: green");

  let scriptToNameResponse = await promptLLM(
    scriptToNameConstructedPrompt,
    scriptToNameSystemTemplate(),
    "gemini-1.5-flash"
  );

  // Handle errors and retries
  if (scriptToNameResponse.includes("error sending request")) {
    console.log("API error detected, retrying script name generation...");
    scriptToNameResponse = await promptLLM(
      scriptToNameConstructedPrompt,
      scriptToNameSystemTemplate(),
      "gemini-1.5-flash"
    );
    if (scriptToNameResponse.includes("error sending request")) {
      console.log("Second attempt failed, defaulting to 'App Name Here'");
      return "App Name Here";
    }
  }

  if (scriptToNameResponse.includes("user balance is:")) {
    alert("Please add more Tokens in Settings to continue using this app.");
    return "App Name Here";
  }

  console.log("%c" + scriptToNameResponse, "color: yellow");
  return scriptToNameResponse.trim().replace("Script Name:", "").trim();
};

/**
 * Cleans up script response by removing markdown and extra whitespace
 */
const cleanScriptResponse = (response) => {
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

/**
 * Updates working script state in localStorage
 */
export const handleWorkingOnScript = (cleanedScript, filename, scriptType) => {
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

const updateScriptInLocalStorage = (scriptName, cleanedScript, scriptType) => {
  let scriptTypeObject = JSON.parse(localStorage.getItem(scriptType) || "[]");
  const scriptIndex = scriptTypeObject.findIndex(
    (script) => script.name === scriptName
  );
  scriptTypeObject[scriptIndex].content = cleanedScript;
  localStorage.setItem(scriptType, JSON.stringify(scriptTypeObject));
};

const saveWorkingScript = (name, cleanedScript, scriptType) => {
  localStorage.setItem(
    "workingOnScript",
    JSON.stringify({
      script: name,
      contents: cleanedScript,
      scriptType: scriptType,
    })
  );
};

const saveScriptToLocalStorage = (filename, cleanedScript, scriptType) => {
  const scriptTypeObject = JSON.parse(localStorage.getItem(scriptType) || "[]");
  const scriptIndex = scriptTypeObject.findIndex(
    (script) => script.name === filename
  );

  if (scriptIndex !== -1) {
    scriptTypeObject[scriptIndex].content = cleanedScript;
  } else {
    scriptTypeObject.push({
      id: Date.now(),
      name: filename,
      content: cleanedScript,
      scriptType: scriptType,
    });
  }

  localStorage.setItem(scriptType, JSON.stringify(scriptTypeObject));
};
