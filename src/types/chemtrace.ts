export interface MoleculeData {
  name: string;
  smiles: string;
  iupac: string;
  mw: number;
  xlogp: number;
  hbd: number;
  rings: number;
  cid?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';
export type RouteStatus = 'APPROVED' | 'FLAGGED' | 'REJECTED';

export interface RouteStep {
  number: number;
  description: string;
  smiles?: string;
}

export interface ReagentInfo {
  name: string;
  cas: string;
  supplier: string;
  country: string;
  price: string;
  availability: string;
  leadDays: number;
  hazard: string;
  geoRisk: RiskLevel;
  status: 'PREFERRED' | 'STANDARD' | 'RESTRICTED' | 'BLOCKED';
  exportControlled: boolean;
}

export interface SynthesisRoute {
  id: string;
  name: string;
  status: RouteStatus;
  score: number;
  yieldPercent: number;
  costPerGram: number;
  batchEstimate: number;
  steps: RouteStep[];
  reagents: string[];
  reagentProcurement: ReagentInfo[];
  citation: string;
  supplyRisk: RiskLevel;
  regulatoryRisk: RiskLevel;
  decisionReason: string;
  riskNotes?: { type: 'error' | 'warning' | 'info'; text: string }[];
}

export interface RegulatoryFramework {
  location: string;
  body: string;
  regulations: string[];
  preferredRegions: string[];
  jurisdictionNotes: string;
}

export interface PipelineResults {
  molecule: MoleculeData;
  location: string;
  regulatory: RegulatoryFramework;
  routes: SynthesisRoute[];
  recommendedRouteId: string;
  agentExplanation: string;
  batchSizeMg: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}
