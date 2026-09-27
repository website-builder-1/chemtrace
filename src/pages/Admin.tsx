import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';
import NotFound from './NotFound';
import PeopleTab from '@/components/site/PeopleTab';
import { Btn, Card, Tabs, inputCls, inputStyle, muted, ink } from '@/components/site/StaffUI';

interface Title { id: string; name: string }
type Tab = 'staff' | 'titles' | 'benchmark' | 'log';


export default function Admin() {
  const { loading, isAdmin } = useRoles();
  if (loading) return null;
  if (!isAdmin) return <NotFound />;
  return <AdminInner />;
}

function AdminInner() {
  const [tab, setTab] = useState<Tab>('staff');
  const [titles, setTitles] = useState<Title[]>([]);

  const load = async () => {
    const { data: t } = await supabase.from('company_titles').select('id, name').order('created_at');
    setTitles(t ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-5 py-12 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Admin</div>
        <h1 className="font-serif-display text-3xl sm:text-4xl mt-2" style={ink}>Control panel</h1>
        <Tabs<Tab> tabs={[['staff', 'People'], ['titles', 'Titles'], ['benchmark', 'Accuracy benchmark'], ['log', 'Usage log']]} value={tab} onChange={setTab} />
        {tab === 'staff' && <PeopleTab isAdmin />}
        {tab === 'titles' && <TitlesTab titles={titles} reload={load} />}
        {tab === 'benchmark' && <Card><p className="font-body text-sm" style={muted}>Run the fixed chemistry test set and compare scores.</p><div className="mt-3"><Link to="/admin/benchmark"><Btn>Open benchmark →</Btn></Link></div></Card>}
        {tab === 'log' && <LogTab />}
      </main>
      <SiteFooter />
    </div>
  );
}

function TitlesTab({ titles, reload }: { titles: Title[]; reload: () => void }) {
  const [name, setName] = useState('');
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return;
    const { error } = await supabase.from('company_titles').insert({ name: name.trim() });
    if (error) toast.error(error.message); else { setName(''); reload(); }
  };
  const rename = async (t: Title) => {
    const n = prompt('Rename title', t.name); if (!n?.trim()) return;
    const { error } = await supabase.from('company_titles').update({ name: n.trim() }).eq('id', t.id);
    if (error) toast.error(error.message); else reload();
  };
  const remove = async (t: Title) => {
    if (!confirm(`Remove the title "${t.name}"? People with it will lose it.`)) return;
    const { error } = await supabase.from('company_titles').delete().eq('id', t.id);
    if (error) toast.error(error.message); else reload();
  };
  return (
    <Card>
      <form onSubmit={add} className="flex gap-2">
        <input className={inputCls} style={inputStyle} placeholder="New title, e.g. Head of Sales" value={name} onChange={e => setName(e.target.value)} />
        <Btn type="submit">Add</Btn>
      </form>
      <ul className="mt-4 divide-y" style={{ borderColor: 'hsl(var(--ct-border))' }}>
        {titles.map(t => (
          <li key={t.id} className="flex items-center justify-between py-2">
            <span className="font-body" style={ink}>{t.name}</span>
            <span className="flex gap-2"><Btn variant="ghost" onClick={() => rename(t)}>Rename</Btn><Btn variant="danger" onClick={() => remove(t)}>Remove</Btn></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LogTab() {
  const [rows, setRows] = useState<Array<{ id: number; created_at: string; function_name: string; task: string | null; provider: string | null; model: string | null; latency_ms: number | null; ok: boolean | null; detail: string | null }>>([]);
  useEffect(() => { supabase.from('request_log').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows(data ?? [])); }, []);
  const ok = rows.filter(r => r.ok).length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / rows.length) : 0;
  return (
    <Card>
      <p className="font-mono-data text-xs" style={muted}>Last {rows.length} AI requests · {rows.length ? Math.round((ok / rows.length) * 100) : 0}% succeeded · average {avg} ms</p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs font-body">
          <thead><tr className="font-mono-data text-[0.6rem] uppercase text-left" style={muted}><th className="p-2">Time</th><th className="p-2">Feature</th><th className="p-2">Service</th><th className="p-2">Speed</th><th className="p-2">Result</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-t" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <td className="p-2 font-mono-data">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.function_name}{r.task ? ` · ${r.task}` : ''}</td>
              <td className="p-2" style={muted}>{r.provider} {r.model}</td>
              <td className="p-2 font-mono-data">{r.latency_ms ?? '—'} ms</td>
              <td className="p-2" style={{ color: r.ok ? 'hsl(var(--ct-status-green))' : 'hsl(var(--ct-status-red))' }} title={r.detail ?? ''}>{r.ok ? 'OK' : 'Failed'}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </Card>
  );
}
