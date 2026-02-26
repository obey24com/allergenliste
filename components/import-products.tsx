"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Product } from "@/types/product";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ALLERGENS, ADDITIVES } from "@/lib/constants";
import { parseAdditiveInput, parseAllergenInput } from "@/lib/product-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ImportProductsProps {
  onImport: (products: Product[]) => void;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
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

const ALLERGEN_OPTIONS = Object.entries(ALLERGENS);
const ADDITIVE_OPTIONS = Object.entries(ADDITIVES);
const ALLERGEN_LABELS = new Map(ALLERGEN_OPTIONS);
const ADDITIVE_LABELS = new Map(ADDITIVE_OPTIONS);

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, "");

const toStringValue = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const sortedUnique = (values: string[]) => Array.from(new Set(values)).sort();

const summarizeSelection = (
  selectedKeys: string[],
  labelsByKey: Map<string, string>,
  transformKey: (value: string) => string = (value) => value
) => {
  if (selectedKeys.length === 0) {
    return "Keine";
  }

  const mapped = selectedKeys.map((key) => {
    const label = labelsByKey.get(key);
    const renderedKey = transformKey(key);
    return label ? `${renderedKey} (${label})` : renderedKey;
  });

  const preview = mapped.slice(0, 3);
  const remaining = mapped.length - preview.length;
  return remaining > 0 ? `${preview.join(", ")} +${remaining} weitere` : preview.join(", ");
};

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

