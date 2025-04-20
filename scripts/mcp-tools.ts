#!/usr/bin/env bun
/**
 * MCP Tools for Ditto App
 * 
 * This script provides a unified interface for MCP to interact with Ditto tools.
 * It uses Bun.js native APIs for improved performance and cleaner code.
 * 
 * Usage:
 *   bun scripts/mcp-tools.ts <command> [args...]
 * 
 * Commands:
 *   login           - Authenticate with test account
 *   screenshot      - Take screenshots of specific app views
 *   take-screenshot - Take a screenshot using browsertools
 *   browsertools    - Ensure browsertools server is running
 */

import { $ } from "bun";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const [, , command, ...args] = process.argv;

// Browser tools configuration
const BROWSERTOOLS_PORT = 3025;
const BROWSERTOOLS_SERVER_COMMAND = "bunx @agentdeskai/browser-tools-server@latest";

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    // Attempt to connect to the port
    const socket = new Bun.TCPSocket({
      port,
      hostname: "localhost",
      timeout: 1000,
    });
    
    // We connected successfully, port is in use
    return true;
  } catch (error) {
    // Connection failed, port is not in use
    return false;
  }
}

/**
 * Ensure browsertools server is running
 */
async function ensureBrowserTools(): Promise<boolean> {
  console.log("Ensuring browsertools server is running...");
  
  // First check if the server is already running
  if (await isPortInUse(BROWSERTOOLS_PORT)) {
    console.log(`✅ Browsertools server is already running on port ${BROWSERTOOLS_PORT}`);
    return true;
  }
  
  console.log(`🚀 Starting browsertools server on port ${BROWSERTOOLS_PORT}...`);
  
  // Start the server in the background
  const proc = Bun.spawn(["bunx", "@agentdeskai/browser-tools-server@latest"], {
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  });
  
  // Detach the process so it runs independently
  proc.unref();
  
  // Wait for the server to start (up to 5 seconds)
  for (let i = 0; i < 5; i++) {
    await Bun.sleep(1000); // Wait 1 second
    if (await isPortInUse(BROWSERTOOLS_PORT)) {
      console.log("✅ Browsertools server started successfully");
      return true;
    }
    console.log(`Waiting for server to start... (${i+1}/5)`);
  }
  
  console.warn("❌ Failed to start browsertools server within 5 seconds");
  return false;
}

/**
 * Run the login script for Ditto
 */
async function login(): Promise<boolean> {
  console.log("Starting Ditto login process...");
  const scriptPath = resolve(__dirname, "tests/playwright-login.ts");
  
  console.log(`Running login script: ${scriptPath}`);
  
  try {
    // Use Bun's spawn API to run the login script
    const proc = Bun.spawn(["bun", scriptPath], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    
    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      console.log("Login script completed successfully");
      return true;
    } else {
      console.error(`Login script failed with code ${exitCode}`);
      return false;
    }
  } catch (err) {
    console.error("Error executing login script:", err);
    return false;
  }
}

/**
 * Run the screenshot tool for Ditto
 */
async function screenshot(): Promise<boolean> {
  console.log("Taking app screenshots...");
  const scriptPath = resolve(__dirname, "tests/screenshot.ts");
  
  try {
    const proc = Bun.spawn(["bun", scriptPath], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    
    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      console.log("Screenshot script completed successfully");
      return true;
    } else {
      console.error(`Screenshot script failed with code ${exitCode}`);
      return false;
    }
  } catch (err) {
    console.error("Error executing screenshot script:", err);
    return false;
  }
}

/**
 * Take a browser screenshot using browsertools
 */
async function takeScreenshot(): Promise<boolean> {
  console.log("Taking browser screenshot with browsertools...");
  
  try {
    // Use the browsertools directly via API call
    const response = await fetch(`http://localhost:${BROWSERTOOLS_PORT}/screenshot`, {
      method: "POST"
    });
    
    if (!response.ok) {
      throw new Error(`Screenshot request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Screenshot taken successfully");
    console.log(`Screenshot saved to: ${result.filepath}`);
    return true;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    return false;
  }
}

// Command router
async function main() {
  try {
    // Always ensure browsertools server is running first
    await ensureBrowserTools();
    
    switch (command) {
      case "login":
        await login();
        break;
      case "screenshot":
        await screenshot();
        break;
      case "take-screenshot":
        await takeScreenshot();
        break;
      case "browsertools":
        // Just ensure browsertools is running, already done above
        console.log("Browsertools server check completed.");
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error executing command:", error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
MCP Tools for Ditto App

Usage:
  bun scripts/mcp-tools.ts <command> [args...]

Commands:
  login           - Authenticate with test account
  screenshot      - Take screenshots of specific app views
  take-screenshot - Take screenshot using browsertools
  browsertools    - Ensure browsertools server is running

Examples:
  bun scripts/mcp-tools.ts login
  bun scripts/mcp-tools.ts screenshot
  bun scripts/mcp-tools.ts take-screenshot
  bun scripts/mcp-tools.ts browsertools
`);
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!command) {
    printHelp();
    process.exit(0);
  }
  
  main().catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

export default {
  login,
  screenshot,
  takeScreenshot,
  ensureBrowserTools
};