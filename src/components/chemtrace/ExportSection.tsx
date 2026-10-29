import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { PipelineResults } from '@/types/chemtrace';
import { downloadRoutesCSV, downloadCROBrief, downloadJSON } from '@/lib/exportUtils';
import SectionLabel from './SectionLabel';
import type { Currency } from '@/lib/currency';
import { useSupplierCatalog, enrichReagent } from '@/lib/stepMaterials';

export default function ExportSection({ results, currency }: { results: PipelineResults; currency: Currency }) {
  const [elnMsg, setElnMsg] = useState('');
  const catalog = useSupplierCatalog();
  const exportResults = { ...results, routes: results.routes.map(r => ({ ...r, reagentProcurement: r.reagentProcurement.map(p => enrichReagent(p, catalog)) })) };

  return (
    <section>
      <SectionLabel label="EXPORT" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto min-h-10 whitespace-normal text-xs" onClick={() => downloadRoutesCSV(exportResults, currency)}>↓ Routes CSV</Button>
        <Button variant="outline" className="h-auto min-h-10 whitespace-normal text-xs" onClick={() => downloadCROBrief(exportResults, currency)}>↓ CRO brief</Button>
        <Button variant="outline" className="h-auto min-h-10 whitespace-normal text-xs" onClick={() => downloadJSON(exportResults, currency)}>↓ JSON data</Button>
        <Button variant="outline" className="h-auto min-h-10 whitespace-normal text-xs" onClick={() => setElnMsg('Sending to Benchling is not available yet. Ask your administrator to connect Benchling.')}>
          Send to Benchling
        </Button>
      </div>
      {elnMsg && (
        <div className="mt-2 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: '3px solid hsl(var(--ct-teal))', color: 'hsl(var(--ct-ink))' }}>
          {elnMsg}
        </div>
      )}
    </section>
  );
}
