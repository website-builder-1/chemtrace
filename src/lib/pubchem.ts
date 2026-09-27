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

const PROPS = 'MolecularWeight,XLogP,HBondDonorCount,IUPACName,SMILES,ConnectivitySMILES';

async function fetchRetry(url: string, tries = 3): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok || res.status === 404 || res.status === 400) return res;
    } catch { /* network blip — retry */ }
    await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  return null;
}

async function fetchByLookup(lookup: string, value: string): Promise<MoleculeData | null> {
  try {
    const url = `${BASE}/compound/${lookup}/${encodeURIComponent(value)}/property/${PROPS}/JSON`;
    const res = await fetchRetry(url);
    if (!res || !res.ok) return null;
    const data = await res.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;
    const smiles = props.SMILES || props.IsomericSMILES || props.CanonicalSMILES || props.ConnectivitySMILES || '';
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

/** Backup name→SMILES resolver (NCI CACTUS) used when PubChem is unreachable. */
async function resolveNameViaCactus(name: string): Promise<string | null> {
  const res = await fetchRetry(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(name)}/smiles`, 2);
  if (!res || !res.ok) return null;
  const txt = (await res.text()).trim().split(/\s+/)[0];
  return txt && !txt.startsWith('<') ? txt : null;
}

export async function fetchFromPubChem(name: string): Promise<MoleculeData | null> {
  const pretty = name.charAt(0).toUpperCase() + name.slice(1);
  const m = await fetchByLookup('name', name);
  if (m) return { ...m, name: pretty };
  const smiles = await resolveNameViaCactus(name);
  if (!smiles) return null;
  const bySmiles = await fetchByLookup('smiles', smiles);
  if (bySmiles) return { ...bySmiles, name: pretty };
  return { name: pretty, smiles, iupac: '', mw: 0, xlogp: 0, hbd: 0, rings: countRingsFromSmiles(smiles), source: 'curated' };
}

/** Lookup a molecule by SMILES (already canonical, ideally). */
export function fetchFromPubChemBySmiles(smiles: string): Promise<MoleculeData | null> {
  return fetchByLookup('smiles', smiles);
}
