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
      <main className="container py-6 space-y-6 max-w-5xl mx-auto px-4 flex-1">
        <DismissibleTitle />
        <ProductForm onSubmit={handleProductSubmit} />
        <ProductTable 
          products={products}
          onDelete={handleProductDelete}
          onUpdate={handleProductUpdate}
        />
        <ContentSections />
      </main>
      <Footer />
    </div>
  );
}