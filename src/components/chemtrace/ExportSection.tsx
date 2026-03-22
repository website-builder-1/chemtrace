import { useState } from 'react';
import type { PipelineResults } from '@/types/chemtrace';
import { downloadRoutesCSV, downloadCROBrief, downloadJSON } from '@/lib/exportUtils';
import SectionLabel from './SectionLabel';

const btnClass = "px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider border transition-colors duration-150";

export default function ExportSection({ results }: { results: PipelineResults }) {
  const [elnMsg, setElnMsg] = useState('');

  const btnStyle = { borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-teal))' };
  const hover = (e: React.MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; };
  const leave = (e: React.MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-teal))'; };

  return (
    <section>
      <SectionLabel label="EXPORT" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button className={btnClass} style={btnStyle} onMouseEnter={hover} onMouseLeave={leave} onClick={() => downloadRoutesCSV(results)}>↓ Routes CSV</button>
        <button className={btnClass} style={btnStyle} onMouseEnter={hover} onMouseLeave={leave} onClick={() => downloadCROBrief(results)}>↓ CRO Brief</button>
        <button className={btnClass} style={btnStyle} onMouseEnter={hover} onMouseLeave={leave} onClick={() => downloadJSON(results)}>↓ JSON Data</button>
        <button className={btnClass} style={btnStyle} onMouseEnter={hover} onMouseLeave={leave} onClick={() => setElnMsg('ELN push requires server-side Benchling API configuration. Contact your system administrator.')}>
          Push to ELN (Benchling)
        </button>
      </div>
      {elnMsg && (
        <div className="mt-2 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: 'hsl(210,90%,96%)', borderLeft: '3px solid hsl(var(--ct-teal))', color: 'hsl(var(--ct-ink))' }}>
          {elnMsg}
        </div>
      )}
    </section>
  );
}
