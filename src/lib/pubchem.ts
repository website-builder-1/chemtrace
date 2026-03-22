import type { MoleculeData } from '@/types/chemtrace';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

export async function fetchFromPubChem(name: string): Promise<MoleculeData | null> {
  try {
    const propUrl = `${BASE}/compound/name/${encodeURIComponent(name)}/property/MolecularWeight,XLogP,HBondDonorCount,IUPACName,CanonicalSMILES,RingCount/JSON`;
    const res = await fetch(propUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      smiles: props.CanonicalSMILES || '',
      iupac: props.IUPACName || '',
      mw: props.MolecularWeight ?? 0,
      xlogp: props.XLogP ?? 0,
      hbd: props.HBondDonorCount ?? 0,
      rings: props.RingCount ?? 0,
      cid: props.CID,
    };
  } catch {
    return null;
  }
}
