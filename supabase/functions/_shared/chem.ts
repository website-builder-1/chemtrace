// Deterministic cheminformatics via RDKit-JS. The LLM never computes these.
import initRDKitModule from "npm:@rdkit/rdkit@2025.3.4-1.0.0";

let rdkitPromise: Promise<unknown> | null = null;
// deno-lint-ignore no-explicit-any
export async function getRDKit(): Promise<any> {
  if (!rdkitPromise) rdkitPromise = initRDKitModule();
  return await rdkitPromise;
}

// deno-lint-ignore no-explicit-any
async function withMol<T>(smiles: string, fn: (mol: any) => T): Promise<T | null> {
  const RDKit = await getRDKit();
  const mol = RDKit.get_mol(smiles.trim());
  if (!mol || !mol.is_valid()) { try { mol?.delete(); } catch { /* */ } return null; }
  try { return fn(mol); } finally { mol.delete(); }
}

export async function canonical(smiles: string) {
  return await withMol(smiles, (m) => m.get_smiles() as string);
}

export async function descriptors(smiles: string) {
  return await withMol(smiles, (m) => {
    const d = JSON.parse(m.get_descriptors());
    return {
      canonical_smiles: m.get_smiles(),
      inchi: safe(() => m.get_inchi()),
      mw: round(d.amw), exact_mass: round(d.exactmw), formula: d.formula ?? undefined,
      logp: round(d.CrippenClogP), tpsa: round(d.tpsa), hbd: d.NumHBD, hba: d.NumHBA,
      rotatable_bonds: d.NumRotatableBonds, rings: d.NumRings, aromatic_rings: d.NumAromaticRings,
      heavy_atoms: d.NumHeavyAtoms, fraction_csp3: round(d.FractionCSP3),
      lipinski_violations: [d.amw > 500, d.CrippenClogP > 5, d.NumHBD > 5, d.NumHBA > 10].filter(Boolean).length,
    };
  });
}

function safe<T>(f: () => T): T | undefined { try { return f(); } catch { return undefined; } }
function round(n: unknown) { return typeof n === "number" ? Math.round(n * 1000) / 1000 : undefined; }

async function fingerprint(smiles: string): Promise<string | null> {
  return await withMol(smiles, (m) => m.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 })) as string);
}

export async function tanimoto(a: string, b: string): Promise<number | null> {
  const [fa, fb] = await Promise.all([fingerprint(a), fingerprint(b)]);
  if (!fa || !fb) return null;
  let both = 0, either = 0;
  for (let i = 0; i < fa.length; i++) {
    const x = fa[i] === "1", y = fb[i] === "1";
    if (x && y) both++;
    if (x || y) either++;
  }
  return either ? Math.round((both / either) * 1000) / 1000 : 0;
}

export async function hasSubstructure(smiles: string, smarts: string): Promise<boolean | null> {
  const RDKit = await getRDKit();
  const q = RDKit.get_qmol(smarts);
  if (!q || !q.is_valid()) return null;
  try {
    return await withMol(smiles, (m) => JSON.parse(m.get_substruct_match(q) || "{}").atoms?.length > 0);
  } finally { q.delete(); }
}

// Common functional groups, detected deterministically.
export const FUNCTIONAL_GROUPS: Record<string, string> = {
  "alcohol": "[CX4][OX2H]", "phenol": "c[OX2H]", "carboxylic acid": "[CX3](=O)[OX2H1]",
  "ester": "[#6][CX3](=O)[OX2][#6]", "amide": "[NX3][CX3](=[OX1])", "amine (primary)": "[NX3;H2][#6]",
  "amine (secondary)": "[NX3;H1]([#6])[#6]", "ketone": "[#6][CX3](=O)[#6]", "aldehyde": "[CX3H1](=O)[#6]",
  "ether": "[OD2]([#6])[#6]", "alkene": "C=C", "alkyne": "C#C", "nitrile": "C#N", "nitro": "[N+](=O)[O-]",
  "halide": "[#6][F,Cl,Br,I]", "aromatic ring": "a1aaaaa1", "sulfonamide": "S(=O)(=O)N", "thiol": "[SX2H]",
};

export async function functionalGroups(smiles: string): Promise<string[]> {
  const out: string[] = [];
  for (const [name, smarts] of Object.entries(FUNCTIONAL_GROUPS)) if (await hasSubstructure(smiles, smarts)) out.push(name);
  return out;
}
