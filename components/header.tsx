"use client";

import { LogoUpload } from "@/components/logo-upload";
import { ImportProducts } from "@/components/import-products";
import { ExportButtons } from "@/components/export-buttons";
import { Product } from "@/types/product";

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
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-2 py-2 max-w-5xl mx-auto px-4">
        <LogoUpload logoUrl={logoUrl} onLogoChange={onLogoChange} />
        <h1 className="text-sm font-semibold text-primary md:text-base">
          Kostenlos Allergenliste erstellen
        </h1>
        <div className="flex items-center gap-2">
          <ImportProducts onImport={onImportProducts} />
          <ExportButtons products={products} logoUrl={logoUrl} />
        </div>
      </div>
    </header>
  );
}