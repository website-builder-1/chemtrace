import { PageMeta } from '@/components/site/PageMeta';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';

// Placeholder bios — replace with the team's real photos and text.
const team = [
  { name: 'Aryan', role: 'Technical Lead', bio: 'Builds the Chemtraceit platform and synthesis pipeline.' },
  { name: 'Emilia', role: 'Science & Research', bio: 'Leads scientific background, research and market insight.' },
  { name: 'Minal', role: 'Operations & Engineering', bio: 'Coordinates delivery, tooling and product development.' },
  { name: 'Renee', role: 'Founder & Partnerships', bio: 'Drives strategy, investment and industry relationships.' },
];

export default function Team() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <PageMeta
        title="Our Team | Chemtraceit Synthesis Route Intelligence"
        description="Meet the chemists and engineers behind Chemtraceit, the platform for synthesis route planning, reagent sourcing and supply risk. Get in touch today."
        keywords="Chemtraceit team, synthesis route planning, chemistry software, reagent sourcing, chemical supply chain"
        path="/team"
        jsonLd={[
          { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Chemtraceit team', url: 'https://chemtraceit.com/team', about: { '@id': 'https://chemtraceit.com/#org' } },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chemtraceit.com/' },
            { '@type': 'ListItem', position: 2, name: 'Team', item: 'https://chemtraceit.com/team' },
          ] },
          ...team.map(m => ({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: m.name,
            jobTitle: m.role,
            description: m.bio,
            worksFor: { '@id': 'https://chemtraceit.com/#org' },
          })),
        ]}
      />
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-5 py-16 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>The people</div>
        <h1 className="font-serif-display text-4xl mt-3" style={{ color: 'hsl(var(--ct-ink))' }}>Meet the team</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {team.map(m => (
            <article key={m.name} className="bg-card border rounded-[3px] overflow-hidden" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <div aria-hidden="true" className="aspect-square flex items-center justify-center font-serif-display text-5xl" style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: 'hsl(var(--ct-teal))' }}>
                {m.name[0]}
              </div>
              <div className="p-5">
                <h2 className="font-serif-display text-xl" style={{ color: 'hsl(var(--ct-ink))' }}>{m.name}</h2>
                <div className="font-mono-data text-xs uppercase tracking-wider mt-1" style={{ color: 'hsl(var(--ct-teal))' }}>{m.role}</div>
                <p className="font-body text-sm mt-3" style={{ color: 'hsl(var(--ct-muted))' }}>{m.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
