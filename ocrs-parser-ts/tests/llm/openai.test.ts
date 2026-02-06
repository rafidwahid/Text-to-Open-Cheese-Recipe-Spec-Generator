import { describe, it, expect, vi } from "vitest";
import { OpenAIProvider } from "../../src/ocrs-parser/llm/openai.js";

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
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
                      { stepNumber: 1, title: "Heat", category: "HEATING", instructions: "Heat milk to 32°C" },
                    ],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 200 },
          }),
        },
      };
    },
  };
});

const dummyOptions = {
  apiKey: "test-key",
  systemPrompt: "You are a cheese recipe parser.",
  schema: { type: "object", properties: {}, required: [] },
};

describe("OpenAIProvider", () => {
  it("returns parsed OCRS recipe from LLM response", async () => {
    const provider = new OpenAIProvider(dummyOptions);
    const result = await provider.parse("Simple mozzarella recipe with 1 gallon milk", {
      format: "structured",
    });

    expect(result.parsedJson.spec).toBe("OCRS/1.0");
    expect(result.parsedJson.recipe.name).toBe("Test Mozzarella");
    expect(result.provider).toBe("openai");
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(200);
  });

  it("includes format hint in system prompt", async () => {
    const provider = new OpenAIProvider(dummyOptions);
    await provider.parse("some recipe text", { format: "unstructured" });
  });
});
