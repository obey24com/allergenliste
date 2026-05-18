import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { ADDITIVES, ALLERGENS, LEGAL_NOTICES } from "@/lib/constants";
import {
  aiMenuParseJsonSchema,
  aiMenuParseSchema,
  allAdditiveKeysLabel,
  allAllergenKeysLabel,
  allLegalNoticeKeysLabel,
} from "@/lib/ai-schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// OCR plus structured parse can exceed Vercel's default function duration.
export const maxDuration = 60;

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
const MAX_TEXT_LENGTH = 18_000;
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const OCR_MODEL = "gpt-4.1-mini";
const PARSE_MODEL = "gpt-5.4-mini-2026-03-17";
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

// Removes trailing prices, "+X €", parenthesized prices, sizes like "0,33 l",
// and surrounding garbage so we keep only the actual dish/drink name.
const cleanProductName = (raw: string) => {
  let name = raw.normalize("NFKC").replace(/\s+/g, " ").trim();

  // Strip trailing parenthesised price blocks: "(3,40 €)", "(EUR 3.40)".
  name = name.replace(/\s*\((?:€|EUR|CHF|USD|\$)?\s*\d+[.,]?\d*\s*(?:€|EUR|CHF|USD|\$)?\)\s*$/i, "");

  // Strip "+ 1 €" / "+1€ extra" / "+ 0.50 EUR" suffixes (repeatedly).
  while (/\s*[+\-]\s*\d+[.,]?\d*\s*(?:€|EUR|CHF|USD|\$)(?:\s*\w+)?\s*$/i.test(name)) {
    name = name.replace(/\s*[+\-]\s*\d+[.,]?\d*\s*(?:€|EUR|CHF|USD|\$)(?:\s*\w+)?\s*$/i, "");
  }

  // Strip trailing standalone price tokens (e.g. "Cappuccino 3,40 €", "Cola  2.50").
  name = name.replace(/\s*[\u2013\u2014\-:]?\s*\d+[.,]\d{1,2}\s*(?:€|EUR|CHF|USD|\$)?\s*$/i, "");
  name = name.replace(/\s*(?:€|EUR|CHF|USD|\$)\s*\d+[.,]?\d*\s*$/i, "");

  // Strip trailing serving sizes: "0,33 l", "500 ml", "1L".
  name = name.replace(/\s*\d+[.,]?\d*\s*(?:ml|cl|l|g|kg)\s*$/i, "");

  // Strip trailing dot/colon/dash leftovers.
  name = name.replace(/[\s.,:;\-\u2013\u2014]+$/g, "");

  return name.trim();
};

const PRICE_ONLY_RE = /^\s*(?:€|EUR|CHF|USD|\$)?\s*\d+[.,]?\d*\s*(?:€|EUR|CHF|USD|\$|ml|cl|l|g|kg)?\s*$/i;
const ALL_CAPS_HEADER_RE = /^[A-ZÄÖÜ0-9\s&\-\u2013\u2014.!]{4,}$/;

const looksLikeProduct = (name: string) => {
  if (name.length < 2 || name.length > 180) return false;

  // Pure prices / pure numbers / size declarations.
  if (PRICE_ONLY_RE.test(name)) return false;

  // Fragment sentences ending with a colon ("Served with your choice of:").
  if (/[:\u2026]$/.test(name)) return false;

  // Lines that are mostly digits.
  const letterCount = (name.match(/\p{L}/gu) ?? []).length;
  if (letterCount < 2) return false;

  // Section headers in ALL CAPS without lowercase letters and no digits.
  if (ALL_CAPS_HEADER_RE.test(name) && !/\d/.test(name) && name.length < 32) {
    return false;
  }

  return true;
};

const normalizeProducts = (
  products: Array<{
    name: string;
    allergens: string[];
    additives: string[];
    legalNotices: string[];
  }>
) => {
  const seenNames = new Set<string>();
  return products
    .map((product) => ({
      name: cleanProductName(product.name ?? ""),
      allergens: Array.from(new Set(product.allergens)),
      additives: Array.from(new Set(product.additives)),
      legalNotices: Array.from(new Set(product.legalNotices)),
    }))
    .filter((product) => looksLikeProduct(product.name))
    .filter((product) => {
      const key = product.name.toLowerCase();
      if (seenNames.has(key)) {
        return false;
      }
      seenNames.add(key);
      return true;
    });
};

const fileToDataUrl = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
};

