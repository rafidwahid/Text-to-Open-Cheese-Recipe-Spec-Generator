import { describe, it, expect, vi } from "vitest";
import { Pipeline } from "../src/ocrs-parser/pipeline.js";
import type { LLMProvider, ParseResult, ParseOptions } from "../src/ocrs-parser/llm/base.js";
import type { OCRSRecipe } from "../src/ocrs-parser/validators/schema.js";

function validRecipe(): OCRSRecipe {
  return {
    spec: "OCRS/1.0",
    recipe: {
      name: "Test Mozzarella",
      style: "FRESH",
      milkType: "COW",
      difficulty: "BEGINNER",
      batchSize: { milkVolume: 3.785, unit: "liters" },
    },
    ingredients: [
      { name: "Whole Milk", type: "PRIMARY", amount: 3.785, unit: "liters" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Heat",
        category: "HEATING",
        instructions: "Heat milk to 32°C",
        temperature: { target: 32, unit: "C" },
      },
    ],
    safety: {
      allergens: ["MILK", "LACTOSE"],
    },
  };
}

function mockProvider(recipe: OCRSRecipe): LLMProvider {
  return {
    parse: vi.fn().mockResolvedValue({
      parsedJson: recipe,
      provider: "mock",
      model: "mock-model",
      usage: { inputTokens: 0, outputTokens: 0 },
    } satisfies ParseResult),
  };
}

describe("Pipeline", () => {
  it("processes valid recipe text end-to-end", async () => {
    const provider = mockProvider(validRecipe());
    const pipeline = new Pipeline(provider);
    const result = await pipeline.run("Simple mozzarella with 1 gallon milk, citric acid, rennet...");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.spec).toBe("OCRS/1.0");
    }
  });

  it("rejects empty input at pre-processing stage", async () => {
    const provider = mockProvider(validRecipe());
    const pipeline = new Pipeline(provider);

    await expect(pipeline.run("")).rejects.toThrow("Input text is empty");
  });

  it("returns validation errors for schema-invalid LLM output", async () => {
    const badRecipe = { spec: "OCRS/1.0" } as unknown as OCRSRecipe;
    const provider = mockProvider(badRecipe);
    const pipeline = new Pipeline(provider);
    const result = await pipeline.run("Some recipe text");

    expect(result.success).toBe(false);
  });

  it("returns semantic validation failures", async () => {
    const recipe = validRecipe();
    recipe.safety = { allergens: [] }; // missing MILK, LACTOSE
    const provider = mockProvider(recipe);
    const pipeline = new Pipeline(provider);
    const result = await pipeline.run("Some recipe text");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("allergen"))).toBe(true);
    }
  });
});
