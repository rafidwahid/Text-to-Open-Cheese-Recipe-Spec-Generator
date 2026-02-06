import type { OCRSRecipe } from "../validators/schema.js";
import type { InputFormat } from "../preprocessor.js";

export interface ParseOptions {
  format: InputFormat;
}

export interface ParseResult {
  parsedJson: OCRSRecipe;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  parse(text: string, options: ParseOptions): Promise<ParseResult>;
}
