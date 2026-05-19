import type { MoleculeData, SynthesisRoute } from '@/types/chemtrace';

/**
 * Estimate atom economy and Process Mass Intensity (PMI) for a route.
 * These are indicative — true values require reaction stoichiometry that we don't always have
 * for dynamically-generated routes. We use heuristics keyed off MW, step count, and reagent count.
 */

export interface GreenMetrics {
  atomEconomyPct: number;   // (MW product / sum MW reagents) * 100, estimated
  pmi: number;              // kg total mass in / kg product out, estimated
  eFactor: number;          // kg waste / kg product (= PMI - 1)
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  basis: string;            // short note on how it was estimated
}

export function computeGreenMetrics(molecule: MoleculeData, route: SynthesisRoute): GreenMetrics {
  const productMw = molecule.mw || 200;

  // Heuristic average MW per reagent for organic synthesis (~150 g/mol)
  const avgReagentMw = 150;
  const reagentMassEstimate = Math.max(1, route.reagents.length) * avgReagentMw;

  // Atom economy: cap at 95% for realism, floor at 15%
  const rawAE = (productMw / (productMw + reagentMassEstimate * 0.6)) * 100;
  const atomEconomyPct = Math.max(15, Math.min(95, +rawAE.toFixed(1)));

  // PMI: scales with steps and inversely with yield. Pharma industry median is ~25-100.
  const yieldFactor = Math.max(0.2, route.yieldPercent / 100);
  const pmi = +(8 * route.steps.length / yieldFactor).toFixed(1);

  const eFactor = +(pmi - 1).toFixed(1);

  let rating: GreenMetrics['rating'];
  if (atomEconomyPct > 70 && pmi < 30) rating = 'excellent';
  else if (atomEconomyPct > 55 && pmi < 60) rating = 'good';
  else if (atomEconomyPct > 35 && pmi < 100) rating = 'fair';
  else rating = 'poor';

  return {
    atomEconomyPct,
    pmi,
    eFactor,
    rating,
    basis: `Estimated from product MW (${productMw.toFixed(0)}), ${route.reagents.length} reagents, ${route.steps.length} steps, ${route.yieldPercent}% yield`,
  };
}

export function ratingColor(r: GreenMetrics['rating']): string {
  if (r === 'excellent') return 'hsl(var(--ct-status-green))';
  if (r === 'good') return 'hsl(var(--ct-status-green))';
  if (r === 'fair') return 'hsl(var(--ct-status-gold))';
  return 'hsl(var(--ct-status-red))';
}