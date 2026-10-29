import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { useState } from 'react';
import { BrandLogo } from '@/components/site/BrandLogo';
import jsPDF from 'jspdf';
import type { PipelineResults } from '@/types/chemtrace';
import { generateInvoiceData, downloadReagentsCSV } from '@/lib/exportUtils';
import { formatCurrency, symbol, type Currency } from '@/lib/currency';
import { useSupplierCatalog, enrichReagent } from '@/lib/stepMaterials';
import SectionLabel from './SectionLabel';

export default function InvoicePanel({ results, currency }: { results: PipelineResults; currency: Currency }) {
  const catalog = useSupplierCatalog();
  const recommended = results.routes.find(r => r.id === results.recommendedRouteId);
  const [showInvoice, setShowInvoice] = useState(false);
  if (!recommended) return null;
  const rec = { ...recommended, reagentProcurement: recommended.reagentProcurement.map(r => enrichReagent(r, catalog)) };
  const rawInvoice = generateInvoiceData(rec, results.batchSizeMg, currency);
  // Drop placeholder rows like "none" that aren't real reagents.
  const invoice = { ...rawInvoice, items: rawInvoice.items.filter(i => !/^(none|n\/a|-|–)?$/i.test(i.reagent.trim())) };
  const pricedCount = invoice.items.filter(i => i.total != null).length;
  const unpricedCount = invoice.items.length - pricedCount;
  const sym = symbol(currency);
  const money = (amount: number | null) => amount == null ? 'Quote required' : formatCurrency(amount, currency, currency);
  // Never show £0.00 when items are unpriced: show "Quote required" or "£X + quotes".
  const totalLabel = (amount: number | null) => {
    if (pricedCount === 0) return 'Quote required';
    const v = money(amount);
    return unpricedCount > 0 ? `${v} + quotes` : v;
  };
  const note = pricedCount === 0
    ? 'Pricing on request: none of these reagents are in our supplier catalogue yet. Request quotes from suppliers for a total.'
    : unpricedCount > 0
      ? `Partial estimate: ${unpricedCount} of ${invoice.items.length} items need supplier quotes and are not included in the total.`
      : null;

  // Identify critical-path reagent (longest lead time)
  const criticalReagent = rec.reagentProcurement.length > 0
    ? rec.reagentProcurement.reduce((a, b) => (b.leadDays > a.leadDays ? b : a))
    : null;

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.addImage(logo, 'PNG', 20, 14, 9, 8);
    doc.text('Chemtraceit', 33, y); y += 10;
    doc.text('Reagent invoice', 20, y); y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice: ${invoice.invoiceNumber}  |  Date: ${invoice.date}`, 20, y); y += 6;
    doc.text(`Molecule: ${results.molecule.name}  |  Route: ${rec.name}  |  Batch: ${results.batchSizeMg} mg  |  Currency: ${currency}`, 20, y); y += 10;

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const cols = [20, 70, 100, 130, 150, 170];
    ['Reagent', 'CAS', 'Supplier', 'Qty', `Unit ${sym}`, `Total ${sym}`].forEach((h, i) => doc.text(h, cols[i], y));
    y += 2;
    doc.setDrawColor(196, 186, 166);
    doc.line(20, y, 190, y); y += 5;

    doc.setFont('helvetica', 'normal');
    invoice.items.forEach(item => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(item.reagent.slice(0, 25), cols[0], y);
      doc.text(item.cas, cols[1], y);
      doc.text(item.supplier.slice(0, 15), cols[2], y);
      doc.text(String(item.qty), cols[3], y);
      doc.text(money(item.unitPrice), cols[4], y);
      doc.text(money(item.total), cols[5], y);
      y += 5;
    });

    y += 3;
    doc.line(20, y, 190, y); y += 6;
    doc.setFont('helvetica', 'bold');
    if (note) { doc.splitTextToSize(note, 170).forEach((l: string) => { doc.text(l, 20, y); y += 5; }); y += 1; }
    doc.text(`Subtotal: ${totalLabel(invoice.subtotal)}`, 130, y); y += 5;
    doc.text(`VAT (20%): ${totalLabel(invoice.vat)}`, 130, y); y += 5;
    doc.setFontSize(10);
    doc.text(`TOTAL: ${totalLabel(invoice.grandTotal)}`, 130, y);

    doc.save(`chemtrace_invoice_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <section>
      <SectionLabel label="INVOICE & PROCUREMENT" />
      {criticalReagent && (
        <div className="mb-3 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: 'hsl(var(--ct-review-bg))', borderLeft: '3px solid hsl(var(--ct-status-gold))', color: 'hsl(var(--ct-ink))' }}>
          <span className="font-mono-data uppercase text-[0.6rem] tracking-wider mr-2" style={{ color: 'hsl(var(--ct-status-gold))' }}>⚠ CRITICAL PATH</span>
          <strong>{criticalReagent.name}</strong> from {criticalReagent.supplier} ({criticalReagent.country}) has the longest lead time, at <strong>{criticalReagent.leadDays} days</strong>. It sets the start date for the whole synthesis.
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-3">
        <Button onClick={() => setShowInvoice(!showInvoice)} className="text-xs">{showInvoice ? 'Hide invoice' : 'View invoice'}</Button>
        <Button variant="outline" onClick={downloadPDF} className="text-xs">↓ Invoice PDF</Button>
        <Button variant="outline" onClick={() => downloadReagentsCSV(rec.reagentProcurement, results.molecule.name, currency)} className="text-xs">↓ Reagents CSV</Button>
      </div>

      {showInvoice && (
        <div className="bg-card border rounded-[3px] p-5" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <BrandLogo size="sm" />
              <div className="font-mono-data text-[0.6rem] uppercase tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>REAGENT INVOICE</div>
            </div>
            <div className="text-right font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>
              <div>Invoice: {invoice.invoiceNumber}</div>
              <div>Date: {invoice.date}</div>
              <div>Currency: {currency}</div>
            </div>
          </div>

          <div className="font-body text-xs mb-3" style={{ color: 'hsl(var(--ct-muted))' }}>
            Molecule: {results.molecule.name} | Route: {rec.name} | Batch: {results.batchSizeMg} mg
          </div>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse mb-4">
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--ct-sidebar))' }}>
                {['Reagent', 'CAS', 'Supplier', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className="font-mono-data uppercase text-[0.6rem] text-brand-paper font-medium px-2 py-1.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={`${item.reagent}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--ct-border))' }}>
                  <td className="font-body text-xs px-2 py-1.5">{item.reagent}</td>
                  <td className="font-mono-data text-[0.7rem] px-2 py-1.5">{item.cas}</td>
                  <td className="font-body text-xs px-2 py-1.5">{item.supplier}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5 text-center">{item.qty}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5">{money(item.unitPrice)}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5 font-medium">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="text-right space-y-1">
            {note && <p className="font-body text-xs text-muted-foreground">{note}</p>}
            <div className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>Subtotal: {totalLabel(invoice.subtotal)}</div>
            <div className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>VAT (20%): {totalLabel(invoice.vat)}</div>
            <div className="font-mono-data text-sm font-bold" style={{ color: 'hsl(var(--ct-teal))' }}>TOTAL: {totalLabel(invoice.grandTotal)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
