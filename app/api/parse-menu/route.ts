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
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const OCR_MODEL = "gpt-4.1-mini";
const PARSE_MODEL = "gpt-5.2";
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SUPPORTED_PDF_TYPES = new Set(["application/pdf"]);

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

const fileToDataUrl = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
};

const extractMenuTextFromFile = async ({
  openai,
  file,
}: {
  openai: OpenAI;
  file: File;
}) => {
  const fileDataUrl = await fileToDataUrl(file);

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
    | { type: "input_file"; filename: string; file_data: string }
  > = [
    {
      type: "input_text",
      text: `Extrahiere den Speisekarten-Inhalt möglichst vollständig als reinen Fließtext.
- Liste Positionen zeilenweise.
- Behalte Produktnamen, Zutatenhinweise und Kennzeichnungen bei.
- Ignoriere dekorative Elemente.
- Antworte nur mit dem extrahierten Text, ohne JSON, ohne Erklärungen.`,
    },
  ];

  if (SUPPORTED_PDF_TYPES.has(file.type)) {
    content.push({
      type: "input_file",
      filename: file.name || "menu.pdf",
      file_data: fileDataUrl,
    });
  } else {
    content.push({
      type: "input_image",
      image_url: fileDataUrl,
      detail: "high",
    });
  }

  const response = await openai.responses.create({
    model: OCR_MODEL,
    max_output_tokens: 4_000,
    input: [
      {
        role: "user",
        content,
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
    const pdf = formData.get("pdf");

    const textInput = typeof rawText === "string" ? rawText.trim() : "";
    const imageFile = image instanceof File && image.size > 0 ? image : null;
    const pdfFile = pdf instanceof File && pdf.size > 0 ? pdf : null;
    const uploadedFile = imageFile ?? pdfFile;

    if (!textInput && !uploadedFile) {
      return NextResponse.json(
        { error: "Bitte senden Sie Text oder laden Sie ein Bild/PDF hoch." },
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

    if (pdfFile && !SUPPORTED_PDF_TYPES.has(pdfFile.type)) {
      return NextResponse.json(
        {
          error: "Bitte eine gültige PDF-Datei hochladen.",
        },
        { status: 400 }
      );
    }

    if (uploadedFile && uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "Datei ist zu groß. Bitte maximal 12 MB hochladen.",
        },
        { status: 400 }
      );
    }

    const warnings: string[] = [];
    let combinedText = textInput;

    if (uploadedFile) {
      const extractedText = await extractMenuTextFromFile({
        openai,
        file: uploadedFile,
      });

      if (extractedText) {
        combinedText = [textInput, extractedText].filter(Boolean).join("\n\n");
        warnings.push(
          SUPPORTED_PDF_TYPES.has(uploadedFile.type)
            ? "PDF wurde per OCR analysiert."
            : "Bild wurde per OCR analysiert."
        );
      } else if (!textInput) {
        return NextResponse.json(
          {
            error:
              "Kein lesbarer Text in der Datei gefunden. Bitte besseres Bild/PDF verwenden oder Text einfügen.",
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
      model: PARSE_MODEL,
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
