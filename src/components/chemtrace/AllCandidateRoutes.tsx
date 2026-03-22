import { useState } from 'react';
import type { SynthesisRoute } from '@/types/chemtrace';
import SectionLabel from './SectionLabel';
import { ChevronRight } from 'lucide-react';

const statusColor = (s: string) => {
  if (s === 'APPROVED') return 'hsl(var(--ct-status-green))';
  if (s === 'FLAGGED') return 'hsl(var(--ct-status-gold))';
  return 'hsl(var(--ct-status-red))';
};

const riskColor = (r: string) => {
  if (r === 'low') return 'hsl(var(--ct-status-green))';
  if (r === 'medium') return 'hsl(var(--ct-status-gold))';
  return 'hsl(var(--ct-status-red))';
};

export default function AllCandidateRoutes({ routes, location }: { routes: SynthesisRoute[]; location: string }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section>
      <SectionLabel label="ALL CANDIDATE ROUTES" />
      <div className="space-y-2">
        {routes.map(route => {
          const isOpen = open === route.id;
          return (
            <div key={route.id} className="border rounded-[3px] bg-card" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <button
                onClick={() => setOpen(isOpen ? null : route.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-ink))' }}>
                  {route.id} — {route.name} | <span style={{ color: statusColor(route.status) }}>{route.status}</span> | Score {route.score} | Yield {route.yieldPercent}% | £{route.costPerGram}/g
                </span>
                <ChevronRight
                  size={14}
                  className="transition-transform duration-200 flex-shrink-0"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: 'hsl(var(--ct-muted))' }}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: steps + citation + risk */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-serif-display font-bold text-sm" style={{ color: 'hsl(var(--ct-ink))' }}>{route.name}</span>
                        <span className="font-mono-data uppercase text-[0.58rem]" style={{ color: statusColor(route.status) }}>{route.status}</span>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        {route.steps.map(step => (
                          <div key={step.number} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono-data text-[0.6rem] text-white" style={{ backgroundColor: 'hsl(var(--ct-teal))' }}>{step.number}</span>
                            <span className="font-body text-xs leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>{step.description}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 rounded-r-[2px] mb-2" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: '3px solid hsl(var(--ct-amber))' }}>
                        <span className="mr-1">📖</span>
                        <span className="font-serif-display italic text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>{route.citation}</span>
                      </div>
                      <div className="font-mono-data text-[0.7rem] flex gap-3">
                        <span><span style={{ color: riskColor(route.supplyRisk) }}>●</span> Supply: {route.supplyRisk}</span>
                        <span><span style={{ color: riskColor(route.regulatoryRisk) }}>●</span> Regulatory: {route.regulatoryRisk}</span>
                      </div>
                      <p className="font-body italic text-xs mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>{route.decisionReason}</p>
                    </div>

                    {/* Right: compact reagent table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[0.72rem]">
                        <thead>
                          <tr style={{ backgroundColor: 'hsl(var(--ct-sidebar))' }}>
                            {['Reagent', `Supplier (Country)`, 'Price', 'Availability', 'Lead', `Status (${location})`].map(h => (
                              <th key={h} className="font-mono-data uppercase text-[0.58rem] text-white font-medium px-2 py-1 text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {route.reagentProcurement.map((r, i) => (
                            <tr key={r.cas} style={{ backgroundColor: i % 2 === 0 ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--ct-border))' }}>
                              <td className="font-body px-2 py-1">{r.name}</td>
                              <td className="font-body px-2 py-1">{r.supplier} ({r.country})</td>
                              <td className="font-mono-data px-2 py-1">{r.price}</td>
                              <td className="font-body px-2 py-1">{r.availability}</td>
                              <td className="font-mono-data px-2 py-1 text-center">{r.leadDays}</td>
                              <td className="font-mono-data uppercase text-[0.55rem] px-2 py-1">{r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Risk notes */}
                  {route.riskNotes?.map((note, i) => {
                    const bg = note.type === 'error' ? 'hsl(0,90%,96%)' : note.type === 'warning' ? 'hsl(38,90%,96%)' : 'hsl(210,90%,96%)';
                    const border = note.type === 'error' ? 'hsl(var(--ct-status-red))' : note.type === 'warning' ? 'hsl(var(--ct-status-gold))' : 'hsl(var(--ct-teal))';
                    return (
                      <div key={i} className="mt-2 p-2 rounded-[3px] font-body text-xs" style={{ backgroundColor: bg, borderLeft: `3px solid ${border}`, color: 'hsl(var(--ct-ink))' }}>
                        {note.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
