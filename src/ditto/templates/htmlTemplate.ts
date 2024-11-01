export const htmlSystemTemplate = () => {
    return "You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend."
}

export const workingOnScriptModule = (script: string) => {
    if (script === "") {
        return ""
    }
    return `## Current Script
- The user is currently working on this HTML script below. DO NOT change the script's functionality or design unless the user asks you to do so.
Current HTML Script:
\`\`\`html
<!script>
\`\`\`
`.replace('<!script>', script)
}

/**
 * This function returns the current time in the timezone of the user.
 * @returns {string} timezoneString - The current time in the timezone of the user.
    */
export const getTimezoneString = () => {
    let timezoneString;
    let timezone = new Date().toLocaleString("en-US", {timeZoneName: "short"}).split(' ');
    if (timezone[1] === "Standard") {
        timezoneString = timezone[2]
    } else {
        timezoneString = timezone[1]
    }
    return timezoneString
}

export const historyModule = (ltm: string, stm: string) => {
    if (ltm === "" && stm === "") {
        return ""
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
-- End Short Term Memory --`
}

export const programmerAgentplanner = (query: string, script: string) => {
    let prompt = `You are an experienced web developer ready to create a set of tasks in a JSON Schema for another AI agent to follow. You will be given a design idea and you will need to create each task in the JSON Schema to contain "start_line" and "end_line" keys to indicate where in the script the task starts and ends, followed by a "task" key that contains the task description. Note that each task you create in the JSON Schema should be achiveable by editing the start and end line contents.

## Instructions
- Your job is to create a JSON Schema that contains the tasks for another AI agent to follow.

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
JSON Schema:
{
    "tasks": [
        {
            "snippet": "<title>My Website</title>",
            "task": "Change the title of the page to "My Website""
        },
        {
            "snippet": "<footer>Copyright 2024 My Website</footer>",
            "task": "Add a simple footer with the text "Copyright 2024 My Website""
        },
        {
            "snippet": "body {\n            display: flex;\n            justify-content: center;\n            align-items: center;\n            height: 100vh;\n            margin: 0;\n            font-family: sans-serif;\n            background-color: #f0f0f0;\n        }",
            "task": "Change the body to be more like a dark mode theme. Make sure to change the background color, font color, and font family."
        },
        {
            "snippet": "h1 {\n            font-size: 5rem;\n            color: #333;\n        }",
            "task": "Change the h1 to be more like a dark mode theme. Change the font size, color, and font family."
        }
    ]
}

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
JSON Schema:
{
    "tasks": [
        {
            "snippet": "<title>Simple Textbox App</title>",
            "task": "Change the title of the page to 'To-Do List'"
        },
        {
            "snippet": "<h1>My To-Do List</h1>",
            "task": "Add a heading to the page"
        },
        {
            "snippet": "<input type=\"text\" id=\"taskInput\" placeholder=\"Enter a new task\">",
            "task": "Add an input field for entering new tasks"
        },
        {
            "snippet": "<button onclick=\"addTask()\">Add Task</button>",
            "task": "Add a button to add new tasks"
        },
        {
            "snippet": "<ul id=\"taskList\"></ul>",
            "task": "Add an unordered list to display tasks"
        },
        {
            "snippet": "function addTask() {\n    // JavaScript function to add tasks\n}",
            "task": "Add JavaScript function to handle adding tasks"
        }
    ]
}
-- End Examples --

User's Name: <!users_name>
Current Timestamp: <!timestamp>
Current Time in User's Timezone: <!time>
User's Design Idea: <!query>
HTML Script:
\`\`\`html
<!script>
\`\`\`
JSON Schema:
`
    prompt = prompt.replace('<!time>', getTimezoneString() + ' ' + (new Date().getHours() >= 12 ? 'PM' : 'AM'))
    prompt = prompt.replace('<!users_prompt>', query)
    prompt = prompt.replace('<!script>', script)
    return prompt
}

export const htmlTemplate = (query: string, script: string, ltm: string = "", stm: string = "") => {
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
`
    prompt = prompt.replace('<!query>', query)
    prompt = prompt.replace('<!working_on_script_module>', workingOnScriptModule(script))
    prompt = prompt.replace('<!history>', historyModule(ltm, stm))
    return prompt
}