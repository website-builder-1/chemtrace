import { buildSupplierUrl } from './supplierLinks';
import type { ReactionConditions } from '@/types/chemtrace';

/** Indicative catalogue prices (USD, reagent grade) for common bulk materials. */
const CATALOGUE: Record<string, { cas: string; supplier: string; price: string }> = {
  'ethylene': { cas: '74-85-1', supplier: 'BOC Gases', price: '≈ $90 / lecture bottle' },
  'water': { cas: '7732-18-5', supplier: 'Sigma-Aldrich', price: '≈ $40 / 1 L (HPLC)' },
  'phosphoric acid': { cas: '7664-38-2', supplier: 'Sigma-Aldrich', price: '≈ $70 / 500 mL' },
  'sulfuric acid': { cas: '7664-93-9', supplier: 'Sigma-Aldrich', price: '≈ $60 / 500 mL' },
  'h2so4': { cas: '7664-93-9', supplier: 'Sigma-Aldrich', price: '≈ $60 / 500 mL' },
  'hydrochloric acid': { cas: '7647-01-0', supplier: 'Fisher Scientific', price: '≈ $55 / 500 mL' },
  'acetic acid': { cas: '64-19-7', supplier: 'Sigma-Aldrich', price: '≈ $50 / 500 mL' },
  'acetic anhydride': { cas: '108-24-7', supplier: 'Sigma-Aldrich', price: '≈ $65 / 500 mL' },
  'salicylic acid': { cas: '69-72-7', supplier: 'Sigma-Aldrich', price: '≈ $45 / 500 g' },
  'methanol': { cas: '67-56-1', supplier: 'Fisher Scientific', price: '≈ $40 / 1 L' },
  'ethanol': { cas: '64-17-5', supplier: 'Fisher Scientific', price: '≈ $60 / 1 L' },
  'acetone': { cas: '67-64-1', supplier: 'Fisher Scientific', price: '≈ $35 / 1 L' },
  'toluene': { cas: '108-88-3', supplier: 'Sigma-Aldrich', price: '≈ $55 / 1 L' },
  'benzene': { cas: '71-43-2', supplier: 'Sigma-Aldrich', price: '≈ $70 / 1 L' },
  'dichloromethane': { cas: '75-09-2', supplier: 'Fisher Scientific', price: '≈ $50 / 1 L' },
  'thf': { cas: '109-99-9', supplier: 'Sigma-Aldrich', price: '≈ $75 / 1 L' },
  'sodium hydroxide': { cas: '1310-73-2', supplier: 'Sigma-Aldrich', price: '≈ $40 / 500 g' },
  'naoh': { cas: '1310-73-2', supplier: 'Sigma-Aldrich', price: '≈ $40 / 500 g' },
  'hydrogen': { cas: '1333-74-0', supplier: 'BOC Gases', price: 'Cylinder rental — quote' },
  'h2': { cas: '1333-74-0', supplier: 'BOC Gases', price: 'Cylinder rental — quote' },
  'palladium on carbon': { cas: '7440-05-3', supplier: 'Sigma-Aldrich', price: '≈ $120 / 5 g (10%)' },
  'pd/c': { cas: '7440-05-3', supplier: 'Sigma-Aldrich', price: '≈ $120 / 5 g (10%)' },
  'nickel': { cas: '7440-02-0', supplier: 'Sigma-Aldrich', price: '≈ $80 / 100 g' },
  'aluminium chloride': { cas: '7446-70-0', supplier: 'Sigma-Aldrich', price: '≈ $60 / 250 g' },
  'alcl3': { cas: '7446-70-0', supplier: 'Sigma-Aldrich', price: '≈ $60 / 250 g' },
  'carbon monoxide': { cas: '630-08-0', supplier: 'BOC Gases', price: 'Cylinder — quote' },
  'oxygen': { cas: '7782-44-7', supplier: 'BOC Gases', price: 'Cylinder — quote' },
  'ammonia': { cas: '7664-41-7', supplier: 'BOC Gases', price: 'Cylinder — quote' },
  'p-aminophenol': { cas: '123-30-8', supplier: 'TCI Chemicals', price: '≈ $50 / 100 g' },
  '4-aminophenol': { cas: '123-30-8', supplier: 'TCI Chemicals', price: '≈ $50 / 100 g' },
  'isobutylbenzene': { cas: '538-93-2', supplier: 'TCI Chemicals', price: '≈ $60 / 100 mL' },
};

export interface StepMaterial { name: string; role: string; supplier: string; cas: string; price: string; url: string }

export function materialsForStep(c?: ReactionConditions): StepMaterial[] {
  if (!c) return [];
  const items: Array<[string, string]> = [];
  (c.reagents ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(n => items.push([n, 'Reagent']));
  if (c.catalyst) items.push([c.catalyst, 'Catalyst']);
  if (c.solvent) items.push([c.solvent, 'Solvent']);
  const seen = new Set<string>();
  return items.filter(([n]) => {
    const k = n.toLowerCase();
    if (seen.has(k) || /^(none|n\/a|—|-|neat)$/i.test(n)) return false;
    seen.add(k); return true;
  }).map(([name, role]) => {
    const key = name.toLowerCase().replace(/\(.*?\)/g, '').trim();
    const hit = CATALOGUE[key] ?? Object.entries(CATALOGUE).find(([k]) => key.includes(k))?.[1];
    const supplier = hit?.supplier ?? 'Sigma-Aldrich';
    const cas = hit?.cas ?? '';
    return { name, role, supplier, cas, price: hit?.price ?? 'Price on supplier site', url: buildSupplierUrl(supplier, cas, name) };
  });
}
