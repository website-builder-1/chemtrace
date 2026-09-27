// Compound identity resolution: PubChem (authoritative) + RDKit, cached in `compounds`.
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { canonical, descriptors } from "./chem.ts";

const PC = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPS = "MolecularFormula,MolecularWeight,InChI,InChIKey,IUPACName,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,SMILES,ConnectivitySMILES";

async function pc(path: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${PC}${path}`);
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch { /* retry */ }
    await new Promise((s) => setTimeout(s, 400 * (i + 1)));
  }
  return null;
}

export async function resolveCompound(admin: SupabaseClient, query: { smiles?: string; name?: string }) {
  let smiles = query.smiles?.trim();
  if (!smiles && query.name) {
    const { data: syn } = await admin.from("compound_synonyms").select("compound:compounds(*)").ilike("synonym", query.name.trim()).limit(1).maybeSingle();
    // deno-lint-ignore no-explicit-any
    if ((syn as any)?.compound) return { ...(syn as any).compound, cached: true };
    const j = await pc(`/compound/name/${encodeURIComponent(query.name.trim())}/property/SMILES,ConnectivitySMILES/JSON`);
    const p = j?.PropertyTable?.Properties?.[0];
    smiles = p?.SMILES ?? p?.ConnectivitySMILES;
    if (!smiles) {
      try {
        const r = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(query.name.trim())}/smiles`);
        if (r.ok) smiles = (await r.text()).trim().split("\n")[0];
      } catch { /* */ }
    }
  }
  if (!smiles) return null;
  const can = await canonical(smiles);
  if (!can) return null;

  const { data: existing } = await admin.from("compounds").select("*").eq("canonical_smiles", can).maybeSingle();
  if (existing && Date.now() - new Date(existing.updated_at).getTime() < 30 * 86400_000) return { ...existing, cached: true };

  const j = await pc(`/compound/smiles/property/${PROPS}/JSON?smiles=${encodeURIComponent(can)}`);
  const p = j?.PropertyTable?.Properties?.[0];
  const d = await descriptors(can);
  const row = {
    canonical_smiles: can,
    name: p?.IUPACName ?? query.name ?? null,
    inchi: p?.InChI ?? d?.inchi ?? null,
    inchikey: p?.InChIKey ?? null,
    formula: p?.MolecularFormula ?? d?.formula ?? null,
    mw: p?.MolecularWeight ? Number(p.MolecularWeight) : d?.mw ?? null,
    pubchem_cid: p?.CID ?? null,
    properties: { pubchem: p ?? null, rdkit: d },
    source: p ? "PubChem PUG REST + RDKit" : "RDKit (not found in PubChem)",
    updated_at: new Date().toISOString(),
  };
  const { data: saved } = await admin.from("compounds").upsert(row, { onConflict: "canonical_smiles" }).select().single();
  if (saved && p?.CID) {
    const s = await pc(`/compound/cid/${p.CID}/synonyms/JSON`);
    const syns: string[] = (s?.InformationList?.Information?.[0]?.Synonym ?? []).slice(0, 15);
    if (query.name) syns.unshift(query.name);
    if (syns.length) await admin.from("compound_synonyms").upsert([...new Set(syns)].map((x) => ({ compound_id: saved.id, synonym: x })), { onConflict: "compound_id,synonym" });
  }
  return saved ?? row;
}
