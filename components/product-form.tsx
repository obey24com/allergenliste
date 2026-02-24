"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllergenCheckbox } from "@/components/allergen-checkbox";
import { Product } from "@/types/product";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";
import { hasMissingDeclarations } from "@/lib/product-helpers";

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
  const [name, setName] = useState(initialData?.name ?? "");
  const [allergens, setAllergens] = useState<string[]>(initialData?.allergens ?? []);
  const [additives, setAdditives] = useState<string[]>(initialData?.additives ?? []);
  const [keepSelection, setKeepSelection] = useState(false);

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
        <Label htmlFor="name" className="text-base font-medium">Produktname</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Wiener Schnitzel"
          className="mt-2"
        />
      </div>

      <Tabs defaultValue="allergens" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allergens">Allergene</TabsTrigger>
          <TabsTrigger value="additives">Zusatzstoffe</TabsTrigger>
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

      <div className="space-y-2">
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
