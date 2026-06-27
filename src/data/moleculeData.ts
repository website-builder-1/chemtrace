import type { MoleculeData, RegulatoryFramework } from '@/types/chemtrace';

/**
 * Property fallbacks only. Synthesis routes are produced dynamically by the
 * `retrosynthesis` edge function — there are no curated route lists.
 */
export const CURATED_MOLECULES = [
  'ibuprofen', 'aspirin', 'paracetamol', 'naproxen',
  'dopamine', 'caffeine', 'atenolol', 'metformin',
];

const MOLECULES: Record<string, MoleculeData> = {
  ibuprofen:   { name: 'Ibuprofen',   smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', iupac: '2-(4-isobutylphenyl)propionic acid', mw: 206.28, xlogp: 3.5, hbd: 1, rings: 1, cid: 3672 },
  aspirin:     { name: 'Aspirin',     smiles: 'CC(=O)Oc1ccccc1C(=O)O',      iupac: '2-acetoxybenzoic acid',             mw: 180.16, xlogp: 1.2, hbd: 1, rings: 1, cid: 2244 },
  paracetamol: { name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1',         iupac: 'N-(4-hydroxyphenyl)acetamide',      mw: 151.16, xlogp: 0.46, hbd: 2, rings: 1, cid: 1983 },
  naproxen:    { name: 'Naproxen',    smiles: 'COc1ccc2cc(ccc2c1)C(C)C(=O)O', iupac: '(S)-2-(6-methoxynaphthalen-2-yl)propanoic acid', mw: 230.26, xlogp: 3.18, hbd: 1, rings: 2, cid: 156391 },
  dopamine:    { name: 'Dopamine',    smiles: 'NCCc1ccc(O)c(O)c1',          iupac: '4-(2-aminoethyl)benzene-1,2-diol',  mw: 153.18, xlogp: -0.98, hbd: 3, rings: 1, cid: 681 },
  caffeine:    { name: 'Caffeine',    smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O', iupac: '1,3,7-trimethyl-3,7-dihydro-1H-purine-2,6-dione', mw: 194.19, xlogp: -0.07, hbd: 0, rings: 2, cid: 2519 },
  atenolol:    { name: 'Atenolol',    smiles: 'CC(C)NCC(O)COc1ccc(CC(N)=O)cc1', iupac: '2-[4-[2-hydroxy-3-(propan-2-ylamino)propoxy]phenyl]acetamide', mw: 266.34, xlogp: 0.16, hbd: 4, rings: 1, cid: 2249 },
  metformin:   { name: 'Metformin',   smiles: 'CN(C)C(=N)NC(=N)N',          iupac: '1,1-dimethylbiguanide',             mw: 129.16, xlogp: -1.36, hbd: 2, rings: 0, cid: 4091 },
};

const REGULATORY: Record<string, RegulatoryFramework> = {
  UK:          { location: 'UK',          body: 'MHRA',      regulations: ['Human Medicines Regulations 2012', 'REACH (UK retained)', 'Misuse of Drugs Act 1971', 'Precursor Chemical Regulations'], preferredRegions: ['UK', 'EU', 'Switzerland'], jurisdictionNotes: 'Post-Brexit UK REACH applies. API manufacturers require MHRA GMP compliance. Controlled substances require Home Office licence.' },
  EU:          { location: 'EU',          body: 'EMA',       regulations: ['EU GMP Directive 2003/94/EC', 'REACH Regulation (EC) 1907/2006', 'EU Precursors Regulation 273/2004', 'Falsified Medicines Directive 2011/62/EU'], preferredRegions: ['EU', 'Switzerland', 'UK'], jurisdictionNotes: 'EMA centralized procedure applies. CEP certificates required for API suppliers. EDQM oversight for pharmacopoeial standards.' },
  USA:         { location: 'USA',         body: 'FDA',       regulations: ['Federal Food, Drug, and Cosmetic Act', 'Drug Supply Chain Security Act', 'DEA Controlled Substances Act', 'EPA TSCA regulations'], preferredRegions: ['USA', 'EU', 'Japan'], jurisdictionNotes: 'FDA cGMP compliance required. DMF required for API suppliers. DEA registration for Schedule II-V substances.' },
  India:       { location: 'India',       body: 'CDSCO',     regulations: ['Drugs and Cosmetics Act 1940', 'NDPS Act 1985', 'Chemical Weapons Convention Act'], preferredRegions: ['India', 'China', 'EU'], jurisdictionNotes: 'CDSCO approval required. India is a major API manufacturing hub. Price controls apply to essential medicines.' },
  China:       { location: 'China',       body: 'NMPA',      regulations: ['Drug Administration Law 2019', 'Regulations on Narcotic Drugs', 'Chemical Weapons Convention Implementation'], preferredRegions: ['China', 'India'], jurisdictionNotes: 'NMPA registration required. Dual-use chemical export controls apply. Environmental regulations increasingly strict.' },
  Switzerland: { location: 'Switzerland', body: 'Swissmedic',regulations: ['Therapeutic Products Act', 'Narcotics Act', 'Chemicals Act (ChemA)'], preferredRegions: ['Switzerland', 'EU', 'UK'], jurisdictionNotes: 'Swissmedic GMP inspections. MRA with EU for pharmaceutical products. High-quality manufacturing environment.' },
  Japan:       { location: 'Japan',       body: 'PMDA',      regulations: ['Pharmaceutical and Medical Device Act', 'Narcotics and Psychotropics Control Act', 'Chemical Substances Control Law'], preferredRegions: ['Japan', 'USA', 'EU'], jurisdictionNotes: 'PMDA review required. Japanese Pharmacopoeia standards. Strict import controls on controlled substances.' },
};

export function getMoleculeData(name: string): MoleculeData | null {
  const key = name.toLowerCase().trim();
  const m = MOLECULES[key];
  return m ? { ...m, source: 'curated' } : null;
}

export function getRegulatory(location: string): RegulatoryFramework {
  return REGULATORY[location] || REGULATORY['UK'];
}
