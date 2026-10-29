import { describe, expect, it, vi } from 'vitest';
import { convertCurrency, fmt, formatReagentPrice } from '@/lib/currency';
import { generateInvoiceData, downloadRoutesCSV, downloadJSON, downloadCROBrief, downloadReagentsCSV } from '@/lib/exportUtils';
import type { PipelineResults, SynthesisRoute, ReagentInfo } from '@/types/chemtrace';

const reagent = { name: 'Acid', cas: '1', supplier: 'Supplier', country: 'UK', price: 'USD 127 / 500 g', unitPrice: 127, priceCurrency: 'USD', availability: 'Checked', leadDays: 2, hazard: 'Unconfirmed', geoRisk: 'low', status: 'STANDARD', exportControlled: false } satisfies ReagentInfo;
const route: SynthesisRoute = { id: 'R1', name: 'Test', status: 'APPROVED', score: 90, yieldPercent: 80, costPerGram: 10, batchEstimate: 5, steps: [], reagents: [], reagentProcurement: [reagent], citation: '', supplyRisk: 'low', regulatoryRisk: 'low', decisionReason: '' };
const results: PipelineResults = { molecule: { name: 'Test', smiles: 'CCO', iupac: '', mw: 46, xlogp: 0, hbd: 1, rings: 0 }, location: 'UK', regulatory: { location: 'UK', body: '', regulations: [], preferredRegions: [], jurisdictionNotes: '' }, routes: [route], recommendedRouteId: 'R1', agentExplanation: '', batchSizeMg: 500 };

describe('selected currency consistency', () => {
  it('switches GBP to USD and back from original values without changing the amount', () => {
    expect(fmt(10, 'USD')).toBe('$12.70');
    expect(fmt(10, 'GBP')).toBe('£10.00');
    expect(fmt(10, 'EUR')).toBe('€11.70');
    expect(route.costPerGram).toBe(10);
  });
  it('converts supplier USD and EUR prices using their actual source currency', () => {
    expect(formatReagentPrice(reagent, 'GBP')).toBe('£100.00 / 500 g');
    expect(formatReagentPrice(reagent, 'USD')).toBe('$127.00 / 500 g');
    expect(convertCurrency(117, 'EUR', 'USD')).toBe(127);
  });
  it('invoice line items and totals use selected currency once, with matching rounding', () => {
    const usd = generateInvoiceData(route, 500, 'USD');
    expect(usd.items[0].unitPrice).toBe(127);
    expect(usd.subtotal).toBe(127);
    expect(usd.grandTotal).toBe(152.4);
    const gbp = generateInvoiceData(route, 500, 'GBP');
    expect(gbp.items[0].unitPrice).toBe(100);
    expect(gbp.grandTotal).toBe(120);
  });
  it('does not present unknown supplier prices as free items', () => {
    const unknown = { ...reagent, unitPrice: undefined, priceCurrency: undefined, price: 'Quote on request' };
    const invoice = generateInvoiceData({ ...route, reagentProcurement: [unknown] }, 500, 'GBP');
    expect(invoice.items[0].unitPrice).toBeNull();
    expect(invoice.incomplete).toBe(true);
    expect(formatReagentPrice(unknown, 'USD')).toBe('Quote on request');
  });
  it('exports selected currency rather than hardcoded pounds without mutating saved results', async () => {
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:test'; }, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadRoutesCSV(results, 'USD');
    downloadJSON(results, 'USD');
    downloadCROBrief(results, 'USD');
    downloadReagentsCSV([reagent], 'Test', 'GBP');
    const read = (blob: Blob) => new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
    expect(await read(blobs[0])).toContain('Cost/g (USD)');
    expect(await read(blobs[0])).toContain('12.7,6.35');
    const data = JSON.parse(await read(blobs[1]));
    expect(data.currency).toBe('USD');
    expect(data.routes[0].costPerGram).toBe(12.7);
    expect(data.routes[0].reagentProcurement[0].unitPrice).toBe(127);
    expect(await read(blobs[2])).toContain('COST PER GRAM: $12.70');
    expect(await read(blobs[3])).toContain('£100.00 / 500 g');
    expect(results.routes[0].costPerGram).toBe(10);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});