"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { FileDown, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADDITIVE_ENTRIES,
  ALLERGEN_ENTRIES,
  ExportMode,
  formatAdditiveValues,
  formatAllergenValues,
  hasMissingDeclarations,
} from "@/lib/product-helpers";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExportButtonsProps {
  products: Product[];
  logoUrl: string | null;
}

type PdfImageFormat = "PNG" | "JPEG" | "WEBP";

const exportVersion = "1.0";

const getImageFormat = (dataUrl: string): PdfImageFormat | null => {
  const mimeType = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1];

  switch (mimeType) {
    case "image/png":
      return "PNG";
    case "image/jpeg":
    case "image/jpg":
      return "JPEG";
    case "image/webp":
      return "WEBP";
    default:
      return null;
  }
};

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });

const toPdfImage = async (source: string) => {
  const image = await loadImage(source);
  let dataUrl = source;
  let format = getImageFormat(source);

  if (!format) {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas-Kontext konnte nicht erstellt werden.");
    }
    context.drawImage(image, 0, 0);
    dataUrl = canvas.toDataURL("image/png");
    format = "PNG";
  }

  return {
    dataUrl,
    format,
    width: image.width,
    height: image.height,
  };
};

const getExportTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString("de-DE");
  const time = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
};

export function ExportButtons({ products, logoUrl }: ExportButtonsProps) {
  const [exportMode, setExportMode] = useState<ExportMode>("cleartext");
  const [isCsvExporting, setIsCsvExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [showMissingDeclarationsDialog, setShowMissingDeclarationsDialog] =
    useState(false);

  const hasProductsWithMissingDeclarations = useMemo(
    () =>
      products.some((product) =>
        hasMissingDeclarations(product.allergens, product.additives)
      ),
    [products]
  );

  const handleCSVExport = async () => {
    setIsCsvExporting(true);
    try {
      const data = products.map((product) => ({
        Name: product.name,
        Allergene: formatAllergenValues(product.allergens, exportMode),
        Zusatzstoffe: formatAdditiveValues(product.additives, exportMode),
      }));

      if (exportMode === "codes") {
        data.push({ Name: "", Allergene: "", Zusatzstoffe: "" });
        data.push({
          Name: "Legende Allergene",
          Allergene: ALLERGEN_ENTRIES.map(([key, label]) => `${key.toUpperCase()}=${label}`).join(
            " | "
          ),
          Zusatzstoffe: "",
        });
        data.push({
          Name: "Legende Zusatzstoffe",
          Allergene: "",
          Zusatzstoffe: ADDITIVE_ENTRIES.map(([key, label]) => `${key}=${label}`).join(" | "),
        });
      }

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "allergenliste.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "CSV exportiert",
        description: "Die CSV-Datei wurde heruntergeladen.",
      });
    } catch (error) {
      console.error("CSV-Export fehlgeschlagen:", error);
      toast({
        title: "CSV-Export fehlgeschlagen",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsCsvExporting(false);
    }
  };

  const performPDFExport = async () => {
    setIsPdfExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const exportTimestamp = getExportTimestamp();
      let startY = 16;

      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text("Allergen- und Zusatzstoffliste", pageWidth / 2, startY, {
        align: "center",
      });
      startY += 6;

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Erstellt am: ${exportTimestamp} | Modus: ${
          exportMode === "cleartext" ? "Klartext" : "Kürzel"
        } | Version: ${exportVersion}`,
        pageWidth / 2,
        startY,
        { align: "center" }
      );
      startY += 8;

      if (logoUrl) {
        try {
          const image = await toPdfImage(logoUrl);
          const aspectRatio = image.width / image.height;
          const maxWidth = 50;
          const width = Math.min(maxWidth, image.width);
          const height = width / aspectRatio;

          doc.addImage(
            image.dataUrl,
            image.format,
            (pageWidth - width) / 2,
            startY,
            width,
            height
          );
          startY += height + 8;
        } catch (error) {
          console.error("Logo konnte nicht in PDF übernommen werden:", error);
        }
      }

      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(
        "Lebensmittel/Speisen sind mit nachfolgenden Zusatzstoffen und Allergenen hergestellt:",
        pageWidth / 2,
        startY,
        { align: "center" }
      );
      startY += 6;

      const tableData = products.map((product) => [
        product.name,
        formatAllergenValues(product.allergens, exportMode) || "Keine Angabe",
        formatAdditiveValues(product.additives, exportMode) || "Keine Angabe",
      ]);

      autoTable(doc, {
        head: [
          [
            "Name",
            exportMode === "codes" ? "Allergene (A-N)" : "Allergene",
            exportMode === "codes" ? "Zusatzstoffe (1-10)" : "Zusatzstoffe",
          ],
        ],
        body: tableData,
        startY: startY + 5,
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [71, 85, 105],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        theme: "grid",
        margin: { left: 14, right: 14 },
      });

      let legendStartY =
        (
          doc as jsPDF & {
            lastAutoTable?: {
              finalY: number;
            };
          }
        ).lastAutoTable?.finalY ?? startY + 30;

      if (exportMode === "codes") {
        legendStartY += 8;
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(11);
        doc.text("Legende", 14, legendStartY);

        autoTable(doc, {
          head: [["Allergen-Code", "Bedeutung"]],
          body: Object.entries(ALLERGENS).map(([key, label]) => [key.toUpperCase(), label]),
          startY: legendStartY + 3,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });

        legendStartY =
          (
            doc as jsPDF & {
              lastAutoTable?: {
                finalY: number;
              };
            }
          ).lastAutoTable?.finalY ?? legendStartY + 20;

        autoTable(doc, {
          head: [["Zusatzstoff-Code", "Bedeutung"]],
          body: Object.entries(ADDITIVES).map(([key, label]) => [key, label]),
          startY: legendStartY + 5,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });
      }

      doc.save("allergenliste.pdf");
      toast({
        title: "PDF exportiert",
        description: "Die PDF-Datei wurde heruntergeladen.",
      });
    } catch (error) {
      console.error("PDF-Export fehlgeschlagen:", error);
      toast({
        title: "PDF-Export fehlgeschlagen",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handlePDFExport = () => {
    if (hasProductsWithMissingDeclarations) {
      setShowMissingDeclarationsDialog(true);
      return;
    }

    void performPDFExport();
  };

  const isExporting = isCsvExporting || isPdfExporting;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={exportMode} onValueChange={(value) => setExportMode(value as ExportMode)}>
        <SelectTrigger className="h-9 w-[170px]" disabled={isExporting}>
          <SelectValue placeholder="Exportmodus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cleartext">Klartext</SelectItem>
          <SelectItem value="codes">Kürzel + Legende</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleCSVExport()}
        disabled={products.length === 0 || isExporting}
      >
        {isCsvExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        {isCsvExporting ? "Exportiere..." : "CSV Export"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        disabled={products.length === 0 || isExporting}
      >
        {isPdfExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        {isPdfExporting ? "Exportiere..." : "PDF Export"}
      </Button>
      {hasProductsWithMissingDeclarations && (
        <p className="basis-full text-right text-xs text-amber-700">
          Hinweis: Mindestens ein Produkt hat noch keine Kennzeichnung.
        </p>
      )}
      </div>

      <AlertDialog
        open={showMissingDeclarationsDialog}
        onOpenChange={setShowMissingDeclarationsDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trotzdem exportieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Mindestens ein Produkt hat keine Allergene oder Zusatzstoffe. Sie können den
              Export trotzdem fortsetzen und die Liste später ergänzen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void performPDFExport()}>
              Trotzdem exportieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}