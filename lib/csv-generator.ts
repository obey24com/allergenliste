import { Product, ALLERGENS, ADDITIVES } from '@/types/product';

export const generateCSV = (products: Product[]) => {
  // Prepare headers
  const headers = [
    'Produkt',
    ...ALLERGENS.map(a => a.label),
    ...ADDITIVES.map(a => a.label)
  ];

  // Prepare data rows
  const data = products.map(product => [
    product.name,
    ...ALLERGENS.map(a => product.allergens.includes(a.id) ? 'X' : ''),
    ...ADDITIVES.map(a => product.additives.includes(a.id) ? 'X' : '')
  ]);

  // Combine headers and data
  const csvContent = [
    headers.join(';'),
    ...data.map(row => row.join(';'))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'allergene-zusatzstoffe.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};