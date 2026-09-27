import { Link } from 'react-router-dom';
import { Route, PackageSearch, ShieldCheck, Receipt, Check, Minus } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';

const questions = [
  'How do I synthesise a completely novel compound?',
  'Where can I source the starting materials reliably?',
  'Which predicted pathway minimises risk and cost?',
];

const features = [
  { icon: Route, title: 'Route planning', text: 'AI retrosynthesis proposes ranked routes with predicted conditions for any valid structure.' },
  { icon: PackageSearch, title: 'Reagent sourcing', text: 'Starting materials mapped to suppliers, lead times and geographic supply risk.' },
  { icon: ShieldCheck, title: 'Risk & compliance', text: 'Controlled-substance screening, regulatory framework and hazard notes per route.' },
  { icon: Receipt, title: 'Costed invoice', text: 'Batch-scaled cost estimates and exportable procurement invoices in GBP, USD or EUR.' },
];

const steps = [
  ['01', 'Enter a molecule', 'Type a name or paste a SMILES string, set batch size and production location.'],
  ['02', 'Compare routes', 'Review ranked pathways, conditions, green-chemistry metrics and literature.'],
  ['03', 'Procure with confidence', 'Check supply and compliance risk, then export the reagent invoice.'],
];

const compare: [string, boolean, boolean][] = [
  ['Retrosynthetic route planning', true, true],
  ['Reagent procurement', true, true],
  ['Supply-chain & geographic risk', true, false],
  ['Regulatory / controlled-substance checks', true, false],
  ['Costed batch invoice', true, false],
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-5 pt-16 pb-14 md:pt-24">
          <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Synthesis intelligence</div>
          <h1 className="font-serif-display text-4xl md:text-6xl leading-tight mt-4 max-w-3xl" style={{ color: 'hsl(var(--ct-ink))' }}>
            From novel compound to costed, compliant synthesis plan.
          </h1>
          <p className="font-body text-lg mt-5 max-w-2xl" style={{ color: 'hsl(var(--ct-muted))' }}>
            Chemtraceit combines route planning, reagent sourcing and risk checks, so chemists can move from idea to bench faster.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app" className="font-mono-data text-sm px-6 py-3 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>Try Chemtraceit →</Link>
            <a href="#how" className="font-mono-data text-sm px-6 py-3 rounded-[3px] border" style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-teal))' }}>How it works</a>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-14">
            {questions.map((q, i) => (
              <div key={q} className="bg-card border rounded-[3px] p-5" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                <div className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-teal))' }}>Q{i + 1}</div>
                <div className="font-serif-display text-lg mt-2" style={{ color: 'hsl(var(--ct-ink))' }}>“{q}”</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderColor: 'hsl(var(--ct-border))' }}>
          <div className="max-w-6xl mx-auto px-5 py-16">
            <h2 className="font-serif-display text-3xl" style={{ color: 'hsl(var(--ct-ink))' }}>What it does</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {features.map(f => (
                <div key={f.title} className="bg-card border rounded-[3px] p-5" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                  <f.icon className="w-5 h-5" style={{ color: 'hsl(var(--ct-teal))' }} />
                  <div className="font-mono-data text-sm uppercase tracking-wider mt-3" style={{ color: 'hsl(var(--ct-ink))' }}>{f.title}</div>
                  <p className="font-body text-sm mt-2" style={{ color: 'hsl(var(--ct-muted))' }}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="font-serif-display text-3xl" style={{ color: 'hsl(var(--ct-ink))' }}>How it works</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {steps.map(([n, t, d]) => (
              <div key={n} className="border-t-2 pt-4" style={{ borderColor: 'hsl(var(--ct-teal))' }}>
                <div className="font-mono-data text-2xl" style={{ color: 'hsl(var(--ct-teal))' }}>{n}</div>
                <div className="font-serif-display text-xl mt-2" style={{ color: 'hsl(var(--ct-ink))' }}>{t}</div>
                <p className="font-body text-sm mt-2" style={{ color: 'hsl(var(--ct-muted))' }}>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 pb-20">
          <h2 className="font-serif-display text-3xl" style={{ color: 'hsl(var(--ct-ink))' }}>Beyond route planning</h2>
          <p className="font-body mt-2 max-w-2xl" style={{ color: 'hsl(var(--ct-muted))' }}>Leading tools pair route planning with procurement. Chemtraceit adds the risk and compliance layer on top.</p>
          <div className="mt-6 overflow-x-auto bg-card border rounded-[3px]" style={{ borderColor: 'hsl(var(--ct-border))' }}>
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="font-mono-data text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--ct-muted))' }}>
                  <th className="text-left p-4">Capability</th><th className="p-4">Chemtraceit</th><th className="p-4">Route-planning tools</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([c, a, b]) => (
                  <tr key={c} className="border-t" style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))' }}>
                    <td className="p-4">{c}</td>
                    {[a, b].map((v, i) => (
                      <td key={i} className="p-4 text-center">
                        {v ? <Check className="w-4 h-4 inline" style={{ color: 'hsl(var(--ct-status-green))' }} /> : <Minus className="w-4 h-4 inline" style={{ color: 'hsl(var(--ct-muted))' }} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
