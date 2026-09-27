import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Btn, Card, inputCls, inputStyle, muted, ink } from '@/components/site/StaffUI';

export interface Person {
  id: string; email: string; display_name: string | null; company: string | null; disabled: boolean;
  roles: string[]; titles: string[]; is_main: boolean; last_sign_in_at: string | null;
  must_change_password: boolean; terms_version: string | null; terms_signed_name: string | null; terms_signed_at: string | null;
}
interface Title { id: string; name: string }

export async function callAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (data?.error) { toast.error(data.error); return null; }
  if (error) {
    // Non-2xx responses: read the real reason from the response body.
    let msg = 'Something went wrong. Please try again.';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any).context as Response | undefined;
      if (ctx && typeof ctx.json === 'function') { const j = await ctx.clone().json(); if (j?.error) msg = String(j.error); }
    } catch { /* keep default */ }
    toast.error(msg); return null;
  }
  return data;
}

export function strongPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
  const a = new Uint32Array(14); crypto.getRandomValues(a);
  return Array.from(a, n => chars[n % chars.length]).join('');
}

const roleOf = (p: Person) => p.roles.includes('admin') ? 'admin' : p.roles.includes('moderator') ? 'moderator' : p.roles.includes('client') ? 'client' : 'none';
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', moderator: 'Moderator', client: 'Client', none: 'No access' };

