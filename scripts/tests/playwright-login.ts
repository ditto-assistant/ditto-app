#!/usr/bin/env bun
/**
 * Playwright script for automated login to Ditto app
 * Uses Bun APIs for improved performance
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');

// Interface for login result
interface LoginResult {
  page: Page;
  browser: Browser;
  context: BrowserContext;
}

/**
 * Load environment variables from .env.local
 */
function loadEnv(): Record<string, string> {
  const envPath = resolve(projectRoot, '.env.local');
  
  // Check if the file exists
  if (!fs.existsSync(envPath)) {
    return process.env;
  }
  
  try {
    // Read the .env file using Bun's file API
    const envFile = Bun.file(envPath);
    const content = Bun.readFileSync(envFile, { string: true });
    
    // Parse the .env file contents
    const env: Record<string, string> = {};
    
    for (const line of content.split('\n')) {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;
      
      // Split by the first equals sign
      const equalsPos = line.indexOf('=');
      if (equalsPos === -1) continue;
      
      const key = line.slice(0, equalsPos).trim();
      const value = line.slice(equalsPos + 1).trim();
      
      // Remove quotes if present
      env[key] = value.replace(/^["']|["']$/g, '');
    }
    
    // Merge with existing env vars (existing take precedence)
    return { ...env, ...process.env };
  } catch (error) {
    console.warn('Error loading .env.local file:', error);
    return process.env;
  }
}

// Load environment variables
const env = loadEnv();

/**
 * Login to Ditto app using Playwright
 */
export async function loginToDitto(): Promise<LoginResult> {
  // Get credentials from environment variables
  const TEST_EMAIL = env.VITE_TEST_EMAIL || 'test@test.com';
  const TEST_PASSWORD = env.VITE_TEST_PASSWORD || 'djedjegordon';
  
  console.log(`Launching browser and logging in as ${TEST_EMAIL}...`);
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50, // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    
    // Wait for the login form to be visible
    await page.waitForSelector('input[type="email"]');
    
    // Fill login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Click sign in
    await page.click('button:has-text("Sign In")');
    
    // Wait for login to complete
    try {
      // Either wait for navigation or for an element that appears after login
      await Promise.race([
        page.waitForNavigation({ timeout: 5000 }),
        page.waitForSelector('.chat-feed', { timeout: 5000 })
      ]);
      
      console.log('Login successful!');
      
      // Check for Terms of Service popup and accept if it appears
      await handleTermsOfService(page);
      
      // Take screenshot of the logged-in state
      const screenshotPath = resolve(projectRoot, 'login-success.png');
      await page.screenshot({ path: screenshotPath });
      
      return { page, browser, context };
    } catch (e) {
      console.log('Login may have failed or UI is different than expected');
      // Still try to handle TOS in case that's what's blocking the main UI
      await handleTermsOfService(page);
      const screenshotPath = resolve(projectRoot, 'login-failure.png');
      await page.screenshot({ path: screenshotPath });
      throw e;
    }
  } catch (error) {
    console.error('Login failed:', error);
    const screenshotPath = resolve(projectRoot, 'login-error.png');
    await page.screenshot({ path: screenshotPath });
    await browser.close();
    throw error;
  }
}

/**
 * Handle Terms of Service dialog if it appears
 */
async function handleTermsOfService(page: Page): Promise<boolean> {
  try {
    // Check multiple possible TOS selectors
    const tosSelectors = [
      'button:has-text("Accept")',
      'button:text("Accept")',
      'button.accept-button',
      'h2:has-text("Terms of Service")'
    ];
    
    // Try each selector with a short timeout
    for (const selector of tosSelectors) {
      try {
        // Use a short timeout to check if TOS appears
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          console.log('Terms of Service detected, clicking Accept...');
          // If we found the heading, we need to find the button
          if (selector.includes('Terms of Service')) {
            await page.click('button:has-text("Accept")');
          } else {
            await element.click();
          }
          console.log('Terms of Service accepted');
          
          // Wait a moment for the TOS to be dismissed
          await page.waitForTimeout(1000);
          return true;
        }
      } catch (e) {
        // This selector wasn't found, try the next one
        continue;
      }
    }
    
    console.log('No Terms of Service dialog detected');
    return false;
  } catch (e) {
    console.log('Error handling Terms of Service:', e);
    return false;
  }
}

/**
 * Create a browser integration for MCP
 */
export async function setupBrowserSession(): Promise<LoginResult> {
  try {
    const { page, browser, context } = await loginToDitto();
    
    // Keep the browser open and return context info
    console.log('Browser session ready for MCP integration');
    
    // You could save cookies or state here for reuse
    const cookies = await context.cookies();
    
    // Use Bun's file API for writing the session data
    const sessionDataPath = resolve(projectRoot, 'browser-session.json');
    const sessionData = JSON.stringify(cookies, null, 2);
    Bun.write(sessionDataPath, sessionData);
    
    return { page, browser, context };
  } catch (e) {
    console.error('Failed to set up browser session:', e);
    throw e;
  }
}

// If this script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    let browser: Browser | undefined;
    try {
      const result = await loginToDitto();
      browser = result.browser;
      
      // Keep browser open for manual inspection
      console.log('Browser will stay open for 30 seconds for inspection');
      await Bun.sleep(30000);
    } catch (e) {
      console.error('Script failed:', e);
    } finally {
      if (browser) await browser.close();
    }
  })();
}