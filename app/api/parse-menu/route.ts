import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const parsePdfToText = async (pdfFile: File) => {
  const parser = new PDFParse({
    data: await pdfFile.arrayBuffer(),
  });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
};

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
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
        { error: "Bitte senden Sie Text, ein Bild oder eine PDF." },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    let extractedPdfText = "";

    if (pdfFile) {
      extractedPdfText = await parsePdfToText(pdfFile);
      if (!extractedPdfText) {
        warnings.push("Die PDF enthielt keinen auslesbaren Text.");
      }
    }

    const combinedText = [textInput, extractedPdfText].filter(Boolean).join("\n\n");
    const isTruncated = combinedText.length > MAX_TEXT_LENGTH;
    const trimmedText = isTruncated ? combinedText.slice(0, MAX_TEXT_LENGTH) : combinedText;
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
