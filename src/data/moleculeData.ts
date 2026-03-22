import type { MoleculeData, SynthesisRoute, RegulatoryFramework } from '@/types/chemtrace';

export const CURATED_MOLECULES = [
  'ibuprofen', 'aspirin', 'paracetamol', 'naproxen',
  'dopamine', 'caffeine', 'atenolol', 'metformin',
];

const MOLECULES: Record<string, MoleculeData> = {
  ibuprofen: {
    name: 'Ibuprofen',
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    iupac: '2-(4-isobutylphenyl)propionic acid',
    mw: 206.28, xlogp: 3.5, hbd: 1, rings: 1, cid: 3672,
  },
  aspirin: {
    name: 'Aspirin',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    iupac: '2-acetoxybenzoic acid',
    mw: 180.16, xlogp: 1.2, hbd: 1, rings: 1, cid: 2244,
  },
  paracetamol: {
    name: 'Paracetamol',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    iupac: 'N-(4-hydroxyphenyl)acetamide',
    mw: 151.16, xlogp: 0.46, hbd: 2, rings: 1, cid: 1983,
  },
  naproxen: {
    name: 'Naproxen',
    smiles: 'COc1ccc2cc(ccc2c1)C(C)C(=O)O',
    iupac: '(S)-2-(6-methoxynaphthalen-2-yl)propanoic acid',
    mw: 230.26, xlogp: 3.18, hbd: 1, rings: 2, cid: 156391,
  },
  dopamine: {
    name: 'Dopamine',
    smiles: 'NCCc1ccc(O)c(O)c1',
    iupac: '4-(2-aminoethyl)benzene-1,2-diol',
    mw: 153.18, xlogp: -0.98, hbd: 3, rings: 1, cid: 681,
  },
  caffeine: {
    name: 'Caffeine',
    smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O',
    iupac: '1,3,7-trimethyl-3,7-dihydro-1H-purine-2,6-dione',
    mw: 194.19, xlogp: -0.07, hbd: 0, rings: 2, cid: 2519,
  },
  atenolol: {
    name: 'Atenolol',
    smiles: 'CC(C)NCC(O)COc1ccc(CC(N)=O)cc1',
    iupac: '2-[4-[2-hydroxy-3-(propan-2-ylamino)propoxy]phenyl]acetamide',
    mw: 266.34, xlogp: 0.16, hbd: 4, rings: 1, cid: 2249,
  },
  metformin: {
    name: 'Metformin',
    smiles: 'CN(C)C(=N)NC(=N)N',
    iupac: '1,1-dimethylbiguanide',
    mw: 129.16, xlogp: -1.36, hbd: 2, rings: 0, cid: 4091,
  },
};

const REGULATORY: Record<string, RegulatoryFramework> = {
  UK: { location: 'UK', body: 'MHRA', regulations: ['Human Medicines Regulations 2012', 'REACH (UK retained)', 'Misuse of Drugs Act 1971', 'Precursor Chemical Regulations'], preferredRegions: ['UK', 'EU', 'Switzerland'], jurisdictionNotes: 'Post-Brexit UK REACH applies. API manufacturers require MHRA GMP compliance. Controlled substances require Home Office licence.' },
  EU: { location: 'EU', body: 'EMA', regulations: ['EU GMP Directive 2003/94/EC', 'REACH Regulation (EC) 1907/2006', 'EU Precursors Regulation 273/2004', 'Falsified Medicines Directive 2011/62/EU'], preferredRegions: ['EU', 'Switzerland', 'UK'], jurisdictionNotes: 'EMA centralized procedure applies. CEP certificates required for API suppliers. EDQM oversight for pharmacopoeial standards.' },
  USA: { location: 'USA', body: 'FDA', regulations: ['Federal Food, Drug, and Cosmetic Act', 'Drug Supply Chain Security Act', 'DEA Controlled Substances Act', 'EPA TSCA regulations'], preferredRegions: ['USA', 'EU', 'Japan'], jurisdictionNotes: 'FDA cGMP compliance required. DMF required for API suppliers. DEA registration for Schedule II-V substances.' },
  India: { location: 'India', body: 'CDSCO', regulations: ['Drugs and Cosmetics Act 1940', 'NDPS Act 1985', 'Chemical Weapons Convention Act'], preferredRegions: ['India', 'China', 'EU'], jurisdictionNotes: 'CDSCO approval required. India is a major API manufacturing hub. Price controls apply to essential medicines.' },
  China: { location: 'China', body: 'NMPA', regulations: ['Drug Administration Law 2019', 'Regulations on Narcotic Drugs', 'Chemical Weapons Convention Implementation'], preferredRegions: ['China', 'India'], jurisdictionNotes: 'NMPA registration required. Dual-use chemical export controls apply. Environmental regulations increasingly strict.' },
  Switzerland: { location: 'Switzerland', body: 'Swissmedic', regulations: ['Therapeutic Products Act', 'Narcotics Act', 'Chemicals Act (ChemA)'], preferredRegions: ['Switzerland', 'EU', 'UK'], jurisdictionNotes: 'Swissmedic GMP inspections. MRA with EU for pharmaceutical products. High-quality manufacturing environment.' },
  Japan: { location: 'Japan', body: 'PMDA', regulations: ['Pharmaceutical and Medical Device Act', 'Narcotics and Psychotropics Control Act', 'Chemical Substances Control Law'], preferredRegions: ['Japan', 'USA', 'EU'], jurisdictionNotes: 'PMDA review required. Japanese Pharmacopoeia standards. Strict import controls on controlled substances.' },
};

