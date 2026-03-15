import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── PDF Export ────────────────────────────────────────────────────────────
export const exportToPDF = (title, columns, rows, filename = 'report.pdf') => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 32,
    head: [columns.map(c => c.header)],
    body: rows.map(row => columns.map(c => c.accessor(row) ?? '')),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
};

// ── Excel Export ──────────────────────────────────────────────────────────
export const exportToExcel = (title, columns, rows, filename = 'report.xlsx') => {
  const headers = columns.map(c => c.header);
  const data = rows.map(row => columns.map(c => c.accessor(row) ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));

  // Auto column widths
  const maxWidths = headers.map((h, i) =>
    Math.max(h.length, ...data.map(r => String(r[i] || '').length), 10)
  );
  ws['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 40) }));

  XLSX.writeFile(wb, filename);
};

// ── Predefined export configs ──────────────────────────────────────────────
export const exportProducts = (products, format = 'pdf') => {
  const cols = [
    { header: 'Name', accessor: r => r.name },
    { header: 'SKU', accessor: r => r.sku },
    { header: 'Category', accessor: r => r.category },
    { header: 'Unit', accessor: r => r.unit },
    { header: 'Total Stock', accessor: r => r.totalStock },
    { header: 'Reorder Level', accessor: r => r.reorderLevel },
    { header: 'Status', accessor: r => r.stockStatus?.toUpperCase() },
  ];
  if (format === 'pdf') exportToPDF('Products Report', cols, products, 'products.pdf');
  else exportToExcel('Products', cols, products, 'products.xlsx');
};

export const exportReceipts = (receipts, format = 'pdf') => {
  const cols = [
    { header: 'Ref', accessor: r => r.ref },
    { header: 'Supplier', accessor: r => r.supplier },
    { header: 'Status', accessor: r => r.status },
    { header: 'Date', accessor: r => new Date(r.createdAt).toLocaleDateString() },
    { header: 'Items', accessor: r => r.items?.length },
  ];
  if (format === 'pdf') exportToPDF('Receipts Report', cols, receipts, 'receipts.pdf');
  else exportToExcel('Receipts', cols, receipts, 'receipts.xlsx');
};

export const exportLedger = (ledger, format = 'pdf') => {
  const cols = [
    { header: 'Date', accessor: r => new Date(r.createdAt).toLocaleString() },
    { header: 'Product', accessor: r => r.product?.name },
    { header: 'Warehouse', accessor: r => r.warehouse?.name },
    { header: 'Type', accessor: r => r.type },
    { header: 'Quantity', accessor: r => r.quantity },
    { header: 'Balance After', accessor: r => r.balanceAfter },
    { header: 'Reference', accessor: r => r.referenceRef },
    { header: 'Note', accessor: r => r.note },
  ];
  if (format === 'pdf') exportToPDF('Stock Ledger', cols, ledger, 'ledger.pdf');
  else exportToExcel('Stock Ledger', cols, ledger, 'ledger.xlsx');
};
