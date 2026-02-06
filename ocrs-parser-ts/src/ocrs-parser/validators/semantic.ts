import type { OCRSRecipe } from "./schema.js";

export interface SemanticResult {
  rule: string;
  severity: "pass" | "warn" | "fail";
  message: string;
}

type Rule = (recipe: OCRSRecipe) => SemanticResult[];

// Per system-instructions.md: cheesemaking temperatures in Celsius
// rarely exceed ~80°C (stretching mozzarella). Pasteurization is 63°C.
const MAX_PLAUSIBLE_TEMP_C = 85;

// pH range for cheesemaking per system-instructions.md:
// Fresh milk: 6.5-6.7, Final cheese: 4.9-5.3
// Allow a buffer: 4.0-7.0
const PH_MIN = 4.0;
const PH_MAX = 7.0;

const stepSequencing: Rule = (recipe) => {
  const results: SemanticResult[] = [];
  for (let i = 0; i < recipe.steps.length; i++) {
    const expected = i + 1;
    if (recipe.steps[i].stepNumber !== expected) {
      results.push({
        rule: "step-sequencing",
        severity: "fail",
        message: `Step ${i + 1} has stepNumber ${recipe.steps[i].stepNumber}, expected ${expected}`,
      });
    }
  }
  if (results.length === 0) {
    results.push({ rule: "step-sequencing", severity: "pass", message: "Step numbers are sequential" });
  }
  return results;
};

const temperaturePlausibility: Rule = (recipe) => {
  const results: SemanticResult[] = [];
  for (const step of recipe.steps) {
    if (step.temperature && step.temperature.unit === "C" && step.temperature.target > MAX_PLAUSIBLE_TEMP_C) {
      results.push({
        rule: "temperature-plausibility",
        severity: "fail",
        message: `Step ${step.stepNumber} "${step.title}": temperature ${step.temperature.target}°C is implausible — likely unconverted Fahrenheit`,
      });
    }
  }
  if (results.length === 0) {
    results.push({ rule: "temperature-plausibility", severity: "pass", message: "All temperatures plausible" });
  }
  return results;
};

const phRange: Rule = (recipe) => {
  const results: SemanticResult[] = [];
  for (const step of recipe.steps) {
    if (step.ph !== undefined && (step.ph < PH_MIN || step.ph > PH_MAX)) {
      results.push({
        rule: "ph-range",
        severity: "fail",
        message: `Step ${step.stepNumber} "${step.title}": pH ${step.ph} is outside cheesemaking range (${PH_MIN}-${PH_MAX})`,
      });
    }
  }
  if (results.length === 0) {
    results.push({ rule: "ph-range", severity: "pass", message: "All pH values in range" });
  }
  return results;
};

const durationSanity: Rule = (recipe) => {
  const results: SemanticResult[] = [];
  for (const step of recipe.steps) {
    if (step.duration?.value !== undefined && step.duration.value <= 0) {
      results.push({
        rule: "duration-sanity",
        severity: "fail",
        message: `Step ${step.stepNumber} "${step.title}": duration ${step.duration.value} is invalid (must be positive)`,
      });
    }
  }
  if (results.length === 0) {
    results.push({ rule: "duration-sanity", severity: "pass", message: "All durations valid" });
  }
  return results;
};

const requiredAllergens: Rule = (recipe) => {
  const allergens = recipe.safety?.allergens ?? [];
  const missing: string[] = [];
  if (!allergens.includes("MILK")) missing.push("MILK");
  if (!allergens.includes("LACTOSE")) missing.push("LACTOSE");

  if (missing.length > 0) {
    return [
      {
        rule: "required-allergens",
        severity: "fail",
        message: `Missing required allergens for dairy recipe: ${missing.join(", ")}`,
      },
    ];
  }
  return [{ rule: "required-allergens", severity: "pass", message: "Required allergens present" }];
};

const unitConsistency: Rule = (recipe) => {
  const results: SemanticResult[] = [];
  for (const step of recipe.steps) {
    if (step.temperature && step.temperature.unit !== "C") {
      results.push({
        rule: "unit-consistency",
        severity: "fail",
        message: `Step ${step.stepNumber} "${step.title}": temperature must be in Celsius, got ${step.temperature.unit}`,
      });
    }
  }
  if (results.length === 0) {
    results.push({ rule: "unit-consistency", severity: "pass", message: "All units consistent" });
  }
  return results;
};

const ALL_RULES: Rule[] = [
  stepSequencing,
  temperaturePlausibility,
  phRange,
  durationSanity,
  requiredAllergens,
  unitConsistency,
];

export function validateSemantic(recipe: OCRSRecipe): SemanticResult[] {
  return ALL_RULES.flatMap((rule) => rule(recipe));
}
