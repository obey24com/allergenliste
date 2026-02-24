import { ADDITIVES, ALLERGENS } from "@/lib/constants";

export type ExportMode = "cleartext" | "codes";

const normalizeValue = (value: string) => value.trim().toLowerCase();

const splitTokenList = (value: string) =>
  value
    .split(/[;,|]/)
    .map((token) => token.trim())
    .filter(Boolean);

const uniqueValues = <T,>(values: T[]) => Array.from(new Set(values));

export const ALLERGEN_ENTRIES = Object.entries(ALLERGENS);
export const ADDITIVE_ENTRIES = Object.entries(ADDITIVES);

export const toAllergenCode = (key: string) => key.toUpperCase();
export const toAdditiveCode = (key: string) => key;

export const allergenLabelFromKey = (key: string) =>
  ALLERGENS[key as keyof typeof ALLERGENS] ?? key;

export const additiveLabelFromKey = (key: string) =>
  ADDITIVES[key as keyof typeof ADDITIVES] ?? key;

export const formatAllergenValues = (keys: string[], mode: ExportMode) =>
  keys
    .map((key) =>
      mode === "codes" ? toAllergenCode(key) : allergenLabelFromKey(key)
    )
    .join(", ");

export const formatAdditiveValues = (keys: string[], mode: ExportMode) =>
  keys
    .map((key) => (mode === "codes" ? toAdditiveCode(key) : additiveLabelFromKey(key)))
    .join(", ");

const resolveAllergenToken = (token: string): string | null => {
  const normalized = normalizeValue(token);
  if (!normalized) {
    return null;
  }

  const potentialCode = normalized.replace(/[^a-z]/g, "");
  if (potentialCode.length === 1 && potentialCode in ALLERGENS) {
    return potentialCode;
  }

  const labelEntry = ALLERGEN_ENTRIES.find(
    ([, label]) => normalizeValue(label) === normalized
  );
  return labelEntry?.[0] ?? null;
};

const resolveAdditiveToken = (token: string): string | null => {
  const normalized = normalizeValue(token);
  if (!normalized) {
    return null;
  }

  const numericCandidate = normalized.replace(/[^\d]/g, "");
  if (numericCandidate.length > 0) {
    const numeric = String(Number(numericCandidate));
    if (numeric in ADDITIVES) {
      return numeric;
    }
  }

  const labelEntry = ADDITIVE_ENTRIES.find(
    ([, label]) => normalizeValue(label) === normalized
  );
  return labelEntry?.[0] ?? null;
};

export const parseAllergenInput = (value: string) => {
  const keys: string[] = [];
  const invalidTokens: string[] = [];

  splitTokenList(value).forEach((token) => {
    const resolved = resolveAllergenToken(token);
    if (resolved) {
      keys.push(resolved);
    } else {
      invalidTokens.push(token);
    }
  });

  return {
    keys: uniqueValues(keys),
    invalidTokens: uniqueValues(invalidTokens),
  };
};

export const parseAdditiveInput = (value: string) => {
  const keys: string[] = [];
  const invalidTokens: string[] = [];

  splitTokenList(value).forEach((token) => {
    const resolved = resolveAdditiveToken(token);
    if (resolved) {
      keys.push(resolved);
    } else {
      invalidTokens.push(token);
    }
  });

  return {
    keys: uniqueValues(keys),
    invalidTokens: uniqueValues(invalidTokens),
  };
};

export const hasMissingDeclarations = (allergens: string[], additives: string[]) =>
  allergens.length === 0 && additives.length === 0;
