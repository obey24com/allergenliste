"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALLERGENS } from "@/lib/constants";

interface ProductFilterProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  missingOnly: boolean;
  onMissingOnlyChange: (value: boolean) => void;
  allergenFilter: string;
  onAllergenFilterChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
}

export function ProductFilter({
  searchQuery,
  onSearchQueryChange,
  missingOnly,
  onMissingOnlyChange,
  allergenFilter,
  onAllergenFilterChange,
  totalCount,
  filteredCount,
}: ProductFilterProps) {
  const hasActiveFilters = searchQuery.trim().length > 0 || missingOnly || allergenFilter !== "all";

  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Produkte suchen..."
            className="pl-9"
            aria-label="Produkte suchen"
          />
        </div>

        <Button
          type="button"
          variant={missingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onMissingOnlyChange(!missingOnly)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Ohne Kennzeichnung
        </Button>

        <Select value={allergenFilter} onValueChange={onAllergenFilterChange}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Allergen filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Allergene</SelectItem>
            {Object.entries(ALLERGENS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {key.toUpperCase()} - {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchQueryChange("");
              onMissingOnlyChange(false);
              onAllergenFilterChange("all");
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredCount} von {totalCount} Produkten sichtbar
      </p>
    </section>
  );
}