function TitlePicker({ titles, value, onChange, readOnly }: { titles: Title[]; value: string[]; onChange: (v: string[]) => void; readOnly?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {titles.map(t => {
        const on = value.includes(t.id);
        if (readOnly && !on) return null;
        return (
          <button type="button" key={t.id} disabled={readOnly} onClick={() => onChange(on ? value.filter(x => x !== t.id) : [...value, t.id])}
            className="px-2 py-1 rounded-[3px] border font-mono-data text-[0.6rem] uppercase"
            style={{ borderColor: 'hsl(var(--ct-teal))', backgroundColor: on ? 'hsl(var(--ct-teal))' : 'transparent', color: on ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-teal))' }}>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

export default function PeopleTab({ isAdmin }: { isAdmin: boolean }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const blank = { email: '', password: '', displayName: '', company: '', role: 'client', titles: [] as string[] };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, { data: t }] = await Promise.all([
      callAdmin({ action: 'search', query, role, status }),
      supabase.from('company_titles').select('id, name').order('created_at'),
    ]);
    setLoading(false);
    if (d) setPeople(d.users);
    setTitles(t ?? []);
  };
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [query, role, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = await callAdmin({ action: 'create', ...form });
    setBusy(false);
    if (r) { toast.success(`Account created. They'll set their own password and sign the terms on first sign-in.`); setForm(blank); load(); }
  };
  const act = async (body: Record<string, unknown>, msg: string) => { if (await callAdmin(body)) { toast.success(msg); load(); } };

  return (
    <>
      <Card>
        <h2 className="font-serif-display text-lg" style={ink}>Create an account</h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2 mt-3">
          <input className={inputCls} style={inputStyle} type="email" required maxLength={255} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <div className="flex gap-2">
            <input className={inputCls} style={inputStyle} type="text" required minLength={10} placeholder="Temporary password (10+ characters, not a common word)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <Btn type="button" variant="ghost" onClick={() => setForm({ ...form, password: strongPassword() })}>Generate</Btn>
          </div>
          <input className={inputCls} style={inputStyle} maxLength={120} placeholder="Full name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
          <input className={inputCls} style={inputStyle} maxLength={120} placeholder="Company (optional)" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          <select className={inputCls} style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={!isAdmin}>
            <option value="client">Client</option>
            {isAdmin && <><option value="moderator">Moderator</option><option value="admin">Admin</option></>}
          </select>
          {isAdmin && form.role !== 'client' && <div className="md:col-span-2"><div className="font-mono-data text-[0.6rem] uppercase mb-1.5" style={muted}>Company titles</div>
            <TitlePicker titles={titles} value={form.titles} onChange={v => setForm({ ...form, titles: v })} /></div>}
          <div><Btn type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Btn></div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mt-8">
        <h2 className="font-serif-display text-lg mr-auto" style={ink}>People</h2>
        <input className="px-3 py-1.5 rounded-[3px] border font-body text-sm bg-card w-full sm:w-64" style={inputStyle} placeholder="Search name, email or company" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search people" />
        <select className="px-2 py-1.5 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={role} onChange={e => setRole(e.target.value)} aria-label="Role">
          <option value="all">All roles</option><option value="client">Clients</option><option value="moderator">Moderators</option><option value="admin">Admins</option><option value="none">No access</option>
        </select>
        <select className="px-2 py-1.5 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="all">Any status</option><option value="active">Active</option><option value="disabled">Disabled</option>
        </select>
      </div>
      <p className="font-mono-data text-[0.65rem] mt-2" style={muted}>{loading ? 'Searching…' : `${people.length} ${people.length === 1 ? 'person' : 'people'}`}</p>
      {people.map(p => <PersonRow key={p.id} p={p} titles={titles} act={act} isAdmin={isAdmin} />)}
      {!loading && !people.length && <p className="font-body text-sm mt-4" style={muted}>No one matches.</p>}
    </>
  );
}

function PersonRow({ p, titles, act, isAdmin }: { p: Person; titles: Title[]; act: (b: Record<string, unknown>, m: string) => void; isAdmin: boolean }) {
  const role = roleOf(p);
  const [t, setT] = useState(p.titles);
  const dirty = t.join() !== p.titles.join();
  const canManage = !p.is_main && (isAdmin || role === 'client' || role === 'none');
  const tag = (text: string, color: string) => <span className="font-mono-data text-[0.6rem] uppercase ml-2" style={{ color }}>{text}</span>;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-body font-semibold" style={ink}>
            {p.display_name || p.email}
            {tag(ROLE_LABEL[role], 'hsl(var(--ct-teal))')}
            {p.is_main && tag('Main admin', 'hsl(var(--ct-teal))')}
            {p.disabled && tag('Disabled', 'hsl(var(--ct-status-red))')}
          </div>
          <div className="font-mono-data text-xs break-all" style={muted}>{p.email}{p.company ? ` · ${p.company}` : ''} · last sign-in {p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleDateString() : 'never'}</div>
          <div className="font-mono-data text-[0.65rem] mt-1" style={muted}>
            {p.must_change_password ? 'Awaiting first sign-in setup' : p.terms_signed_at ? `Terms v${p.terms_version} signed by "${p.terms_signed_name}" on ${new Date(p.terms_signed_at).toLocaleString()}` : 'Terms not yet signed'}
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2 items-center">
            <select className="px-2 py-1 rounded-[3px] border font-mono-data text-xs bg-card" style={inputStyle} value={role} aria-label="Role"
              onChange={e => act({ action: 'update', userId: p.id, role: e.target.value }, 'Role updated.')}>
              <option value="client">Client</option>
              {isAdmin && <><option value="moderator">Moderator</option><option value="admin">Admin</option></>}
              <option value="none">No access</option>
            </select>
            <Btn variant="ghost" onClick={() => { const pw = prompt(`New temporary password for ${p.email} (8+ characters). They'll be asked to change it on next sign-in.`); if (pw) act({ action: 'reset_password', userId: p.id, password: pw }, 'Password reset.'); }}>Reset password</Btn>
            <Btn variant="ghost" onClick={() => act({ action: p.disabled ? 'enable' : 'disable', userId: p.id }, p.disabled ? 'Account enabled.' : 'Account disabled.')}>{p.disabled ? 'Enable' : 'Disable'}</Btn>
            {isAdmin && <Btn variant="danger" onClick={() => { if (confirm(`Delete ${p.email} permanently?`)) act({ action: 'delete', userId: p.id }, 'Account deleted.'); }}>Delete</Btn>}
          </div>
        ) : <span className="font-mono-data text-xs" style={muted}>{p.is_main ? 'Protected' : 'View only'}</span>}
      </div>
      {(p.titles.length > 0 || (isAdmin && role !== 'client')) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <TitlePicker titles={titles} value={t} onChange={setT} readOnly={!isAdmin || p.is_main} />
          {dirty && <Btn onClick={() => act({ action: 'update', userId: p.id, titles: t }, 'Titles saved.')}>Save titles</Btn>}
        </div>
      )}
    </Card>
  );
}
