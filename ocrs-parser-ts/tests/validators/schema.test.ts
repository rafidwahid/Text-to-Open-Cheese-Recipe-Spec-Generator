import { describe, it, expect } from "vitest";
import { OCRSSchema } from "../../src/ocrs-parser/validators/schema.js";

describe("OCRSSchema", () => {
  it("validates a complete mozzarella recipe", () => {
    const mozzarella = {
      spec: "OCRS/1.0",
      recipe: {
        name: "Simple Mozzarella",
        style: "FRESH",
        milkType: "COW",
        difficulty: "BEGINNER",
        batchSize: { milkVolume: 3.785, unit: "liters" },
      },
      ingredients: [
        { name: "Whole Milk", type: "PRIMARY", amount: 3.785, unit: "liters" },
        { name: "Citric Acid", type: "ADDITIVE", amount: 1.5, unit: "tsp" },
        { name: "Liquid Rennet", type: "COAGULANT", amount: 0.25, unit: "tsp" },
        { name: "Salt", type: "SEASONING", amount: 1, unit: "tsp" },
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Add Citric Acid",
          category: "HEATING",
          instructions: "Heat milk to 13C, add dissolved citric acid",
          temperature: { target: 13, unit: "C" },
        },
        {
          stepNumber: 2,
          title: "Add Rennet",
          category: "COAGULATION",
          instructions: "Heat to 32C, add diluted rennet",
          temperature: { target: 32, unit: "C" },
        },
      ],
    };

    const result = OCRSSchema.safeParse(mozzarella);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalid = {
      spec: "OCRS/1.0",
      recipe: { name: "Test" },
      // missing ingredients and steps
    };

    const result = OCRSSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    const invalid = {
      spec: "OCRS/1.0",
      recipe: {
        name: "Test",
        style: "INVALID_STYLE",
        milkType: "COW",
        difficulty: "BEGINNER",
        batchSize: { milkVolume: 1, unit: "liters" },
      },
      ingredients: [{ name: "Milk", type: "PRIMARY", amount: 1, unit: "liters" }],
      steps: [{ stepNumber: 1, title: "Test", category: "HEATING", instructions: "Test" }],
    };

    const result = OCRSSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts optional fields when present", () => {
    const withOptionals = {
      spec: "OCRS/1.0",
      recipe: {
        name: "Aged Cheddar",
        style: "SEMI_HARD",
        milkType: "COW",
        difficulty: "INTERMEDIATE",
        batchSize: { milkVolume: 7.57, unit: "liters" },
        origin: "England",
        yield: { amount: 900, unit: "grams" },
        totalTime: 180,
        source: { type: "BOOK", reference: "Home Cheese Making" },
      },
      ingredients: [
        { name: "Whole Milk", type: "PRIMARY", amount: 7.57, unit: "liters" },
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Heat Milk",
          category: "HEATING",
          instructions: "Heat milk to 31C",
          temperature: { target: 31, unit: "C" },
          duration: { type: "FIXED", value: 15, unit: "minutes" },
        },
        {
          stepNumber: 2,
          title: "Drain",
          category: "DRAINING",
          instructions: "Drain at pH 5.4",
          ph: 5.4,
          duration: { type: "UNTIL_CONDITION", condition: "pH reaches 5.4" },
          validation: { expectedResult: "Curds mat together" },
        },
      ],
      aging: {
        required: true,
        duration: { min: 3, max: 12, unit: "months" },
        temperature: { value: 13, unit: "C" },
        humidity: "85-90%",
      },
      finalProduct: {
        texture: "Firm, crumbly",
        flavor: "Sharp, tangy",
        moisture: "LOW",
        color: "Pale yellow",
      },
      equipment: {
        required: [{ name: "Large pot" }, { name: "Cheese press" }],
        specialEquipment: [{ name: "pH meter", purpose: "Monitor acid development" }],
      },
      safety: {
        allergens: ["MILK", "LACTOSE"],
        shelfLife: { fresh: "2 weeks", aged: "1 year" },
        storageInstructions: "Wrap in cheese paper, store at 4C",
      },
    };

    const result = OCRSSchema.safeParse(withOptionals);
    expect(result.success).toBe(true);
  });
});
