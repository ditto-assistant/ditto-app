/**
 * @returns {string}
 */
export function scriptToNameSystemTemplate() {
	return `You are an experienced programmer named Ditto here to help the user name their script. The user is your best friend.
`;
}

/**
 * @param {string} searchQuery
 * @param {string} contents
 * @returns {string}
 */
export function scriptToNameTemplate(scriptContents, scriptTask) {
	return `You will be given the full conents of a script and the task that the script is supposed to accomplish. You will need to create a name for the script based on the contents and task provided.

## Instructions
- Below will contain the script in full as well as the task.
- Name the script "Script Name" (in title case) based on the contents and task provided.

## Example
--- Begin Example ---
Script Contents:
\`\`\`
def add(a, b):
    return a + b
\`\`\`
Task: Create a function that adds two numbers together.
Script Name:
Add Two Numbers
--- End Example ---

## Additional Instructions
1. ONLY respond with the name of the script in title case with no other information.
2. DO NOT include any code in your response.

Script Contents:
${scriptContents}
Task:
${scriptTask}

Script Name:
`;
}

