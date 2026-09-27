import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/hooks/useRoles';
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_VERSION, TERMS_EFFECTIVE } from '@/content/terms';

const pwSchema = z.object({
  password: z.string().min(10, 'Use at least 10 characters.').max(72, 'Use 72 characters or fewer.'),
  confirm: z.string(),
}).refine(v => v.password === v.confirm, { message: "The passwords don't match.", path: ['confirm'] });

const label = 'block font-mono-data uppercase text-[0.6rem] tracking-wider mb-1.5';
const input = 'w-full px-3 rounded-[3px] font-body text-base border focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]';
const inputStyle = { borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: '44px' };

export default function Welcome() {
  const r = useRoles();
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Account setup — Chemtraceit'; }, []);
  if (r.loading) return null;
  if (!r.userId) return <Navigate to="/auth" replace />;
  if (!r.needsPassword && !r.needsTerms) return <Navigate to="/app" replace />;
  const step = r.needsPassword ? 1 : 2;

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-serif-display font-bold text-2xl" style={{ color: 'hsl(var(--ct-ink))' }}>Welcome to Chemtraceit</h1>
          <p className="font-mono-data uppercase text-[0.6rem] tracking-[0.15em] mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>Step {step} of 2 · {step === 1 ? 'Set your password' : 'Terms of use'}</p>
        </div>
        {step === 1 ? <PasswordStep onDone={r.reload} /> : <TermsStep onDone={() => { r.reload(); navigate('/app'); }} />}
        <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="block mx-auto mt-4 font-mono-data text-[0.7rem] uppercase tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>Sign out</button>
      </div>
    </div>
  );
}

function PasswordStep({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pwSchema.safeParse({ password, confirm });
    if (!v.success) return toast.error(v.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'change_own_password', password } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? 'Could not save your password.');
    toast.success('Password saved.');
    onDone();
  };
  return (
    <form onSubmit={submit} className="bg-card border rounded-[3px] p-6 max-w-md mx-auto space-y-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>
      <p className="font-body text-sm" style={{ color: 'hsl(var(--ct-muted))' }}>For security, replace the temporary password you were given with your own.</p>
      <div><label htmlFor="pw" className={label} style={{ color: 'hsl(var(--ct-muted))' }}>New password</label>
        <input id="pw" type="password" autoComplete="new-password" className={input} style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} required />
        <p className="font-body text-xs mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>At least 10 characters, different from your temporary password.</p></div>
      <div><label htmlFor="pw2" className={label} style={{ color: 'hsl(var(--ct-muted))' }}>Confirm new password</label>
        <input id="pw2" type="password" autoComplete="new-password" className={input} style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
      <button type="submit" disabled={busy} className="w-full rounded-[3px] font-mono-data text-xs uppercase tracking-wider disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))', minHeight: '44px' }}>
        {busy ? 'Saving…' : 'Save password →'}
      </button>
    </form>
  );
}

function TermsStep({ onDone }: { onDone: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [readAll, setReadAll] = useState(false);
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const onScroll = () => {
    const el = boxRef.current; if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadAll(true);
  };
  const ready = readAll && adult && agree && name.trim().length >= 3;
  const sign = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ready) return;
    setBusy(true);
    const { error } = await supabase.rpc('complete_onboarding', { _signed_name: name.trim().slice(0, 120), _version: TERMS_VERSION, _user_agent: navigator.userAgent });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Thank you — agreement signed.');
    onDone();
  };
  return (
    <div className="bg-card border rounded-[3px] p-5 sm:p-6" style={{ borderColor: 'hsl(var(--ct-border))' }}>
      <h2 className="font-serif-display text-xl" style={{ color: 'hsl(var(--ct-ink))' }}>{TERMS_TITLE}</h2>
      <p className="font-mono-data text-[0.65rem] mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>Version {TERMS_VERSION} · effective {TERMS_EFFECTIVE}</p>
      <div ref={boxRef} onScroll={onScroll} className="mt-4 h-[55vh] overflow-y-auto border rounded-[3px] p-4 space-y-4 font-body text-sm leading-relaxed" style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', backgroundColor: 'hsl(var(--ct-paper))' }}>
        <p>{TERMS_INTRO}</p>
        {TERMS_SECTIONS.map(s => (
          <section key={s.heading}>
            <h3 className="font-serif-display font-bold text-base mb-1">{s.heading}</h3>
            {s.body.map((b, i) => <p key={i} className="mb-1.5">{b}</p>)}
          </section>
        ))}
        <p className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>— End of agreement —</p>
      </div>
      {!readAll && <p className="font-body text-xs mt-2" style={{ color: 'hsl(var(--ct-muted))' }}>Scroll to the end of the agreement to sign.</p>}

      <form onSubmit={sign} className="mt-5 space-y-3" style={{ opacity: readAll ? 1 : 0.5 }}>
        <fieldset disabled={!readAll} className="space-y-3">
          <label className="flex items-start gap-2 font-body text-sm" style={{ color: 'hsl(var(--ct-ink))' }}>
            <input type="checkbox" className="mt-1" checked={adult} onChange={e => setAdult(e.target.checked)} /> I confirm I am 18 years of age or older.
          </label>
          <label className="flex items-start gap-2 font-body text-sm" style={{ color: 'hsl(var(--ct-ink))' }}>
            <input type="checkbox" className="mt-1" checked={agree} onChange={e => setAgree(e.target.checked)} /> I have read, understood and agree to the Terms of Use and Confidentiality Agreement.
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div><label htmlFor="sig" className={label} style={{ color: 'hsl(var(--ct-muted))' }}>Signature — type your full legal name</label>
              <input id="sig" className={`${input} font-serif-display italic`} style={inputStyle} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
            <div><div className={label} style={{ color: 'hsl(var(--ct-muted))' }}>Date</div>
              <div className="px-3 flex items-center font-mono-data text-sm border rounded-[3px]" style={inputStyle}>{today}</div></div>
          </div>
          <button type="submit" disabled={!ready || busy} className="w-full rounded-[3px] font-mono-data text-xs uppercase tracking-wider disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))', minHeight: '44px' }}>
            {busy ? 'Signing…' : 'Sign and continue →'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