const extractMenuTextFromImage = async ({
  openai,
  file,
}: {
  openai: OpenAI;
  file: File;
}) => {
  const fileDataUrl = await fileToDataUrl(file);

  const response = await openai.responses.create({
    model: OCR_MODEL,
    max_output_tokens: 4_000,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extrahiere den Speisekarten-Inhalt möglichst vollständig als reinen Fließtext.
- Liste Positionen zeilenweise.
- Behalte Produktnamen, Zutatenhinweise und Kennzeichnungen bei.
- Ignoriere dekorative Elemente.
- Antworte nur mit dem extrahierten Text, ohne JSON, ohne Erklärungen.`,
          },
          {
            type: "input_image",
            image_url: fileDataUrl,
            detail: "high",
          },
        ],
      },
    ],
  });

  return response.output_text.trim();
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

    const textInput = typeof rawText === "string" ? rawText.trim() : "";
    const imageFile = image instanceof File && image.size > 0 ? image : null;

    if (!textInput && !imageFile) {
      return NextResponse.json(
        { error: "Bitte senden Sie Text oder laden Sie ein Bild hoch." },
        { status: 400 }
      );
    }

    if (imageFile && !SUPPORTED_IMAGE_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        {
          error:
            "Nicht unterstütztes Bildformat. Bitte PNG, JPG/JPEG oder WEBP verwenden.",
        },
        { status: 400 }
      );
    }

    if (imageFile && imageFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "Bild ist zu groß. Bitte maximal 4 MB hochladen.",
        },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    let combinedText = textInput;

    if (imageFile) {
      const extractedText = await extractMenuTextFromImage({
        openai,
        file: imageFile,
      });

      if (extractedText) {
        combinedText = [textInput, extractedText].filter(Boolean).join("\n\n");
        warnings.push("Bild wurde per OCR analysiert.");
      } else if (!textInput) {
        return NextResponse.json(
          {
            error:
              "Kein lesbarer Text im Bild gefunden. Bitte besseres Bild verwenden oder Text einfügen.",
          },
          { status: 400 }
        );
      }
    }

    const isTruncated = combinedText.length > MAX_TEXT_LENGTH;
    const trimmedText = isTruncated ? combinedText.slice(0, MAX_TEXT_LENGTH) : combinedText;
    if (isTruncated) {
      warnings.push("Sehr lange Eingabe wurde für die Analyse gekürzt.");
    }

    const instructions = `
Analysiere die Speisekarte und gib eine strukturierte Produktliste zurück.

PRODUKT-DEFINITION (sehr strikt):
- Ein "Produkt" ist AUSSCHLIESSLICH ein konkret bestellbares Gericht oder Getränk.
- Es muss einen klaren Eigennamen haben (z.B. "Wiener Schnitzel", "Cappuccino", "Caesar Salad").

NICHT als Produkt aufnehmen (immer komplett ignorieren):
- Reine Preise oder Preiszeilen (z.B. "3,40 €", "11,90 €", "EUR 4.50", "+1€ extra").
- Kategorie- und Sektions-Überschriften (z.B. "Coffee & More", "Hauptspeisen", "Getränke", "Beilagen", "FOR THE TABLE").
- Beschreibungs- oder Satzfragmente, besonders solche mit Doppelpunkt am Ende (z.B. "Served with your choice of:", "Mit folgenden Beilagen:", "Auf Wunsch mit:").
- Mengen-/Größen-Angaben allein (z.B. "0,33 l", "500 ml", "kleine Portion").
- Allergen- oder Zusatzstoff-Legenden (z.B. "A = Glutenhaltiges Getreide").
- Öffnungszeiten, Adressen, Telefonnummern, rechtliche Hinweise, Werbetexte, "Vielen Dank ...".
- Reine Zutaten-Auflistungen, die nicht eigenständig bestellbar sind.

NAMENS-BEREINIGUNG (zwingend vor Ausgabe):
- Entferne aus dem Produktnamen alle Preise, Währungssymbole, "+X €"-Aufpreise, Größenangaben (ml, cl, l, g, kg).
- Behalte aber Produkt-Varianten wie "Cappuccino groß" oder "Pistachio Cream" bei (ohne den Preis-Zusatz).
- Beispiel: "Pistachio Cream +1€ extra"  ->  "Pistachio Cream".
- Beispiel: "Cappuccino  3,40 €"  ->  "Cappuccino".
- Beispiel: "Coca Cola 0,33l  3,20"  ->  "Coca Cola".

ZUSATZSTOFFE / ALLERGENE / HINWEISE:
- Verwende ausschliesslich diese Allergen-Keys: ${allAllergenKeysLabel}
- Verwende ausschliesslich diese Zusatzstoff-Keys: ${allAdditiveKeysLabel}
- Verwende ausschliesslich diese Hinweis-Keys: ${allLegalNoticeKeysLabel}
- Weise einen Code nur dann zu, wenn er im Speisekartentext explizit beim Produkt angegeben ist (z.B. "Schnitzel (A,C,G)") oder unzweifelhaft aus der Produktbeschreibung folgt.
- Im Zweifel lieber leer lassen als raten.

Allergene (A-N):
${allergenList}

Zusatzstoffe (1-15):
${additiveList}

Rechtlich relevante Hinweise (H1-H9):
${legalNoticeList}
`;

    const userText = `
Eingabetext:
${trimmedText || "Kein zusätzlicher Text übergeben."}
`;

    const completion = await openai.chat.completions.create({
      model: PARSE_MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 16_000,
      response_format: {
        type: "json_schema",
        json_schema: aiMenuParseJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: instructions,
        },
        {
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
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Die Speisekarte konnte nicht analysiert werden: ${message}` },
      { status: 500 }
    );
  }
}
