import type { PipelineResults } from '@/types/chemtrace';
import type { Currency } from '@/lib/currency';
import MoleculeIdentityBar from './MoleculeIdentityBar';
import AIAgentPanel from './AIAgentPanel';
import TopRouteCard from './TopRouteCard';
import SupplyChainSection from './SupplyChainSection';
import AllCandidateRoutes from './AllCandidateRoutes';
import InvoicePanel from './InvoicePanel';
import ProtocolGenerator from './ProtocolGenerator';
import ExportSection from './ExportSection';

const HR = () => <hr className="my-5" style={{ borderColor: 'hsl(var(--ct-border))' }} />;

export default function ResultsView({ results, currency }: { results: PipelineResults; currency: Currency }) {
  const rec = results.routes.find(r => r.id === results.recommendedRouteId);
  if (!rec) return null;

  return (
    <div className="space-y-0">
      <MoleculeIdentityBar results={results} />
      <HR />
      <TopRouteCard route={rec} molecule={results.molecule} currency={currency} />
      <HR />
      <SupplyChainSection results={results} currency={currency} />
      <HR />
      <InvoicePanel results={results} currency={currency} />
      <HR />
      <AllCandidateRoutes routes={results.routes} location={results.location} currency={currency} />
      <HR />
      <ProtocolGenerator results={results} />
      <HR />
      <ExportSection results={results} currency={currency} />
      <HR />
      <AIAgentPanel results={results} currency={currency} />
    </div>
  );
}
