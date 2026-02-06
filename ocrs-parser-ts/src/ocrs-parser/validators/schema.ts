import { z } from "zod";

const CheeseStyle = z.enum([
  "FRESH",
  "SOFT",
  "SEMI_SOFT",
  "SEMI_HARD",
  "HARD",
  "BLUE",
  "BRINED",
]);

const MilkType = z.enum(["COW", "GOAT", "SHEEP", "BUFFALO", "MIXED"]);

const Difficulty = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);

const IngredientType = z.enum([
  "PRIMARY",
  "CULTURE",
  "COAGULANT",
  "ADDITIVE",
  "SEASONING",
  "OTHER",
]);

const StepCategory = z.enum([
  "HEATING",
  "COAGULATION",
  "CUTTING",
  "DRAINING",
  "SALTING",
  "PRESSING",
  "AGING",
  "OTHER",
]);

const DurationType = z.enum(["FIXED", "UNTIL_CONDITION", "RANGE"]);

const TempUnit = z.enum(["C", "F"]);

const BatchUnit = z.enum(["liters", "gallons"]);

const YieldUnit = z.enum(["kg", "lbs", "grams", "oz"]);

const DurationUnit = z.enum(["seconds", "minutes", "hours"]);

const AgingDurationUnit = z.enum(["days", "weeks", "months"]);

const SourceType = z.enum([
  "BOOK",
  "WEBSITE",
  "ORIGINAL",
  "TRADITIONAL",
  "COURSE",
  "OTHER",
]);

const Allergen = z.enum(["MILK", "LACTOSE", "NUTS", "SOY", "GLUTEN", "EGGS"]);

const Moisture = z.enum(["HIGH", "MEDIUM", "LOW"]);

const BatchSizeSchema = z.object({
  milkVolume: z.number(),
  unit: BatchUnit,
});

const YieldSchema = z.object({
  amount: z.number(),
  unit: YieldUnit,
});

const SourceSchema = z.object({
  type: SourceType,
  reference: z.string().optional(),
});

const RecipeSchema = z.object({
  name: z.string(),
  style: CheeseStyle,
  milkType: MilkType,
  origin: z.string().optional(),
  difficulty: Difficulty,
  batchSize: BatchSizeSchema,
  yield: YieldSchema.optional(),
  totalTime: z.number().int().optional(),
  prepTime: z.number().int().optional(),
  source: SourceSchema.optional(),
});

const IngredientSchema = z.object({
  name: z.string(),
  type: IngredientType,
  amount: z.number(),
  unit: z.string(),
  preparation: z.string().optional(),
});

const TemperatureSchema = z.object({
  target: z.number(),
  unit: TempUnit,
});

const DurationSchema = z.object({
  type: DurationType,
  value: z.number().int().optional(),
  unit: DurationUnit.optional(),
  condition: z.string().optional(),
});

const ValidationSchema = z.object({
  expectedResult: z.string().optional(),
});

const StepSchema = z.object({
  stepNumber: z.number().int(),
  title: z.string(),
  category: StepCategory,
  instructions: z.string(),
  temperature: TemperatureSchema.optional(),
  ph: z.number().optional(),
  duration: DurationSchema.optional(),
  validation: ValidationSchema.optional(),
});

const AgingDurationSchema = z.object({
  min: z.number().int(),
  max: z.number().int().optional(),
  unit: AgingDurationUnit,
});

const AgingTemperatureSchema = z.object({
  value: z.number(),
  unit: TempUnit,
});

const AgingSchema = z.object({
  required: z.boolean(),
  duration: AgingDurationSchema.optional(),
  temperature: AgingTemperatureSchema.optional(),
  humidity: z.string().optional(),
});

const FinalProductSchema = z.object({
  texture: z.string().optional(),
  flavor: z.string().optional(),
  moisture: Moisture.optional(),
  color: z.string().optional(),
});

const EquipmentItemSchema = z.object({
  name: z.string(),
});

const SpecialEquipmentSchema = z.object({
  name: z.string(),
  purpose: z.string().optional(),
  alternatives: z.string().optional(),
});

const EquipmentSchema = z.object({
  required: z.array(EquipmentItemSchema).optional(),
  specialEquipment: z.array(SpecialEquipmentSchema).optional(),
});

const ShelfLifeSchema = z.object({
  fresh: z.string().optional(),
  aged: z.string().optional(),
});

const SafetySchema = z.object({
  allergens: z.array(Allergen).optional(),
  shelfLife: ShelfLifeSchema.optional(),
  storageInstructions: z.string().optional(),
});

export const OCRSSchema = z.object({
  spec: z.literal("OCRS/1.0"),
  recipe: RecipeSchema,
  ingredients: z.array(IngredientSchema),
  steps: z.array(StepSchema),
  aging: AgingSchema.optional(),
  finalProduct: FinalProductSchema.optional(),
  equipment: EquipmentSchema.optional(),
  safety: SafetySchema.optional(),
});

export type OCRSRecipe = z.infer<typeof OCRSSchema>;
