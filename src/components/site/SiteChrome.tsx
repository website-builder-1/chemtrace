import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, FlaskConical } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';

const links = [
  { to: '/', label: 'Home' },
  { to: '/research', label: 'Research' },
  { to: '/team', label: 'Team' },
  { to: '/#contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAdmin, isModerator, hasAccess, userId } = useRoles();
  const staff = [
    ...(isAdmin || isModerator ? [{ to: '/moderator', label: 'Moderator' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];
  const all = [...links.filter(l => l.to !== '/research' || hasAccess), ...staff];
  const cta = userId ? { to: '/app', label: 'Open tool →' } : { to: '/auth', label: 'Sign in →' };
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
  return (
    <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: 'hsl(var(--ct-sidebar))', borderColor: 'hsl(var(--ct-teal))' }}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-serif-display text-xl" style={{ color: 'hsl(var(--ct-paper))' }}>
          <FlaskConical className="w-5 h-5" style={{ color: 'hsl(var(--ct-agent-pulse))' }} /> Chemtraceit
        </Link>
        <nav className="hidden md:flex items-center gap-7 font-mono-data text-xs uppercase tracking-wider">
          {all.map(l => (
            <NavLink key={l.to} to={l.to} className="hover:opacity-80" style={{ color: 'hsl(var(--ct-sidebar-text))' }}>{l.label}</NavLink>
          ))}
          {userId && <button onClick={signOut} className="hover:opacity-80 uppercase" style={{ color: 'hsl(var(--ct-sidebar-text))' }}>Sign out</button>}
          <Link to={cta.to} className="px-4 py-2 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>{cta.label}</Link>
        </nav>
        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(o => !o)} style={{ color: 'hsl(var(--ct-paper))' }}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden flex flex-col gap-4 px-5 pb-5 font-mono-data text-sm uppercase tracking-wider">
          {all.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{ color: 'hsl(var(--ct-sidebar-text))' }}>{l.label}</Link>
          ))}
          {userId && <button onClick={signOut} className="text-left uppercase" style={{ color: 'hsl(var(--ct-sidebar-text))' }}>Sign out</button>}
          <Link to={cta.to} onClick={() => setOpen(false)} className="px-4 py-2 rounded-[3px] text-center" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>{cta.label}</Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t" style={{ backgroundColor: 'hsl(var(--ct-sidebar))', borderColor: 'hsl(var(--ct-teal))' }}>
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-serif-display text-lg" style={{ color: 'hsl(var(--ct-paper))' }}>Chemtraceit</div>
          <p className="font-body text-sm mt-2" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>Synthesis intelligence: routes, sourcing, risk and cost in one place.</p>
        </div>
        <div>
          <div className="font-mono-data text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>Contact</div>
          <a href="mailto:admin@chemtraceit.com" className="font-body text-sm mt-2 block underline" style={{ color: 'hsl(var(--ct-paper))' }}>admin@chemtraceit.com</a>
        </div>
        <div className="font-mono-data text-xs flex flex-col gap-2" style={{ color: 'hsl(var(--ct-sidebar-text))' }}>
          <Link to="/app">Launch the tool</Link>
          <Link to="/research">Ask a chemistry question</Link>
          <Link to="/team">Meet the team</Link>
          <Link to="/auth">Client sign in</Link>
        </div>
      </div>
      <div className="text-center font-mono-data text-[0.65rem] pb-6" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>© {new Date().getFullYear()} Chemtraceit</div>
    </footer>
  );
}
