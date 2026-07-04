import { describe, expect, it } from "vitest";

import { greet, version } from "./index";

describe("greet", () => {
  it("greets a name", () => {
    expect(greet("Kumix")).toBe("Hello, Kumix!");
  });
});

describe("version", () => {
  it("is exported", () => {
    expect(version).toBe("0.0.0");
  });
});
