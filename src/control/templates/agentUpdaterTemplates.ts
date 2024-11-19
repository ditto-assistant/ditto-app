export function getTimezoneString(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function htmlSystemTemplate(): string {
  return "You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend.";
}

export function programmerAgentPlanner(query: string, script: string): string {
  const timezone = getTimezoneString();
  const now = new Date();
  const amPm = now.getHours() >= 12 ? "PM" : "AM";

  const prompt = `You are an experienced web developer ready to create a set of tasks in a JSON Schema for another AI agent to follow. You will be given a design idea and you will need to create a formal writeup of the tasks that need to be completed to create the design idea.

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

Current Time in User's Timezone: <!timezone> <!am_pm>
User's Design Idea: <!query>
HTML Script:
<!script>
Task Writeup:
`;

  return prompt
    .replace("<!timezone>", timezone)
    .replace("<!am_pm>", amPm)
    .replace("<!query>", query)
    .replace("<!script>", script);
}

export function programmerAgentTaskCoder(
  taskWriteup: string,
  script: string
): string {
  const prompt = `You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend. You will be given a task writeup from another AI agent and an entire HTML script.

## Design Instructions
- You MUST use the <script> tag to include Javascript code in the HTML file from popular libraries that all browsers support, even on mobile devices, as everything you make has to work and look good on mobile devices.
- Import any external libraries you need using the <script> tag and use these even if the user does not mention them as they are necessary for the design / functionality to work.
- Be sure to use localStorage browser caching for any apps that may require state, like a to-do list app, or anything that requires saving data. In general, always cache state in localStorage for apps that you make for the user and add it where necessary to improve the user experience.
- Stick to Material Design principles like Apple / Google made it. Use consistent color palettes, typography, and spacing.

## Instructions
- Please respond with the snippets of code needed to complete the task writeup. Make sure your code is in a markdown code block.

HTML Script:
<!script>
Task Writeup:
<!task_writeup>
Response:
\`\`\`html
`;

  return prompt
    .replace("<!script>", script)
    .replace("<!task_writeup>", taskWriteup);
}

export function programmerAgentTaskApplier(
  codeSnippets: string,
  script: string
): string {
  const prompt = `You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend. You will be given a set of code snippets that need to be added to the HTML script and the entire HTML script.

## Instructions
- Please respond with the entire HTML script with the code snippets added. Make sure your code is in a markdown code block.

HTML Script:
<!script>
Code Snippets:
<!code_snippets>
Response:
\`\`\`html
`;

  return prompt
    .replace("<!script>", script)
    .replace("<!code_snippets>", codeSnippets);
}

export function programmerAgentContinuer(
  codeSnippets: string,
  finalScript: string
): string {
  const prompt = `Code Snippets we were in the middle of writing:
<!code_snippets>

Final Script we were in the middle of writing:
<!final_script>

Finish this script where it left off in a markdown code block. DO NOT repeat ANYTHING from the final script.

Response:
`;

  return prompt
    .replace("<!code_snippets>", codeSnippets)
    .replace("<!final_script>", finalScript);
}
