import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';
import NotFound from './NotFound';
import { Btn, Card, Tabs, inputCls, inputStyle, muted, ink } from '@/components/site/StaffUI';

interface StaffUser { id: string; email: string; display_name: string | null; disabled: boolean; roles: string[]; titles: string[]; is_main: boolean; last_sign_in_at: string | null }
interface Title { id: string; name: string }
type Tab = 'staff' | 'titles' | 'benchmark' | 'log';

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error || data?.error) { toast.error(data?.error ?? 'Something went wrong.'); return null; }
  return data;
}

export default function Admin() {
  const { loading, isAdmin } = useRoles();
  if (loading) return null;
  if (!isAdmin) return <NotFound />;
  return <AdminInner />;
}

function AdminInner() {
  const [tab, setTab] = useState<Tab>('staff');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);

  const load = async () => {
    const [d, { data: t }] = await Promise.all([call({ action: 'list' }), supabase.from('company_titles').select('id, name').order('created_at')]);
    if (d) setUsers(d.users);
    setTitles(t ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-5 py-12 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Admin</div>
        <h1 className="font-serif-display text-3xl sm:text-4xl mt-2" style={ink}>Control panel</h1>
        <Tabs<Tab> tabs={[['staff', 'Staff'], ['titles', 'Titles'], ['benchmark', 'Accuracy benchmark'], ['log', 'Usage log']]} value={tab} onChange={setTab} />
        {tab === 'staff' && <StaffTab users={users} titles={titles} reload={load} />}
        {tab === 'titles' && <TitlesTab titles={titles} reload={load} />}
        {tab === 'benchmark' && <Card><p className="font-body text-sm" style={muted}>Run the fixed chemistry test set and compare scores.</p><div className="mt-3"><Link to="/admin/benchmark"><Btn>Open benchmark →</Btn></Link></div></Card>}
        {tab === 'log' && <LogTab />}
      </main>
      <SiteFooter />
    </div>
  );
}

function TitlePicker({ titles, value, onChange }: { titles: Title[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {titles.map(t => {
        const on = value.includes(t.id);
        return (
          <button type="button" key={t.id} onClick={() => onChange(on ? value.filter(x => x !== t.id) : [...value, t.id])}
            className="px-2 py-1 rounded-[3px] border font-mono-data text-[0.6rem] uppercase"
            style={{ borderColor: 'hsl(var(--ct-teal))', backgroundColor: on ? 'hsl(var(--ct-teal))' : 'transparent', color: on ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-teal))' }}>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

function StaffTab({ users, titles, reload }: { users: StaffUser[]; titles: Title[]; reload: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'moderator', titles: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'staff' | 'all'>('staff');

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = await call({ action: 'create', ...form });
    setBusy(false);
    if (r) { toast.success('Login created.'); setForm({ email: '', password: '', displayName: '', role: 'moderator', titles: [] }); reload(); }
  };
  const act = async (body: Record<string, unknown>, msg: string) => { if (await call(body)) { toast.success(msg); reload(); } };
  const shown = users.filter(u => filter === 'all' || u.roles.length || u.titles.length);

  return (
    <>
      <Card>
        <h2 className="font-serif-display text-lg" style={ink}>Create a staff login</h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2 mt-3">
          <input className={inputCls} style={inputStyle} type="email" required placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className={inputCls} style={inputStyle} type="text" required minLength={8} placeholder="Temporary password (8+ characters)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input className={inputCls} style={inputStyle} placeholder="Name (optional)" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
          <select className={inputCls} style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="moderator">Moderator</option><option value="admin">Admin</option><option value="none">No staff role</option>
          </select>
          <div className="md:col-span-2"><div className="font-mono-data text-[0.6rem] uppercase mb-1.5" style={muted}>Company titles</div>
            <TitlePicker titles={titles} value={form.titles} onChange={v => setForm({ ...form, titles: v })} /></div>
          <div><Btn type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create login'}</Btn></div>
        </form>
      </Card>

      <div className="flex items-center justify-between mt-8">
        <h2 className="font-serif-display text-lg" style={ink}>People</h2>
        <select className="px-2 py-1 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={filter} onChange={e => setFilter(e.target.value as 'staff' | 'all')}>
          <option value="staff">Staff only</option><option value="all">Everyone (incl. customers)</option>
        </select>
      </div>
      {shown.map(u => <UserRow key={u.id} u={u} titles={titles} act={act} />)}
      {!shown.length && <p className="font-body text-sm mt-4" style={muted}>No one here yet.</p>}
    </>
  );
}

function UserRow({ u, titles, act }: { u: StaffUser; titles: Title[]; act: (b: Record<string, unknown>, m: string) => void }) {
  const role = u.roles.includes('admin') ? 'admin' : u.roles.includes('moderator') ? 'moderator' : 'none';
  const [t, setT] = useState(u.titles);
  const dirty = t.join() !== u.titles.join();
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-body font-semibold" style={ink}>{u.display_name || u.email} {u.is_main && <span className="font-mono-data text-[0.6rem] uppercase ml-2" style={{ color: 'hsl(var(--ct-teal))' }}>Main admin</span>}{u.disabled && <span className="font-mono-data text-[0.6rem] uppercase ml-2" style={{ color: 'hsl(var(--ct-status-red))' }}>Disabled</span>}</div>
          <div className="font-mono-data text-xs" style={muted}>{u.email} · last sign-in {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'never'}</div>
        </div>
        {u.is_main ? <span className="font-mono-data text-xs" style={muted}>Admin · protected</span> : (
          <div className="flex flex-wrap gap-2 items-center">
            <select className="px-2 py-1 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={role}
              onChange={e => act({ action: 'update', userId: u.id, role: e.target.value }, 'Role updated.')}>
              <option value="moderator">Moderator</option><option value="admin">Admin</option><option value="none">No staff role</option>
            </select>
            <Btn variant="ghost" onClick={() => { const p = prompt(`New password for ${u.email} (8+ characters)`); if (p) act({ action: 'reset_password', userId: u.id, password: p }, 'Password reset.'); }}>Reset password</Btn>
            <Btn variant="ghost" onClick={() => act({ action: u.disabled ? 'enable' : 'disable', userId: u.id }, u.disabled ? 'Account enabled.' : 'Account disabled.')}>{u.disabled ? 'Enable' : 'Disable'}</Btn>
            <Btn variant="danger" onClick={() => { if (confirm(`Delete ${u.email} permanently?`)) act({ action: 'delete', userId: u.id }, 'Account deleted.'); }}>Delete</Btn>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <TitlePicker titles={titles} value={t} onChange={u.is_main ? () => {} : setT} />
        {dirty && <Btn onClick={() => act({ action: 'update', userId: u.id, titles: t }, 'Titles saved.')}>Save titles</Btn>}
      </div>
    </Card>
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
