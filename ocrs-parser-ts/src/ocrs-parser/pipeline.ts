import { preprocess } from "./preprocessor.js";
import { OCRSSchema, type OCRSRecipe } from "./validators/schema.js";
import { validateSemantic } from "./validators/semantic.js";
import type { LLMProvider } from "./llm/base.js";
import { config } from "./config.js";

export type PipelineResult =
  | { success: true; data: OCRSRecipe; warnings: string[] }
  | { success: false; errors: string[]; warnings: string[] };

// OpenAI strict mode returns null for optional fields; Zod expects undefined.
// Recursively strip null values so Zod .optional() works correctly.
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null) {
        result[key] = stripNulls(value);
      }
    }
    return result;
  }
  return obj;
}

export class Pipeline {
  constructor(private provider: LLMProvider) {}

  async run(rawText: string): Promise<PipelineResult> {
    // Stage 1: Pre-process (throws on invalid input)
    const { text, format } = preprocess(rawText);

    let lastErrors: string[] = [];
    const maxAttempts = 1 + config.pipeline.maxRetries;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Stage 2: LLM Parse
      const parseResult =
        attempt === 0 || !("parseWithFeedback" in this.provider)
          ? await this.provider.parse(text, { format })
          : await (this.provider as any).parseWithFeedback(text, { format }, lastErrors);

      // Stage 3: Schema Validation (strip nulls from LLM response first)
      const cleaned = stripNulls(parseResult.parsedJson);
      const schemaResult = OCRSSchema.safeParse(cleaned);
      if (!schemaResult.success) {
        lastErrors = schemaResult.error.issues.map(
          (issue) => `Schema error at ${issue.path.join(".")}: ${issue.message}`
        );
        continue;
      }

      // Stage 4: Semantic Validation
      const semanticResults = validateSemantic(schemaResult.data);
      const failures = semanticResults.filter((r) => r.severity === "fail");
      const warnings = semanticResults.filter((r) => r.severity === "warn").map((r) => r.message);

      if (failures.length > 0) {
        lastErrors = failures.map((f) => f.message);
        continue;
      }

      return { success: true, data: schemaResult.data, warnings };
    }

    return { success: false, errors: lastErrors, warnings: [] };
  }
}
