"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { LogoUpload } from "@/components/logo-upload";
import { ImportProducts } from "@/components/import-products";
import { ProductForm } from "@/components/product-form";
import { ProductTable } from "@/components/product-table";
import { ProductFilter } from "@/components/product-filter";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { ContentSections } from "@/components/content-sections";
import { ToolFAQ } from "@/components/tool-faq";
import { Footer } from "@/components/footer";
import { Product } from "@/types/product";
import { ALLERGENS } from "@/lib/constants";
import { hasMissingDeclarations } from "@/lib/product-helpers";
import { toast } from "@/hooks/use-toast";

const PRODUCTS_STORAGE_KEY = "gastrohelper-products-v1";
const LOGO_STORAGE_KEY = "gastrohelper-logo-v1";
const VISITED_STORAGE_KEY = "gastrohelper-visited";
const BACKUP_REMINDER_STORAGE_KEY = "gastrohelper-backup-reminder-v1";

const DEMO_PRODUCTS: Array<Omit<Product, "id">> = [
  {
    name: "Wiener Schnitzel",
    allergens: ["a", "c", "g"],
    additives: [],
  },
  {
    name: "Caesar Salad",
    allergens: ["a", "c", "d", "g", "j"],
    additives: ["1"],
  },
  {
    name: "Tomatensuppe",
    allergens: ["i"],
    additives: ["2"],
  },
  {
    name: "Hausdessert",
    allergens: ["a", "c", "g", "h"],
    additives: ["9"],
  },
];

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [allergenFilter, setAllergenFilter] = useState("all");

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

      const hasVisited = localStorage.getItem(VISITED_STORAGE_KEY);
      setShowOnboarding(!hasVisited);
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

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    const hasReminder = localStorage.getItem(BACKUP_REMINDER_STORAGE_KEY);
    if (products.length > 10 && !hasReminder) {
      toast({
        title: "Backup empfohlen",
        description: "Exportieren Sie Ihre Liste als CSV, um eine Sicherung zu haben.",
      });
      localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, "1");
    }
  }, [products.length, storageLoaded]);

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

  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((product) => !idSet.has(product.id)));
  };

  const handleBulkAddAllergen = (ids: string[], allergenKey: string) => {
    if (ids.length === 0 || !(allergenKey in ALLERGENS)) {
      return;
    }

    const idSet = new Set(ids);
    setProducts((prev) =>
      prev.map((product) => {
        if (!idSet.has(product.id) || product.allergens.includes(allergenKey)) {
          return product;
        }

        return {
          ...product,
          allergens: [...product.allergens, allergenKey],
        };
      })
    );
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

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(VISITED_STORAGE_KEY, "1");
  };

  const handleLoadDemoProducts = () => {
    setProducts((prev) => {
      const existingNames = new Set(prev.map((product) => product.name.toLowerCase()));

      const preparedDemos = DEMO_PRODUCTS.map((demoProduct) => {
        let nextName = demoProduct.name;
        let counter = 2;
        while (existingNames.has(nextName.toLowerCase())) {
          nextName = `${demoProduct.name} ${counter}`;
          counter += 1;
        }
        existingNames.add(nextName.toLowerCase());

        return {
          id: crypto.randomUUID(),
          name: nextName,
          allergens: demoProduct.allergens,
          additives: demoProduct.additives,
        } satisfies Product;
      });

      return [...prev, ...preparedDemos];
    });

    handleDismissOnboarding();
    toast({
      title: "Beispieldaten geladen",
      description: "Sie können die Produkte jetzt direkt bearbeiten oder exportieren.",
    });
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query)) {
        return false;
      }

      if (missingOnly && !hasMissingDeclarations(product.allergens, product.additives)) {
        return false;
      }

      if (allergenFilter !== "all" && !product.allergens.includes(allergenFilter)) {
        return false;
      }

      return true;
    });
  }, [products, searchQuery, missingOnly, allergenFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || missingOnly || allergenFilter !== "all";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header logoUrl={logo} products={products} />
      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container py-8 space-y-6 max-w-5xl mx-auto px-4">
            <div className="backdrop-blur-sm bg-background/50 rounded-xl border shadow-lg p-6">
              {showOnboarding && (
                <div className="mb-6">
                  <OnboardingBanner
                    onDismiss={handleDismissOnboarding}
                    onLoadDemoProducts={handleLoadDemoProducts}
                  />
                </div>
              )}

              <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-background p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Schnellstart
                    </p>
                    <h2 className="text-lg font-semibold leading-tight">
                      Speisekarte importieren statt alles manuell einzugeben
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      CSV, Copy-Paste oder KI-Import mit Bild/PDF. So sind viele Produkte in wenigen
                      Minuten erfasst.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ImportProducts
                      onImport={handleProductsImport}
                      triggerLabel="Speisekarte importieren"
                      triggerVariant="default"
                      triggerSize="default"
                      triggerClassName="h-10 px-5 font-semibold shadow-sm"
                    />
                    <LogoUpload logoUrl={logo} onLogoChange={setLogo} />
                  </div>
                </div>
              </div>

              <ProductForm
                onSubmit={handleProductSubmit}
                existingProductNames={products.map((product) => product.name)}
              />

              <div className="mt-6 space-y-4">
                {products.length > 0 && (
                  <ProductFilter
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    missingOnly={missingOnly}
                    onMissingOnlyChange={setMissingOnly}
                    allergenFilter={allergenFilter}
                    onAllergenFilterChange={setAllergenFilter}
                    totalCount={products.length}
                    filteredCount={filteredProducts.length}
                  />
                )}

                <ProductTable
                  products={filteredProducts}
                  onDelete={handleProductDelete}
                  onUpdate={handleProductUpdate}
                  onReorder={handleProductReorder}
                  onDuplicate={handleProductDuplicate}
                  onBulkDelete={handleBulkDelete}
                  onBulkAddAllergen={handleBulkAddAllergen}
                  isReorderEnabled={!hasActiveFilters}
                />
                <p className="text-xs text-muted-foreground">
                  Ihre Daten werden lokal im Browser gespeichert.
                </p>
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
