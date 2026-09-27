import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';
import NotFound from './NotFound';
import { Btn, Card, Tabs, inputCls, inputStyle, muted, ink } from '@/components/site/StaffUI';

type Tab = 'feedback' | 'facts' | 'suppliers' | 'runs';

export default function Moderator() {
  const { loading, isAdmin, isModerator, userId } = useRoles();
  const [tab, setTab] = useState<Tab>('feedback');
  if (loading) return null;
  if (!isAdmin && !isModerator) return <NotFound />;
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-5 py-12 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Moderator</div>
        <h1 className="font-serif-display text-3xl sm:text-4xl mt-2" style={ink}>Review desk</h1>
        <Tabs<Tab> tabs={[['feedback', 'Feedback'], ['facts', 'Checked facts'], ['suppliers', 'Suppliers & prices'], ['runs', 'Saved runs']]} value={tab} onChange={setTab} />
        {tab === 'feedback' && <FeedbackTab userId={userId!} />}
        {tab === 'facts' && <FactsTab userId={userId!} />}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'runs' && <RunsTab />}
      </main>
      <SiteFooter />
    </div>
  );
}

interface Fb { id: string; question: string; answer: string; rating: string; correction: string | null; reason: string | null; status: string; created_at: string }

function FeedbackTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Fb[]>([]);
  const [status, setStatus] = useState('pending');
  const load = () => supabase.from('feedback').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, [status]);
  const setS = async (f: Fb, s: string, toFact = false) => {
    const { error } = await supabase.from('feedback').update({ status: s }).eq('id', f.id);
    if (error) return toast.error(error.message);
    if (toFact && f.correction) {
      const { error: e2 } = await supabase.from('validated_facts').insert({ subject: f.question.slice(0, 200), statement: f.correction, source: f.reason || 'Reviewed customer correction', origin: 'feedback', validated_by: userId });
      if (e2) return toast.error(e2.message);
      toast.success('Approved and saved as a checked fact.');
    } else toast.success(s === 'approved' ? 'Approved.' : 'Rejected.');
    load();
  };
  return (
    <>
      <div className="mt-4"><select className="px-2 py-1 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      {rows.map(f => (
        <Card key={f.id}>
          <div className="font-mono-data text-[0.6rem] uppercase" style={muted}>{new Date(f.created_at).toLocaleString()} · rated {f.rating}</div>
          <div className="font-body font-semibold mt-1" style={ink}>{f.question}</div>
          <p className="font-body text-sm mt-1 line-clamp-4" style={muted}>{f.answer}</p>
          {f.correction && <p className="font-body text-sm mt-2" style={ink}><b>Correction:</b> {f.correction}</p>}
          {f.reason && <p className="font-body text-xs mt-1" style={muted}>Reason: {f.reason}</p>}
          {f.status === 'pending' && <div className="flex flex-wrap gap-2 mt-3">
            <Btn onClick={() => setS(f, 'approved')}>Approve</Btn>
            {f.correction && <Btn onClick={() => setS(f, 'approved', true)}>Approve + save as fact</Btn>}
            <Btn variant="danger" onClick={() => setS(f, 'rejected')}>Reject</Btn>
          </div>}
        </Card>
      ))}
      {!rows.length && <p className="font-body text-sm mt-4" style={muted}>Nothing here.</p>}
    </>
  );
}

function FactsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; subject: string; statement: string; source: string; origin: string; created_at: string }>>([]);
  const [f, setF] = useState({ subject: '', statement: '', source: '' });
  const load = () => supabase.from('validated_facts').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('validated_facts').insert({ ...f, origin: 'manual', validated_by: userId });
    if (error) return toast.error(error.message);
    setF({ subject: '', statement: '', source: '' }); load();
  };
  const del = async (id: string) => { if (!confirm('Delete this fact?')) return; await supabase.from('validated_facts').delete().eq('id', id); load(); };
  return (
    <>
      <Card>
        <form onSubmit={add} className="grid gap-2">
          <input required className={inputCls} style={inputStyle} placeholder="Subject (e.g. Aspirin melting point)" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
          <textarea required className={inputCls} style={inputStyle} placeholder="Statement" value={f.statement} onChange={e => setF({ ...f, statement: e.target.value })} />
          <input required className={inputCls} style={inputStyle} placeholder="Source (DOI, handbook, etc.)" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} />
          <div><Btn type="submit">Add fact</Btn></div>
        </form>
      </Card>
      {rows.map(r => (
        <Card key={r.id}>
          <div className="flex justify-between gap-3"><div>
            <div className="font-body font-semibold" style={ink}>{r.subject}</div>
            <p className="font-body text-sm mt-1" style={ink}>{r.statement}</p>
            <p className="font-mono-data text-[0.65rem] mt-1" style={muted}>{r.source} · {r.origin}</p>
          </div><Btn variant="danger" onClick={() => del(r.id)}>Delete</Btn></div>
        </Card>
      ))}
    </>
  );
}

