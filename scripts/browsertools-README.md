# Browser Tools Integration for Ditto

This directory contains scripts for automating browser interactions using [@agentdeskai/browser-tools](https://browsertools.agentdesk.ai/installation).

## Overview

Browser Tools provides a reliable way to interact with the browser programmatically, including:
- Taking screenshots
- Capturing console logs and errors
- Network request inspection
- Accessibility auditing
- And more

## Automatic Server Management

The Ditto codebase includes automatic management of the Browser Tools server:

1. The `ensure-browsertools.sh` script checks if the Browser Tools server is running on port 3025
2. If not running, it automatically starts the server in the background
3. The `mcp-tools.js` script calls this check before executing any commands

## Usage

### Direct MCP Tools Integration

When using `mcp-tools.js`, the Browser Tools server is automatically started if needed:

```bash
# These commands will automatically ensure browser tools are running
bun mcp-tools.js login
bun mcp-tools.js capture
bun mcp-tools.js screenshot
```

### Manual Server Management

To explicitly start/check the Browser Tools server:

```bash
# Check and start the server if needed
bun mcp-tools.js browsertools

# Or run the script directly
./scripts/ensure-browsertools.sh
```

### Manual Server Launch

If you prefer to start the server manually:

```bash
# Start the server directly
bunx @agentdeskai/browser-tools-server@latest
```

## Available Tools

When the Browser Tools server is running, the following tools are available to MCP:

- `mcp__browsertools__takeScreenshot`: Capture a screenshot of the current page
- `mcp__browsertools__getConsoleLogs`: Get browser console logs
- `mcp__browsertools__getConsoleErrors`: Get browser console errors
- `mcp__browsertools__getNetworkErrors`: Get network request errors
- `mcp__browsertools__getNetworkLogs`: Get all network request logs
- `mcp__browsertools__runAccessibilityAudit`: Run accessibility audit on the current page
- `mcp__browsertools__runPerformanceAudit`: Run performance audit
- `mcp__browsertools__runSEOAudit`: Run SEO audit
- And many more!

## Documentation

For full documentation of Browser Tools, visit: [https://browsertools.agentdesk.ai/installation](https://browsertools.agentdesk.ai/installation)