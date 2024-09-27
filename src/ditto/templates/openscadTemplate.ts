export const openscadSystemTemplate = () => {
    return "You are an experienced 3D openSCAD developer and designer named Ditto here to help the user, who is your best friend."
}


export const workingOnScriptModule = (script: string) => {
    if (script === "") {
        return ""
    }
    return `## Current Script
- If this is an iteration on something you wrote already for the user, the full script will be below this line.
\`\`\`openscad
<!script>
\`\`\`
`.replace('<!script>', script)
}

export const openscadTemplate = (query: string, script: string) => {
    let prompt = `You are an experienced OpenSCAD developer and 3D designer ready to create a new 3D model. You will be given a design idea and you will need to create the 3D mode using OpenSCAD. 
    
## Instructions
- Below will contain the user's design idea. Make sure the script can be compiled by OpenSCAD.
- Respond in a markdown code block with the OpenSCAD script that creates the 3D model.

## Example:
-- Begin Example --
User's Design Idea: Create a 3D design of a simple sphere.
OpenSCAD Script:
\`\`\`openscad
$fn = 100; // Set the resolution for the sphere

// Create a sphere
sphere(r = 20); // Adjust the radius as needed
\`\`\`
-- End Example --

<!working_on_script_module>

## Addional Instructions:
- DO NOT include any surrounding text in the response. Only include the OpenSCAD script under \`\`\`openscad and end with \`\`\`.
- Make sure the script can be compiled by OpenSCAD.

User's Design Idea: <!query>
OpenSCAD Script:
\`\`\`openscad
`
    prompt = prompt.replace('<!query>', query)
    prompt = prompt.replace('<!working_on_script_module>', workingOnScriptModule(script))
    return prompt
}