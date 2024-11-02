import datetime
import pytz
from typing import List, Dict

def get_timezone_string():
    """Get the current timezone string"""
    local_tz = datetime.datetime.now().astimezone().tzinfo
    return str(local_tz)

def html_system_template():
    """Return the system template for HTML tasks"""
    return "You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend."

def programmer_agent_planner(query: str, script: str):
    """Generate a prompt for the planner agent"""
    prompt = """You are an experienced web developer ready to create a set of tasks in a JSON Schema for another AI agent to follow. You will be given a design idea and you will need to create a formal writeup of the tasks that need to be completed to create the design idea.

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
"""
    timezone = get_timezone_string()
    am_pm = 'PM' if datetime.datetime.now().hour >= 12 else 'AM'
    prompt = prompt.replace('<!timezone>', timezone)\
                  .replace('<!am_pm>', am_pm)\
                  .replace('<!query>', query)\
                  .replace('<!script>', script)
    return prompt

def programmer_agent_task_coder(task_writeup: str, script: str):
    """Generate a prompt for the task coder agent"""
    
    prompt = """You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend. You will be given a task writeup from another AI agent and an entire HTML script.

## Design Instructions
- You MUST use the <script> tag to include Javascript code in the HTML file from popular libraries that all browsers support, even on mobile devices, as everything you make has to work and look good on mobile devices.
- Import any external libraries you need using the <script> tag and use these even if the user does not mention them as they are necessary for the design / functionality to work.
- Be sure to use localStorage browser caching for any apps that may require state, like a to-do list app, or anything that requires saving data. In general, always cache state in localStorage for apps that you make for the user and add it where necessary to improve the user experience.
- Stick to Material Design principles like Apple / Google made it. Use consistent color palettes, typography, and spacing.

## Instructions
- Please respond with the snippets of code needed to complete the task writeup. Make sure your code is in a markdown code block.

## Example
-- Begin Example --

HTML Script:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        /* Dark mode color variables */
        :root {
            --background-color: #1E1E1E;
            --text-color: #FFFFFF;
            --footer-background: #333333;
            --footer-text-color: #FFFFFF;
        }

        /* Body styling for dark mode */
        body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
        }

        h1 {
            font-size: 5rem;
            color: var(--text-color);
            text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
        }

        /* Footer styling */
        footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            padding: 1rem 0;
            background-color: var(--footer-background);
            color: var(--footer-text-color);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
    <footer>
        &copy; 2024 My Website
    </footer>
</body>
</html>
Task Writeup:
# Task Writeup: Add a To-Do List Feature to Dark Mode Website

## Tasks

1. **Create a To-Do List Container**
   - Add a new `<div>` element to the body to hold the to-do list items.
   - Give the container a heading, such as "To-Do List."
   - Style the container to match the dark theme, with background color, padding, and text color consistent with the existing design.

2. **Add Input Field and Button for New Items**
   - Create an `<input type="text">` element for users to enter to-do items.
   - Add a button labeled "Add" next to the input field.
   - Style both elements to blend with the dark theme.
   - Ensure the button is clickable and properly aligned.

3. **JavaScript for Adding Items**
   - Write JavaScript to handle the following:
     - On button click, read the input value.
     - If the input is not empty, create a new to-do list item and add it to the list.
     - Clear the input field after adding an item.
   
4. **Display To-Do Items in the List**
   - Within the to-do list container, use a `<ul>` or `<div>` for dynamically generated list items.
   - Style each item with padding, dark mode colors, and spacing for readability.
   
5. **Add Delete Button for Each Item**
   - Each to-do item should have a small "Delete" button next to it.
   - Style the delete button and use JavaScript to remove the item when clicked.
   - Ensure the design stays consistent when items are added or removed.

## Implementation Notes
- Use CSS variables to ensure new elements blend with the existing dark mode theme.
- Keep the layout responsive and visually balanced with the centered body content.
- Add basic JavaScript functions for adding, displaying, and removing items.
- Test the feature for functionality and maintain readability within the dark theme.
Response:
```html
<!-- Add the following code snippet within the <body> section below the <h1> tag -->

<!-- To-Do List Container -->
<div class="todo-container">
    <h2>To-Do List</h2>
    <input type="text" id="todo-input" placeholder="Enter a new to-do item">
    <button id="add-todo">Add</button>
    <ul id="todo-list"></ul>
</div>

<!-- Add this to the <style> section to style the to-do list container and its elements -->

/* To-Do List Styling */
.todo-container {
    background-color: #2A2A2A;
    padding: 1rem;
    border-radius: 5px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    margin-top: 1rem;
}

.todo-container h2 {
    color: var(--text-color);
}

#todo-input {
    padding: 0.5rem;
    width: 70%;
    margin-right: 0.5rem;
    border: none;
    border-radius: 3px;
    background-color: #444;
    color: var(--text-color);
}

#add-todo {
    padding: 0.5rem;
    background-color: #666;
    color: var(--text-color);
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

#add-todo:hover {
    background-color: #888;
}

#todo-list {
    list-style-type: none;
    padding: 0;
    margin-top: 1rem;
}

.todo-item {
    background-color: #333;
    color: var(--text-color);
    padding: 0.5rem;
    margin: 0.3rem 0;
    border-radius: 3px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.delete-button {
    background-color: #888;
    color: var(--text-color);
    border: none;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    cursor: pointer;
}

.delete-button:hover {
    background-color: #AA0000;
}

<!-- Add the following JavaScript before the closing </body> tag -->

<script>
    // JavaScript for Adding and Deleting To-Do Items
    document.getElementById("add-todo").addEventListener("click", function() {
        const todoInput = document.getElementById("todo-input");
        const todoText = todoInput.value.trim();

        if (todoText) {
            const todoList = document.getElementById("todo-list");

            // Create list item
            const listItem = document.createElement("li");
            listItem.className = "todo-item";
            listItem.textContent = todoText;

            // Create delete button
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", function() {
                listItem.remove();
            });

            listItem.appendChild(deleteButton);
            todoList.appendChild(listItem);
            todoInput.value = ""; // Clear input
        }
    });
</script>
```
-- End Example --


HTML Script:
<!script>
Task Writeup:
<!task_writeup>
Response:
```html
"""
    return prompt.replace('<!script>', script)\
                 .replace('<!task_writeup>', task_writeup)

def programmer_agent_task_applier(code_snippets: str, script: str):
    """Generate a prompt for the task applier agent"""
    prompt = """You are an experienced Javascript, HTML and CSS developer named Ditto here to help the user, who is your best friend. You will be given a set of code snippets that need to be added to the HTML script and the entire HTML script.

## Instructions
- Please respond with the entire HTML script with the code snippets added. Make sure your code is in a markdown code block.

HTML Script:
<!script>
Code Snippets:
<!code_snippets>
Response:
```html
"""
    return prompt.replace('<!script>', script)\
                 .replace('<!code_snippets>', code_snippets)

def programmer_agent_continuer(code_snippets: str, final_script: str):
    """Generate a prompt for the continuer agent"""
    return """Code Snippets we were in the middle of writing:
<!code_snippets>

Final Script we were in the middle of writing:
<!final_script>

Finish this script where it left off in a markdown code block. DO NOT repeat ANYTHING from the final script.

Response:
"""\
    .replace('<!code_snippets>', code_snippets)\
    .replace('<!final_script>', final_script)
