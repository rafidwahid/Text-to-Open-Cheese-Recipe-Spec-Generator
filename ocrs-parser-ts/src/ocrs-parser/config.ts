export const config = {
  openai: {
    model: "gpt-4o-2024-08-06",
    temperature: 0,
    seed: 42,
    maxTokens: 4096,
  },
  pipeline: {
    maxRetries: 2,
  },
} as const;