function getIbuprofenRoutes(location: string, batchMg: number): SynthesisRoute[] {
  const batchG = batchMg / 1000;
  return [
    {
      id: 'R1', name: 'BHC (Boots-Hoechst-Celanese) Green Process', status: 'APPROVED', score: 0.94, yieldPercent: 77, costPerGram: 12.40, batchEstimate: +(12.40 * batchG).toFixed(2), steps: [
        { number: 1, description: 'Friedel-Crafts acylation of isobutylbenzene with acetic anhydride using HF catalyst to yield 4\'-isobutylacetophenone', smiles: 'CC(=O)c1ccc(CC(C)C)cc1' },
        { number: 2, description: 'Hydrogenation of the ketone intermediate using Raney nickel and H₂ to give 1-(4-isobutylphenyl)ethanol', smiles: 'CC(O)c1ccc(CC(C)C)cc1' },
        { number: 3, description: 'Carbonylation with palladium catalyst (Pd(dppf)Cl₂) and CO in methanol, followed by hydrolysis to yield racemic ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
      ],
      reagents: ['Isobutylbenzene', 'Acetic anhydride', 'HF catalyst', 'Raney Nickel', 'H₂ gas', 'Pd(dppf)Cl₂', 'Carbon monoxide', 'Methanol'],
      reagentProcurement: [
        { name: 'Isobutylbenzene', cas: '538-93-2', supplier: 'Sigma-Aldrich', country: 'Germany', price: '£28.50/100g', availability: 'In Stock', leadDays: 3, hazard: 'Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Acetic anhydride', cas: '108-24-7', supplier: 'Fisher Scientific', country: 'UK', price: '£18.90/500mL', availability: 'In Stock', leadDays: 2, hazard: 'Corrosive, Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'HF (Hydrogen fluoride)', cas: '7664-39-3', supplier: 'Alfa Aesar', country: 'USA', price: '£145.00/500g', availability: 'Made to Order', leadDays: 14, hazard: 'Extremely Toxic, Corrosive', geoRisk: 'low', status: 'RESTRICTED', exportControlled: false },
        { name: 'Raney Nickel', cas: '7440-02-0', supplier: 'Sigma-Aldrich', country: 'Germany', price: '£52.30/50g', availability: 'In Stock', leadDays: 5, hazard: 'Pyrophoric, Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Pd(dppf)Cl₂', cas: '72287-26-4', supplier: 'TCI Chemicals', country: 'Japan', price: '£187.00/5g', availability: 'In Stock', leadDays: 7, hazard: 'Irritant', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Carbon monoxide', cas: '630-08-0', supplier: 'BOC Gases', country: 'UK', price: '£95.00/cylinder', availability: 'In Stock', leadDays: 3, hazard: 'Extremely Toxic, Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Methanol', cas: '67-56-1', supplier: 'Fisher Scientific', country: 'UK', price: '£15.20/2.5L', availability: 'In Stock', leadDays: 1, hazard: 'Toxic, Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
      ],
      citation: 'Elango, V. et al. "BHC Ibuprofen Process: A Green Chemistry Success." Synthesis, 1991, 1, 50–53. Winner of the Presidential Green Chemistry Challenge Award, 1997.',
      supplyRisk: 'low', regulatoryRisk: 'low',
      decisionReason: 'Highest atom economy (77%), fewest steps (3), established industrial process with Green Chemistry Award recognition.',
      riskNotes: [{ type: 'info', text: `Standard pharmaceutical reagents — all available through established ${location} supply chains with GMP-compliant suppliers.` }],
    },
    {
      id: 'R2', name: 'Classic Boots Synthesis (Original)', status: 'APPROVED', score: 0.72, yieldPercent: 40, costPerGram: 28.60, batchEstimate: +(28.60 * batchG).toFixed(2), steps: [
        { number: 1, description: 'Friedel-Crafts acylation of isobutylbenzene with acetyl chloride / AlCl₃' },
        { number: 2, description: 'Darzens glycidic ester condensation with ethyl chloroacetate' },
        { number: 3, description: 'Hydrolysis and decarboxylation of glycidic ester to aldehyde' },
        { number: 4, description: 'Wittig reaction or Knoevenagel condensation to extend carbon chain' },
        { number: 5, description: 'Oxidation to carboxylic acid' },
        { number: 6, description: 'Purification and crystallization to yield racemic ibuprofen' },
      ],
      reagents: ['Isobutylbenzene', 'Acetyl chloride', 'AlCl₃', 'Ethyl chloroacetate', 'NaOEt', 'H₂SO₄', 'NaOH'],
      reagentProcurement: [
        { name: 'Isobutylbenzene', cas: '538-93-2', supplier: 'Sigma-Aldrich', country: 'Germany', price: '£28.50/100g', availability: 'In Stock', leadDays: 3, hazard: 'Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Acetyl chloride', cas: '75-36-5', supplier: 'Alfa Aesar', country: 'USA', price: '£22.10/100mL', availability: 'In Stock', leadDays: 5, hazard: 'Corrosive, Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'AlCl₃', cas: '7446-70-0', supplier: 'TCI Chemicals', country: 'Japan', price: '£19.80/100g', availability: 'In Stock', leadDays: 5, hazard: 'Corrosive', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
        { name: 'Ethyl chloroacetate', cas: '105-39-5', supplier: 'Sigma-Aldrich', country: 'Germany', price: '£24.30/100mL', availability: 'In Stock', leadDays: 4, hazard: 'Toxic, Lachrymator', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
      ],
      citation: 'Boots Pure Drug Co. "Ibuprofen synthesis." UK Patent GB 971700, 1964. Original 6-step synthesis by Stewart Adams and John Nicholson.',
      supplyRisk: 'low', regulatoryRisk: 'low',
      decisionReason: 'Original industrial route, well-characterized but low atom economy (40%) and high waste generation compared to BHC process.',
    },
    {
      id: 'R3', name: 'Asymmetric Hydrogenation Route (S-Ibuprofen)', status: 'FLAGGED', score: 0.81, yieldPercent: 65, costPerGram: 45.20, batchEstimate: +(45.20 * batchG).toFixed(2), steps: [
        { number: 1, description: 'Friedel-Crafts acylation to give 4\'-isobutylacetophenone' },
        { number: 2, description: 'Asymmetric hydrogenation using chiral Ru-BINAP catalyst to yield (S)-1-(4-isobutylphenyl)ethanol with >95% ee' },
        { number: 3, description: 'Carbonylation to (S)-ibuprofen' },
        { number: 4, description: 'Chiral HPLC purification and recrystallization' },
      ],
      reagents: ['Isobutylbenzene', 'Acetic anhydride', 'Ru-BINAP catalyst', 'H₂ gas', 'CO', 'PdCl₂'],
      reagentProcurement: [
        { name: 'Ru-BINAP catalyst', cas: '98674-86-3', supplier: 'Strem Chemicals', country: 'USA', price: '£420.00/1g', availability: 'In Stock', leadDays: 10, hazard: 'Irritant', geoRisk: 'low', status: 'STANDARD', exportControlled: false },
        { name: 'Isobutylbenzene', cas: '538-93-2', supplier: 'Sigma-Aldrich', country: 'Germany', price: '£28.50/100g', availability: 'In Stock', leadDays: 3, hazard: 'Flammable', geoRisk: 'low', status: 'PREFERRED', exportControlled: false },
      ],
      citation: 'Noyori, R. "Asymmetric catalysis in organic synthesis." Wiley, 1994. Adapted for ibuprofen enantioselective synthesis.',
      supplyRisk: 'medium', regulatoryRisk: 'low',
      decisionReason: 'Produces enantiopure (S)-ibuprofen (the active enantiomer) but expensive chiral catalyst significantly increases cost.',
      riskNotes: [
        { type: 'warning', text: 'Ru-BINAP catalyst cost is significant at scale. Consider catalyst recycling protocols to reduce per-batch expense.' },
        { type: 'info', text: 'Enantiopure (S)-ibuprofen may command premium pricing in markets requiring single-enantiomer APIs.' },
      ],
    },
  ];
}

export function getMoleculeData(name: string): MoleculeData | null {
  const key = name.toLowerCase().trim();
  return MOLECULES[key] || null;
}

export function getRoutes(moleculeName: string, location: string, batchMg: number): SynthesisRoute[] {
  const key = moleculeName.toLowerCase().trim();
  if (key === 'ibuprofen') return getIbuprofenRoutes(location, batchMg);
  // For other curated molecules, generate similar data structures
  return getIbuprofenRoutes(location, batchMg); // fallback for demo
}

export function getRegulatory(location: string): RegulatoryFramework {
  return REGULATORY[location] || REGULATORY['UK'];
}
