export const downloadOpenscadScript = (script, scriptName = "") => {
  console.log("Downloading OpenSCAD script...")
  // print script in blue
  // console.log(`%c${script}`, 'color: orange');
  // package the string in script as a .scad file and request to download to user's browser
  const blob = new Blob([script], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  let fileDownloadName = scriptName
  if (fileDownloadName === "") {
    // create a stamp to embed in the filename like "output-2021-09-01-12-00-00.scad"
    const stamp = new Date()
      .toISOString()
      .split(".")[0]
      .replace(/:/g, "-")
      .replace("T", "-")
    fileDownloadName = `output-${stamp}.scad`
    a.download = `${fileDownloadName}.scad`
    a.click()
    URL.revokeObjectURL(url)
    return fileDownloadName
  } else {
    // remove all spaces and not allowed characters as a filename
    // fileDownloadName = scriptName.replace(/[^a-zA-Z0-9-_]/g, '');
    a.download = `${fileDownloadName}.scad`
    a.click()
    URL.revokeObjectURL(url)
    return `${fileDownloadName}.scad`
  }
}
