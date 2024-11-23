"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductForm } from "@/components/product-form";
import { ProductTable } from "@/components/product-table";
import { ContentSections } from "@/components/content-sections";
import { DismissibleTitle } from "@/components/dismissible-title";
import { Product } from "@/types/product";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logo, setLogo] = useState<string | null>(null);

  const handleProductSubmit = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(prev => 
      prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    );
  };

  const handleProductDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        logoUrl={logo}
        onLogoChange={setLogo}
        products={products}
      />
      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container py-8 space-y-6 max-w-5xl mx-auto px-4">
            <DismissibleTitle />
            <div className="backdrop-blur-sm bg-background/50 rounded-xl border shadow-lg p-6">
              <ProductForm onSubmit={handleProductSubmit} />
              <div className="mt-6">
                <ProductTable 
                  products={products}
                  onDelete={handleProductDelete}
                  onUpdate={handleProductUpdate}
                />
              </div>
            </div>
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
