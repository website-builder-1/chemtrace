import type { SynthesisRoute } from '@/types/chemtrace';
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

export default function TopRouteCard({ route }: { route: SynthesisRoute }) {
  const st = statusStyle(route.status);
  const stats = [
    { label: 'EST. YIELD', value: `${route.yieldPercent}%` },
    { label: 'COST/GRAM', value: `£${route.costPerGram}` },
    { label: 'BATCH EST.', value: `£${route.batchEstimate}` },
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

        {/* Synthesis pathway */}
        <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>SYNTHESIS PATHWAY</div>
        <div className="space-y-2 mb-4">
          {route.steps.map(step => (
            <div key={step.number} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono-data text-[0.6rem] text-white" style={{ backgroundColor: 'hsl(var(--ct-teal))' }}>{step.number}</span>
              <span className="font-body text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>
                {step.description}
                {step.smiles && <code className="ml-1 font-mono-data text-[0.7rem] px-1 py-0.5 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: 'hsl(var(--ct-teal))' }}>{step.smiles}</code>}
              </span>
            </div>
          ))}
        </div>

        {/* Reagents */}
        <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-1" style={{ color: 'hsl(var(--ct-muted))' }}>REAGENTS</div>
        <p className="font-body text-sm mb-4" style={{ color: 'hsl(var(--ct-ink))' }}>{route.reagents.join(', ')}</p>

        {/* Citation */}
        <div className="p-3 rounded-r-[2px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: '3px solid hsl(var(--ct-amber))' }}>
          <span className="mr-1">📖</span>
          <span className="font-serif-display italic text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-muted))' }}>{route.citation}</span>
        </div>

        {/* Risk */}
        <div className="flex gap-4 mt-4 font-mono-data text-xs">
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
