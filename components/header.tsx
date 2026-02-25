"use client";

import { LogoUpload } from "@/components/logo-upload";
import { ImportProducts } from "@/components/import-products";
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
  onLogoChange: (logo: string | null) => void;
  products: Product[];
  onImportProducts: (products: Product[]) => void;
}

export function Header({
  logoUrl,
  onLogoChange,
  products,
  onImportProducts,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-16 items-center justify-between gap-2 py-2 max-w-5xl mx-auto px-4">
        <div className="hidden md:flex">
          <LogoUpload logoUrl={logoUrl} onLogoChange={onLogoChange} />
        </div>

        <h1 className="text-sm font-semibold text-primary md:flex-1 md:text-center md:text-base">
          Kostenlos Allergenliste erstellen
        </h1>

        <div className="hidden md:flex items-center gap-2">
          <ImportProducts onImport={onImportProducts} />
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
                    Logo
                  </p>
                  <LogoUpload logoUrl={logoUrl} onLogoChange={onLogoChange} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Import
                  </p>
                  <ImportProducts onImport={onImportProducts} />
                </div>
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