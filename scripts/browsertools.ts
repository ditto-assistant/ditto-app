import { $ } from "bun"
const BROWSERTOOLS_PORT = 3025

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    await fetch(`http://localhost:${port}`)
    return true
  } catch (error) {
    console.error("Error checking if port is in use:", error)
    return false
  }
}

/**
 * Ensure browsertools server is running
 */
async function ensureBrowserTools(): Promise<boolean> {
  console.log("Ensuring browsertools server is running...")

  // First check if the server is already running
  if (await isPortInUse(BROWSERTOOLS_PORT)) {
    console.log(
      `✅ Browsertools server is already running on port ${BROWSERTOOLS_PORT}`
    )
    return true
  }

  console.log(`🚀 Starting browsertools server on port ${BROWSERTOOLS_PORT}...`)

  // Start the server in the background
  const proc = Bun.spawn(["bunx", "@agentdeskai/browser-tools-server@latest"], {
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  })
  // Detach the process so it runs independently
  proc.unref()

  // Wait for the server to start (up to 5 seconds)
  for (let i = 0; i < 5; i++) {
    await Bun.sleep(1000) // Wait 1 second
    if (await isPortInUse(BROWSERTOOLS_PORT)) {
      console.log("✅ Browsertools server started successfully")
      return true
    }
    console.log(`Waiting for server to start... (${i + 1}/5)`)
  }

  console.warn("❌ Failed to start browsertools server within 5 seconds")
  return false
}

await ensureBrowserTools()
console.log("📸 Screenshots will be saved to ./screenshots 📁")
await $`bunx @agentdeskai/browser-tools-mcp@latest`
