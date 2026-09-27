import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReactionConditions, RouteStep } from '@/types/chemtrace';
import { buildSupplierUrl } from './supplierLinks';

export interface CatalogProduct {
  id: string; supplier: string; material_key: string; aliases: string[]; product_name: string; smiles: string | null;
  cas: string | null; pack_size: string; price: number | null; currency: string; product_url: string; price_note: string;
  price_source: string; updated_at: string; price_checked_at: string | null;
}
export interface StepMaterial { name: string; role: string; offers: CatalogProduct[]; fallbackUrl: string }

const SELECT = 'id, material_key, aliases, product_name, smiles, cas, pack_size, price, currency, product_url, price_note, price_source, updated_at, price_checked_at, suppliers(name)';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (r: any): CatalogProduct => ({ ...r, supplier: r.suppliers?.name ?? '' });

let current: CatalogProduct[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(c: CatalogProduct[]) => void>();
const emit = () => listeners.forEach(l => l(current));

async function refetch() {
  const { data } = await supabase.from('supplier_products').select(SELECT);
  current = (data ?? []).map(toProduct); emit();
}

function start() {
  loaded ??= (async () => {
    await refetch();
    // Live updates: any price change by staff or the daily check appears immediately.
    supabase.channel('supplier_products_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_products' }, () => { refetch(); })
      .subscribe();
  })();
}

export function useSupplierCatalog() {
  const [cat, setCat] = useState<CatalogProduct[]>(current);
  useEffect(() => { listeners.add(setCat); start(); setCat(current); return () => { listeners.delete(setCat); }; }, []);
  return cat;
}

const norm = (s: string) => s.toLowerCase().replace(/\((cat\.|excess)\)/g, '').replace(/\s+/g, ' ').trim();

function match(name: string, cat: CatalogProduct[]): CatalogProduct[] {
  const n = norm(name);
  const words = n.split(/[\s/()]+/).filter(Boolean);
  return cat.filter(p => [p.material_key, ...p.aliases].map(norm).some(a =>
    a === n || (a.length > 2 && n.includes(a)) || words.includes(a)));
}

const best = (offers: CatalogProduct[]) => offers.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)).slice(0, 3);

/** Reactants of a step (from its reaction SMILES) that are bought in, not made in an earlier step. */
function startingMaterials(step: RouteStep, earlierProducts: Set<string>, cat: CatalogProduct[]): StepMaterial[] {
  const lhs = step.reactionSmiles?.split('>>')[0];
  if (!lhs) return [];
  return lhs.split('.').filter(s => s && !earlierProducts.has(s)).map(smi => {
    const offers = cat.filter(p => p.smiles === smi);
    const name = offers[0]?.material_key ?? smi;
    return { name, role: 'Starting material', offers: best(offers), fallbackUrl: buildSupplierUrl('Sigma-Aldrich', '', name) };
  });
}

export function materialsForStep(c: ReactionConditions | undefined, cat: CatalogProduct[], step?: RouteStep, allSteps?: RouteStep[]): StepMaterial[] {
  const out: StepMaterial[] = [];
  if (step) {
    const earlier = new Set<string>();
    for (const s of allSteps ?? []) {
      if (s.number >= step.number) break;
      s.reactionSmiles?.split('>>')[1]?.split('.').forEach(x => earlier.add(x));
    }
    out.push(...startingMaterials(step, earlier, cat));
  }
  if (c) {
    const items: Array<[string, string]> = [];
    const split = (s?: string) => (s ?? '').split(/[,;]| or /).map(x => x.trim()).filter(Boolean);
    split(c.reagents).forEach(n => items.push([n, 'Reagent']));
    split(c.catalyst).forEach(n => items.push([n, 'Catalyst']));
    if (c.solvent) items.push([c.solvent, 'Solvent']);
    items.forEach(([name, role]) => out.push({ name, role, offers: best(match(name, cat)), fallbackUrl: buildSupplierUrl('Sigma-Aldrich', '', name) }));
  }
  const seen = new Set<string>();
  return out.filter(m => {
    const k = norm(m.name);
    if (seen.has(k) || /^(none|neat|n\/a|—|-)/i.test(k)) return false;
    seen.add(k); return true;
  });
}

export function priceLabel(o: CatalogProduct): string {
  const when = new Date(o.price_source === 'auto' && o.price_checked_at ? o.price_checked_at : o.updated_at).toLocaleDateString();
  if (o.price_source === 'auto') return `Live from supplier · ${when}`;
  if (o.price_source === 'manual') return `Checked by ChemTraceIt staff · ${when}`;
  return `Estimated list price · ${when}`;
}