interface Sp { id: string; supplier_id: string; material_key: string; product_name: string; pack_size: string; price: number | null; currency: string; product_url: string }

function SuppliersTab() {
  const [rows, setRows] = useState<Sp[]>([]);
  const [q, setQ] = useState('');
  const load = () => supabase.from('supplier_products').select('id, supplier_id, material_key, product_name, pack_size, price, currency, product_url').order('material_key').then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const save = async (r: Sp) => {
    const { error } = await supabase.from('supplier_products').update({ product_name: r.product_name, pack_size: r.pack_size, price: r.price, currency: r.currency, product_url: r.product_url, updated_at: new Date().toISOString() }).eq('id', r.id);
    if (error) toast.error(error.message); else toast.success('Saved.');
  };
  const shown = rows.filter(r => !q || `${r.material_key} ${r.product_name} ${r.supplier_id}`.toLowerCase().includes(q.toLowerCase()));
  const upd = (id: string, patch: Partial<Sp>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  return (
    <Card>
      <input className={inputCls} style={inputStyle} placeholder="Search material or supplier" value={q} onChange={e => setQ(e.target.value)} />
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs font-body">
          <thead><tr className="font-mono-data text-[0.6rem] uppercase text-left" style={muted}><th className="p-2">Material</th><th className="p-2">Supplier</th><th className="p-2">Product</th><th className="p-2">Pack</th><th className="p-2">Price</th><th className="p-2">Cur.</th><th className="p-2">Link</th><th /></tr></thead>
          <tbody>{shown.map(r => (
            <tr key={r.id} className="border-t" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <td className="p-2 font-mono-data">{r.material_key}</td>
              <td className="p-2">{r.supplier_id}</td>
              <td className="p-1"><input className={inputCls} style={inputStyle} value={r.product_name} onChange={e => upd(r.id, { product_name: e.target.value })} /></td>
              <td className="p-1 w-24"><input className={inputCls} style={inputStyle} value={r.pack_size} onChange={e => upd(r.id, { pack_size: e.target.value })} /></td>
              <td className="p-1 w-24"><input className={inputCls} style={inputStyle} type="number" step="0.01" value={r.price ?? ''} onChange={e => upd(r.id, { price: e.target.value === '' ? null : Number(e.target.value) })} /></td>
              <td className="p-1 w-20"><select className={inputCls} style={inputStyle} value={r.currency} onChange={e => upd(r.id, { currency: e.target.value })}><option>USD</option><option>GBP</option><option>EUR</option></select></td>
              <td className="p-1"><input className={inputCls} style={inputStyle} value={r.product_url} onChange={e => upd(r.id, { product_url: e.target.value })} /></td>
              <td className="p-1"><Btn onClick={() => save(r)}>Save</Btn></td>
            </tr>))}</tbody>
        </table>
      </div>
    </Card>
  );
}

function RunsTab() {
  const [rows, setRows] = useState<Array<{ id: string; created_at: string; molecule_name: string; location: string; batch_size_mg: number; recommended_route_name: string }>>([]);
  useEffect(() => { supabase.from('runs').select('id, created_at, molecule_name, location, batch_size_mg, recommended_route_name').order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows(data ?? [])); }, []);
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead><tr className="font-mono-data text-[0.6rem] uppercase text-left" style={muted}><th className="p-2">When</th><th className="p-2">Molecule</th><th className="p-2">Location</th><th className="p-2">Batch</th><th className="p-2">Recommended route</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-t" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <td className="p-2 font-mono-data">{new Date(r.created_at).toLocaleString()}</td><td className="p-2">{r.molecule_name}</td><td className="p-2">{r.location}</td><td className="p-2 font-mono-data">{r.batch_size_mg} mg</td><td className="p-2">{r.recommended_route_name}</td>
            </tr>))}</tbody>
        </table>
        {!rows.length && <p className="font-body text-sm mt-2" style={muted}>No saved runs yet.</p>}
      </div>
    </Card>
  );
}
