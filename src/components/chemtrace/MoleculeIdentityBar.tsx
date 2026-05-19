import { useState } from 'react';
import { ShieldCheck, Database, Sparkles } from 'lucide-react';
import type { PipelineResults } from '@/types/chemtrace';
import SectionLabel from './SectionLabel';

function getSmilesImageUrl(smiles: string, size = 300) {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=${size}x${size}`;
}

function ProvenanceBadge({ source }: { source?: 'pubchem' | 'curated' | 'ai-inferred' }) {
  const cfg = (() => {
    switch (source) {
      case 'pubchem': return { icon: <ShieldCheck className="w-3 h-3" />, label: 'PUBCHEM VERIFIED', color: 'hsl(var(--ct-status-green))' };
      case 'curated': return { icon: <Database className="w-3 h-3" />, label: 'CURATED DATASET', color: 'hsl(var(--ct-teal))' };
      case 'ai-inferred': return { icon: <Sparkles className="w-3 h-3" />, label: 'AI-INFERRED', color: 'hsl(var(--ct-status-gold))' };
      default: return { icon: <Sparkles className="w-3 h-3" />, label: 'UNVERIFIED', color: 'hsl(var(--ct-muted))' };
    }
  })();
  return (
    <span className="inline-flex items-center gap-1 font-mono-data uppercase text-[0.55rem] tracking-wider px-1.5 py-0.5 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function MoleculeIdentityBar({ results }: { results: PipelineResults }) {
  const { molecule, location, regulatory } = results;
  const [imgError, setImgError] = useState(false);
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
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>SMILES</div>
            <ProvenanceBadge source={molecule.source} />
          </div>
          <div className="font-mono-data text-sm mt-1 break-all" style={{ color: 'hsl(var(--ct-teal))' }}>{molecule.smiles}</div>
          {molecule.iupac && (
            <div className="font-body text-xs italic mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>{molecule.iupac}</div>
          )}
          {/* Structural formula from PubChem */}
          {!imgError && (
            <div className="mt-3 flex justify-center">
              <img
                src={getSmilesImageUrl(molecule.smiles)}
                alt={`Structural formula of ${molecule.name}`}
                className="max-w-[220px] bg-white rounded-[3px] border p-1"
                style={{ borderColor: 'hsl(var(--ct-border))' }}
                onError={() => setImgError(true)}
              />
            </div>
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
