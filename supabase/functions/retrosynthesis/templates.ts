// Template-based retrosynthesis: well-known textbook disconnections encoded
// as retro reaction SMARTS and applied deterministically with RDKit.
// Conditions are typical textbook conditions → evidence level "analogous".
import { getRDKit } from "../_shared/chem.ts";

interface Template { name: string; retro: string; byproduct?: string; conditions: Record<string, string>; reference: string }

export const TEMPLATES: Template[] = [
  { name: "Fischer esterification", retro: "[C:1](=[O:2])[O:3][CX4:4]>>[C:1](=[O:2])[OH].[OH][C:4]", byproduct: "O",
    conditions: { solvent: "excess alcohol or toluene (Dean–Stark)", catalyst: "H2SO4 (cat.)", reagents: "acid + alcohol", temperature: "reflux" }, reference: "Vogel's Textbook of Practical Organic Chemistry, 5th ed." },
  { name: "Phenol O-acylation (acid anhydride)", retro: "[C:1](=[O:2])[O:3][c:4]>>[C:1](=[O:2])OC(=O)[C:1].[OH][c:4]", byproduct: "CC(=O)O",
    conditions: { solvent: "neat or pyridine", catalyst: "H3PO4 or H2SO4 (cat.)", reagents: "acetic anhydride", temperature: "50–90 °C" }, reference: "Vogel's Textbook, aspirin preparation" },
  { name: "Amide coupling (acid chloride)", retro: "[C:1](=[O:2])[NX3:3]>>[C:1](=[O:2])Cl.[N:3]", byproduct: "Cl",
    conditions: { solvent: "DCM", catalyst: "none", reagents: "Et3N (base)", temperature: "0 °C → rt" }, reference: "Clayden, Organic Chemistry, 2nd ed., ch. 10" },
  { name: "Williamson ether synthesis", retro: "[CX4;!$(C=O):1][O:2][CX4;H2:3]>>[C:1][OH].Br[C:3]", byproduct: "Br",
    conditions: { solvent: "DMF or THF", catalyst: "none", reagents: "NaH or K2CO3 (base)", temperature: "rt → 60 °C" }, reference: "Clayden, Organic Chemistry, ch. 15" },
  { name: "Aryl ether (Williamson, phenoxide)", retro: "[c:1][O:2][CX4;H2,H3:3]>>[c:1][OH].Br[C:3]", byproduct: "Br",
    conditions: { solvent: "acetone or DMF", catalyst: "none", reagents: "K2CO3", temperature: "reflux" }, reference: "Vogel's Textbook, aryl alkyl ethers" },
  { name: "Reductive amination", retro: "[CX4;!$(C(N)N):1][NX3;!$(NC=O):2]>>[C:1]=O.[N:2]", byproduct: "O",
    conditions: { solvent: "DCE or MeOH", catalyst: "AcOH (cat.)", reagents: "NaBH(OAc)3 (reduction)", temperature: "rt" }, reference: "Abdel-Magid et al., J. Org. Chem. 1996, 61, 3849" },
  { name: "Ketone reduction to secondary alcohol", retro: "[CX4;H1:1]([#6:3])([#6:4])[OH:2]>>[C:1]([#6:3])([#6:4])=[O:2].[H][H]",
    conditions: { solvent: "MeOH or EtOH", catalyst: "none", reagents: "NaBH4 (reduction)", temperature: "0 °C → rt" }, reference: "Clayden, Organic Chemistry, ch. 6" },
  { name: "Aldehyde reduction to primary alcohol", retro: "[CX4;H2:1]([#6:3])[OH:2]>>[C:1]([#6:3])=[O:2].[H][H]",
    conditions: { solvent: "MeOH", catalyst: "none", reagents: "NaBH4 (reduction)", temperature: "0 °C → rt" }, reference: "Clayden, Organic Chemistry, ch. 6" },
  { name: "Suzuki–Miyaura coupling", retro: "[c:1]-!@[c:2]>>[c:1]B(O)O.Br[c:2]", byproduct: "OB(O)Br",
    conditions: { solvent: "dioxane/H2O", catalyst: "Pd(PPh3)4", reagents: "K2CO3", temperature: "80–100 °C", atmosphere: "N2" }, reference: "Miyaura & Suzuki, Chem. Rev. 1995, 95, 2457" },
  { name: "Friedel–Crafts acylation", retro: "[c:1][C:2](=[O:3])[CX4:4]>>[cH:1].Cl[C:2](=[O:3])[C:4]", byproduct: "Cl",
    conditions: { solvent: "DCM or CS2", catalyst: "AlCl3 (1.1 equiv)", reagents: "acyl chloride", temperature: "0 °C → rt" }, reference: "Olah, Friedel–Crafts and Related Reactions" },
  { name: "Nitrile hydrolysis", retro: "[C:1](=O)[OH]>>[C:1]#N.O.O", byproduct: "N",
    conditions: { solvent: "water", catalyst: "H2SO4 or NaOH", reagents: "aqueous acid/base", temperature: "reflux" }, reference: "Vogel's Textbook, carboxylic acids" },
  { name: "Ester hydrolysis (saponification)", retro: "[C:1](=[O:2])[OH:3]>>[C:1](=[O:2])OC.O", byproduct: "CO",
    conditions: { solvent: "MeOH/H2O", catalyst: "none", reagents: "NaOH then HCl", temperature: "rt → reflux" }, reference: "Clayden, Organic Chemistry, ch. 10" },
  { name: "Alkene hydration", retro: "[CX4:1][CX4:2][OH]>>[C:1]=[C:2].O",
    conditions: { solvent: "water", catalyst: "H2SO4 or H3PO4", reagents: "H2O", temperature: "elevated" }, reference: "Ullmann's Encyclopedia of Industrial Chemistry" },
  { name: "N-Acetylation of amine", retro: "[CH3:1][C:2](=[O:3])[NX3;H1:4][c:5]>>[CH3:1][C:2](=[O:3])OC(C)=O.[NH2:4][c:5]", byproduct: "CC(=O)O",
    conditions: { solvent: "water or AcOH", catalyst: "none", reagents: "acetic anhydride", temperature: "rt → 80 °C" }, reference: "Vogel's Textbook, acetanilide/paracetamol" },
];

