"use client";

import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { FileDown } from "lucide-react";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";

interface ExportButtonsProps {
  products: Product[];
  logoUrl: string | null;
}

export function ExportButtons({ products, logoUrl }: ExportButtonsProps) {
  const handleCSVExport = () => {
    const data = products.map((product) => ({
      Name: product.name,
      Allergene: product.allergens
        .map((key) => ALLERGENS[key as keyof typeof ALLERGENS])
        .join(", "),
      Zusatzstoffe: product.additives
        .map((key) => ADDITIVES[key as keyof typeof ADDITIVES])
        .join(", "),
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "allergenliste.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = async () => {
    const doc = new jsPDF();
    let startY = 20;

    // Add logo if available
    if (logoUrl) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });

        const aspectRatio = img.width / img.height;
        const maxWidth = 50;
        const width = Math.min(maxWidth, img.width);
        const height = width / aspectRatio;
        
        doc.addImage(
          logoUrl,
          'PNG',
          (doc.internal.pageSize.width - width) / 2,
          startY,
          width,
          height
        );
        startY += height + 20;
      } catch (error) {
        console.error('Error loading logo:', error);
        // Continue without logo if there's an error
      }
    }

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      "Lebensmittel/Speisen sind mit nachfolgenden Zusatzstoffen und Allergenen hergestellt:",
      doc.internal.pageSize.width / 2,
      startY + 10,
      { align: "center" }
    );

    // Table data
    const tableData = products.map((product) => [
      product.name,
      product.allergens
        .map((key) => ALLERGENS[key as keyof typeof ALLERGENS])
        .join(", "),
      product.additives
        .map((key) => ADDITIVES[key as keyof typeof ADDITIVES])
        .join(", "),
    ]);

    // Generate table
    autoTable(doc, {
      head: [["Name", "Allergene", "Zusatzstoffe"]],
      body: tableData,
      startY: startY + 20,
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [71, 85, 105],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      theme: 'grid',
      margin: { top: 20 },
    });

    doc.save("allergenliste.pdf");
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSVExport}
        disabled={products.length === 0}
      >
        <FileDown className="mr-2 h-4 w-4" />
        CSV Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        disabled={products.length === 0}
      >
        <FileDown className="mr-2 h-4 w-4" />
        PDF Export
      </Button>
    </div>
  );
}