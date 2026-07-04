import { greet } from "@kumix/core";

/**
 * Main package for the Kumix template.
 *
 * Demonstrates consuming `@kumix/core` via the workspace protocol.
 */

/** Build a welcome message using the core `greet` helper. */
export function welcome(name: string): string {
  return `${greet(name)} Welcome to the Kumix template.`;
}
