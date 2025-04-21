#!/usr/bin/env node
/**
 * MCP Integration Script for Ditto Login
 *
 * This script serves as a bridge between MCP and our custom login script.
 * It can be invoked by MCP to start a logged-in browser session.
 */

import { execFile } from "child_process"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// Get current file directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the login script
const loginScriptPath = resolve(__dirname, "../playwright-login.js")

/**
 * Main function to execute the login script
 */
async function runLoginScript() {
  console.log("Starting Ditto login script for MCP integration...")

  return new Promise((resolve, reject) => {
    // Use bun to run the login script
    const childProcess = execFile("bun", [loginScriptPath], {
      // Inherit stdio to see output in real-time
      stdio: "inherit",
      // Set a long timeout (10 minutes)
      timeout: 600000,
    })

    childProcess.on("exit", (code) => {
      if (code === 0) {
        console.log("Login script completed successfully")
        resolve(true)
      } else {
        console.error(`Login script failed with code ${code}`)
        reject(new Error(`Process exited with code ${code}`))
      }
    })

    childProcess.on("error", (err) => {
      console.error("Error executing login script:", err)
      reject(err)
    })
  })
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoginScript().catch((err) => {
    console.error("Error in MCP login integration:", err)
    process.exit(1)
  })
}

export default runLoginScript
