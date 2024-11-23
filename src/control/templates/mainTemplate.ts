import { TOOLS } from "../../constants";
import type { Tool, ToolPreferences } from "../../types/llm";

const getToolsModule = (
  scriptType: string | null,
  toolPreferences: ToolPreferences
): Tool[] => {
  const enabledTools = [];

  if (toolPreferences.imageGeneration) {
    enabledTools.push(TOOLS.imageGeneration);
  }
  if (toolPreferences.googleSearch) {
    enabledTools.push(TOOLS.googleSearch);
  }
  if (toolPreferences.googleHome) {
    enabledTools.push(TOOLS.googleHome);
  }
  if (toolPreferences.htmlScript) {
    enabledTools.push(TOOLS.webApps);
  }
  if (toolPreferences.openScad) {
    enabledTools.push(TOOLS.openScad);
  }

  if (!scriptType) return enabledTools;

  switch (scriptType.toLowerCase()) {
    case "webapps":
      return toolPreferences.htmlScript
        ? [TOOLS.webApps, ...enabledTools.filter((t) => t !== TOOLS.webApps)]
        : enabledTools;
    case "openscad":
      return toolPreferences.openScad
        ? [TOOLS.openScad, ...enabledTools.filter((t) => t !== TOOLS.openScad)]
        : enabledTools;
    default:
      return enabledTools;
  }
};

export const systemTemplate = () => {
  return "You are a friendly AI named Ditto here to help the user who is your best friend.";
};

/**
 * This function returns the current time in the timezone of the user.
 * @returns {string} timezoneString - The current time in the timezone of the user.
 */
export const getTimezoneString = () => {
  let timezoneString;
  let timezone = new Date()
    .toLocaleString("en-US", { timeZoneName: "short" })
    .split(" ");
  if (timezone[1] === "Standard") {
    timezoneString = timezone[2];
  } else {
    timezoneString = timezone[1];
  }
  return timezoneString;
};

export const workingOnScriptModule = (scriptName: string, type: string) => {
  if (scriptName === "") {
    return "";
  }
  return `## Current Script: ${scriptName}
- If you are reading this, that means the user is currently working on a ${type} script. Please send any requests from the user to the respective agent/tool for the user's ${type} script.
- Don't send a user's prompt to the tool if they are obviously asking you something off topic to the current script or chatting with you. 
`;
};

export const mainTemplate = (
  longTermMemory: string,
  shortTermMemory: string,
  examples: string,
  firstName: string,
  timestamp: string,
  usersPrompt: string,
  workingOnScriptName: string | null = null,
  workingOnScriptType: string | null = null,
  toolPreferences: ToolPreferences
) => {
  const tools = getToolsModule(workingOnScriptType, toolPreferences);

  const toolsSection =
    tools.length > 0
      ? `
## Available Tools
${tools
        .map(
          (tool, index) =>
            `${index + 1}. ${tool.name}: ${tool.description} (Trigger: ${tool.trigger})`
        )
        .join("\n")}`
      : "";

  const filteredExamples = examples
    .split("\n\n")
    .filter((example) => {
      if (!example.trim()) return false;

      return tools.some((tool) => {
        const triggerBase = tool.trigger.split(" ")[0];
        return example.includes(triggerBase);
      });
    })
    .map((example, index) => {
      const cleanExample = example
        .replace(/Example \d+\s*Example \d+/g, "")
        .replace(/Example \d+/g, "")
        .trim();

      const [userPrompt, response] = cleanExample
        .split("User's Prompt:")
        .map((s) => s.trim());

      return `Example ${index + 1}\nUser's Prompt: ${response}`;
    })
    .join("\n\n");

  const examplesSection =
    tools.length > 0 && filteredExamples
      ? `

## Examples of User Prompts that need tools:
-- Begin Examples --
${filteredExamples}
-- End Examples --`
      : "";

  let prompt = `The following is a conversation between an AI named Ditto and a human that are best friends. Ditto is helpful and answers factual questions correctly but maintains a friendly relationship with the human.
${toolsSection}${examplesSection}

## Long Term Memory
- Relevant prompt/response pairs from the user's prompt history are indexed using cosine similarity and are shown below as Long Term Memory. 
Long Term Memory Buffer (most relevant prompt/response pairs):
-- Begin Long Term Memory --
<!long_term_memory>
-- End Long Term Memory --

## Short Term Memory
- The most recent prompt/response pairs are shown below as Short Term Memory. This is usually 5-10 most recent prompt/response pairs.
Short Term Memory Buffer (most recent prompt/response pairs):
-- Begin Short Term Memory --
<!short_term_memory>
-- End Short Term Memory --

<!working_on_script_module>

User's Name: <!users_name>
Current Timestamp: <!timestamp>
Current Time in User's Timezone: <!time>
User's Prompt: <!users_prompt>
Ditto:`;

  prompt = prompt.replace(
    "<!time>",
    getTimezoneString() + " " + (new Date().getHours() >= 12 ? "PM" : "AM")
  );
  prompt = prompt.replace("<!long_term_memory>", longTermMemory);
  prompt = prompt.replace("<!short_term_memory>", shortTermMemory);
  prompt = prompt.replace("<!examples>", examples);
  prompt = prompt.replace(
    "<!working_on_script_module>",
    workingOnScriptModule(workingOnScriptName || "", workingOnScriptType || "")
  );
  prompt = prompt.replace("<!users_name>", firstName);
  prompt = prompt.replace("<!timestamp>", timestamp);
  prompt = prompt.replace("<!users_prompt>", usersPrompt);
  return prompt;
};
