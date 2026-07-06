# Kumix Template - MCP Server

MCP server for exploring the Kumix Template packages, their source code, and documentation.

## Overview

This MCP server provides access to:

- **Workspace packages** in the Kumix Template
- **Component discovery** and search
- **Source code reading** for development
- **Usage examples** and documentation

## Available Packages

The server scans `packages/**` at runtime and indexes every workspace package whose
name starts with `@kumix/` (it excludes itself, `@kumix/mcp`):

- `@kumix/core` - Core package for the Kumix template
  - **Exports**: `.` - main entry (`greet`, `version`)
- `@kumix/main` - Main package for the Kumix template
  - **Exports**: `.` - main entry, depends on `@kumix/core`

> Note: the package list is discovered dynamically. Add a new package under
> `packages/` with a `@kumix/*` name and it shows up automatically.

## Setup

### Build

```bash
cd packages/mcp
bun run build
```

### Development

```bash
cd packages/mcp
bun run dev
```

### Smoke Test

```bash
cd packages/mcp
bun run smoke
```

## Configuration

Add the MCP server to your MCP client configuration:

### Example Configuration

```json
{
  "mcpServers": {
    "Kumix Template": {
      "command": "node",
      "args": ["/absolute/path/to/template/packages/mcp/dist/index.js"],
      "cwd": "/absolute/path/to/template"
    }
  }
}
```

### Configuration Parameters

- **command**: `"node"` - Runtime to execute the server
- **args**: Array containing the absolute path to the built server file
- **cwd**: Current working directory for the server process (repository root)

### Path Guidelines

**Finding the Correct Paths:**

1. **Path to `dist/index.js`**: The `args` array must contain the absolute path to the compiled MCP server
2. **Working Directory (`cwd`)**: Should point to the repository root where `packages/` is located

**Example Paths by Platform:**

```jsonc
// macOS/Linux
{
  "args": ["/home/user/projects/template/packages/mcp/dist/index.js"],
  "cwd": "/home/user/projects/template"
}

// Windows (with forward slashes - recommended)
{
  "args": ["C:/Users/user/projects/template/packages/mcp/dist/index.js"],
  "cwd": "C:/Users/user/projects/template"
}

// Windows (with backslashes - also works)
{
  "args": ["C:\\Users\\user\\projects\\template\\packages\\mcp\\dist\\index.js"],
  "cwd": "C:\\Users\\user\\projects\\template"
}
```

**Important Notes:**

- Use absolute paths (not relative paths)
- Paths must point to the **built** files in `dist/`, not source files
- The server must be built first: `cd packages/mcp && bun run build`
- Forward slashes work on all platforms and are recommended

## Available Tools

### 1. `list_packages`

Lists all available packages in the template.

**Parameters:** none

**Example Prompts:**

```
Show me all available packages.
List the template packages.
```

### 2. `get_package_info`

Gets detailed information about a specific package.

**Parameters:**

- `package_name` (required): Full package name (e.g., "@kumix/core")

**Example Prompts:**

```
Tell me about the @kumix/core package.
Show me details for @kumix/main.
```

### 3. `find_component`

Searches for components (source files) across all packages.

**Parameters:**

- `component_name` (required): Name to search for
- `package_filter` (optional): Filter by package name (e.g., core, main)

**Example Prompts:**

```
Find the index component.
Search for "greet".
Look for components in the core package.
```

### 4. `read_component_code`

Reads the source code of a specific component.

**Parameters:**

- `package_name` (required): Package containing the component
- `component_path` (required): Relative path from the package `src/` directory

**Example Prompts:**

```
Read index.ts in the @kumix/core package.
Show me the source for the main package entry.
```

### 5. `get_usage_example`

Gets usage examples for packages or components.

**Parameters:**

- `package_name` (required): Package name
- `component_name` (optional): Specific component name

**Example Prompts:**

```
Give me usage examples for @kumix/core.
How do I use the @kumix/main package?
```

## Common Workflows

### 1. Package Discovery

1. Use `list_packages` to see all available packages
2. Use `get_package_info` for detailed package information

### 2. Component Search and Analysis

1. Use `find_component` to locate relevant source files
2. Use `read_component_code` to examine implementation
3. Use `get_usage_example` for usage patterns

## Tips for Best Results

- Use full package names: `@kumix/core`, not just "core"
- Include the file extension in component paths (`.ts`, `.tsx`)
- First `find_component`, then `read_component_code`

## File Structure Reference

```
packages/
├── mcp/                  # MCP server (this package)
│   ├── src/              # Source code
│   ├── dist/             # Built output
│   └── README.md         # This file
├── core/                 # @kumix/core
│   ├── src/              # Source code
│   └── package.json
└── main/                 # @kumix/main (depends on @kumix/core)
    ├── src/              # Source code
    └── package.json
```

## Development

```bash
bun run build        # Compile with tsc
bun run dev          # Run from source with Bun
bun run types:check  # Type-check without emit
bun run clean        # Remove dist
```
