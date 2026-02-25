"use client";

import { ExportButtons } from "@/components/export-buttons";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";

interface HeaderProps {
  logoUrl: string | null;
  products: Product[];
}

export function Header({ logoUrl, products }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-16 items-center justify-between gap-2 py-2 max-w-5xl mx-auto px-4">
        <h1 className="text-sm font-semibold text-primary md:text-base">
          Kostenlos Allergenliste erstellen
        </h1>

        <div className="hidden md:flex">
          <ExportButtons products={products} logoUrl={logoUrl} />
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Aktionen öffnen">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
              <div className="space-y-3 p-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Export
                  </p>
                  <ExportButtons products={products} logoUrl={logoUrl} />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}