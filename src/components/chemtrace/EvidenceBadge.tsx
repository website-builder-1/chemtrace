export type EvidenceLevel = 'documented' | 'supported' | 'hypothesis' | 'insufficient';

const META: Record<EvidenceLevel, { label: string; color: string; hint: string }> = {
  documented: { label: 'Documented', color: 'var(--ct-status-green)', hint: 'Directly supported by a database entry or cited literature.' },
  supported: { label: 'Supported inference', color: 'var(--ct-teal)', hint: 'Follows from documented chemistry by analogy (e.g. a standard reaction template), not a report for this exact case.' },
  hypothesis: { label: 'Plausible hypothesis', color: 'var(--ct-status-gold)', hint: 'Proposed by the ChemTraceIt engine. Passed automatic checks but has no supporting source yet.' },
  insufficient: { label: 'Insufficient evidence', color: 'var(--ct-status-red)', hint: 'No supporting source was found.' },
};

/** Maps backend evidence strings onto the four user-facing labels. */
export function toEvidenceLevel(v?: string): EvidenceLevel {
  switch ((v ?? '').toLowerCase()) {
    case 'documented': return 'documented';
    case 'analogous': case 'supported': case 'supported_inference': return 'supported';
    case 'insufficient': case 'insufficient_evidence': return 'insufficient';
    default: return 'hypothesis';
  }
}

export function EvidenceBadge({ level, className = '' }: { level: EvidenceLevel; className?: string }) {
  const m = META[level];
  return (
    <span
      title={m.hint}
      className={`inline-flex items-center gap-1 font-mono-data uppercase text-[0.55rem] tracking-wider px-1.5 py-0.5 rounded-[2px] border ${className}`}
      style={{ color: `hsl(${m.color})`, borderColor: `hsl(${m.color} / 0.5)`, backgroundColor: 'hsl(var(--ct-paper2))' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `hsl(${m.color})` }} />
      {m.label}
    </span>
  );
}
