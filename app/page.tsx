"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { ProductForm } from "@/components/product-form";
import { ProductTable } from "@/components/product-table";
import { ContentSections } from "@/components/content-sections";
import { ToolFAQ } from "@/components/tool-faq";
import { Footer } from "@/components/footer";
import { Product } from "@/types/product";

const PRODUCTS_STORAGE_KEY = "gastrohelper-products-v1";
const LOGO_STORAGE_KEY = "gastrohelper-logo-v1";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const toStoredProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Product>;

  if (typeof candidate.name !== "string" || !candidate.name.trim()) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    name: candidate.name.trim(),
    allergens: isStringArray(candidate.allergens) ? candidate.allergens : [],
    additives: isStringArray(candidate.additives) ? candidate.additives : [],
  };
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        const parsed = JSON.parse(storedProducts);
        if (Array.isArray(parsed)) {
          setProducts(
            parsed
              .map(toStoredProduct)
              .filter((product): product is Product => product !== null)
          );
        }
      }

      const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
      if (storedLogo) {
        setLogo(storedLogo);
      }
    } catch (error) {
      console.error("Konnte gespeicherte Daten nicht laden:", error);
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [products, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (logo) {
      localStorage.setItem(LOGO_STORAGE_KEY, logo);
      return;
    }

    localStorage.removeItem(LOGO_STORAGE_KEY);
  }, [logo, storageLoaded]);

  const handleProductSubmit = (product: Product) => {
    setProducts((prev) => [...prev, { ...product, name: product.name.trim() }]);
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === updatedProduct.id
          ? { ...updatedProduct, name: updatedProduct.name.trim() }
          : product
      )
    );
  };

  const handleProductDelete = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const handleProductsImport = (importedProducts: Product[]) => {
    setProducts((prev) => [...prev, ...importedProducts]);
  };

  const handleProductReorder = (reorderedProducts: Product[]) => {
    setProducts(reorderedProducts);
  };

  const handleProductDuplicate = (productToDuplicate: Product) => {
    setProducts((prev) => {
      const existingNames = new Set(prev.map((product) => product.name.toLowerCase()));
      const baseName = `${productToDuplicate.name} (Kopie)`;
      let nextName = baseName;
      let copyCounter = 2;

      while (existingNames.has(nextName.toLowerCase())) {
        nextName = `${baseName} ${copyCounter}`;
        copyCounter += 1;
      }

      return [
        ...prev,
        {
          ...productToDuplicate,
          id: crypto.randomUUID(),
          name: nextName,
        },
      ];
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        logoUrl={logo}
        onLogoChange={setLogo}
        products={products}
        onImportProducts={handleProductsImport}
      />
      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container py-8 space-y-6 max-w-5xl mx-auto px-4">
            <div className="backdrop-blur-sm bg-background/50 rounded-xl border shadow-lg p-6">
              <ProductForm
                onSubmit={handleProductSubmit}
                existingProductNames={products.map((product) => product.name)}
              />
              <div className="mt-6">
                <ProductTable
                  products={products}
                  onDelete={handleProductDelete}
                  onUpdate={handleProductUpdate}
                  onReorder={handleProductReorder}
                  onDuplicate={handleProductDuplicate}
                />
              </div>
            </div>
            <ToolFAQ />
          </div>
        </div>
        <div className="container py-12 max-w-5xl mx-auto px-4">
          <ContentSections />
        </div>
      </main>
      <Footer />
    </div>
  );
}
