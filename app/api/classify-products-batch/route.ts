import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ADDITIVES, ALLERGENS, LEGAL_NOTICES } from "@/lib/constants";
import {
  aiBulkClassificationJsonSchema,
  aiBulkClassificationSchema,
  allAdditiveKeysLabel,
  allAllergenKeysLabel,
  allLegalNoticeKeysLabel,
} from "@/lib/ai-schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PRODUCTS_PER_REQUEST = 50;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
};

const toList = (entries: Record<string, string>, transformKey?: (value: string) => string) =>
  Object.entries(entries)
    .map(([key, label]) => `${transformKey ? transformKey(key) : key}: ${label}`)
    .join("\n");

const allergenList = toList(ALLERGENS, (key) => key.toUpperCase());
const additiveList = toList(ADDITIVES);
const legalNoticeList = toList(LEGAL_NOTICES, (key) => key.toUpperCase());

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

export async function POST(request: NextRequest) {
  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ist nicht gesetzt." },
      { status: 500 }
    );
  }

  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`classify-batch:${clientId}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es in Kürze erneut." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { productNames?: unknown };
    const rawNames = Array.isArray(body.productNames) ? body.productNames : [];

    const productNames = rawNames
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length >= 2)
      .slice(0, MAX_PRODUCTS_PER_REQUEST);

    if (productNames.length === 0) {
      return NextResponse.json(
        { error: "Bitte mindestens einen gültigen Produktnamen senden." },
        { status: 400 }
      );
    }

    const numberedList = productNames
      .map((name, index) => `${index + 1}. ${name}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: aiBulkClassificationJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: `
Du bist ein Assistent für Gastronomie-Allergenkennzeichnung nach EU LMIV.
Antworte AUSSCHLIESSLICH als JSON im vorgegebenen Schema.
Nutze nur diese Allergen-Keys (Kleinbuchstaben): ${allAllergenKeysLabel.toLowerCase()}.
Nutze nur diese Zusatzstoff-Keys: ${allAdditiveKeysLabel}.
Nutze nur diese Hinweis-Keys (Kleinbuchstaben): ${allLegalNoticeKeysLabel.toLowerCase()}.

Regeln zur Genauigkeit:
- Schlage nur Kennzeichnungen vor, die aus dem Produktnamen mit hoher Sicherheit ableitbar sind.
- Im Zweifel lieber WENIGER vorschlagen und das Produkt mit "needsReview": true markieren.
- "needsReview": true setzen, wenn der Produktname mehrdeutig ist, übliche Variationen unterschiedliche Allergene/Zusatzstoffe haben können oder der Produktname zu allgemein ist (z.B. "Tee", "Salat", "Suppe").
- "needsReview": false setzen, wenn der Name klar und eindeutig ist (z.B. "Aperol Spritz", "Espresso", "Wiener Schnitzel mit Pommes").

Wichtige Hinweise:
- "Aperol Spritz" enthält in der Regel Farbstoff (1) und Sulfite (l).
- "Lillet"/"Wermut" enthalten Sulfite (l).
- "Tonic Water" enthält chininhaltig (h1).
- "Cola/Energy/Iced Coffee/Espresso/Kaffee" enthält Koffein → h8 (für Kaffeeprodukte) bzw. h7 (für Energy Drinks).
- "Wiener Schnitzel" enthält Gluten (a), Ei (c), Milch (g).
- "Caesar Salad" enthält Gluten (a), Ei (c), Fisch (d) durch Anchovis, Milch (g), Senf (j).
- Reine Spirituosen, stilles Wasser, frischer Espresso ohne Milch haben oft keine Allergene.
- Antworte für jedes Produkt mit exakt dem gleichen Namen wie in der Eingabe.
- Behalte die Reihenfolge der Eingabe.
`,
        },
        {
          role: "user",
          content: `
Allergene (A-N):
${allergenList}

Zusatzstoffe (1-15):
${additiveList}

Rechtlich relevante Hinweise (H1-H9):
${legalNoticeList}

Klassifiziere folgende Produkte:
${numberedList}

Gib für jedes Produkt die wahrscheinlichen Allergene, Zusatzstoffe und Hinweise zurück.
Setze "needsReview": true, wenn die Kennzeichnung nicht eindeutig aus dem Namen ableitbar ist.
`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Leere KI-Antwort.");
    }

    const parsed = aiBulkClassificationSchema.parse(JSON.parse(rawContent));

    const normalizedInput = productNames.map((name) => name.toLowerCase());
    const responseByName = new Map<string, (typeof parsed.products)[number]>();

    parsed.products.forEach((entry) => {
      const key = entry.name.trim().toLowerCase();
      if (!responseByName.has(key)) {
        responseByName.set(key, entry);
      }
    });

    const results = productNames.map((name, index) => {
      const direct = responseByName.get(normalizedInput[index]);
      const fallback = parsed.products[index];
      const source = direct ?? fallback;

      if (!source) {
        return {
          name,
          allergens: [] as string[],
          additives: [] as string[],
          legalNotices: [] as string[],
          needsReview: true,
        };
      }

      return {
        name,
        allergens: Array.from(new Set(source.allergens)),
        additives: Array.from(new Set(source.additives)),
        legalNotices: Array.from(new Set(source.legalNotices)),
        needsReview: source.needsReview,
      };
    });

    return NextResponse.json({ products: results });
  } catch (error) {
    console.error("Fehler in /api/classify-products-batch:", error);
    return NextResponse.json(
      { error: "Die KI-Klassifizierung konnte nicht erzeugt werden." },
      { status: 500 }
    );
  }
}
