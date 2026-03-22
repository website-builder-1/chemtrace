import { useState } from 'react';
import jsPDF from 'jspdf';
import type { PipelineResults } from '@/types/chemtrace';
import { generateInvoiceData, downloadReagentsCSV } from '@/lib/exportUtils';
import SectionLabel from './SectionLabel';

export default function InvoicePanel({ results }: { results: PipelineResults }) {
  const rec = results.routes.find(r => r.id === results.recommendedRouteId)!;
  const invoice = generateInvoiceData(rec, results.batchSizeMg);
  const [showInvoice, setShowInvoice] = useState(false);

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CHEMTRACE — REAGENT INVOICE', 20, y); y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice: ${invoice.invoiceNumber}  |  Date: ${invoice.date}`, 20, y); y += 6;
    doc.text(`Molecule: ${results.molecule.name}  |  Route: ${rec.name}  |  Batch: ${results.batchSizeMg} mg`, 20, y); y += 10;

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const cols = [20, 70, 100, 130, 150, 170];
    ['Reagent', 'CAS', 'Supplier', 'Qty', 'Unit £', 'Total £'].forEach((h, i) => doc.text(h, cols[i], y));
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
      doc.text(`£${item.unitPrice.toFixed(2)}`, cols[4], y);
      doc.text(`£${item.total.toFixed(2)}`, cols[5], y);
      y += 5;
    });

    y += 3;
    doc.line(20, y, 190, y); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: £${invoice.subtotal.toFixed(2)}`, 150, y); y += 5;
    doc.text(`VAT (20%): £${invoice.vat.toFixed(2)}`, 150, y); y += 5;
    doc.setFontSize(10);
    doc.text(`TOTAL: £${invoice.grandTotal.toFixed(2)}`, 150, y);

    doc.save(`chemtrace_invoice_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <section>
      <SectionLabel label="INVOICE & PROCUREMENT" />
      <div className="flex flex-wrap gap-3 mb-3">
        <button
          onClick={() => setShowInvoice(!showInvoice)}
          className="px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider text-white transition-colors duration-150"
          style={{ backgroundColor: 'hsl(var(--ct-teal))' }}
        >
          {showInvoice ? 'Hide Invoice' : 'View Invoice'}
        </button>
        <button
          onClick={downloadPDF}
          className="px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider border transition-colors duration-150"
          style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-teal))' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-teal))'; }}
        >
          ↓ Download Invoice (PDF)
        </button>
        <button
          onClick={() => downloadReagentsCSV(rec.reagentProcurement, results.molecule.name)}
          className="px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider border transition-colors duration-150"
          style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-teal))' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-teal))'; }}
        >
          ↓ Reagents CSV
        </button>
      </div>

      {showInvoice && (
        <div className="bg-card border rounded-[3px] p-5" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-serif-display font-bold text-base" style={{ color: 'hsl(var(--ct-teal))' }}>⚗ ChemTrace</div>
              <div className="font-mono-data text-[0.6rem] uppercase tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>REAGENT INVOICE</div>
            </div>
            <div className="text-right font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>
              <div>Invoice: {invoice.invoiceNumber}</div>
              <div>Date: {invoice.date}</div>
            </div>
          </div>

          <div className="font-body text-xs mb-3" style={{ color: 'hsl(var(--ct-muted))' }}>
            Molecule: {results.molecule.name} | Route: {rec.name} | Batch: {results.batchSizeMg} mg
          </div>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--ct-sidebar))' }}>
                {['Reagent', 'CAS', 'Supplier', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className="font-mono-data uppercase text-[0.6rem] text-white font-medium px-2 py-1.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={item.cas} style={{ backgroundColor: i % 2 === 0 ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--ct-border))' }}>
                  <td className="font-body text-xs px-2 py-1.5">{item.reagent}</td>
                  <td className="font-mono-data text-[0.7rem] px-2 py-1.5">{item.cas}</td>
                  <td className="font-body text-xs px-2 py-1.5">{item.supplier}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5 text-center">{item.qty}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5">£{item.unitPrice.toFixed(2)}</td>
                  <td className="font-mono-data text-xs px-2 py-1.5 font-medium">£{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right space-y-1">
            <div className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>Subtotal: £{invoice.subtotal.toFixed(2)}</div>
            <div className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>VAT (20%): £{invoice.vat.toFixed(2)}</div>
            <div className="font-mono-data text-sm font-bold" style={{ color: 'hsl(var(--ct-teal))' }}>TOTAL: £{invoice.grandTotal.toFixed(2)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
