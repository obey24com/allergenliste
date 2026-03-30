import { join } from "path";
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
// PDF OCR plus the follow-up structured parse can exceed Vercel's default function duration.
export const maxDuration = 60;

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

class DOMMatrixStub {
  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  translate() {
    return this;
  }

  scale() {
    return this;
  }

  rotate() {
    return this;
  }

  invertSelf() {
    return this;
  }
}

class ImageDataStub {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth?: Uint8ClampedArray | number, width?: number, height?: number) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth;
      this.width = width ?? 0;
      this.height = height ?? 0;
      return;
    }

    this.width = typeof dataOrWidth === "number" ? dataOrWidth : width ?? 0;
    this.height = typeof dataOrWidth === "number" ? width ?? 0 : height ?? 0;
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }
}

class Path2DStub {
  addPath() {}
  closePath() {}
  lineTo() {}
  moveTo() {}
  rect() {}
}

const PDFJS_STANDARD_FONT_DATA_URL = (() => {
  const fontDirectory = join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts");

  return fontDirectory.endsWith("/") ? fontDirectory : `${fontDirectory}/`;
})();

const installPdfJsGlobals = () => {
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = DOMMatrixStub as typeof DOMMatrix;
  }

  if (!globalThis.ImageData) {
    globalThis.ImageData = ImageDataStub as typeof ImageData;
  }

  if (!globalThis.Path2D) {
    globalThis.Path2D = Path2DStub as typeof Path2D;
  }
};

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

const loadPdfJsModule = async () => {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = (async () => {
      installPdfJsGlobals();

      const originalGetBuiltinModule = process.getBuiltinModule;
      if (!originalGetBuiltinModule) {
        return import("pdfjs-dist/legacy/build/pdf.mjs");
      }

      const readBuiltinModule = (name: string) => originalGetBuiltinModule.call(process, name);

      process.getBuiltinModule = ((name: string) => {
        if (name === "module") {
          const moduleBuiltin = readBuiltinModule("module") as {
            createRequire: (specifier: string) => (id: string) => unknown;
          };

          return {
            createRequire(specifier: string) {
              const nativeRequire = moduleBuiltin.createRequire(specifier);

              return (id: string) => {
                if (id === "@napi-rs/canvas") {
                  return {
                    DOMMatrix: DOMMatrixStub,
                    ImageData: ImageDataStub,
                    Path2D: Path2DStub,
                    createCanvas() {
                      throw new Error(
                        "Canvas rendering is not supported during PDF text extraction."
                      );
                    },
                  };
                }

                return nativeRequire(id);
              };
            },
          };
        }

        return readBuiltinModule(name);
      }) as typeof process.getBuiltinModule;

      try {
        return await import("pdfjs-dist/legacy/build/pdf.mjs");
      } finally {
        process.getBuiltinModule = originalGetBuiltinModule;
      }
    })().catch((error) => {
      pdfJsModulePromise = null;
      throw error;
    });
  }

  return pdfJsModulePromise;
};

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
    legalNotices: string[];
  }>
) => {
  const seenNames = new Set<string>();
  const normalized = products
    .map((product) => ({
      name: product.name.trim(),
      allergens: Array.from(new Set(product.allergens)),
      additives: Array.from(new Set(product.additives)),
      legalNotices: Array.from(new Set(product.legalNotices)),
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

const extractMenuTextFromImage = async ({
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

  content.push({
    type: "input_image",
    image_url: fileDataUrl,
    detail: "high",
  });

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

const extractMenuTextFromPdf = async (file: File) => {
  const { getDocument } = await loadPdfJsModule();
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }

    return pages.join("\n\n");
  } finally {
    await pdf.destroy();
  }
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
      const extractedText = SUPPORTED_PDF_TYPES.has(uploadedFile.type)
        ? await extractMenuTextFromPdf(uploadedFile)
        : await extractMenuTextFromImage({
            openai,
            file: uploadedFile,
          });

      if (extractedText) {
        combinedText = [textInput, extractedText].filter(Boolean).join("\n\n");
        warnings.push(
          SUPPORTED_PDF_TYPES.has(uploadedFile.type)
            ? "PDF-Text wurde direkt aus der Datei extrahiert."
            : "Bild wurde per OCR analysiert."
        );
      } else if (!textInput) {
        return NextResponse.json(
          {
            error: SUPPORTED_PDF_TYPES.has(uploadedFile.type)
              ? "Dieses PDF enthält keinen eingebetteten Text. Bitte Text einfügen oder die relevanten Seiten als Bild hochladen."
              : "Kein lesbarer Text im Bild gefunden. Bitte besseres Bild verwenden oder Text einfügen.",
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
- Verwende nur diese Hinweis-Keys: ${allLegalNoticeKeysLabel}
- Weise Hinweise nur zu, wenn sie im Text explizit genannt sind oder aus dem Produkt eindeutig folgen.
- Wenn unsicher: lieber konservative, plausible Vorschläge.

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
