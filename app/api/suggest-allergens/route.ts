import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ADDITIVES, ALLERGENS, LEGAL_NOTICES } from "@/lib/constants";
import {
  aiAllergenSuggestionJsonSchema,
  aiAllergenSuggestionSchema,
  allAdditiveKeysLabel,
  allAllergenKeysLabel,
  allLegalNoticeKeysLabel,
} from "@/lib/ai-schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const rateLimit = checkRateLimit(`suggest:${clientId}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Zu viele Anfragen. Bitte versuchen Sie es in Kürze erneut.",
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { productName?: string };
    const productName = body.productName?.trim() ?? "";

    if (productName.length < 2) {
      return NextResponse.json(
        { error: "Bitte einen gültigen Produktnamen senden." },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: aiAllergenSuggestionJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: `
Du bist ein Assistent für Gastronomie-Allergenkennzeichnung nach EU LMIV.
Antworte AUSSCHLIESSLICH als JSON im vorgegebenen Schema.
Nutze nur diese Allergen-Keys: ${allAllergenKeysLabel}.
Nutze nur diese Zusatzstoff-Keys: ${allAdditiveKeysLabel}.
Nutze nur diese Hinweis-Keys: ${allLegalNoticeKeysLabel}.
Schlage Hinweise nur dann vor, wenn sie aus dem Produktnamen sehr naheliegend sind.
Wenn unsicher, gib lieber einen vorsichtigen Hinweis in reasoning und schlage wahrscheinliche Treffer vor.
`,
        },
        {
          role: "user",
          content: `
Produktname: ${productName}

Allergene (A-N):
${allergenList}

Zusatzstoffe (1-15):
${additiveList}

Rechtlich relevante Hinweise (H1-H9):
${legalNoticeList}

Gib wahrscheinliche Allergene, Zusatzstoffe und Hinweise für das Produkt zurück.
`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Leere KI-Antwort.");
    }

    const parsed = aiAllergenSuggestionSchema.parse(JSON.parse(rawContent));
    return NextResponse.json({
      allergens: Array.from(new Set(parsed.allergens)),
      additives: Array.from(new Set(parsed.additives)),
      legalNotices: Array.from(new Set(parsed.legalNotices)),
      reasoning: parsed.reasoning,
    });
  } catch (error) {
    console.error("Fehler in /api/suggest-allergens:", error);
    return NextResponse.json(
      {
        error: "Die KI-Vorschläge konnten nicht erzeugt werden.",
      },
      { status: 500 }
    );
  }
}
