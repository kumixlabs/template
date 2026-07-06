#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { glob } from "glob";
import { z } from "zod";

// Check for test flag
const isTestMode = process.argv.includes("--test");

if (isTestMode) {
  console.log("✅ MCP server executable test passed");
  process.exit(0);
}

// Get current directory for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Repo root (two levels up from packages/mcp/dist|src). Used as the `cwd` for
// glob so that ignore patterns are matched against project-relative paths
// (glob does not match ignore patterns against absolute paths reliably).
const PACKAGES_ROOT = resolve(__dirname, "..", "..");

// Directories to never scan when looking for package.json or source files.
const SCAN_IGNORE = ["**/node_modules/**", "**/dist/**"];

// Package information cache
// biome-ignore lint/suspicious/noExplicitAny: package metadata shape is dynamic
const packages = new Map<string, any>();
// biome-ignore lint/suspicious/noExplicitAny: component metadata shape is dynamic
const components = new Map<string, any>();

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  main: string;
  exports: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  srcDir: string | null;
  packageDir: string;
  componentFiles: string[];
}

class KumixTemplateMCPServer {
  private async loadPackageInfo(): Promise<void> {
    try {
      // Scan the repo's packages/ directory. Using a relative pattern with
      // `cwd` is required: glob's `ignore` patterns are matched against
      // project-relative paths, so absolute patterns would let node_modules
      // and dist sneak back in.
      const packageDirs = await glob("packages/**/package.json", {
        cwd: PACKAGES_ROOT,
        windowsPathsNoEscape: true,
        ignore: SCAN_IGNORE,
      });

      for (const relativePackageDir of packageDirs.map((p) => dirname(p))) {
        const packageDir = resolve(PACKAGES_ROOT, relativePackageDir);
        const packageJsonPath = join(packageDir, "package.json");

        try {
          await access(packageJsonPath);
          const packageJsonContent = await readFile(packageJsonPath, "utf-8");
          const packageJson = JSON.parse(packageJsonContent);

          if (packageJson.name?.startsWith("@kumix/") && packageJson.name !== "@kumix/mcp") {
            // Check if package has src directory
            const srcDir = join(packageDir, "src");
            let componentFiles: string[] = [];
            let hasSrcDir = false;

            try {
              await access(srcDir);
              hasSrcDir = true;

              // Get all TypeScript/TSX files in src directory.
              // Use a relative pattern + cwd so the ignore patterns apply.
              const relativeSrc = relative(PACKAGES_ROOT, srcDir).replace(/\\/g, "/");
              const componentFileRel = await glob(`${relativeSrc}/**/*.{ts,tsx}`, {
                cwd: PACKAGES_ROOT,
                windowsPathsNoEscape: true,
                ignore: ["**/*.test.ts", "**/*.test.tsx", ...SCAN_IGNORE],
              });
              componentFiles = componentFileRel.map((p) => resolve(PACKAGES_ROOT, p));
            } catch (error) {
              // Package doesn't have a src directory — expected for some packages.
              console.error(`[mcp] no src/ in ${packageJson.name}:`, error);
              hasSrcDir = false;
            }

            // Extract exported components/members from package.json exports
            const exportEntries = Object.keys(packageJson.exports || {})
              .filter((key) => key !== "./package.json")
              .map((key) => key.replace("./", ""));

            const packageInfo: PackageInfo = {
              name: packageJson.name,
              version: packageJson.version,
              description: packageJson.description,
              main: packageJson.main,
              exports: exportEntries,
              dependencies: packageJson.dependencies || {},
              devDependencies: packageJson.devDependencies || {},
              srcDir: hasSrcDir ? srcDir : null,
              packageDir, // Store package root directory
              componentFiles,
            };

            packages.set(packageJson.name, packageInfo);

            // Index components only if src directory exists
            if (hasSrcDir) {
              for (const componentFile of componentFiles) {
                const componentName = basename(componentFile, extname(componentFile));
                const relativePath = relative(srcDir, componentFile).replace(/\\/g, "/");

                components.set(componentName, {
                  name: componentName,
                  package: packageJson.name,
                  path: relativePath,
                });
              }
            }
          }
        } catch (error) {
          console.error(`[mcp] failed to read ${packageJsonPath}:`, error);
        }
      }
    } catch (error) {
      console.error("Error loading package info:", error);
    }
  }

