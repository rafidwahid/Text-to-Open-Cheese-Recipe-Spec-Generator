import OpenAI from "openai";
import { config } from "../config.js";
import type { LLMProvider, ParseOptions, ParseResult } from "./base.js";
import type { OCRSRecipe } from "../validators/schema.js";

export interface OpenAIProviderOptions {
  apiKey?: string;
  systemPrompt: string;
  schema: Record<string, unknown>;
}

// OpenAI requires: additionalProperties:false on every object, all properties
// in required, optional properties wrapped as anyOf: [{...}, {type:"null"}].
function toOpenAIStrict(node: Record<string, unknown>): Record<string, unknown> {
  if (node.type === "object" && node.properties) {
    const properties = node.properties as Record<string, Record<string, unknown>>;
    const required = (node.required ?? []) as string[];
    const allKeys = Object.keys(properties);

    const newProperties: Record<string, unknown> = {};
    for (const key of allKeys) {
      const prop = toOpenAIStrict({ ...properties[key] });
      if (!required.includes(key)) {
        newProperties[key] = { anyOf: [prop, { type: "null" }] };
      } else {
        newProperties[key] = prop;
      }
    }

    const result: Record<string, unknown> = {
      type: "object",
      properties: newProperties,
      required: allKeys,
      additionalProperties: false,
    };
    if (node.description) result.description = node.description;
    return result;
  }

  if (node.type === "array" && node.items) {
    const result: Record<string, unknown> = {
      type: "array",
      items: toOpenAIStrict(node.items as Record<string, unknown>),
    };
    if (node.description) result.description = node.description;
    return result;
  }

  // Primitives — pass through (strip propertyOrdering)
  const { propertyOrdering, ...rest } = node;
  return rest;
}

function buildSystemPrompt(basePrompt: string, format: string): string {
  const formatHint = `\n\n## Input Format Detection\nThis input appears to be ${format}. ${
    format === "unstructured"
      ? "Pay extra attention to extracting implicit ingredients and step boundaries from the narrative."
      : format === "semi-structured"
        ? "Some sections may be identifiable by headers, but instructions may be mixed with narrative."
        : "This input has clear section headers — extract from each section accordingly."
  }`;
  return basePrompt + formatHint;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private systemPrompt: string;
  private schema: Record<string, unknown>;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey ?? process.env.OPENAI_API_KEY });
    this.systemPrompt = options.systemPrompt;
    this.schema = toOpenAIStrict(options.schema);
  }

  private async callOpenAI(
    messages: OpenAI.ChatCompletionMessageParam[],
  ): Promise<ParseResult> {
    const response = await this.client.chat.completions.create({
      model: config.openai.model,
      temperature: config.openai.temperature,
      seed: config.openai.seed,
      max_tokens: config.openai.maxTokens,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ocrs_recipe",
          strict: true,
          schema: this.schema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    return {
      parsedJson: JSON.parse(content) as OCRSRecipe,
      provider: "openai",
      model: config.openai.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async parse(text: string, options: ParseOptions): Promise<ParseResult> {
    return this.callOpenAI([
      { role: "system", content: buildSystemPrompt(this.systemPrompt, options.format) },
      { role: "user", content: text },
    ]);
  }

  async parseWithFeedback(
    text: string,
    options: ParseOptions,
    errors: string[],
  ): Promise<ParseResult> {
    const errorFeedback = `Your previous output had these errors:\n${errors.map((e) => `- ${e}`).join("\n")}\nPlease fix these specific issues and re-output.`;
    return this.callOpenAI([
      { role: "system", content: buildSystemPrompt(this.systemPrompt, options.format) },
      { role: "user", content: text },
      { role: "assistant", content: "Let me re-parse with corrections." },
      { role: "user", content: errorFeedback },
    ]);
  }
}
