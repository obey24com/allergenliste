"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllergenCheckbox } from "@/components/allergen-checkbox";
import { Product } from "@/types/product";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";
import { hasMissingDeclarations } from "@/lib/product-helpers";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductFormProps {
  onSubmit: (product: Product) => void;
  initialData?: Product;
  existingProductNames?: string[];
}

export function ProductForm({
  onSubmit,
  initialData,
  existingProductNames = [],
}: ProductFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [allergens, setAllergens] = useState<string[]>(initialData?.allergens ?? []);
  const [additives, setAdditives] = useState<string[]>(initialData?.additives ?? []);
  const [keepSelection, setKeepSelection] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionReasoning, setSuggestionReasoning] = useState<string | null>(null);

  const normalizedName = name.trim().toLowerCase();
  const normalizedInitialName = initialData?.name.trim().toLowerCase() ?? "";
  const hasDuplicateName =
    normalizedName.length > 0 &&
    existingProductNames.some((productName) => {
      const normalizedProductName = productName.trim().toLowerCase();
      return (
        normalizedProductName === normalizedName &&
        normalizedProductName !== normalizedInitialName
      );
    });

  const hasNoDeclarations = hasMissingDeclarations(allergens, additives);

  const handleAISuggestion = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSuggesting) {
      return;
    }

    setIsSuggesting(true);
    setSuggestionReasoning(null);

    try {
      const response = await fetch("/api/suggest-allergens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: trimmedName,
        }),
      });

      if (!response.ok) {
        throw new Error("Die KI-Antwort konnte nicht geladen werden.");
      }

      const data = (await response.json()) as {
        allergens?: string[];
        additives?: string[];
        reasoning?: string;
      };

      const suggestedAllergens = Array.isArray(data.allergens) ? data.allergens : [];
      const suggestedAdditives = Array.isArray(data.additives) ? data.additives : [];

      setAllergens(suggestedAllergens);
      setAdditives(suggestedAdditives);
      setSuggestionReasoning(data.reasoning?.trim() || "Keine zusätzliche Begründung.");

      toast({
        title: "KI-Vorschlag geladen",
        description: "Bitte prüfen Sie die vorausgewählten Angaben vor dem Speichern.",
      });
    } catch (error) {
      console.error("KI-Vorschlag fehlgeschlagen:", error);
      toast({
        title: "KI-Vorschlag fehlgeschlagen",
        description: "Bitte versuchen Sie es erneut oder wählen Sie die Angaben manuell aus.",
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSubmit({
      id: initialData?.id ?? crypto.randomUUID(),
      name: trimmedName,
      allergens,
      additives,
    });

    if (!initialData) {
      setName("");
      if (!keepSelection) {
        setAllergens([]);
        setAdditives([]);
      }
      setSuggestionReasoning(null);
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  };

  const toggleAllergen = (key: string) => {
    setAllergens(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const toggleAdditive = (key: string) => {
    setAdditives(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="name" className="text-base font-medium">
            Produktname
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleAISuggestion()}
            disabled={!name.trim() || isSuggesting}
          >
            {isSuggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isSuggesting ? "Analysiere..." : "KI-Vorschlag"}
          </Button>
        </div>
        <Input
          id="name"
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Wiener Schnitzel"
          className="mt-2"
        />
      </div>

      <Tabs defaultValue="allergens" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allergens" className="gap-2">
            Allergene
            {allergens.length > 0 && (
              <Badge variant="secondary" className="px-2 py-0 text-[10px] leading-5">
                {allergens.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="additives" className="gap-2">
            Zusatzstoffe
            {additives.length > 0 && (
              <Badge variant="secondary" className="px-2 py-0 text-[10px] leading-5">
                {additives.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="allergens" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ALLERGENS).map(([key, label]) => (
              <AllergenCheckbox
                key={key}
                id={`allergen-${key}`}
                label={label}
                checked={allergens.includes(key)}
                onChange={() => toggleAllergen(key)}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="additives" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ADDITIVES).map(([key, label]) => (
              <AllergenCheckbox
                key={key}
                id={`additive-${key}`}
                label={label}
                checked={additives.includes(key)}
                onChange={() => toggleAdditive(key)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {suggestionReasoning && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium text-primary">KI-Vorschlag geladen</p>
          <p className="mt-1 text-muted-foreground">
            Bitte prüfen Sie die Vorauswahl: {suggestionReasoning}
          </p>
        </div>
      )}

      <div className="space-y-2" aria-live="polite">
        {hasDuplicateName && (
          <p className="text-sm text-amber-700">
            Hinweis: Ein Produkt mit diesem Namen ist bereits vorhanden.
          </p>
        )}
        {hasNoDeclarations && (
          <p className="text-sm text-amber-700">
            Hinweis: Für dieses Produkt wurden noch keine Allergene oder Zusatzstoffe
            ausgewählt.
          </p>
        )}
      </div>

      {!initialData && (
        <div className="flex items-center justify-between rounded-md border bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">Auswahl nach Speichern behalten</p>
            <p className="text-xs text-muted-foreground">
              Hilfreich, wenn mehrere ähnliche Produkte nacheinander erfasst werden.
            </p>
          </div>
          <Switch checked={keepSelection} onCheckedChange={setKeepSelection} />
        </div>
      )}

      <Button type="submit" className="w-full">
        {initialData ? "Produkt aktualisieren" : "Produkt hinzufügen"}
      </Button>
    </form>
  );
}
