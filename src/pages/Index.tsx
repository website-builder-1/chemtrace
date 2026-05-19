import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineResults } from '@/types/chemtrace';
import { CURATED_MOLECULES, getMoleculeData, getRoutes, getRegulatory } from '@/data/moleculeData';
import { fetchFromPubChem } from '@/lib/pubchem';
import ResultsView from '@/components/chemtrace/ResultsView';

const LOCATIONS = ['UK', 'EU', 'USA', 'India', 'China', 'Switzerland', 'Japan'];

interface SidebarBodyProps {
  query: string;
  setQuery: (v: string) => void;
  batchSize: number;
  setBatchSize: (v: number) => void;
  location: string;
  setLocation: (v: string) => void;
  isLoading: boolean;
  runPipeline: () => void;
  userEmail: string | null;
  onAuthClick: () => void;
  onSignOut: () => void;
}

function SidebarBody({
  query, setQuery, batchSize, setBatchSize, location, setLocation,
  isLoading, runPipeline, userEmail, onAuthClick, onSignOut,
}: SidebarBodyProps) {
  const inputClass = "w-full px-3 py-2 rounded-[3px] font-mono-data text-sm border border-[hsl(var(--ct-border))]/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]";

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto" style={{ backgroundColor: 'hsl(var(--ct-sidebar))' }}>
      <div className="mb-1">
        <div className="font-serif-display font-bold text-xl" style={{ color: 'hsl(var(--ct-teal))' }}>⚗ ChemTrace</div>
        <div className="font-mono-data uppercase text-[0.55rem] tracking-[0.15em]" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>SYNTHESIS INTELLIGENCE</div>
      </div>

      <hr className="my-3" style={{ borderColor: 'hsl(var(--ct-border))', opacity: 0.3 }} />
      <div className="font-mono-data uppercase text-[0.55rem] tracking-wider mb-3" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>SEARCH</div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="font-mono-data uppercase text-[0.55rem] tracking-wider block mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>CHEMICAL NAME OR SMILES</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ibuprofen"
            className={inputClass}
            style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0', minHeight: '44px' }}
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
            style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0', minHeight: '44px' }}
          />
        </div>
        <div>
          <label className="font-mono-data uppercase text-[0.55rem] tracking-wider block mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>PRODUCTION LOCATION</label>
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            className={inputClass}
            style={{ backgroundColor: 'hsl(var(--ct-sidebar-input))', color: '#E2EAF0', minHeight: '44px' }}
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
          className="w-full px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] text-white transition-colors duration-150 disabled:opacity-50"
          style={{ backgroundColor: 'hsl(var(--ct-teal))', minHeight: '44px' }}
        >
          {isLoading ? 'Running…' : 'Run ChemTrace →'}
        </button>
        <button
          onClick={runPipeline}
          disabled={isLoading}
          className="w-full px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] border transition-colors duration-150 disabled:opacity-50"
          style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-sidebar-text))', opacity: 0.7, minHeight: '44px' }}
        >
          Regenerate
        </button>

        <hr className="my-2" style={{ borderColor: 'hsl(var(--ct-border))', opacity: 0.3 }} />

        {userEmail ? (
          <>
            <div className="font-mono-data text-[0.65rem] truncate px-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>{userEmail}</div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] border transition-colors duration-150"
              style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-sidebar-text))', minHeight: '44px' }}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </>
        ) : (
          <button
            onClick={onAuthClick}
            className="w-full flex items-center justify-center gap-2 px-4 rounded-[3px] font-mono-data text-xs tracking-[0.08em] border transition-colors duration-150"
            style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-sidebar-text))', minHeight: '44px' }}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in / Sign up
          </button>
        )}
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [batchSize, setBatchSize] = useState(500);
  const [location, setLocation] = useState('UK');
  const [results, setResults] = useState<PipelineResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const runPipeline = async () => {
    const name = query.trim() || 'ibuprofen';
    setIsLoading(true);
    setError('');
    setResults(null);
    setMobileMenuOpen(false);

    try {
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

      const routes = getRoutes(name, location, batchSize, molecule);
      const regulatory = getRegulatory(location);

      setResults({
        molecule, location, regulatory, routes,
        recommendedRouteId: routes[0].id,
        agentExplanation: '',
        batchSizeMg: batchSize,
      });
    } catch {
      setError('Pipeline error. Please try again.');
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
  };

  const sidebarProps: SidebarBodyProps = {
    query, setQuery, batchSize, setBatchSize, location, setLocation,
    isLoading, runPipeline, userEmail,
    onAuthClick: () => { setMobileMenuOpen(false); navigate('/auth'); },
    onSignOut: handleSignOut,
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[280px] flex-shrink-0 flex-col"
        style={{ borderRight: '2px solid hsl(var(--ct-teal))' }}
      >
        <SidebarBody {...sidebarProps} />
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor: 'hsl(var(--ct-sidebar))',
          borderBottom: '2px solid hsl(var(--ct-teal))',
        }}
      >
        <span className="font-serif-display font-bold text-base" style={{ color: 'hsl(var(--ct-teal))' }}>⚗ ChemTrace</span>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="flex items-center justify-center rounded-[3px] text-white"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px] border-0">
            <SidebarBody {...sidebarProps} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main canvas */}
      <main
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pt-[72px] lg:pt-6"
        style={{ backgroundColor: 'hsl(var(--ct-paper))' }}
      >
        {error && (
          <div className="mb-4 p-3 rounded-[3px] font-body text-sm" style={{ backgroundColor: 'hsl(0,90%,96%)', borderLeft: '3px solid hsl(var(--ct-status-red))', color: 'hsl(var(--ct-ink))' }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-8 h-8 border-[3px] rounded-full animate-ct-spin mb-3" style={{ borderColor: 'hsl(var(--ct-teal))', borderTopColor: 'transparent' }} />
            <span className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>Running pipeline…</span>
          </div>
        )}

        {results && !isLoading && <ResultsView results={results} />}

        {!results && !isLoading && !error && (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <div className="max-w-[540px] text-center w-full">
              <div className="font-serif-display text-5xl sm:text-6xl mb-3" style={{ color: 'hsl(var(--ct-teal))' }}>⚗</div>
              <h1 className="font-serif-display font-bold text-xl sm:text-2xl mb-3" style={{ color: 'hsl(var(--ct-ink))', lineHeight: 1.2 }}>Autonomous Reaction Scouting</h1>
              <p className="font-body text-sm sm:text-base leading-[1.7] mb-5" style={{ color: 'hsl(var(--ct-muted))' }}>
                Enter a molecule name or SMILES string. ChemTrace evaluates synthesis routes, checks reagent supply chains, assesses regulatory compliance, and recommends the optimal pathway for your production location and batch size.
              </p>
              <div className="border rounded-[3px] p-4 bg-card" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>CURATED MOLECULES — NO SETUP NEEDED</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {CURATED_MOLECULES.map(m => (
                    <button
                      key={m}
                      onClick={() => setQuery(m)}
                      className="font-mono-data text-xs px-2.5 py-1.5 rounded-[2px] transition-colors duration-150 cursor-pointer"
                      style={{ backgroundColor: 'hsl(var(--ct-paper2))', color: 'hsl(var(--ct-teal))', minHeight: '32px' }}
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