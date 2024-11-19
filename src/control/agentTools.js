// import home assistant sendGoogleSdkCommand
import { sendGoogleSdkCommand } from "./homeAssistant";

let scriptWindow = null;

export const openHTMLScriptInNewWindow = (script) => {
  console.log("Opening HTML script in new window...");
  try {
    // Create a new window or close and reopen the existing one
    if (scriptWindow && !scriptWindow.closed) {
      scriptWindow.close();
    }
    scriptWindow = window.open(
      "",
      "_blank",
      "width=800,height=600,resizable=yes"
    );
    scriptWindow.document.open();
    scriptWindow.document.write(script);
    scriptWindow.document.close();
  } catch (e) {
    console.error("Error opening HTML script in new window: ", e);
  }
};

// make scriptName default to "output" if not provided
export const downloadHTMLScript = (script, scriptName = "") => {
  // open a new window to display the HTML script
  // openHTMLScriptInNewWindow(script);
  localStorage.setItem(
    "latestWorkingOnScript",
    JSON.stringify({ script, scriptName })
  );
  console.log("Opened HTML script in new window...");
  // print script in blue
  // console.log(`%c${script}`, 'color: orange');
  // package the string in script as a .html file and request to download to user's browser
  // const blob = new Blob([script], { type: 'text/plain' });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url;

  let fileDownloadName = scriptName;
  if (fileDownloadName === "") {
    // create a stamp to embed in the filename like "output-2021-09-01-12-00-00.html"
    const stamp = new Date()
      .toISOString()
      .split(".")[0]
      .replace(/:/g, "-")
      .replace("T", "-");
    fileDownloadName = `output-${stamp}.html`;
    // a.download = `${fileDownloadName}.html`;
    // a.click();
    // URL.revokeObjectURL(url);
    return fileDownloadName;
  } else {
    // remove all spaces and not allowed characters as a filename
    // fileDownloadName = scriptName.replace(/[^a-zA-Z0-9-_]/g, '');
    // a.download = `${fileDownloadName}.html`;
    // a.click();
    // URL.revokeObjectURL(url);
    return `${fileDownloadName}.html`;
  }
};

export const downloadOpenscadScript = (script, scriptName = "") => {
  console.log("Downloading OpenSCAD script...");
  // print script in blue
  // console.log(`%c${script}`, 'color: orange');
  // package the string in script as a .scad file and request to download to user's browser
  const blob = new Blob([script], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  let fileDownloadName = scriptName;
  if (fileDownloadName === "") {
    // create a stamp to embed in the filename like "output-2021-09-01-12-00-00.scad"
    const stamp = new Date()
      .toISOString()
      .split(".")[0]
      .replace(/:/g, "-")
      .replace("T", "-");
    fileDownloadName = `output-${stamp}.scad`;
    a.download = `${fileDownloadName}.scad`;
    a.click();
    URL.revokeObjectURL(url);
    return fileDownloadName;
  } else {
    // remove all spaces and not allowed characters as a filename
    // fileDownloadName = scriptName.replace(/[^a-zA-Z0-9-_]/g, '');
    a.download = `${fileDownloadName}.scad`;
    a.click();
    URL.revokeObjectURL(url);
    return `${fileDownloadName}.scad`;
  }
};

export const handleHomeAssistantTask = async (task) => {
  console.log("Handling Home Assistant task...");
  let response = false;
  try {
    await sendGoogleSdkCommand(task);
    response = true;
  } catch (error) {
    console.error("Error handling Home Assistant task: ", error);
    response = false;
  }
  return response;
};
