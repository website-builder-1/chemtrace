import { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Leaf } from 'lucide-react';
import type { SynthesisRoute, MoleculeData } from '@/types/chemtrace';
import { fmt, type Currency } from '@/lib/currency';
import { computeGreenMetrics, ratingColor } from '@/lib/greenChem';
import { searchLiterature, buildQuery, type Citation } from '@/lib/literature';
import SectionLabel from './SectionLabel';

const statusStyle = (s: string) => {
  if (s === 'APPROVED') return { color: 'hsl(var(--ct-status-green))', icon: '✓' };
  if (s === 'FLAGGED') return { color: 'hsl(var(--ct-status-gold))', icon: '△' };
  return { color: 'hsl(var(--ct-status-red))', icon: '✕' };
};

const riskColor = (r: string) => {
  if (r === 'low') return 'hsl(var(--ct-status-green))';
  if (r === 'medium') return 'hsl(var(--ct-status-gold))';
  return 'hsl(var(--ct-status-red))';
};

export interface TopRouteCardProps {
  route: SynthesisRoute;
  molecule: MoleculeData;
  currency: Currency;
}

/** Fires a window event so the AI agent panel can pre-fill a prompt and stream a response. */
function emitExplainStep(stepNumber: number, description: string, routeName: string) {
  const prompt = `Explain step ${stepNumber} of the "${routeName}" route in detail: "${description}". Cover the reaction mechanism, why these reagents/conditions are chosen, expected by-products, and critical safety considerations.`;
  window.dispatchEvent(new CustomEvent('chemtrace:explain', { detail: { prompt } }));
  // Scroll the AI panel into view
  setTimeout(() => {
    const el = document.getElementById('chemtrace-ai-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

export default function TopRouteCard({ route, molecule, currency }: TopRouteCardProps) {
  const st = statusStyle(route.status);
  const green = computeGreenMetrics(molecule, route);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citLoading, setCitLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCitLoading(true);
    searchLiterature(buildQuery(molecule.name, route.name), 4).then(c => {
      if (!cancelled) {
        setCitations(c);
        setCitLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [molecule.name, route.name]);

  const stats = [
    { label: 'EST. YIELD', value: `${route.yieldPercent}%` },
    { label: 'COST/GRAM', value: fmt(route.costPerGram, currency) },
    { label: 'BATCH EST.', value: fmt(route.batchEstimate, currency) },
    { label: 'SCORE', value: route.score.toFixed(2) },
    { label: 'STEPS', value: route.steps.length },
  ];

  return (
    <section>
      <SectionLabel label="TOP RECOMMENDED ROUTE" />
      <div className="bg-card rounded-[3px] p-6" style={{ borderLeft: '5px solid hsl(var(--ct-teal))', border: '1.5px solid hsl(var(--ct-teal))', borderLeftWidth: '5px' }}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-mono-data uppercase text-[0.6rem] tracking-wider text-white px-2 py-0.5 rounded-[1px]" style={{ backgroundColor: 'hsl(var(--ct-teal))' }}>★ Recommended</span>
          <span className="font-serif-display font-bold text-base" style={{ color: 'hsl(var(--ct-ink))' }}>{route.name}</span>
          <span className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: st.color }}>{st.icon} {route.status}</span>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mb-5">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-mono-data text-xl font-medium" style={{ color: 'hsl(var(--ct-teal))' }}>{s.value}</div>
              <div className="font-mono-data uppercase text-[0.55rem] tracking-wider mt-0.5" style={{ color: 'hsl(var(--ct-muted))' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Green chemistry metrics */}
        <div className="mb-5 p-3 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: '3px solid ' + ratingColor(green.rating) }}>
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-3.5 h-3.5" style={{ color: ratingColor(green.rating) }} />
            <span className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>
              GREEN CHEMISTRY · <span style={{ color: ratingColor(green.rating) }}>{green.rating.toUpperCase()}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div>
              <div className="font-mono-data text-base font-medium" style={{ color: 'hsl(var(--ct-ink))' }}>{green.atomEconomyPct}%</div>
              <div className="font-mono-data uppercase text-[0.55rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>ATOM ECONOMY</div>
            </div>
            <div>
              <div className="font-mono-data text-base font-medium" style={{ color: 'hsl(var(--ct-ink))' }}>{green.pmi}</div>
              <div className="font-mono-data uppercase text-[0.55rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>PMI (kg/kg)</div>
            </div>
            <div>
              <div className="font-mono-data text-base font-medium" style={{ color: 'hsl(var(--ct-ink))' }}>{green.eFactor}</div>
              <div className="font-mono-data uppercase text-[0.55rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>E-FACTOR</div>
            </div>
          </div>
          <p className="font-body italic text-[0.7rem] mt-2" style={{ color: 'hsl(var(--ct-muted))' }}>{green.basis}</p>
        </div>

        {/* Synthesis pathway */}
        <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>SYNTHESIS PATHWAY</div>
        <div className="space-y-3 mb-4">
          {route.steps.map(step => (
            <div key={step.number} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono-data text-[0.6rem] text-white" style={{ backgroundColor: 'hsl(var(--ct-teal))' }}>{step.number}</span>
              <div className="flex-1 min-w-0">
                <span className="font-body text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>
                  {step.description}
                  {step.smiles && <code className="ml-1 font-mono-data text-[0.7rem] px-1 py-0.5 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: 'hsl(var(--ct-teal))' }}>{step.smiles}</code>}
                </span>
                <button
                  onClick={() => emitExplainStep(step.number, step.description, route.name)}
                  className="ml-1 inline-flex items-center gap-1 font-mono-data text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] transition-colors"
                  style={{ color: 'hsl(var(--ct-teal))', backgroundColor: 'transparent', border: '1px solid hsl(var(--ct-teal))' }}
                  title="Ask the AI to explain this step"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Explain
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Reagents */}
        <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-1" style={{ color: 'hsl(var(--ct-muted))' }}>REAGENTS</div>
        <p className="font-body text-sm mb-4" style={{ color: 'hsl(var(--ct-ink))' }}>{route.reagents.join(', ')}</p>

        {/* Static curated citation, kept as historical reference */}
        <div className="p-3 rounded-r-[2px] mb-3" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: '3px solid hsl(var(--ct-amber))' }}>
          <span className="mr-1">📖</span>
          <span className="font-serif-display italic text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-muted))' }}>{route.citation}</span>
        </div>

        {/* Live literature from CrossRef */}
        <div className="mb-2">
          <div className="font-mono-data uppercase text-[0.6rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>
            LIVE LITERATURE · CrossRef
          </div>
          {citLoading && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 rounded-full animate-ct-spin" style={{ borderColor: 'hsl(var(--ct-teal))', borderTopColor: 'transparent' }} />
              <span className="font-mono-data text-[0.7rem]" style={{ color: 'hsl(var(--ct-muted))' }}>Searching journals…</span>
            </div>
          )}
          {!citLoading && citations.length === 0 && (
            <p className="font-body text-xs italic" style={{ color: 'hsl(var(--ct-muted))' }}>No relevant journal articles found via CrossRef.</p>
          )}
          {!citLoading && citations.length > 0 && (
            <ul className="space-y-1.5">
              {citations.map(c => (
                <li key={c.doi} className="font-body text-xs leading-snug" style={{ color: 'hsl(var(--ct-ink))' }}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline gap-1 hover:underline"
                    style={{ color: 'hsl(var(--ct-teal))' }}
                  >
                    <ExternalLink className="w-2.5 h-2.5 translate-y-[1px] flex-shrink-0" />
                    <span>
                      <span className="font-medium">{c.title}</span>
                      {c.journal && <span className="italic" style={{ color: 'hsl(var(--ct-muted))' }}> — {c.journal}</span>}
                      {c.year && <span style={{ color: 'hsl(var(--ct-muted))' }}> ({c.year})</span>}
                    </span>
                  </a>
                  <div className="font-body text-[0.7rem] pl-3.5" style={{ color: 'hsl(var(--ct-muted))' }}>{c.authors} · DOI: {c.doi}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Risk */}
        <div className="flex flex-wrap gap-4 mt-4 font-mono-data text-xs">
          <span>
            <span style={{ color: riskColor(route.supplyRisk) }}>●</span> Supply: {route.supplyRisk}
          </span>
          <span>
            <span style={{ color: riskColor(route.regulatoryRisk) }}>●</span> Regulatory: {route.regulatoryRisk}
          </span>
        </div>

        <p className="font-body italic text-xs mt-2" style={{ color: 'hsl(var(--ct-muted))' }}>{route.decisionReason}</p>
      </div>

      {/* Risk notes */}
      {route.riskNotes?.map((note, i) => {
        const bg = note.type === 'error' ? 'hsl(0,90%,96%)' : note.type === 'warning' ? 'hsl(38,90%,96%)' : 'hsl(210,90%,96%)';
        const border = note.type === 'error' ? 'hsl(var(--ct-status-red))' : note.type === 'warning' ? 'hsl(var(--ct-status-gold))' : 'hsl(var(--ct-teal))';
        return (
          <div key={i} className="mt-2 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: bg, borderLeft: `3px solid ${border}`, color: 'hsl(var(--ct-ink))' }}>
            {note.text}
          </div>
        );
      })}
    </section>
  );
}