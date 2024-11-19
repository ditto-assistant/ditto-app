import { handleHomeAssistantTask } from "../agentTools";

/**
 * Handles Home Assistant task flow
 */
export const handleHomeAssistant = async (response) => {
  const query = response.split("<GOOGLE_HOME>")[1];
  const success = await handleHomeAssistantTask(query);
  
  return success
    ? `Home Assistant Task: ${query}\n\nTask completed successfully.`
    : `Home Assistant Task: ${query}\n\nTask failed.`;
}; 