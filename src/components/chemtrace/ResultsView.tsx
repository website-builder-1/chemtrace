import type { PipelineResults } from '@/types/chemtrace';
import MoleculeIdentityBar from './MoleculeIdentityBar';
import AIAgentPanel from './AIAgentPanel';
import TopRouteCard from './TopRouteCard';
import SupplyChainSection from './SupplyChainSection';
import AllCandidateRoutes from './AllCandidateRoutes';
import InvoicePanel from './InvoicePanel';
import ProtocolGenerator from './ProtocolGenerator';
import ExportSection from './ExportSection';

const HR = () => <hr className="my-5" style={{ borderColor: 'hsl(var(--ct-border))' }} />;

export default function ResultsView({ results }: { results: PipelineResults }) {
  const rec = results.routes.find(r => r.id === results.recommendedRouteId)!;

  return (
    <div className="space-y-0">
      <MoleculeIdentityBar results={results} />
      <HR />
      <AIAgentPanel results={results} />
      <HR />
      <TopRouteCard route={rec} />
      <HR />
      <SupplyChainSection results={results} />
      <HR />
      <InvoicePanel results={results} />
      <HR />
      <AllCandidateRoutes routes={results.routes} location={results.location} />
      <HR />
      <ProtocolGenerator results={results} />
      <HR />
      <ExportSection results={results} />
    </div>
  );
}
