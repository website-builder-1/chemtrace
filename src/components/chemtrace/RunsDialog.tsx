import { useEffect, useState } from 'react';
import { Trash2, FlaskConical, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineResults } from '@/types/chemtrace';
import { toast } from 'sonner';

interface RunRow {
  id: string;
  molecule_name: string;
  location: string;
  batch_size_mg: number;
  recommended_route_name: string;
  created_at: string;
  results: PipelineResults;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadRun: (r: PipelineResults) => void;
}

export default function RunsDialog({ open, onClose, onLoadRun }: Props) {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Could not load saved runs.');
        } else {
          setRuns((data || []) as unknown as RunRow[]);
        }
        setLoading(false);
      });
  }, [open]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('runs').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete run.');
      return;
    }
    setRuns(rs => rs.filter(r => r.id !== id));
    toast.success('Run deleted.');
  };

  const handleLoad = (run: RunRow) => {
    onLoadRun(run.results);
    onClose();
    toast.success(`Loaded ${run.molecule_name}.`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(28, 31, 34, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[3px] w-full max-w-2xl max-h-[80vh] flex flex-col border"
        style={{ borderColor: 'hsl(var(--ct-teal))', borderWidth: '1.5px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <div>
            <div className="font-serif-display font-bold text-base" style={{ color: 'hsl(var(--ct-ink))' }}>Saved Runs</div>
            <div className="font-mono-data uppercase text-[0.6rem] tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>YOUR CHEMTRACE HISTORY</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: '44px', minHeight: '44px' }} className="flex items-center justify-center">
            <X className="w-5 h-5" style={{ color: 'hsl(var(--ct-muted))' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 rounded-full animate-ct-spin" style={{ borderColor: 'hsl(var(--ct-teal))', borderTopColor: 'transparent' }} />
              <span className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>Loading saved runs…</span>
            </div>
          )}
          {!loading && runs.length === 0 && (
            <div className="text-center py-12">
              <FlaskConical className="w-10 h-10 mx-auto mb-2" style={{ color: 'hsl(var(--ct-muted))' }} />
              <p className="font-body text-sm" style={{ color: 'hsl(var(--ct-muted))' }}>
                No saved runs yet. Run a pipeline and click <strong>Save Run</strong> to keep it here.
              </p>
            </div>
          )}
          {!loading && runs.length > 0 && (
            <ul className="space-y-2">
              {runs.map(run => (
                <li
                  key={run.id}
                  className="border rounded-[3px] p-3 flex items-start justify-between gap-3"
                  style={{ borderColor: 'hsl(var(--ct-border))' }}
                >
                  <button
                    onClick={() => handleLoad(run)}
                    className="flex-1 text-left"
                  >
                    <div className="font-serif-display font-bold text-sm" style={{ color: 'hsl(var(--ct-teal))' }}>{run.molecule_name}</div>
                    <div className="font-mono-data text-[0.7rem] mt-0.5" style={{ color: 'hsl(var(--ct-muted))' }}>
                      {run.location} · {run.batch_size_mg} mg · {run.recommended_route_name}
                    </div>
                    <div className="font-mono-data text-[0.65rem] mt-0.5" style={{ color: 'hsl(var(--ct-muted))' }}>
                      Saved {new Date(run.created_at).toLocaleString()}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(run.id)}
                    className="flex items-center justify-center rounded-[3px]"
                    style={{ minWidth: '36px', minHeight: '36px', color: 'hsl(var(--ct-status-red))' }}
                    aria-label={`Delete saved run for ${run.molecule_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}