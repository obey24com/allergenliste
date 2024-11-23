import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Product, ALLERGENS, ADDITIVES } from '@/types/product';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generatePDF = (products: Product[], logo: string | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add logo if provided
  if (logo) {
    const imgWidth = 40;
    const imgHeight = 20;
    const xPos = (pageWidth - imgWidth) / 2;
    doc.addImage(logo, 'JPEG', xPos, 10, imgWidth, imgHeight);
  }

  // Add title
  const titleY = logo ? 40 : 20;
  doc.setFontSize(10);
  doc.text(
    'Lebensmittel/Speisen sind mit nachfolgenden Zusatzstoffen und Allergenen hergestellt:',
    14,
    titleY
  );

  // Prepare table data
  const headers = [
    'Produkt',
    ...ALLERGENS.map(a => a.id),
    ...ADDITIVES.map(a => a.id)
  ];

  const data = products.map(product => [
    product.name,
    ...ALLERGENS.map(a => product.allergens.includes(a.id) ? 'X' : ''),
    ...ADDITIVES.map(a => product.additives.includes(a.id) ? 'X' : '')
  ]);

  // Add table
  doc.autoTable({
    head: [headers],
    body: data,
    startY: titleY + 10,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    theme: 'grid',
  });

  // Add legend
  const legendY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(8);

  // Allergens legend
  let currentY = legendY;
  doc.text('Allergene:', 14, currentY);
  currentY += 5;
  ALLERGENS.forEach((allergen, index) => {
    if (index % 2 === 0 && index !== 0) currentY += 5;
    const xPos = index % 2 === 0 ? 14 : pageWidth / 2;
    doc.text(`${allergen.id}: ${allergen.label}`, xPos, currentY);
  });

  // Additives legend
  currentY += 10;
  doc.text('Zusatzstoffe:', 14, currentY);
  currentY += 5;
  ADDITIVES.forEach((additive, index) => {
    if (index % 2 === 0 && index !== 0) currentY += 5;
    const xPos = index % 2 === 0 ? 14 : pageWidth / 2;
    doc.text(`${additive.id}: ${additive.label}`, xPos, currentY);
  });

  // Save the PDF
  doc.save('allergene-zusatzstoffe.pdf');
};