import type { PipelineResults } from '@/types/chemtrace';
import SectionLabel from './SectionLabel';

export default function MoleculeIdentityBar({ results }: { results: PipelineResults }) {
  const { molecule, location, regulatory } = results;
  const metrics = [
    { label: 'MW', value: molecule.mw },
    { label: 'XLOGP', value: molecule.xlogp },
    { label: 'HBD', value: molecule.hbd },
    { label: 'RINGS', value: molecule.rings },
  ];

  return (
    <section>
      <SectionLabel label="MOLECULE" />
      <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3">
        <div className="bg-card border rounded-[3px] p-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <div className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>SMILES</div>
          <div className="font-mono-data text-sm mt-1 break-all" style={{ color: 'hsl(var(--ct-teal))' }}>{molecule.smiles}</div>
          {molecule.iupac && (
            <div className="font-body text-xs italic mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>{molecule.iupac}</div>
          )}
        </div>
        {metrics.map(m => (
          <div key={m.label} className="bg-card border rounded-[3px] p-4 text-center" style={{ borderColor: 'hsl(var(--ct-border))' }}>
            <div className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>{m.label}</div>
            <div className="font-mono-data text-lg mt-1" style={{ color: 'hsl(var(--ct-ink))' }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="font-mono-data text-xs mt-3" style={{ color: 'hsl(var(--ct-muted))' }}>
        📍 Production: {location} | Regulatory body: {regulatory.body}
      </div>
    </section>
  );
}