export interface TemplateRoute { name: string; precursors: string[]; reactionSmiles: string; conditions: Record<string, string>; reference: string; score: number }

export async function applyTemplates(targetCanonical: string): Promise<TemplateRoute[]> {
  const R = await getRDKit();
  const target = R.get_mol(targetCanonical);
  if (!target?.is_valid()) return [];
  const targetHeavy = JSON.parse(target.get_descriptors()).NumHeavyAtoms as number;
  const out: TemplateRoute[] = [];
  const seen = new Set<string>();
  for (const t of TEMPLATES) {
    let rxn;
    try { rxn = R.get_rxn(t.retro); } catch { continue; }
    if (!rxn) continue;
    const list = new R.MolList(); list.append(target);
    try {
      const res = rxn.run_reactants(list, 20);
      for (let i = 0; i < res.size(); i++) {
        const ml = res.get(i);
        const precursors: string[] = [];
        let ok = true;
        for (let j = 0; j < ml.size(); j++) {
          const m = ml.at(j);
          const smi = m.get_smiles();
          const clean = R.get_mol(smi);
          if (!clean?.is_valid()) { ok = false; try { clean?.delete(); } catch { /* */ } break; }
          if (smi !== "[H][H]") precursors.push(clean.get_smiles());
          clean.delete();
        }
        if (!ok || !precursors.length) continue;
        const key = t.name + precursors.slice().sort().join(".");
        if (seen.has(key)) continue; seen.add(key);
        const lhs = t.retro.includes("[H][H]") ? [...precursors, "[H][H]"] : precursors;
        // Score: prefer splitting into balanced, smaller fragments.
        const sizes = await Promise.all(precursors.map(async (p) => {
          const m = R.get_mol(p); const n = JSON.parse(m.get_descriptors()).NumHeavyAtoms; m.delete(); return n as number;
        }));
        const largest = Math.max(...sizes);
        const score = Math.max(0.4, Math.min(0.85, 0.9 - (largest / Math.max(targetHeavy, 1)) * 0.4));
        out.push({
          name: t.name, precursors,
          reactionSmiles: `${lhs.join(".")}>>${targetCanonical}${t.byproduct ? "." + t.byproduct : ""}`,
          conditions: t.conditions, reference: t.reference, score,
        });
      }
    } catch (e) { console.warn("template failed", t.name, e); }
    finally { try { list.delete?.(); rxn.delete?.(); } catch { /* */ } }
  }
  target.delete();
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}
