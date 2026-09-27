import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const noAccess = params.get('noaccess') === '1';

  useEffect(() => {
    document.title = 'Sign in — Chemtraceit';
    if (!noAccess) supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate('/app'); });
  }, [navigate, noAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message.includes('banned') ? 'This account has been disabled.' : error.message);
    toast.success('Signed in.');
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-serif-display text-4xl mb-2" style={{ color: 'hsl(var(--ct-teal))' }}>⚗</div>
          <h1 className="font-serif-display font-bold text-2xl" style={{ color: 'hsl(var(--ct-ink))' }}>Chemtraceit</h1>
          <p className="font-mono-data uppercase text-[0.6rem] tracking-[0.15em] mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>SYNTHESIS INTELLIGENCE</p>
        </div>

        <div className="bg-card border rounded-[3px] p-5 sm:p-6" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <h2 className="font-serif-display text-lg mb-1" style={{ color: 'hsl(var(--ct-ink))' }}>Sign in</h2>
          <p className="font-body text-sm mb-4" style={{ color: 'hsl(var(--ct-muted))' }}>
            Chemtraceit is invite-only. Accounts are issued by Chemtraceit — contact <a href="mailto:admin@chemtraceit.com" className="underline" style={{ color: 'hsl(var(--ct-teal))' }}>admin@chemtraceit.com</a> for access.
          </p>
          {noAccess && <p className="font-body text-sm mb-4" style={{ color: 'hsl(var(--ct-status-red))' }}>Your account doesn't have platform access yet. Please contact admin@chemtraceit.com.</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block font-mono-data uppercase text-[0.6rem] tracking-wider mb-1.5" style={{ color: 'hsl(var(--ct-muted))' }}>EMAIL</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={255}
                className="w-full px-3 rounded-[3px] font-body text-base border focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]"
                style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: '44px' }} />
            </div>
            <div>
              <label htmlFor="password" className="block font-mono-data uppercase text-[0.6rem] tracking-wider mb-1.5" style={{ color: 'hsl(var(--ct-muted))' }}>PASSWORD</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full px-3 rounded-[3px] font-body text-base border focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]"
                style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: '44px' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] uppercase transition-colors duration-150 disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))', minHeight: '44px' }}>
              {loading ? 'Please wait…' : 'Sign in →'}
            </button>
          </form>
          <Link to="/" className="block text-center w-full mt-3 px-4 py-2 font-mono-data text-[0.7rem] uppercase tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>← Back to home</Link>
        </div>

        <p className="font-body text-xs text-center mt-4" style={{ color: 'hsl(var(--ct-muted))' }}>Use of Chemtraceit is subject to the Terms of Use and Confidentiality Agreement.</p>
      </div>
    </div>
  );
}
