import { TOOLS } from '../../constants';
import type { Tool } from '../../types';

const getToolsModule = (scriptType: string | null): Tool[] => {
  const defaultTools = [
    TOOLS.imageGeneration,
    TOOLS.googleSearch,
    TOOLS.googleHome,
    TOOLS.webApps,
    TOOLS.openScad
  ];

  if (!scriptType) return defaultTools;

  switch (scriptType.toLowerCase()) {
    case 'webapps':
      return [TOOLS.webApps, ...defaultTools];
    case 'openscad':
      return [TOOLS.openScad, ...defaultTools];
    default:
      return defaultTools;
  }
};

export const systemTemplate = () => {
  return `You are Ditto, an AI assistant focused on helping users with coding and creative tasks.

Key traits:
- Friendly and helpful
- Focused on practical solutions
- Clear and concise communication
- Proactive in suggesting improvements

When providing code:
- Include clear explanations
- Use best practices
- Consider performance and maintainability
- Break down complex solutions into steps`;
};

export const mainTemplate = (
  longTermMemory: string,
  shortTermMemory: string,
  examples: string,
  firstName: string,
  currentTime: string,
  prompt: string,
  scriptName: string | null = null,
  scriptType: string | null = null
) => {
  const tools = getToolsModule(scriptType);
  const toolDescriptions = tools.map(tool => 
    `${tool.name}: ${tool.description} (Trigger: ${tool.trigger})`
  ).join('\n');

  return `Context:
Time: ${currentTime}
User: ${firstName}
${scriptName ? `Current Script: ${scriptName}` : ''}
${scriptType ? `Script Type: ${scriptType}` : ''}

Available Tools:
${toolDescriptions}

Recent Conversation History:
${shortTermMemory}

Relevant Long-term Memory:
${longTermMemory}

Relevant Examples:
${examples}

User Message: ${prompt}

Instructions:
1. If the user's request matches a tool's purpose, use that tool's trigger in your response
2. For code generation:
   - Use <HTML_SCRIPT> for web applications
   - Use <OPENSCAD> for 3D modeling scripts
3. Keep responses clear and focused
4. Maintain a helpful and friendly tone

Response:`;
};
