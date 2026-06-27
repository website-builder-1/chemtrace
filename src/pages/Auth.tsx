import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = mode === 'login' ? 'Sign in — Chemtraceit' : 'Create account — Chemtraceit';
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
  }, [mode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success('Account created. Check your email to verify.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in.');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-serif-display text-4xl mb-2" style={{ color: 'hsl(var(--ct-teal))' }}>⚗</div>
          <h1 className="font-serif-display font-bold text-2xl" style={{ color: 'hsl(var(--ct-ink))' }}>Chemtraceit</h1>
          <p className="font-mono-data uppercase text-[0.6rem] tracking-[0.15em] mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>
            SYNTHESIS INTELLIGENCE
          </p>
        </div>

        <div className="bg-card border rounded-[3px] p-5 sm:p-6" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <div className="flex gap-1 mb-5 p-1 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))' }}>
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 px-3 rounded-[2px] font-mono-data text-xs uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: mode === m ? 'hsl(var(--ct-teal))' : 'transparent',
                  color: mode === m ? 'white' : 'hsl(var(--ct-muted))',
                  minHeight: '44px',
                }}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block font-mono-data uppercase text-[0.6rem] tracking-wider mb-1.5" style={{ color: 'hsl(var(--ct-muted))' }}>
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 rounded-[3px] font-body text-base border focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]"
                style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: '44px' }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-mono-data uppercase text-[0.6rem] tracking-wider mb-1.5" style={{ color: 'hsl(var(--ct-muted))' }}>
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 rounded-[3px] font-body text-base border focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]"
                style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: '44px' }}
              />
              {mode === 'signup' && (
                <p className="font-body text-xs mt-1" style={{ color: 'hsl(var(--ct-muted))' }}>Minimum 6 characters.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] uppercase text-white transition-colors duration-150 disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--ct-teal))', minHeight: '44px' }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 px-4 py-2 font-mono-data text-[0.7rem] uppercase tracking-wider transition-colors"
            style={{ color: 'hsl(var(--ct-muted))', minHeight: '44px' }}
          >
            ← Continue without account
          </button>
        </div>

        <p className="font-body text-xs text-center mt-4" style={{ color: 'hsl(var(--ct-muted))' }}>
          By continuing you agree to Chemtraceit research-use terms.
        </p>
      </div>
    </div>
  );
}