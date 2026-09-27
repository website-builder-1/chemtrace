import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Run { id: string; created_at: string; engine_version: string | null; summary: Record<string, number | null>; results: Array<{ id: string; category: string; pass: boolean; detail: string; ms: number }> }

const METRICS: Array<[string, string, boolean?]> = [
  ['accuracy', 'Overall accuracy'], ['identification', 'Compound & property'], ['reactions', 'Reactions & retrosynthesis'],
  ['reasoning', 'Chemical reasoning'], ['retrieval', 'Retrieval quality'], ['citation_accuracy', 'Citation accuracy'],
  ['hallucination_rate', 'Hallucination rate', true], ['safety', 'Safety refusals'],
];

export default function Benchmark() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);

  async function load() {
    const { data } = await supabase.from('benchmark_runs').select('*').order('created_at', { ascending: false }).limit(10);
    setRuns((data ?? []) as unknown as Run[]);
  }
  useEffect(() => { load(); }, []);

  async function run() {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('benchmark-run', { body: {} });
    setRunning(false);
    if (error || data?.error) { toast.error(data?.error ?? 'Benchmark failed or timed out — try again.'); return; }
    toast.success('Benchmark complete.');
    load();
  }

  const latest = runs[0];
  const prev = runs[1];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto px-5 py-12 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Quality control</div>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
          <h1 className="font-serif-display text-3xl sm:text-4xl" style={{ color: 'hsl(var(--ct-ink))' }}>Accuracy benchmark</h1>
          <button onClick={run} disabled={running} className="px-5 py-2 rounded-[3px] font-mono-data text-xs uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {running ? 'Running (up to 2 min)…' : 'Run benchmark'}
          </button>
        </div>
        <p className="font-body mt-3 max-w-2xl" style={{ color: 'hsl(var(--ct-muted))' }}>
          A fixed set of test questions: compound identification, properties, reactions, retrosynthesis, reasoning, made-up compounds (to catch invented answers) and safety refusals.
          An improvement only counts if these numbers go up.
        </p>

        {!latest ? <p className="font-body mt-10" style={{ color: 'hsl(var(--ct-muted))' }}>No runs yet.</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              {METRICS.map(([k, label, lowerBetter]) => {
                const v = latest.summary[k]; const p = prev?.summary[k];
                const delta = v != null && p != null ? v - p : null;
                const good = delta == null || delta === 0 ? null : lowerBetter ? delta < 0 : delta > 0;
                return (
                  <div key={k} className="bg-card border rounded-[3px] p-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                    <div className="font-mono-data text-2xl" style={{ color: 'hsl(var(--ct-teal))' }}>{v == null ? '—' : `${v}%`}</div>
                    <div className="font-mono-data text-[0.6rem] uppercase tracking-wider mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>{label}</div>
                    {delta != null && delta !== 0 && (
                      <div className="font-mono-data text-[0.6rem] mt-1" style={{ color: good ? 'hsl(var(--ct-status-green))' : 'hsl(var(--ct-status-red))' }}>{delta > 0 ? '+' : ''}{delta} vs previous</div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="font-mono-data text-[0.65rem] mt-3" style={{ color: 'hsl(var(--ct-muted))' }}>
              Latest run {new Date(latest.created_at).toLocaleString()} · engine {latest.engine_version} · {latest.results.length} cases
            </p>
            <div className="mt-6 bg-card border rounded-[3px] overflow-x-auto" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <table className="w-full text-sm font-body">
                <thead><tr className="font-mono-data text-[0.6rem] uppercase text-left" style={{ color: 'hsl(var(--ct-muted))' }}>
                  <th className="p-3">Case</th><th className="p-3">Category</th><th className="p-3">Result</th><th className="p-3">Detail</th></tr></thead>
                <tbody>
                  {latest.results.map(r => (
                    <tr key={r.id} className="border-t" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                      <td className="p-3 font-mono-data text-xs">{r.id}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>{r.category}</td>
                      <td className="p-3 font-mono-data text-xs" style={{ color: r.pass ? 'hsl(var(--ct-status-green))' : 'hsl(var(--ct-status-red))' }}>{r.pass ? 'PASS' : 'FAIL'}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>{r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
