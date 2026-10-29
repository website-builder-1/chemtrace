/** The one Chemtraceit logo lockup. `tone="light"` for dark backgrounds. */
export function BrandLogo({ tone = 'dark', size = 'md', showName = true }: { tone?: 'dark' | 'light'; size?: 'sm' | 'md'; showName?: boolean }) {
  const img = size === 'sm' ? 'h-6 w-[27px]' : 'h-8 w-9';
  const text = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap ${showName ? 'min-w-[120px]' : ''} ${tone === 'light' ? 'text-brand-paper' : 'text-foreground'}`}>
      <span role={showName ? undefined : 'img'} aria-label={showName ? undefined : 'Chemtraceit'} aria-hidden={showName ? true : undefined} className={`ct-brand-mark ${img} shrink-0`} />
      {showName && (
        <span className={`font-serif-display font-bold ${text} leading-none`}>
          Chemtraceit
        </span>
      )}
    </span>
  );
}

/** Centered hero lockup for the sign-in and account-setup pages. */
export function BrandHero({ subtitle, heading = 'Chemtraceit' }: { subtitle: string; heading?: string }) {
  return (
    <div className="flex flex-col items-center text-center mb-8 text-foreground">
      <div className="p-7">
        <span className="ct-brand-mark block h-14 w-[62px]" aria-hidden="true" />
      </div>
      <h1 className="font-serif-display font-bold text-3xl"><span className="sr-only">{heading === 'Chemtraceit' ? '' : `${heading} — `}</span>Chemtraceit</h1>
      <div className="w-10 h-px my-3 bg-primary" />
      <p className="font-mono-data text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
