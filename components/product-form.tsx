"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllergenCheckbox } from "@/components/allergen-checkbox";
import { Product } from "@/types/product";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";

interface ProductFormProps {
  onSubmit: (product: Product) => void;
  initialData?: Product;
}

export function ProductForm({ onSubmit, initialData }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [allergens, setAllergens] = useState<string[]>(initialData?.allergens ?? []);
  const [additives, setAdditives] = useState<string[]>(initialData?.additives ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      id: initialData?.id ?? crypto.randomUUID(),
      name,
      allergens,
      additives,
    });

    if (!initialData) {
      setName("");
      setAllergens([]);
      setAdditives([]);
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
    <Card className="p-6">
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

        <Button type="submit" className="w-full">
          {initialData ? "Produkt aktualisieren" : "Produkt hinzufügen"}
        </Button>
      </form>
    </Card>
  );
}