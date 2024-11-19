export const htmlSystemTemplate = () => {
  return "You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend.";
};

export const workingOnScriptModule = (script: string) => {
  if (script === "") {
    return "";
  }
  return `## Current Script
- The user is currently working on this HTML script below. DO NOT change the script's functionality or design unless the user asks you to do so.
Current HTML Script:
\`\`\`html
<!script>
\`\`\`
`.replace("<!script>", script);
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

export const historyModule = (ltm: string, stm: string) => {
  if (ltm === "" && stm === "") {
    return "";
  }
  return `## Long Term Memory
- Relevant prompt/response pairs from the user's prompt history are indexed using the user's prompt embedding and cosine similarity and are shown below as Long Term Memory. 
Long Term Memory Buffer (most relevant prompt/response pairs):
-- Begin Long Term Memory --
${ltm}
-- End Long Term Memory --

## Short Term Memory
- The most recent prompt/response pairs are shown below as Short Term Memory. This is usually 5-10 most recent prompt/response pairs.
Short Term Memory Buffer (most recent prompt/response pairs):
-- Begin Short Term Memory --
${stm}
-- End Short Term Memory --`;
};

export const programmerAgentplanner = (query: string, script: string) => {
  let prompt = `You are an experienced web developer ready to create a set of tasks in a JSON Schema for another AI agent to follow. You will be given a design idea and you will need to create a formal writeup of the tasks that need to be completed to create the design idea.

## Instructions
- Your response should be a formal writeup of the tasks that need to be completed to create the design idea.
- Your response should be in markdown format.

## Example
-- Begin Examples --

Example 1:
User's Design Idea: Change the title of the page to "My Website" and also add a simple footer with the text "Copyright 2024 My Website". Be sure to also change the body and h1 to be more like a dark mode theme.
HTML Script:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello, World!</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: sans-serif;
            background-color: #f0f0f0;
        }
        h1 {
            font-size: 5rem;
            color: #333;
        }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
Task Writeup:
# Dark Mode Website with Footer Update
## Tasks
1. Change the page title to "My Website"
   - Locate the title tag in the head section
   - Replace "Hello, World!" with "My Website"

2. Add footer with copyright text
   - Create a new footer element at the bottom of the body
   - Add "Copyright 2024 My Website" text inside footer
   - Style footer with:
     - Fixed position at bottom
     - Full width
     - Center-aligned text
     - Padding for spacing
     - Dark mode colors matching theme

3. Update theme to dark mode
   - Modify body styles:
     - Set background-color to #1E1E1E
     - Change text color to #FFFFFF
   - Update h1 styles:
     - Change color to #FFFFFF
     - Add text-shadow for better contrast
     - Keep existing font size and centering

## Implementation Notes
- Use CSS variables for consistent dark mode colors
- Ensure footer stays at bottom with fixed positioning
- Maintain existing layout and spacing while updating colors
- Test contrast ratios meet accessibility standards

Example 2:
User's Design Idea: Add a title to the page and add an add button to collect user input for a to-do list.
HTML Script:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Textbox App</title>
    <style>
        body {
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f0f0f0;
            margin: 0;
        }

        .container {
            background-color: #fff;
            padding: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        textarea {
            width: 100%;
            padding: 15px;
            border: 1px solid #ccc;
            border-radius: 4px;
            resize: vertical;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <textarea placeholder="Enter your text here..."></textarea>
    </div>
</body>
</html>
\`\`\`
Task Writeup:
# To-Do List App
## Analysis
The current code provides a simple textbox interface that needs to be enhanced into a to-do list application. The existing styling and layout provide a good foundation but need modifications to support the new functionality.

## Required Changes
1. Update Page Title
   - Current: "Simple Textbox App"
   - Change to: "To-Do List"
   - Location: <title> tag in <head> section

2. Enhance Input Interface
   - Convert textarea to input field for better UX
   - Add "Add Task" button next to input
   - Style button to match existing design
   
3. Add Task List Display
   - Create unordered list (<ul>) to show tasks
   - Style list items for consistent appearance
   - Add task deletion capability

4. Implement Task Management
   - Add JavaScript for task handling
   - Use localStorage for data persistence
   - Include task completion toggling

## Implementation Notes
- Maintain existing color scheme and styling
- Ensure responsive design works on mobile
- Keep centered layout with container
- Add appropriate spacing between elements

-- End Examples --

Current Time in User's Timezone: <!time>
User's Design Idea: <!query>
HTML Script:
\`\`\`html
<!script>
\`\`\`
Task Writeup:
`;
  prompt = prompt.replace(
    "<!time>",
    getTimezoneString() + " " + (new Date().getHours() >= 12 ? "PM" : "AM"),
  );
  prompt = prompt.replace("<!query>", query);
  prompt = prompt.replace("<!script>", script);
  return prompt;
};

export const programmerAgentTaskCoder = (query: string, script: string) => {
  let prompt = `You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend. You will be given a task writeup from another AI agent and an entire HTML script. You will also be assessing one line of code at a time and responding with 3 options: "ADD", "REMOVE", or "NO CHANGE". If you use ADD you will need to also respond with the code that needs to be added.

## Instructions
- Given the task writeup, HTML script, and current line of code, respond with the option that best completes the task writeup.
- Your response should be in the following format:
    - <ADD> code here
    - <REMOVE>
    - <NO_CHANGE>

## Examples
-- Begin Examples --

Example 1:
HTML Script:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello, World!</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: sans-serif;
            background-color: #f0f0f0;
        }
        h1 {
            font-size: 5rem;
            color: #333;
        }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
Task Writeup:
# Dark Mode Website with Footer Update
## Tasks
1. Change the page title to "My Website"
   - Locate the title tag in the head section
   - Replace "Hello, World!" with "My Website"

2. Add footer with copyright text
   - Create a new footer element at the bottom of the body
   - Add "Copyright 2024 My Website" text inside footer
   - Style footer with:
     - Fixed position at bottom
     - Full width
     - Center-aligned text
     - Padding for spacing
     - Dark mode colors matching theme

3. Update theme to dark mode
   - Modify body styles:
     - Set background-color to #1E1E1E
     - Change text color to #FFFFFF
   - Update h1 styles:
     - Change color to #FFFFFF
     - Add text-shadow for better contrast
     - Keep existing font size and centering

## Implementation Notes
- Use CSS variables for consistent dark mode colors
- Ensure footer stays at bottom with fixed positioning
- Maintain existing layout and spacing while updating colors
- Test contrast ratios meet accessibility standards
Current Line of Code:
<!DOCTYPE html>
Action:
<NO_CHANGE>
-- End Examples --
HTML Script:
<!script>
Task Writeup:
<!query>
Current Line of Code:
<!current_line_of_code>
Action:
`;
};

export const htmlTemplate = (
  query: string,
  script: string,
  ltm: string = "",
  stm: string = "",
) => {
  let prompt = `You are an experienced web developer ready to create a new web design. You will be given a design idea and you will need to create the web design using Javascript, HTML and CSS in one index.html file. You have been given a task by an AI assistant named Ditto to help the user with their design idea. ONLY use the relevant information from the conversation history to help the user with their design idea. The conversation history is shown below broken up into Long Term Memory and Short Term Memory.

<!history>

## Instructions
- Below will contain the user's design idea. Make sure the script can be rendered without any external files.
- You MUST use the <script> tag to include Javascript code in the HTML file from popular libraries that all browsers support, even on mobile devices, as everything you make has to work and look good on mobile devices.
- Import any external libraries you need using the <script> tag and use these even if the user does not mention them as they are necessary for the design / functionality to work.
- Be sure to use localStorage browser caching for any apps that may require state, like a to-do list app, or anything that requires saving data. In general, always cache state in localStorage for apps that you make for the user and add it where necessary to improve the user experience.
- Stick to Material Design principles like Apple / Google made it. Use consistent color palettes, typography, and spacing.
- Respond in a markdown code block with the index.html code that creates the web design.

## Example:
- Below contains an example of how to respond to the user's design idea. 
-- Begin Example --
User's Design Idea: Create a 3D design of a simple sphere.
HTML Script:
\`\`\`html
<!DOCTYPE html>
... (HTML code)
\`\`\`
-- End Example --

## Addional Instructions:
- Do not include any surrounding text in the response. Only include the full HTML script under \`\`\`html and end with \`\`\`.
- ALWAYS respond with the FULL HTML script. DO NOT just respond with snippets of the HTML script.

<!working_on_script_module>

User's Design Idea: <!query>
HTML Script:
\`\`\`html
`;
  prompt = prompt.replace("<!query>", query);
  prompt = prompt.replace(
    "<!working_on_script_module>",
    workingOnScriptModule(script),
  );
  prompt = prompt.replace("<!history>", historyModule(ltm, stm));
  return prompt;
};
