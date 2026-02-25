import { z } from "zod";

export const ALLERGEN_KEY_VALUES = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
] as const;

export const ADDITIVE_KEY_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEY_VALUES)[number];
export type AdditiveKey = (typeof ADDITIVE_KEY_VALUES)[number];

export const allAllergenKeysLabel = ALLERGEN_KEY_VALUES.map((value) => value.toUpperCase()).join(", ");
export const allAdditiveKeysLabel = ADDITIVE_KEY_VALUES.join(", ");

const allergenKeySchema = z.enum(ALLERGEN_KEY_VALUES);
const additiveKeySchema = z.enum(ADDITIVE_KEY_VALUES);

export const aiAllergenSuggestionSchema = z.object({
  allergens: z.array(allergenKeySchema).default([]),
  additives: z.array(additiveKeySchema).default([]),
  reasoning: z.string().min(1).max(800),
});

export const aiMenuProductSchema = z.object({
  name: z.string().min(1).max(180),
  allergens: z.array(allergenKeySchema).default([]),
  additives: z.array(additiveKeySchema).default([]),
});

export const aiMenuParseSchema = z.object({
  products: z.array(aiMenuProductSchema).max(300).default([]),
  warnings: z.array(z.string()).max(50).default([]),
});

export const aiAllergenSuggestionJsonSchema = {
  name: "allergen_suggestion",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["allergens", "additives", "reasoning"],
    properties: {
      allergens: {
        type: "array",
        items: { type: "string", enum: [...ALLERGEN_KEY_VALUES] },
      },
      additives: {
        type: "array",
        items: { type: "string", enum: [...ADDITIVE_KEY_VALUES] },
      },
      reasoning: {
        type: "string",
        minLength: 1,
        maxLength: 800,
      },
    },
  },
} as const;

export const aiMenuParseJsonSchema = {
  name: "menu_parse_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["products", "warnings"],
    properties: {
      products: {
        type: "array",
        maxItems: 300,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "allergens", "additives"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 180 },
            allergens: {
              type: "array",
              items: { type: "string", enum: [...ALLERGEN_KEY_VALUES] },
            },
            additives: {
              type: "array",
              items: { type: "string", enum: [...ADDITIVE_KEY_VALUES] },
            },
          },
        },
      },
      warnings: {
        type: "array",
        maxItems: 50,
        items: { type: "string" },
      },
    },
  },
} as const;
