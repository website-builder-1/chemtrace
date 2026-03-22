import type { PipelineResults } from '@/types/chemtrace';
import SectionLabel from './SectionLabel';

const statusChip = (s: string) => {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    PREFERRED: { bg: 'hsl(var(--ct-green-bg))', text: 'hsl(var(--ct-status-green))', icon: '✓' },
    STANDARD: { bg: 'hsl(var(--ct-paper2))', text: 'hsl(var(--ct-ink))', icon: '–' },
    RESTRICTED: { bg: 'hsl(38,80%,92%)', text: 'hsl(var(--ct-status-gold))', icon: '△' },
    BLOCKED: { bg: 'hsl(0,70%,94%)', text: 'hsl(var(--ct-status-red))', icon: '✕' },
  };
  return map[s] || map.STANDARD;
};

const riskDot = (r: string) => {
  if (r === 'low') return 'hsl(var(--ct-status-green))';
  if (r === 'medium') return 'hsl(var(--ct-status-gold))';
  return 'hsl(var(--ct-status-red))';
};

export default function SupplyChainSection({ results }: { results: PipelineResults }) {
  const { regulatory, location } = results;
  const rec = results.routes.find(r => r.id === results.recommendedRouteId)!;
  const reagents = rec.reagentProcurement;

  return (
    <section>
      <SectionLabel label="SUPPLY CHAIN & PROCUREMENT INTELLIGENCE" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        {/* Regulatory */}
        <div>
          <h3 className="font-body font-semibold text-sm mb-2" style={{ color: 'hsl(var(--ct-ink))' }}>
            Regulatory framework — {location}
          </h3>
          {regulatory.regulations.map(r => (
            <div key={r} className="font-body text-[0.82rem] leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>— {r}</div>
          ))}
        </div>

        {/* Preferred regions */}
        <div>
          <h3 className="font-body font-semibold text-sm mb-2" style={{ color: 'hsl(var(--ct-ink))' }}>
            Preferred supplier regions
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {regulatory.preferredRegions.map(r => (
              <span key={r} className="font-mono-data uppercase text-[0.6rem] px-2 py-0.5 rounded-[1px]" style={{ backgroundColor: 'hsl(var(--ct-green-bg))', color: 'hsl(var(--ct-status-green))', border: '1px solid hsl(var(--ct-green-border))' }}>{r}</span>
            ))}
          </div>
          <p className="font-body text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>{regulatory.jurisdictionNotes}</p>
        </div>
      </div>

      {/* Procurement table */}
      <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>REAGENT PROCUREMENT TABLE</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: 'hsl(var(--ct-sidebar))' }}>
              {['Reagent', 'CAS', 'Supplier', 'Country', 'Price', 'Availability', 'Lead (days)', 'Hazard', 'Geo Risk', `Status (${location})`, 'Export Ctrl'].map(h => (
                <th key={h} className="font-mono-data uppercase text-[0.63rem] text-white font-medium px-2 py-1.5 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reagents.map((r, i) => {
              const chip = statusChip(r.status);
              return (
                <tr
                  key={r.cas}
                  className="transition-colors duration-150"
                  style={{
                    backgroundColor: i % 2 === 0 ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))',
                    borderBottom: '1px solid hsl(var(--ct-border))',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E8E0D0')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))')}
                >
                  <td className="font-body text-[0.79rem] px-2 py-1.5" style={{ color: 'hsl(var(--ct-ink))' }}>{r.name}</td>
                  <td className="font-mono-data text-[0.72rem] px-2 py-1.5" style={{ color: 'hsl(var(--ct-ink))' }}>{r.cas}</td>
                  <td className="font-body text-[0.79rem] px-2 py-1.5">{r.supplier}</td>
                  <td className="font-body text-[0.79rem] px-2 py-1.5">{r.country}</td>
                  <td className="font-mono-data text-[0.72rem] px-2 py-1.5">{r.price}</td>
                  <td className="font-body text-[0.79rem] px-2 py-1.5">{r.availability}</td>
                  <td className="font-mono-data text-[0.72rem] px-2 py-1.5 text-center">{r.leadDays}</td>
                  <td className="font-body text-[0.72rem] px-2 py-1.5">{r.hazard}</td>
                  <td className="font-mono-data text-[0.72rem] px-2 py-1.5">
                    <span style={{ color: riskDot(r.geoRisk) }}>●</span> {r.geoRisk}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="font-mono-data uppercase text-[0.58rem] px-1.5 py-0.5 rounded-[1px]" style={{ backgroundColor: chip.bg, color: chip.text }}>{chip.icon} {r.status}</span>
                  </td>
                  <td className="font-mono-data text-[0.72rem] px-2 py-1.5" style={{ color: r.exportControlled ? 'hsl(var(--ct-status-gold))' : 'hsl(var(--ct-muted))' }}>
                    {r.exportControlled ? '⚠ Yes' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
