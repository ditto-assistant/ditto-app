#!/usr/bin/env bun
/**
 * Automated screenshot test script using Bun APIs
 */

import { $ } from "bun"
import { loginToDitto } from "./playwright-login"
import { fileURLToPath } from "url"
import { dirname, resolve, join } from "path"
import type { Browser, Page } from "playwright"

// Get current file directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, "../../")

// Define page information interface
interface PageToCapture {
  path: string
  name: string
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = resolve(projectRoot, "screenshots")
try {
  await $`mkdir -p ${screenshotsDir}`
} catch (e) {
  console.error("Error creating screenshots directory:", e)
}

// Pages to capture after login
const PAGES_TO_CAPTURE: PageToCapture[] = [
  { path: "/", name: "home" },
  // Add more paths as needed
]

/**
 * Capture screenshots of app pages
 */
export async function captureScreenshots(): Promise<void> {
  let browser: Browser | undefined
  let page: Page | undefined

  try {
    // Login first
    const session = await loginToDitto()
    browser = session.browser
    page = session.page

    console.log("Successfully logged in, taking screenshots...")

    // Capture each page
    for (const pageInfo of PAGES_TO_CAPTURE) {
      console.log(`Navigating to ${pageInfo.path}...`)
      await page.goto(`http://localhost:3000${pageInfo.path}`)

      // Wait for page to stabilize
      await Bun.sleep(2000)

      // Take screenshot
      const fileName = join(screenshotsDir, `screenshot-${pageInfo.name}.png`)
      await page.screenshot({ path: fileName, fullPage: true })
      console.log(`Captured ${fileName}`)
    }

    console.log("All screenshots captured successfully!")
  } catch (error) {
    console.error("Error during screenshot capture:", error)
  } finally {
    if (browser) await browser.close()
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  captureScreenshots()
}
