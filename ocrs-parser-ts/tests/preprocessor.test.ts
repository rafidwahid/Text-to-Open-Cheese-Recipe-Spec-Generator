import { describe, it, expect } from "vitest";
import { preprocess } from "../src/ocrs-parser/preprocessor.js";

describe("preprocess", () => {
  it("normalizes unicode characters", () => {
    const input = "\u201CHeat to 90\u00B0F\u201D \u2014 add rennet";
    const result = preprocess(input);
    expect(result.text).toBe('"Heat to 90°F" — add rennet');
  });

  it("collapses excessive whitespace", () => {
    const input = "Step 1\n\n\n\n\nHeat milk\n\n\nStep 2\n\nAdd rennet";
    const result = preprocess(input);
    expect(result.text).not.toContain("\n\n\n");
  });

  it("trims leading and trailing whitespace", () => {
    const input = "   \n\n  Recipe here  \n\n  ";
    const result = preprocess(input);
    expect(result.text).toBe("Recipe here");
  });

  it("detects structured format with clear sections", () => {
    const input = "Mozzarella\n\nIngredients:\n- 1 gallon milk\n\nInstructions:\n1. Heat milk";
    const result = preprocess(input);
    expect(result.format).toBe("structured");
  });

  it("detects unstructured narrative format", () => {
    const input = "So I was making cheese yesterday and I heated the milk to about 90 degrees then added some rennet and waited for it to set up nicely";
    const result = preprocess(input);
    expect(result.format).toBe("unstructured");
  });

  it("detects semi-structured format", () => {
    const input = "Mozzarella Recipe\n\nYou'll need 1 gallon of milk, citric acid, and rennet.\n\nFirst heat the milk to 55F. Then add the citric acid.";
    const result = preprocess(input);
    expect(result.format).toBe("semi-structured");
  });

  it("rejects empty input", () => {
    expect(() => preprocess("")).toThrow();
    expect(() => preprocess("   ")).toThrow();
  });

  it("rejects input exceeding max length", () => {
    const long = "word ".repeat(20000);
    expect(() => preprocess(long)).toThrow();
  });
});
