"use client";

import { LogoUpload } from "@/components/logo-upload";
import { ExportButtons } from "@/components/export-buttons";
import { Product } from "@/types/product";

interface HeaderProps {
  logoUrl: string | null;
  onLogoChange: (logo: string | null) => void;
  products: Product[];
}

export function Header({ logoUrl, onLogoChange, products }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between space-x-4 max-w-5xl mx-auto px-4">
        <LogoUpload logoUrl={logoUrl} onLogoChange={onLogoChange} />
        <ExportButtons products={products} logoUrl={logoUrl} />
      </div>
    </header>
  );
}