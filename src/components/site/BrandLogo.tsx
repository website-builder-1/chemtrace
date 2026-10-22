import logo from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';

/** The one Chemtraceit logo lockup. `tone="light"` for dark backgrounds. */
export function BrandLogo({ tone = 'dark', size = 'md', showName = true }: { tone?: 'dark' | 'light'; size?: 'sm' | 'md'; showName?: boolean }) {
  const img = size === 'sm' ? 'h-6' : 'h-8';
  const text = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={tone === 'light' ? logoLight : logo} alt={showName ? '' : 'Chemtraceit'} className={`${img} w-auto shrink-0`} />
      {showName && (
        <span className={`font-serif-display font-bold ${text} leading-none`} style={{ color: tone === 'light' ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-ink))' }}>
          Chemtraceit
        </span>
      )}
    </span>
  );
}

/** Centered hero lockup for the sign-in and account-setup pages. */
export function BrandHero({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center border shadow-sm mb-4"
        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--ct-border))' }}>
        <img src={logo} alt="Chemtraceit logo" className="h-11 w-auto" />
      </div>
      <h1 className="font-serif-display font-bold text-3xl" style={{ color: 'hsl(var(--ct-ink))' }}>Chemtraceit</h1>
      <div className="w-10 h-px my-3" style={{ backgroundColor: 'hsl(var(--ct-teal))' }} />
      <p className="font-mono-data uppercase text-[0.6rem] tracking-[0.2em]" style={{ color: 'hsl(var(--ct-muted))' }}>{subtitle}</p>
    </div>
  );
}
