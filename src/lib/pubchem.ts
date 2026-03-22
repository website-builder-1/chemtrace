import type { MoleculeData } from '@/types/chemtrace';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

function countRingsFromSmiles(smiles: string): number {
  // Count ring closure digits and pair them — each pair = 1 ring
  let ringDigits = 0;
  for (let i = 0; i < smiles.length; i++) {
    const ch = smiles[i];
    if (ch >= '1' && ch <= '9') ringDigits++;
    if (ch === '%') {
      // two-digit ring notation like %10
      i += 2;
      ringDigits++;
    }
  }
  return Math.floor(ringDigits / 2);
}

export async function fetchFromPubChem(name: string): Promise<MoleculeData | null> {
  try {
    const propUrl = `${BASE}/compound/name/${encodeURIComponent(name)}/property/MolecularWeight,XLogP,HBondDonorCount,IUPACName,CanonicalSMILES,CID/JSON`;
    const res = await fetch(propUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;
    const smiles = props.CanonicalSMILES || '';
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      smiles,
      iupac: props.IUPACName || '',
      mw: props.MolecularWeight ?? 0,
      xlogp: props.XLogP ?? 0,
      hbd: props.HBondDonorCount ?? 0,
      rings: countRingsFromSmiles(smiles),
      cid: props.CID,
    };
  } catch {
    return null;
  }
}
