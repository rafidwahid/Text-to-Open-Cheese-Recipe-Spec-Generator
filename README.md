# OCRS - Open Cheese Recipe Schema

A structured schema for converting free-form cheese recipes into machine-readable JSON format using LLMs.

## Files

| File | Description |
|------|-------------|
| `system-instruction.md` | System prompt with parsing guidelines for the LLM |
| `structured-outputs.json` | JSON Schema for structured output validation |

## Quick Start

### Google AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new prompt
3. **System Instructions**: Copy the contents of `system-instruction.md` into the system instructions field
4. **Structured Output**:
   - Click on "Output" in the right panel
   - Select "JSON" as the output format
   - Paste the contents of `structured-outputs.json` as the schema
5. **User Input**: Paste any cheese recipe text
6. Run the prompt to get structured OCRS output

### OpenAI API

Use the schema with OpenAI's structured outputs feature:

```python
import openai
import json

# Load the schema
with open("structured-outputs.json", "r") as f:
    schema = json.load(f)

# Load system instructions
with open("system-instruction.md", "r") as f:
    system_instructions = f.read()

client = openai.OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "system", "content": system_instructions},
        {"role": "user", "content": "YOUR_RECIPE_TEXT_HERE"}
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "ocrs_recipe",
            "strict": True,
            "schema": schema
        }
    }
)

recipe = json.loads(response.choices[0].message.content)
print(json.dumps(recipe, indent=2))
```

### Anthropic Claude API

```python
import anthropic
import json

# Load system instructions
with open("system-instruction.md", "r") as f:
    system_instructions = f.read()

# Load schema for reference in prompt
with open("structured-outputs.json", "r") as f:
    schema = json.load(f)

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=system_instructions + f"\n\nOutput JSON matching this schema:\n```json\n{json.dumps(schema, indent=2)}\n```",
    messages=[
        {"role": "user", "content": "YOUR_RECIPE_TEXT_HERE"}
    ]
)

# Parse JSON from response
import re
json_match = re.search(r'```json\n(.*?)\n```', message.content[0].text, re.DOTALL)
if json_match:
    recipe = json.loads(json_match.group(1))
```

## Example

**Input:**
```
Simple Mozzarella Recipe

Ingredients:
- 1 gallon whole milk
- 1.5 tsp citric acid dissolved in 1/4 cup water
- 1/4 tsp liquid rennet in 1/4 cup water
- 1 tsp salt

Heat milk to 55°F, add citric acid. Heat to 90°F, add rennet.
Let set 5 minutes until clean break. Cut curds into 1-inch cubes.
Heat to 105°F while stirring. Drain whey when pH reaches 5.2.
Stretch in 170°F water until smooth. Salt and form into balls.
```

**Output:**
```json
{
  "spec": "OCRS/1.0",
  "recipe": {
    "name": "Simple Mozzarella",
    "style": "FRESH",
    "milkType": "COW",
    "difficulty": "BEGINNER",
    "batchSize": {
      "milkVolume": 3.785,
      "unit": "liters"
    }
  },
  "ingredients": [
    { "name": "Whole Milk", "type": "PRIMARY", "amount": 3.785, "unit": "liters" },
    { "name": "Citric Acid", "type": "ADDITIVE", "amount": 1.5, "unit": "tsp" },
    { "name": "Liquid Rennet", "type": "COAGULANT", "amount": 0.25, "unit": "tsp" },
    { "name": "Salt", "type": "SEASONING", "amount": 1, "unit": "tsp" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Add Citric Acid",
      "category": "HEATING",
      "instructions": "Heat milk to 13°C, add dissolved citric acid",
      "temperature": { "target": 13, "unit": "C" }
    },
    {
      "stepNumber": 2,
      "title": "Add Rennet",
      "category": "COAGULATION",
      "instructions": "Heat to 32°C, add diluted rennet and stir gently",
      "temperature": { "target": 32, "unit": "C" }
    },
    {
      "stepNumber": 3,
      "title": "Set Curd",
      "category": "COAGULATION",
      "instructions": "Let set until clean break forms",
      "duration": { "type": "FIXED", "value": 5, "unit": "minutes" },
      "validation": { "expectedResult": "Clean break when tested with knife" }
    },
    {
      "stepNumber": 4,
      "title": "Cut Curds",
      "category": "CUTTING",
      "instructions": "Cut curds into 1-inch cubes"
    },
    {
      "stepNumber": 5,
      "title": "Cook Curds",
      "category": "HEATING",
      "instructions": "Heat to 41°C while stirring gently",
      "temperature": { "target": 41, "unit": "C" }
    },
    {
      "stepNumber": 6,
      "title": "Drain Whey",
      "category": "DRAINING",
      "instructions": "Drain whey when pH reaches target",
      "ph": 5.2,
      "duration": { "type": "UNTIL_CONDITION", "condition": "pH reaches 5.2" }
    },
    {
      "stepNumber": 7,
      "title": "Stretch Curd",
      "category": "OTHER",
      "instructions": "Stretch curd in hot water until smooth and elastic",
      "temperature": { "target": 77, "unit": "C" }
    },
    {
      "stepNumber": 8,
      "title": "Salt and Form",
      "category": "SALTING",
      "instructions": "Add salt while stretching, form into balls"
    }
  ],
  "aging": {
    "required": false
  },
  "safety": {
    "allergens": ["MILK", "LACTOSE"]
  }
}
```

## Schema Details

### Cheese Styles
`FRESH` | `SOFT` | `SEMI_SOFT` | `SEMI_HARD` | `HARD` | `BLUE` | `BRINED`

### Milk Types
`COW` | `GOAT` | `SHEEP` | `BUFFALO` | `MIXED`

### Difficulty Levels
| Level | Description |
|-------|-------------|
| `BEGINNER` | Fresh cheeses, acid-set, no aging, <3 hours |
| `INTERMEDIATE` | Simple cultured, short aging, brining |
| `ADVANCED` | Bloomy/washed rind, long aging |
| `EXPERT` | Complex multi-culture, extended aging |

### Step Categories
`HEATING` | `COAGULATION` | `CUTTING` | `DRAINING` | `SALTING` | `PRESSING` | `AGING` | `OTHER`

### Ingredient Types
`PRIMARY` | `CULTURE` | `COAGULANT` | `ADDITIVE` | `SEASONING` | `OTHER`

## License

MIT License - Feel free to use and modify for your cheese-making applications.
