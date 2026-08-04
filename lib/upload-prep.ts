"use client";

// Vercel limitiert Serverless Function Bodies auf 4.5 MB. Wir lassen Puffer.
export const MAX_UPLOAD_BYTES = 3.8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;
const MIN_JPEG_QUALITY = 0.4;

export interface PreparedUpload {
  text?: string;
  file?: File;
  originalSizeBytes: number;
  finalSizeBytes: number;
  notice?: string;
  pageCount?: number;
}

export interface RenderedPdfPages {
  files: File[];
  pageCount: number;
  renderedPages: number;
  notice?: string;
}

const blobToFile = (blob: Blob, originalName: string, type: string) => {
  const base = originalName.replace(/\.[^.]+$/, "");
  const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1] ?? "bin";
  return new File([blob], `${base}.${ext}`, { type });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), type, quality)
  );

export async function prepareImageFile(file: File): Promise<PreparedUpload> {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return { file, originalSizeBytes: file.size, finalSizeBytes: file.size };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    MAX_IMAGE_DIMENSION / bitmap.width,
    MAX_IMAGE_DIMENSION / bitmap.height,
    1
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas-Kontext konnte nicht erstellt werden.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.85;
  let blob: Blob | null = null;
  while (quality >= MIN_JPEG_QUALITY) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob) {
      throw new Error("Bild konnte nicht komprimiert werden.");
    }
    if (blob.size <= MAX_UPLOAD_BYTES) {
      break;
    }
    quality -= 0.1;
  }
  if (!blob) {
    throw new Error("Bild konnte nicht komprimiert werden.");
  }

  const compressed = blobToFile(blob, file.name, "image/jpeg");
  return {
    file: compressed,
    originalSizeBytes: file.size,
    finalSizeBytes: compressed.size,
    notice: `Bild wurde von ${(file.size / 1024 / 1024).toFixed(1)} MB auf ${(compressed.size / 1024 / 1024).toFixed(1)} MB komprimiert.`,
  };
}

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfJsPromise: Promise<PdfJsModule> | null = null;

const loadPdfJs = async () => {
  if (typeof window === "undefined") {
    throw new Error("PDF-Verarbeitung nur im Browser verfügbar.");
  }
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    })().catch((error) => {
      pdfJsPromise = null;
      throw error;
    });
  }
  return pdfJsPromise;
};

export async function extractPdfText(file: File): Promise<PreparedUpload> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        pages.push(text);
      }
    }

    const fullText = pages.join("\n\n");
    return {
      text: fullText,
      originalSizeBytes: file.size,
      finalSizeBytes: new Blob([fullText]).size,
      notice: `PDF wurde im Browser ausgelesen (${(file.size / 1024 / 1024).toFixed(1)} MB \u2192 Text).`,
      pageCount: pdf.numPages,
    };
  } finally {
    await pdf.destroy();
  }
}

// Gescannte PDFs enthalten kaum extrahierbaren Text; dann rendern wir die
// Seiten als Bilder und lassen sie direkt von der Vision-Analyse auslesen.
export const isPdfTextSufficient = (text: string, pageCount: number) => {
  const trimmed = text.trim();
  return trimmed.length >= 200 && trimmed.length / Math.max(1, pageCount) >= 50;
};

export const MAX_PDF_RENDER_PAGES = 10;
const PDF_RENDER_TARGET_PX = 2000;

export async function renderPdfPagesToImages(
  file: File,
  maxPages: number = MAX_PDF_RENDER_PAGES
): Promise<RenderedPdfPages> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const pagesToRender = Math.min(pdf.numPages, maxPages);
    const files: File[] = [];
    const baseName = file.name.replace(/\.[^.]+$/, "");

    for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        3,
        PDF_RENDER_TARGET_PX / Math.max(baseViewport.width, baseViewport.height)
      );
      const viewport = page.getViewport({ scale: Math.max(1, scale) });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas-Kontext konnte nicht erstellt werden.");
      }

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
      if (!blob) {
        throw new Error(`PDF-Seite ${pageNumber} konnte nicht gerendert werden.`);
      }

      const pageFile = new File([blob], `${baseName}-seite-${pageNumber}.jpg`, {
        type: "image/jpeg",
      });
      // \u00dcber der Upload-Grenze? Bestehende Kompression wiederverwenden.
      const prepared = await prepareImageFile(pageFile);
      if (prepared.file) {
        files.push(prepared.file);
      }
    }

    return {
      files,
      pageCount: pdf.numPages,
      renderedPages: pagesToRender,
      notice:
        pdf.numPages > pagesToRender
          ? `PDF hat ${pdf.numPages} Seiten \u2013 nur die ersten ${pagesToRender} wurden analysiert.`
          : undefined,
    };
  } finally {
    await pdf.destroy();
  }
}
