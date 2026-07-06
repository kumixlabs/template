import { describe, expect, it } from "vitest";

import { welcome } from "../src/index";

describe("welcome", () => {
  it("builds a welcome message using the core helper", () => {
    expect(welcome("Kumix")).toBe("Hello, Kumix! Welcome to the Kumix template.");
  });
});