  async listPackages() {
    if (packages.size === 0) {
      await this.loadPackageInfo();
    }

    const allPackages = Array.from(packages.values());

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              packages: allPackages.map((pkg) => ({
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
                exportsCount: pkg.exports.length,
              })),
              total: allPackages.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async getPackageInfo(packageName: string) {
    if (packages.size === 0) {
      await this.loadPackageInfo();
    }

    const pkg = packages.get(packageName);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Package ${packageName} not found`,
                availablePackages: Array.from(packages.keys()),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Strip filesystem-absolute fields before returning to the client.
    const { packageDir, srcDir, componentFiles, ...safeInfo } = pkg;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(safeInfo, null, 2),
        },
      ],
    };
  }

  async findComponent(componentName: string, packageFilter?: string) {
    if (packages.size === 0) {
      await this.loadPackageInfo();
    }

    let matchingComponents = Array.from(components.values()).filter((comp) =>
      comp.name.toLowerCase().includes(componentName.toLowerCase()),
    );

    if (packageFilter) {
      matchingComponents = matchingComponents.filter((comp) =>
        comp.package.includes(packageFilter),
      );
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              components: matchingComponents,
              total: matchingComponents.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async readComponentCode(packageName: string, componentPath: string) {
    if (packages.size === 0) {
      await this.loadPackageInfo();
    }

    const pkg = packages.get(packageName);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Package ${packageName} not found`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Resolve the requested path and ensure it stays inside the package directory.
    // Without this, a caller could request "../../.env" or similar to read files
    // outside the intended scope (path traversal).
    const baseDir = pkg.srcDir ?? pkg.packageDir;
    const packageRoot = resolve(pkg.packageDir);
    const resolvedPath = resolve(baseDir, componentPath);

    if (resolvedPath !== packageRoot && !resolvedPath.startsWith(`${packageRoot}${sep}`)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Component path escapes package directory: ${componentPath}`,
                package: packageName,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    try {
      await access(resolvedPath);
      const code = await readFile(resolvedPath, "utf-8");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                package: packageName,
                component: componentPath,
                code,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      console.error(`[mcp] read_component_code failed for ${packageName}/${componentPath}:`, error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Component file not found: ${componentPath}`,
                package: packageName,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  }

  async getUsageExample(packageName: string, componentName?: string) {
    if (packages.size === 0) {
      await this.loadPackageInfo();
    }

    const pkg = packages.get(packageName);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Package ${packageName} not found`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Try to find README or examples
    const readmePath = pkg.srcDir
      ? join(pkg.srcDir, "..", "README.md")
      : join(pkg.packageDir, "README.md");

    try {
      await access(readmePath);
      const readme = await readFile(readmePath, "utf-8");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                package: packageName,
                component: componentName,
                readme,
                note: componentName
                  ? `Specific examples for ${componentName} not found. Showing package README.`
                  : "Package README and usage examples",
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      console.error(`[mcp] no README for ${packageName}, generating example:`, error);
      // Generate basic usage example
      const example = this.generateUsageExample(packageName, componentName);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                package: packageName,
                component: componentName,
                example,
                note: "Generated usage example",
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  }

  private generateUsageExample(packageName: string, componentName?: string): string {
    const importTarget = componentName ? `{ ${componentName} }` : "* as pkg";
    return `// Example usage for ${packageName}
import ${importTarget} from "${packageName}";

// TODO: replace with a real call once you know the package's API.`;
  }
}

// Create server instance
const server = new McpServer({
  name: "Kumix Template",
  version: "0.0.0",
});

// Instance of our business logic
const kumixServer = new KumixTemplateMCPServer();

// Register tools using the new API
server.registerTool(
  "list_packages",
  {
    description: "List all available Kumix template packages",
    inputSchema: {},
  },
  async () => {
    const result = await kumixServer.listPackages();
    return result;
  },
);

server.registerTool(
  "get_package_info",
  {
    description: "Get detailed information about a specific package",
    inputSchema: {
      package_name: z
        .string()
        .min(1, "Package name is required")
        .describe("The name of the package (e.g., @kumix/core)"),
    },
  },
  async ({ package_name }) => {
    const result = await kumixServer.getPackageInfo(package_name);
    return result;
  },
);

server.registerTool(
  "find_component",
  {
    description: "Find a specific component in the packages",
    inputSchema: {
      component_name: z
        .string()
        .min(1, "Component name is required")
        .describe("The name of the component to find"),
      package_filter: z
        .string()
        .optional()
        .describe("Optional package to search in (e.g., core, main)"),
    },
  },
  async ({ component_name, package_filter }) => {
    const result = await kumixServer.findComponent(component_name, package_filter);
    return result;
  },
);

server.registerTool(
  "read_component_code",
  {
    description: "Read the source code of a specific component",
    inputSchema: {
      package_name: z
        .string()
        .min(1, "Package name is required")
        .describe("The package containing the component"),
      component_path: z
        .string()
        .min(1, "Component path is required")
        .describe("The relative path to the component from src/"),
    },
  },
  async ({ package_name, component_path }) => {
    const result = await kumixServer.readComponentCode(package_name, component_path);
    return result;
  },
);

server.registerTool(
  "get_usage_example",
  {
    description: "Get usage examples for a package or specific component",
    inputSchema: {
      package_name: z
        .string()
        .min(1, "Package name is required")
        .describe("The package to get examples for"),
      component_name: z.string().optional().describe("Optional specific component name"),
    },
  },
  async ({ package_name, component_name }) => {
    const result = await kumixServer.getUsageExample(package_name, component_name);
    return result;
  },
);

/**
 * Main entry point for the Kumix Template MCP Server
 *
 * This script initializes the MCP server using the official MCP SDK and
 * provides tools and resources for exploring the template packages.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kumix Template MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
