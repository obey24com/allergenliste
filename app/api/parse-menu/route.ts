import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ADDITIVES, ALLERGENS } from "@/lib/constants";
import {
  aiMenuParseJsonSchema,
  aiMenuParseSchema,
  allAdditiveKeysLabel,
  allAllergenKeysLabel,
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
const MAX_TEXT_LENGTH = 18_000;

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

const normalizeProducts = (
  products: Array<{
    name: string;
    allergens: string[];
    additives: string[];
  }>
) => {
  const seenNames = new Set<string>();
  const normalized = products
    .map((product) => ({
      name: product.name.trim(),
      allergens: Array.from(new Set(product.allergens)),
      additives: Array.from(new Set(product.additives)),
    }))
    .filter((product) => product.name.length > 0)
    .filter((product) => {
      const key = product.name.toLowerCase();
      if (seenNames.has(key)) {
        return false;
      }
      seenNames.add(key);
      return true;
    });

  return normalized;
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
  const rateLimit = checkRateLimit(`parse-menu:${clientId}`, 15, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es gleich erneut." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const rawText = formData.get("text");
    const image = formData.get("image");
    const pdf = formData.get("pdf");

    const textInput = typeof rawText === "string" ? rawText.trim() : "";
    const imageFile = image instanceof File ? image : null;
    const pdfFile = pdf instanceof File ? pdf : null;

    if (!textInput && !imageFile && !pdfFile) {
      return NextResponse.json(
        { error: "Bitte senden Sie Text oder ein Bild." },
        { status: 400 }
      );
    }

    if (pdfFile) {
      return NextResponse.json(
        {
          error:
            "PDF-Dateien können in dieser Umgebung leider nicht analysiert werden. Bitte nutzen Sie stattdessen ein Foto der Speisekarte (JPG/PNG) oder fügen Sie den Text ein.",
        },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    const isTruncated = textInput.length > MAX_TEXT_LENGTH;
    const trimmedText = isTruncated ? textInput.slice(0, MAX_TEXT_LENGTH) : textInput;
    if (isTruncated) {
      warnings.push("Sehr lange Eingabe wurde für die Analyse gekürzt.");
    }

    const instructions = `
Analysiere die Speisekarte und gib eine strukturierte Produktliste zurück.
Regeln:
- Extrahiere nur tatsächliche Speisen/Getränke als Produkte.
- Ignoriere Überschriften, Preise, dekorative Texte, Kategorienamen.
- Verwende nur diese Allergen-Keys: ${allAllergenKeysLabel}
- Verwende nur diese Zusatzstoff-Keys: ${allAdditiveKeysLabel}
- Wenn unsicher: lieber konservative, plausible Vorschläge.

Allergene (A-N):
${allergenList}

Zusatzstoffe (1-10):
${additiveList}
`;

    const userText = `
Eingabetext:
${trimmedText || "Kein zusätzlicher Text übergeben."}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: aiMenuParseJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: instructions,
        },
        imageFile
          ? {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${userText}\nZusätzlich wurde ein Menübild hochgeladen.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${imageFile.type};base64,${Buffer.from(
                      await imageFile.arrayBuffer()
                    ).toString("base64")}`,
                  },
                },
              ],
            }
          : {
              role: "user",
              content: userText,
            },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Leere KI-Antwort.");
    }

    const parsed = aiMenuParseSchema.parse(JSON.parse(rawContent));
    return NextResponse.json({
      products: normalizeProducts(parsed.products),
      warnings: [...warnings, ...parsed.warnings],
    });
  } catch (error) {
    console.error("Fehler in /api/parse-menu:", error);
    return NextResponse.json(
      { error: "Die Speisekarte konnte nicht analysiert werden." },
      { status: 500 }
    );
  }
}
