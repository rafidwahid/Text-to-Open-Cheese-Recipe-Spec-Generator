import "dotenv/config";
import { readFileSync } from "fs";
import { Pipeline, OpenAIProvider } from "./src/ocrs-parser/index.js";

const recipe = readFileSync("tests/fixtures/mozzarella-blog.txt", "utf-8");

const provider = new OpenAIProvider({
  systemPrompt: readFileSync("../system-instructions.md", "utf-8"),
  schema: JSON.parse(readFileSync("../structured-outputs.json", "utf-8")),
});
const pipeline = new Pipeline(provider);

const result = await pipeline.run(recipe);

console.log(JSON.stringify(result, null, 2));

if (!result.success) {
  console.log("FAILED — errors:");
  for (const e of result.errors) console.log(" ", e);
  console.log("warnings:", result.warnings);
}
