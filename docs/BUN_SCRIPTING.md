# Bun Scripting Guide for Ditto

This document provides resources and examples for writing efficient scripts using Bun in the Ditto project.

## Essential Bun Documentation

### Core APIs

- [Bun Runtime APIs](https://bun.sh/docs/runtime/bun-apis.md)
- [Bun Shell Scripting](https://bun.sh/docs/runtime/shell.md)
- [Bun Process Spawning](https://bun.sh/docs/api/spawn.md)
- [Bun HTTP](https://bun.sh/docs/api/http.md)
- [Bun File I/O](https://bun.sh/docs/api/file-io.md)

### TypeScript Integration

- [Bun with TypeScript](https://bun.sh/docs/runtime/typescript.md)
- Install `@types/bun` for type definitions

## Common Patterns

### Process Management

```typescript
// Async process with stdio inheritance
const proc = Bun.spawn(["command", "arg1", "arg2"], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  cwd: process.cwd(),
  env: process.env,
})

// Wait for process to complete
const exitCode = await proc.exited

// Background process
const daemon = Bun.spawn(["server", "--daemon"], {
  stdio: ["ignore", "ignore", "ignore"],
  detached: true,
})
daemon.unref() // Detach from parent process
```

### Network Operations

```typescript
// Check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const socket = new Bun.TCPSocket({
      port,
      hostname: "localhost",
      timeout: 1000,
    })
    return true // Connected successfully, port is in use
  } catch {
    return false // Connection failed, port is not in use
  }
}

// Make HTTP requests
const response = await fetch("http://localhost:3000/api")
const data = await response.json()
```

### File Operations

```typescript
// Read a file
const file = Bun.file("path/to/file.txt")
const content = await file.text()

// Write a file
await Bun.write("path/to/output.txt", "File content")

// Check if directory exists
try {
  const stats = Bun.file("/path/to/dir").statSync()
  const exists = stats.isDirectory()
} catch {
  // Directory doesn't exist
}

// Create directory
Bun.spawn(["mkdir", "-p", "/path/to/dir"], { stdio: "inherit" })
```

### Shell Commands

```typescript
// Using $ template literal for shell commands
import { $ } from "bun"

// Run a command and get output
const result = await $`echo "Hello World!"`.text()

// Run a command with error handling
const { exitCode, stdout } = await $`npm install`.nothrow()
if (exitCode !== 0) {
  console.error("Installation failed")
}
```

## Environment Variables

```typescript
// Load environment variables
function loadEnv(): Record<string, string> {
  const envPath = "./env.local"

  if (!Bun.file(envPath).existsSync()) {
    return process.env
  }

  const content = Bun.readFileSync(envPath, { string: true })
  const env: Record<string, string> = {}

  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#")) continue

    const equalsPos = line.indexOf("=")
    if (equalsPos === -1) continue

    const key = line.slice(0, equalsPos).trim()
    const value = line.slice(equalsPos + 1).trim()

    env[key] = value.replace(/^["']|["']$/g, "")
  }

  return { ...env, ...process.env }
}
```

## Performance Tips

1. Use native Bun APIs when possible instead of Node.js equivalents
2. Leverage `Bun.spawn` for process management instead of child_process
3. Use TCPSocket for network operations
4. Prefer Bun's file I/O methods over fs module
5. Use Bun's shell API for complex shell operations

## Ditto MCP Tools

The `mcp-tools.ts` script in the root directory provides a unified interface for MCP to interact with Ditto tools:

```bash
# Login to Ditto
bun mcp-tools.ts login

# Take a screenshot
bun mcp-tools.ts take-screenshot

# Take app screenshots
bun mcp-tools.ts screenshot

# Ensure browsertools server is running
bun mcp-tools.ts browsertools
```

See `package.json` for additional npm script aliases.
