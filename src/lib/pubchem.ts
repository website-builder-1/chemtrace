import type { MoleculeData } from '@/types/chemtrace';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

function countRingsFromSmiles(smiles: string): number {
  let ringDigits = 0;
  for (let i = 0; i < smiles.length; i++) {
    const ch = smiles[i];
    if (ch >= '1' && ch <= '9') ringDigits++;
    if (ch === '%') {
      i += 2;
      ringDigits++;
    }
  }
  return Math.floor(ringDigits / 2);
}

const PROPS = 'MolecularWeight,XLogP,HBondDonorCount,IUPACName,CanonicalSMILES';

async function fetchByLookup(lookup: string, value: string): Promise<MoleculeData | null> {
  try {
    const url = `${BASE}/compound/${lookup}/${encodeURIComponent(value)}/property/${PROPS}/JSON`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;
    const smiles = props.CanonicalSMILES || props.ConnectivitySMILES || '';
    const mw = typeof props.MolecularWeight === 'string' ? parseFloat(props.MolecularWeight) : (props.MolecularWeight ?? 0);
    const displayName = props.IUPACName || value;
    return {
      name: displayName,
      smiles,
      iupac: props.IUPACName || '',
      mw,
      xlogp: props.XLogP ?? 0,
      hbd: props.HBondDonorCount ?? 0,
      rings: countRingsFromSmiles(smiles),
      cid: props.CID,
      source: 'pubchem',
    };
  } catch {
    return null;
  }
}

export function fetchFromPubChem(name: string): Promise<MoleculeData | null> {
  return fetchByLookup('name', name).then(m => m
    ? { ...m, name: name.charAt(0).toUpperCase() + name.slice(1) }
    : null);
}

/** Lookup a molecule by SMILES (already canonical, ideally). */
export function fetchFromPubChemBySmiles(smiles: string): Promise<MoleculeData | null> {
  return fetchByLookup('smiles', smiles);
}
