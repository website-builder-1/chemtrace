import { useState } from 'react';
import type { PipelineResults } from '@/types/chemtrace';
import { CURATED_MOLECULES, getMoleculeData, getRoutes, getRegulatory } from '@/data/moleculeData';
import { fetchFromPubChem } from '@/lib/pubchem';
import ResultsView from '@/components/chemtrace/ResultsView';

const LOCATIONS = ['UK', 'EU', 'USA', 'India', 'China', 'Switzerland', 'Japan'];

export default function Index() {
  const [query, setQuery] = useState('');
  const [batchSize, setBatchSize] = useState(500);
  const [location, setLocation] = useState('UK');
  const [results, setResults] = useState<PipelineResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const runPipeline = async () => {
    const name = query.trim() || 'ibuprofen';
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      // Try PubChem first, fall back to curated
      let molecule = getMoleculeData(name);
      if (!molecule) {
        const pubchem = await fetchFromPubChem(name);
        if (pubchem) molecule = pubchem;
      }
      if (!molecule) {
        setError(`Molecule "${name}" not found. Try one of the curated molecules or a valid chemical name.`);
        setIsLoading(false);
        return;
      }

      const routes = getRoutes(name, location, batchSize);
      const regulatory = getRegulatory(location);

      setResults({
        molecule,
        location,
        regulatory,
        routes,
        recommendedRouteId: routes[0].id,
        agentExplanation: '',
        batchSizeMg: batchSize,
      });
    } catch {
      setError('Pipeline error. Please try again.');
    }
    setIsLoading(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-[3px] font-mono-data text-sm border border-[hsl(var(--ct-border))]/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="w-[280px] flex-shrink-0 flex flex-col p-5 overflow-y-auto"
        style={{
          backgroundColor: 'hsl(var(--ct-sidebar))',
          borderRight: '2px solid hsl(var(--ct-teal))',
        }}
      >
        {/* Wordmark */}
        <div className="mb-1">
          <div className="font-serif-display font-bold text-xl" style={{ color: 'hsl(var(--ct-teal))' }}>⚗ ChemTrace</div>
          <div className="font-mono-data uppercase text-[0.55rem] tracking-[0.15em]" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>SYNTHESIS INTELLIGENCE</div>
        </div>

        <hr className="my-3" style={{ borderColor: 'hsl(var(--ct-border))', opacity: 0.3 }} />
        <div className="font-mono-data uppercase text-[0.55rem] tracking-wider mb-3" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>SEARCH</div>

        {/* Inputs */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="font-mono-data uppercase text-[0.55rem] tracking-wider block mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>CHEMICAL NAME OR SMILES</label>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ibuprofen"
              className={inputClass}
              style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0' }}
              onKeyDown={e => e.key === 'Enter' && runPipeline()}
            />
          </div>
          <div>
            <label className="font-mono-data uppercase text-[0.55rem] tracking-wider block mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>BATCH SIZE (MG)</label>
            <input
              type="number"
              value={batchSize}
              onChange={e => setBatchSize(Number(e.target.value))}
              className={inputClass}
              style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0' }}
            />
          </div>
          <div>
            <label className="font-mono-data uppercase text-[0.55rem] tracking-wider block mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>PRODUCTION LOCATION</label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className={inputClass}
              style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0' }}
            >
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <hr className="my-3" style={{ borderColor: 'hsl(var(--ct-border))', opacity: 0.3 }} />

        <p className="font-body text-[0.72rem] leading-relaxed mb-3" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>
          Curated molecules (no setup): ibuprofen, aspirin, paracetamol, naproxen, dopamine, caffeine, atenolol, metformin.
        </p>

        <hr className="my-3" style={{ borderColor: 'hsl(var(--ct-border))', opacity: 0.3 }} />

        <div className="space-y-2 mt-auto">
          <button
            onClick={runPipeline}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-[0.08em] text-white transition-colors duration-150 disabled:opacity-50"
            style={{ backgroundColor: 'hsl(var(--ct-teal))' }}
            onMouseEnter={e => { if (!(e.target as HTMLButtonElement).disabled) (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal-hover))'; }}
            onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'}
          >
            {isLoading ? 'Running…' : 'Run ChemTrace →'}
          </button>
          <button
            onClick={runPipeline}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-[0.08em] border transition-colors duration-150 disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-sidebar-text))', opacity: 0.7 }}
          >
            Regenerate
          </button>
        </div>
      </aside>

      {/* Main canvas */}
      <main className="flex-1 overflow-y-auto px-8 py-6" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: 'hsl(0,90%,96%)', borderLeft: '3px solid hsl(var(--ct-status-red))', color: 'hsl(var(--ct-ink))' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-8 h-8 border-3 rounded-full animate-ct-spin mb-3" style={{ borderColor: 'hsl(var(--ct-teal))', borderTopColor: 'transparent' }} />
            <span className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>Running pipeline…</span>
          </div>
        )}

        {/* Results */}
        {results && !isLoading && <ResultsView results={results} />}

        {/* Landing */}
        {!results && !isLoading && !error && (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <div className="max-w-[540px] text-center">
              <div className="font-serif-display text-5xl mb-3" style={{ color: 'hsl(var(--ct-teal))' }}>⚗</div>
              <h1 className="font-serif-display font-bold text-xl mb-3" style={{ color: 'hsl(var(--ct-ink))', lineHeight: 1.2 }}>Autonomous Reaction Scouting</h1>
              <p className="font-body text-sm leading-[1.7] mb-5" style={{ color: 'hsl(var(--ct-muted))' }}>
                Enter a molecule name or SMILES string. ChemTrace evaluates synthesis routes, checks reagent supply chains, assesses regulatory compliance, and recommends the optimal pathway for your production location and batch size.
              </p>
              <div className="border rounded-[3px] p-4 bg-card" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>CURATED MOLECULES — NO SETUP NEEDED</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {CURATED_MOLECULES.map(m => (
                    <button
                      key={m}
                      onClick={() => { setQuery(m); }}
                      className="font-mono-data text-xs px-2 py-0.5 rounded-[2px] transition-colors duration-150 cursor-pointer"
                      style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: 'hsl(var(--ct-teal))' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-paper2))'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-teal))'; }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