export function ImportProducts({
  onImport,
  triggerLabel = "Import",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
}: ImportProductsProps) {
  const [open, setOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [aiTextInput, setAiTextInput] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPreviewProducts, setAiPreviewProducts] = useState<Product[]>([]);
  const [selectedAiProductIds, setSelectedAiProductIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const visibleWarnings = useMemo(() => warnings.slice(0, 6), [warnings]);
  const selectedPreviewCount = useMemo(
    () =>
      aiPreviewProducts.filter((product) => selectedAiProductIds.has(product.id)).length,
    [aiPreviewProducts, selectedAiProductIds]
  );

  const applyImportResult = (result: ParsedImportResult) => {
    if (result.products.length > 0) {
      onImport(result.products);
      setStatusMessage(`${result.products.length} Produkte importiert.`);
    } else {
      setStatusMessage("Keine importierbaren Produkte gefunden.");
    }
    setWarnings(result.warnings);
  };

  const toggleAiSelection = (id: string, selected: boolean) => {
    setSelectedAiProductIds((previous) => {
      const next = new Set(previous);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const updateAiProductName = (id: string, nextName: string) => {
    setAiPreviewProducts((previous) =>
      previous.map((product) =>
        product.id === id
          ? {
              ...product,
              name: nextName,
            }
          : product
      )
    );
  };

  const toggleAiAllergen = (id: string, allergenKey: string) => {
    setAiPreviewProducts((previous) =>
      previous.map((product) => {
        if (product.id !== id) {
          return product;
        }

        const allergens = product.allergens.includes(allergenKey)
          ? product.allergens.filter((key) => key !== allergenKey)
          : [...product.allergens, allergenKey];

        return {
          ...product,
          allergens: sortedUnique(allergens),
        };
      })
    );
  };

  const toggleAiAdditive = (id: string, additiveKey: string) => {
    setAiPreviewProducts((previous) =>
      previous.map((product) => {
        if (product.id !== id) {
          return product;
        }

        const additives = product.additives.includes(additiveKey)
          ? product.additives.filter((key) => key !== additiveKey)
          : [...product.additives, additiveKey];

        return {
          ...product,
          additives: sortedUnique(additives),
        };
      })
    );
  };

  const handleSelectAllPreview = (selected: boolean) => {
    if (!selected) {
      setSelectedAiProductIds(new Set());
      return;
    }

    setSelectedAiProductIds(new Set(aiPreviewProducts.map((product) => product.id)));
  };

  const handleAiFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAiFile(file);
  };

  const handleAIAnalyze = async () => {
    if (!aiTextInput.trim() && !aiFile) {
      setStatusMessage("Bitte Text eingeben oder eine Bild/PDF-Datei auswählen.");
      setWarnings([]);
      return;
    }

    setIsAiAnalyzing(true);
    setStatusMessage(null);
    setWarnings([]);

    try {
      const formData = new FormData();
      if (aiTextInput.trim()) {
        formData.append("text", aiTextInput.trim());
      }
      if (aiFile) {
        if (aiFile.type === "application/pdf") {
          formData.append("pdf", aiFile);
        } else {
          formData.append("image", aiFile);
        }
      }

      const response = await fetch("/api/parse-menu", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          errorPayload?.error?.trim() || "Die Speisekarte konnte nicht analysiert werden."
        );
      }

      const data = (await response.json()) as {
        products?: Array<{
          name: string;
          allergens: string[];
          additives: string[];
        }>;
        warnings?: string[];
      };

      const parsedProducts =
        Array.isArray(data.products) && data.products.length > 0
          ? data.products
              .map((product) => ({
                id: crypto.randomUUID(),
                name: product.name?.trim() ?? "",
                allergens: Array.isArray(product.allergens) ? sortedUnique(product.allergens) : [],
                additives: Array.isArray(product.additives) ? sortedUnique(product.additives) : [],
              }))
              .filter((product) => product.name.length > 0)
          : [];

      setAiPreviewProducts(parsedProducts);
      setSelectedAiProductIds(new Set(parsedProducts.map((product) => product.id)));
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setStatusMessage(
        parsedProducts.length > 0
          ? `${parsedProducts.length} Produkte erkannt. Bitte prüfen und importieren.`
          : "Es konnten keine Produkte erkannt werden."
      );
    } catch (error) {
      console.error("KI-Import fehlgeschlagen:", error);
      setAiPreviewProducts([]);
      setSelectedAiProductIds(new Set());
      setWarnings([
        `Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler beim KI-Import."}`,
      ]);
      setStatusMessage("KI-Import fehlgeschlagen.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleAiImportSelected = () => {
    const selectedProducts = aiPreviewProducts
      .filter((product) => selectedAiProductIds.has(product.id))
      .map((product) => ({
        ...product,
        name: product.name.trim(),
      }))
      .filter((product) => product.name.length > 0);

    if (selectedProducts.length === 0) {
      setStatusMessage("Bitte mindestens ein Produkt auswählen.");
      return;
    }

    onImport(selectedProducts);
    setStatusMessage(`${selectedProducts.length} Produkte importiert.`);
    setAiPreviewProducts([]);
    setSelectedAiProductIds(new Set());
    setAiTextInput("");
    setAiFile(null);
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
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <Upload className="mr-2 h-4 w-4" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle>Produkte importieren</DialogTitle>
            <DialogDescription>
              Importiere mehrere Produkte als CSV oder per Copy-Paste aus Excel/Google
              Sheets.
            </DialogDescription>
          </DialogHeader>
          <TooltipProvider delayDuration={150}>
            <Tabs defaultValue="csv" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="csv">CSV-Datei</TabsTrigger>
                <TabsTrigger value="paste">Einfügen</TabsTrigger>
                <TabsTrigger value="ai">KI-Import</TabsTrigger>
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
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    "Text importieren"
                  )}
                </Button>
              </TabsContent>
              <TabsContent value="ai" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="ai-menu-text">Speisekarte als Text</Label>
                  <Textarea
                    id="ai-menu-text"
                    value={aiTextInput}
                    onChange={(event) => setAiTextInput(event.target.value)}
                    placeholder="z.B. Wiener Schnitzel mit Pommes, Caesar Salad, Spaghetti Carbonara ..."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-menu-file">Oder Bild/PDF hochladen</Label>
                  <Input
                    id="ai-menu-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleAiFileChange}
                    disabled={isAiAnalyzing}
                  />
                  {aiFile && (
                    <p className="text-xs text-muted-foreground">
                      Ausgewählt: {aiFile.name}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => void handleAIAnalyze()}
                  disabled={isAiAnalyzing || (!aiTextInput.trim() && !aiFile)}
                >
                  {isAiAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speisekarte wird analysiert...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analysieren
                    </>
                  )}
                </Button>

                {aiPreviewProducts.length > 0 && (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Vorschau: {selectedPreviewCount} von {aiPreviewProducts.length} ausgewählt
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectAllPreview(true)}
                        >
                          Alle auswählen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectAllPreview(false)}
                        >
                          Auswahl leeren
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAiImportSelected}
                          disabled={selectedPreviewCount === 0}
                        >
                          Ausgewählte importieren
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Legende:</span> Mouseover
                        auf Code zeigt die Bedeutung.
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-muted-foreground">Allergene</span>
                          {ALLERGEN_OPTIONS.map(([key, label]) => (
                            <Tooltip key={`legend-allergen-${key}`}>
                              <TooltipTrigger asChild>
                                <span className="inline-flex min-w-[26px] items-center justify-center rounded-full border bg-background px-2 py-0.5 font-semibold">
                                  {key.toUpperCase()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{`${key.toUpperCase()}: ${label}`}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-muted-foreground">Zusatzstoffe</span>
                          {ADDITIVE_OPTIONS.map(([key, label]) => (
                            <Tooltip key={`legend-additive-${key}`}>
                              <TooltipTrigger asChild>
                                <span className="inline-flex min-w-[26px] items-center justify-center rounded-full border bg-background px-2 py-0.5 font-semibold">
                                  {key}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{`${key}: ${label}`}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[420px] overflow-auto rounded-md border">
                      <Table className="min-w-[980px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[42px]">
                              <span className="sr-only">Auswahl</span>
                            </TableHead>
                            <TableHead className="min-w-[230px]">Name</TableHead>
                            <TableHead className="min-w-[320px]">Allergene</TableHead>
                            <TableHead className="min-w-[320px]">Zusatzstoffe</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiPreviewProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedAiProductIds.has(product.id)}
                                  onCheckedChange={(checked) =>
                                    toggleAiSelection(product.id, checked === true)
                                  }
                                  aria-label={`Produkt ${product.name} auswählen`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={product.name}
                                  onChange={(event) =>
                                    updateAiProductName(product.id, event.target.value)
                                  }
                                  placeholder="Produktname"
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <p className="mb-2 text-[11px] text-muted-foreground">
                                  Ausgewählt:{" "}
                                  {summarizeSelection(
                                    product.allergens,
                                    ALLERGEN_LABELS,
                                    (value) => value.toUpperCase()
                                  )}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ALLERGEN_OPTIONS.map(([key, label]) => {
                                    const isActive = product.allergens.includes(key);
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        className={cn(
                                          "rounded-full border px-2 py-1 text-[11px] font-medium leading-none transition-colors",
                                          isActive
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-input text-muted-foreground hover:bg-accent"
                                        )}
                                        onClick={() => toggleAiAllergen(product.id, key)}
                                        title={`${key.toUpperCase()}: ${label}`}
                                        aria-label={`${key.toUpperCase()}: ${label}`}
                                      >
                                        {key.toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <p className="mb-2 text-[11px] text-muted-foreground">
                                  Ausgewählt: {summarizeSelection(product.additives, ADDITIVE_LABELS)}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ADDITIVE_OPTIONS.map(([key, label]) => {
                                    const isActive = product.additives.includes(key);
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        className={cn(
                                          "rounded-full border px-2 py-1 text-[11px] font-medium leading-none transition-colors",
                                          isActive
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-input text-muted-foreground hover:bg-accent"
                                        )}
                                        onClick={() => toggleAiAdditive(product.id, key)}
                                        title={`${key}: ${label}`}
                                        aria-label={`${key}: ${label}`}
                                      >
                                        {key}
                                      </button>
                                    );
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TooltipProvider>

          {statusMessage && (
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {statusMessage}
            </p>
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
