import { describe, it, expect } from "vitest";
import { validateSemantic, type SemanticResult } from "../../src/ocrs-parser/validators/semantic.js";
import type { OCRSRecipe } from "../../src/ocrs-parser/validators/schema.js";

// Helper to build a minimal valid recipe and override specific parts
function makeRecipe(overrides: Partial<OCRSRecipe> = {}): OCRSRecipe {
  return {
    spec: "OCRS/1.0",
    recipe: {
      name: "Test Cheese",
      style: "FRESH",
      milkType: "COW",
      difficulty: "BEGINNER",
      batchSize: { milkVolume: 3.785, unit: "liters" },
    },
    ingredients: [
      { name: "Whole Milk", type: "PRIMARY", amount: 3.785, unit: "liters" },
      { name: "Rennet", type: "COAGULANT", amount: 0.25, unit: "tsp" },
    ],
    steps: [
      { stepNumber: 1, title: "Heat", category: "HEATING", instructions: "Heat milk" },
      { stepNumber: 2, title: "Add Rennet", category: "COAGULATION", instructions: "Add rennet" },
    ],
    safety: {
      allergens: ["MILK", "LACTOSE"],
    },
    ...overrides,
  };
}

describe("validateSemantic", () => {
  it("passes a valid recipe", () => {
    const result = validateSemantic(makeRecipe());
    const failures = result.filter((r) => r.severity === "fail");
    expect(failures).toHaveLength(0);
  });

  it("fails on non-sequential step numbers", () => {
    const recipe = makeRecipe({
      steps: [
        { stepNumber: 1, title: "A", category: "HEATING", instructions: "A" },
        { stepNumber: 3, title: "B", category: "CUTTING", instructions: "B" },
      ],
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "step-sequencing" && r.severity === "fail")).toBe(true);
  });

  it("fails on implausible temperature (likely unconverted Fahrenheit)", () => {
    const recipe = makeRecipe({
      steps: [
        {
          stepNumber: 1,
          title: "Heat",
          category: "HEATING",
          instructions: "Heat milk",
          temperature: { target: 170, unit: "C" },
        },
      ],
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "temperature-plausibility" && r.severity === "fail")).toBe(true);
  });

  it("passes valid cheesemaking temperatures in Celsius", () => {
    const recipe = makeRecipe({
      steps: [
        {
          stepNumber: 1,
          title: "Heat",
          category: "HEATING",
          instructions: "Heat milk to 32°C",
          temperature: { target: 32, unit: "C" },
        },
        {
          stepNumber: 2,
          title: "Stretch",
          category: "OTHER",
          instructions: "Stretch in hot water",
          temperature: { target: 77, unit: "C" },
        },
      ],
    });
    const result = validateSemantic(recipe);
    const tempFailures = result.filter((r) => r.rule === "temperature-plausibility" && r.severity === "fail");
    expect(tempFailures).toHaveLength(0);
  });

  it("fails on pH outside cheesemaking range (4.0-7.0)", () => {
    const recipe = makeRecipe({
      steps: [
        {
          stepNumber: 1,
          title: "Drain",
          category: "DRAINING",
          instructions: "Drain whey",
          ph: 8.5,
        },
      ],
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "ph-range" && r.severity === "fail")).toBe(true);
  });

  it("fails on zero or negative duration", () => {
    const recipe = makeRecipe({
      steps: [
        {
          stepNumber: 1,
          title: "Wait",
          category: "COAGULATION",
          instructions: "Wait",
          duration: { type: "FIXED", value: 0, unit: "minutes" },
        },
      ],
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "duration-sanity" && r.severity === "fail")).toBe(true);
  });

  it("fails when MILK or LACTOSE allergen is missing", () => {
    const recipe = makeRecipe({
      safety: { allergens: ["MILK"] },
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "required-allergens" && r.severity === "fail")).toBe(true);
  });

  it("fails when allergens are missing entirely", () => {
    const recipe = makeRecipe({
      safety: {},
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "required-allergens" && r.severity === "fail")).toBe(true);
  });

  it("fails when temperature unit is not Celsius", () => {
    const recipe = makeRecipe({
      steps: [
        {
          stepNumber: 1,
          title: "Heat",
          category: "HEATING",
          instructions: "Heat milk",
          temperature: { target: 90, unit: "F" },
        },
      ],
    });
    const result = validateSemantic(recipe);
    expect(result.some((r) => r.rule === "unit-consistency" && r.severity === "fail")).toBe(true);
  });
});
