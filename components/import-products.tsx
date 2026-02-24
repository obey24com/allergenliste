"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseAdditiveInput, parseAllergenInput } from "@/lib/product-helpers";

interface ImportProductsProps {
  onImport: (products: Product[]) => void;
}

interface ParsedImportResult {
  products: Product[];
  warnings: string[];
}

const NAME_HEADERS = ["name", "produkt", "produktname", "gericht", "speise"];
const ALLERGEN_HEADERS = [
  "allergene",
  "allergen",
  "allergenekuerzel",
  "allergenekürzel",
  "allergenkurzel",
  "allergenkürzel",
  "allergenecodes",
];
const ADDITIVE_HEADERS = [
  "zusatzstoffe",
  "zusatzstoff",
  "zusatzstoffcodes",
  "zusatzstoffkuerzel",
  "zusatzstoffkürzel",
  "zusatzstoffkurzel",
  "additives",
];

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, "");

const toStringValue = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const readField = (row: Record<string, unknown>, allowedHeaders: string[]) => {
  for (const [header, value] of Object.entries(row)) {
    if (allowedHeaders.includes(normalizeHeader(header))) {
      return toStringValue(value);
    }
  }

  return "";
};

const buildProduct = (
  nameInput: string,
  allergensInput: string,
  additivesInput: string,
  rowNumber: number
) => {
  const name = nameInput.trim();
  if (!name) {
    return {
      product: null,
      warnings: [`Zeile ${rowNumber} wurde übersprungen: Produktname fehlt.`],
    };
  }

  const { keys: allergens, invalidTokens: invalidAllergens } =
    parseAllergenInput(allergensInput);
  const { keys: additives, invalidTokens: invalidAdditives } =
    parseAdditiveInput(additivesInput);

  const warnings: string[] = [];

  if (invalidAllergens.length > 0) {
    warnings.push(
      `Zeile ${rowNumber}: Unbekannte Allergene ignoriert (${invalidAllergens.join(", ")}).`
    );
  }

  if (invalidAdditives.length > 0) {
    warnings.push(
      `Zeile ${rowNumber}: Unbekannte Zusatzstoffe ignoriert (${invalidAdditives.join(", ")}).`
    );
  }

  return {
    product: {
      id: crypto.randomUUID(),
      name,
      allergens,
      additives,
    } satisfies Product,
    warnings,
  };
};

const parseHeaderRows = (rows: Record<string, unknown>[]) => {
  const products: Product[] = [];
  const warnings: string[] = [];

  rows.forEach((row, index) => {
    const created = buildProduct(
      readField(row, NAME_HEADERS),
      readField(row, ALLERGEN_HEADERS),
      readField(row, ADDITIVE_HEADERS),
      index + 2
    );

    warnings.push(...created.warnings);
    if (created.product) {
      products.push(created.product);
    }
  });

  return { products, warnings };
};

const looksLikeHeaderRow = (row: string[]) => {
  const normalized = row.map((cell) => normalizeHeader(cell));
  return normalized.some((cell) => NAME_HEADERS.includes(cell));
};

const parseRowsWithoutHeader = (rows: string[][]) => {
  const products: Product[] = [];
  const warnings: string[] = [];

  const hasHeader = rows.length > 0 && looksLikeHeaderRow(rows[0]);
  const rowsToParse = hasHeader ? rows.slice(1) : rows;

  rowsToParse.forEach((row, index) => {
    const rowNumber = hasHeader ? index + 2 : index + 1;
    const created = buildProduct(row[0] ?? "", row[1] ?? "", row[2] ?? "", rowNumber);
    warnings.push(...created.warnings);
    if (created.product) {
      products.push(created.product);
    }
  });

  return { products, warnings };
};

export function ImportProducts({ onImport }: ImportProductsProps) {
  const [open, setOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const visibleWarnings = useMemo(() => warnings.slice(0, 6), [warnings]);

  const applyImportResult = (result: ParsedImportResult) => {
    if (result.products.length > 0) {
      onImport(result.products);
      setStatusMessage(`${result.products.length} Produkte importiert.`);
    } else {
      setStatusMessage("Keine importierbaren Produkte gefunden.");
    }
    setWarnings(result.warnings);
  };

  const handleCSVFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);
    setWarnings([]);

    try {
      const text = await file.text();
      const result = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        applyImportResult({
          products: [],
          warnings: result.errors.map((error) => `CSV-Fehler: ${error.message}`),
        });
      } else {
        applyImportResult(parseHeaderRows(result.data));
      }
    } catch (error) {
      setStatusMessage("Datei konnte nicht importiert werden.");
      setWarnings([`Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`]);
    } finally {
      event.target.value = "";
      setIsImporting(false);
    }
  };

  const handlePasteImport = () => {
    const trimmed = pasteInput.trim();
    if (!trimmed) {
      setStatusMessage("Bitte zuerst Daten einfügen.");
      setWarnings([]);
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);
    setWarnings([]);

    const delimiter = trimmed.includes("\t") ? "\t" : ";";
    const result = Papa.parse<string[]>(trimmed, {
      delimiter,
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      applyImportResult({
        products: [],
        warnings: result.errors.map((error) => `Import-Fehler: ${error.message}`),
      });
      setIsImporting(false);
      return;
    }

    applyImportResult(parseRowsWithoutHeader(result.data));
    setIsImporting(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Produkte importieren</DialogTitle>
            <DialogDescription>
              Importiere mehrere Produkte als CSV oder per Copy-Paste aus Excel/Google
              Sheets.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV-Datei</TabsTrigger>
              <TabsTrigger value="paste">Einfügen</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="space-y-3 pt-2">
              <Label htmlFor="csv-import">
                Erwartete Spalten: Name, Allergene, Zusatzstoffe
              </Label>
              <Input
                id="csv-import"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVFileChange}
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground">
                Mehrfachwerte in einer Zelle mit Komma, Semikolon oder Pipe trennen (z.
                B. A;G oder 1,4).
              </p>
            </TabsContent>
            <TabsContent value="paste" className="space-y-3 pt-2">
              <Label htmlFor="paste-import">
                Zeilenweise einfügen: Name;Allergene;Zusatzstoffe
              </Label>
              <Textarea
                id="paste-import"
                value={pasteInput}
                onChange={(event) => setPasteInput(event.target.value)}
                placeholder={"Wiener Schnitzel;A,C,G;2\nCaesar Salad;A,C,D;1,4"}
                className="min-h-[180px]"
              />
              <Button onClick={handlePasteImport} disabled={isImporting}>
                Text importieren
              </Button>
            </TabsContent>
          </Tabs>

          {statusMessage && (
            <p className="text-sm font-medium text-foreground">{statusMessage}</p>
          )}

          {visibleWarnings.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {visibleWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {warnings.length > visibleWarnings.length && (
                <p>... und {warnings.length - visibleWarnings.length} weitere Hinweise.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
