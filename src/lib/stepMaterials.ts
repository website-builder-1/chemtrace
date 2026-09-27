import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReactionConditions } from '@/types/chemtrace';
import { buildSupplierUrl } from './supplierLinks';

export interface CatalogProduct {
  supplier: string; material_key: string; aliases: string[]; product_name: string;
  cas: string | null; pack_size: string; price: number | null; currency: string; product_url: string; price_note: string;
}
export interface StepMaterial { name: string; role: string; offers: CatalogProduct[]; fallbackUrl: string }

let cache: Promise<CatalogProduct[]> | null = null;
function loadCatalog(): Promise<CatalogProduct[]> {
  cache ??= (async () => {
    const { data } = await supabase.from('supplier_products')
      .select('material_key, aliases, product_name, cas, pack_size, price, currency, product_url, price_note, suppliers(name)');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map(r => ({ ...r, supplier: r.suppliers?.name ?? '' }));
  })();
  return cache;
}

export function useSupplierCatalog() {
  const [cat, setCat] = useState<CatalogProduct[]>([]);
  useEffect(() => { loadCatalog().then(setCat); }, []);
  return cat;
}

const norm = (s: string) => s.toLowerCase().replace(/\((cat\.|excess)\)/g, '').replace(/\s+/g, ' ').trim();

function match(name: string, cat: CatalogProduct[]): CatalogProduct[] {
  const n = norm(name);
  const exact = cat.filter(p => norm(p.material_key) === n || p.aliases.some(a => norm(a) === n));
  if (exact.length) return exact;
  return cat.filter(p => n.includes(norm(p.material_key)) || p.aliases.some(a => a.length > 2 && n.includes(norm(a))));
}

export function materialsForStep(c: ReactionConditions | undefined, cat: CatalogProduct[]): StepMaterial[] {
  if (!c) return [];
  const items: Array<[string, string]> = [];
  const split = (s?: string) => (s ?? '').split(/[,;]| or /).map(x => x.trim()).filter(Boolean);
  split(c.reagents).forEach(n => items.push([n, 'Reagent']));
  split(c.catalyst).forEach(n => items.push([n, 'Catalyst']));
  if (c.solvent) items.push([c.solvent, 'Solvent']);
  const seen = new Set<string>();
  return items.filter(([n]) => {
    const k = norm(n);
    if (seen.has(k) || /^(none|neat|n\/a|—|-)/i.test(k)) return false;
    seen.add(k); return true;
  }).map(([name, role]) => ({
    name, role,
    offers: match(name, cat).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)).slice(0, 3),
    fallbackUrl: buildSupplierUrl('Sigma-Aldrich', '', name),
  }));
}
