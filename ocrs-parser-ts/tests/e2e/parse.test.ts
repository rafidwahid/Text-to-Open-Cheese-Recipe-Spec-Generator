import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Pipeline, OpenAIProvider } from "../../src/ocrs-parser/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../fixtures");
const specRoot = resolve(__dirname, "../../..");

const describeE2E = process.env.OPENAI_API_KEY ? describe : describe.skip;

describeE2E("E2E: Pipeline with OpenAI", () => {
  let provider: OpenAIProvider;
  let pipeline: Pipeline;

  beforeAll(() => {
    provider = new OpenAIProvider({
      systemPrompt: readFileSync(
        resolve(specRoot, "system-instructions.md"),
        "utf-8",
      ),
      schema: JSON.parse(
        readFileSync(resolve(specRoot, "structured-outputs.json"), "utf-8"),
      ),
    });
    pipeline = new Pipeline(provider);
  });

  it("parses a structured mozzarella recipe", async () => {
    const input = readFileSync(resolve(fixturesDir, "mozzarella-blog.txt"), "utf-8");
    const result = await pipeline.run(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.spec).toBe("OCRS/1.0");
      expect(result.data.recipe.style).toBe("FRESH");
      expect(result.data.recipe.milkType).toBe("COW");
      expect(result.data.ingredients.length).toBeGreaterThanOrEqual(3);
      expect(result.data.steps.length).toBeGreaterThanOrEqual(5);
      const tempSteps = result.data.steps.filter((s) => s.temperature);
      for (const step of tempSteps) {
        expect(step.temperature!.unit).toBe("C");
      }
    }
  }, 30_000);

  it("parses an unstructured cheddar transcript", async () => {
    const input = readFileSync(resolve(fixturesDir, "cheddar-transcript.txt"), "utf-8");
    const result = await pipeline.run(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe.milkType).toBe("COW");
      expect(result.data.aging?.required).toBe(true);
      const phSteps = result.data.steps.filter((s) => s.ph !== undefined);
      expect(phSteps.length).toBeGreaterThanOrEqual(1);
    }
  }, 30_000);

  it("does not hallucinate temperature on steps without one (goat cheese garlic)", async () => {
    const input = readFileSync(
      resolve(fixturesDir, "goat-cheese-garlic.txt"),
      "utf-8",
    );
    const result = await pipeline.run(input);

    expect(result.success).toBe(true);
    if (result.success) {
      const heatStep = result.data.steps.find((s) => s.category === "HEATING");
      expect(heatStep?.temperature).toBeDefined();
      expect(heatStep!.temperature!.unit).toBe("C");

      const rennetStep = result.data.steps.find(
        (s) =>
          s.instructions.toLowerCase().includes("dissolve") &&
          s.instructions.toLowerCase().includes("rennet"),
      );
      if (rennetStep) {
        expect(rennetStep.temperature).toBeUndefined();
      }
    }
  }, 30_000);
});
