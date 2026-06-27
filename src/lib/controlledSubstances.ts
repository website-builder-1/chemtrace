/**
 * Lightweight name-based screening for substances that this tool should refuse
 * to plan a synthesis for, plus precursors that warrant a heightened-disclaimer
 * acknowledgement before the pipeline runs.
 *
 * This is NOT a legal/regulatory database — it is a reasonable-effort guardrail
 * to prevent obvious misuse. Real-world compliance with the UN 1961/1971
 * Conventions, the CWC, UK Misuse of Drugs Act 1971, US Controlled Substances
 * Act, and EU/UK drug-precursor regulations remains the user's responsibility.
 */

export type ScreeningCategory =
  | 'narcotic'              // UN 1961 narcotic / Schedule I-II controlled substance
  | 'psychotropic'          // UN 1971 psychotropic
  | 'cwc_schedule_1'        // Chemical Weapons Convention Schedule 1 (chemical weapons / nerve agents / vesicants)
  | 'explosive'             // primary high explosives / detonators
  | 'drug_precursor'        // EU/UK/US scheduled drug precursor (acknowledge & proceed)
  | 'cwc_schedule_2_3';     // dual-use CWC Schedule 2/3 precursors (acknowledge & proceed)

export interface ScreeningResult {
  category: ScreeningCategory;
  /** Action — 'block' refuses planning; 'warn' requires user acknowledgement. */
  action: 'block' | 'warn';
  /** The canonical display name of the matched entry. */
  matchedName: string;
  /** Plain-English explanation shown to the user. */
  reason: string;
  /** The primary statute/treaty being cited. */
  authority: string;
}

interface Entry {
  names: string[];           // lowercase aliases, including common misspellings
  category: ScreeningCategory;
  action: 'block' | 'warn';
  reason: string;
  authority: string;
}

const ENTRIES: Entry[] = [
  // ── BLOCK: Narcotics / Controlled Substances ──────────────────────────
  {
    names: ['heroin', 'diacetylmorphine', 'diamorphine'],
    category: 'narcotic', action: 'block',
    reason: 'Heroin (diacetylmorphine) is a UN Single Convention 1961 Schedule I/IV narcotic. Synthesis planning is not provided.',
    authority: 'UN Single Convention on Narcotic Drugs 1961 · UK Misuse of Drugs Act 1971 (Class A) · US CSA Schedule I',
  },
  {
    names: ['methamphetamine', 'meth', 'crystal meth', 'desoxyephedrine', 'n-methylamphetamine'],
    category: 'psychotropic', action: 'block',
    reason: 'Methamphetamine is a Schedule II controlled substance. Synthesis planning is not provided.',
    authority: 'UN Convention on Psychotropic Substances 1971 · UK MDA 1971 (Class A) · US CSA Schedule II',
  },
  {
    names: ['mdma', 'ecstasy', '3,4-methylenedioxymethamphetamine'],
    category: 'psychotropic', action: 'block',
    reason: 'MDMA is a Schedule I psychotropic substance. Synthesis planning is not provided.',
    authority: 'UN 1971 Convention · UK MDA 1971 (Class A) · US CSA Schedule I',
  },
  {
    names: ['lsd', 'lysergic acid diethylamide', 'lysergide'],
    category: 'psychotropic', action: 'block',
    reason: 'LSD is a Schedule I hallucinogen. Synthesis planning is not provided.',
    authority: 'UN 1971 Convention · UK MDA 1971 (Class A) · US CSA Schedule I',
  },
  {
    names: ['cocaine', 'benzoylmethylecgonine'],
    category: 'narcotic', action: 'block',
    reason: 'Cocaine is a UN 1961 Schedule I narcotic. Synthesis planning is not provided.',
    authority: 'UN 1961 Convention · UK MDA 1971 (Class A) · US CSA Schedule II',
  },
  {
    names: ['fentanyl', 'carfentanil', 'sufentanil', 'acetylfentanyl', 'furanylfentanyl'],
    category: 'narcotic', action: 'block',
    reason: 'Fentanyl and its analogues are Schedule I/II opioids with extreme overdose potential. Synthesis planning is not provided.',
    authority: 'UN 1961 Convention · UK MDA 1971 (Class A) · US CSA Schedule II',
  },
  {
    names: ['krokodil', 'desomorphine'],
    category: 'narcotic', action: 'block',
    reason: 'Desomorphine is a Schedule I narcotic. Synthesis planning is not provided.',
    authority: 'UN 1961 Convention · UK MDA 1971 (Class A)',
  },

  // ── BLOCK: Chemical Weapons (CWC Schedule 1) ──────────────────────────
  {
    names: ['sarin', 'gb', 'o-isopropyl methylphosphonofluoridate'],
    category: 'cwc_schedule_1', action: 'block',
    reason: 'Sarin is a CWC Schedule 1 nerve agent. Synthesis or precursor planning is prohibited.',
    authority: 'Chemical Weapons Convention 1993 · UK CWA 1996 · US CWCIA',
  },
  {
    names: ['vx', 'vx nerve agent', 'novichok', 'a-230', 'a-232', 'a-234'],
    category: 'cwc_schedule_1', action: 'block',
    reason: 'CWC Schedule 1 nerve agent. Synthesis or precursor planning is prohibited.',
    authority: 'Chemical Weapons Convention 1993',
  },
  {
    names: ['tabun', 'ga', 'soman', 'gd'],
    category: 'cwc_schedule_1', action: 'block',
    reason: 'CWC Schedule 1 organophosphate nerve agent. Synthesis is prohibited.',
    authority: 'Chemical Weapons Convention 1993',
  },
  {
    names: ['mustard gas', 'sulfur mustard', 'bis(2-chloroethyl) sulfide', 'lewisite'],
    category: 'cwc_schedule_1', action: 'block',
    reason: 'CWC Schedule 1 vesicant agent. Synthesis is prohibited.',
    authority: 'Chemical Weapons Convention 1993',
  },
  {
    names: ['ricin'],
    category: 'cwc_schedule_1', action: 'block',
    reason: 'Ricin is a CWC Schedule 1 toxin. Synthesis/isolation planning is prohibited.',
    authority: 'Chemical Weapons Convention 1993 · Biological Weapons Convention',
  },

  // ── BLOCK: Primary Explosives ─────────────────────────────────────────
  {
    names: ['tatp', 'triacetone triperoxide', 'acetone peroxide'],
    category: 'explosive', action: 'block',
    reason: 'TATP is a primary high explosive widely used in improvised devices. Synthesis planning is not provided.',
    authority: 'UK Explosives Regulations 2014 · EU Regulation 2019/1148 on explosives precursors',
  },
  {
    names: ['hmtd', 'hexamethylene triperoxide diamine'],
    category: 'explosive', action: 'block',
    reason: 'HMTD is a primary high explosive. Synthesis planning is not provided.',
    authority: 'EU Regulation 2019/1148 · UK Explosives Regulations 2014',
  },
  {
    names: ['petn', 'pentaerythritol tetranitrate', 'rdx', 'cyclonite', 'hmx', 'octogen'],
    category: 'explosive', action: 'block',
    reason: 'Military high explosive. Synthesis planning is restricted to licensed defence research and not provided here.',
    authority: 'UK Explosives Act 1875 / Regs 2014 · US ATF regulations',
  },

  // ── WARN: Scheduled drug precursors (allow with acknowledgement) ──────
  {
    names: ['ephedrine', 'pseudoephedrine', 'phenylacetic acid', 'p-2-p', 'phenyl-2-propanone', '1-phenyl-2-propanone', 'safrole', 'piperonal', 'isosafrole', 'mdp2p', '3,4-methylenedioxyphenyl-2-propanone'],
    category: 'drug_precursor', action: 'warn',
    reason: 'This compound is a scheduled drug precursor. Procurement is monitored and may require an end-user licence.',
    authority: 'EU Regulation 273/2004 · UK Controlled Drugs (Drug Precursors) Regs 2008 · US CSA Chemical Diversion Act',
  },

  // ── WARN: CWC Schedule 2/3 dual-use precursors ────────────────────────
  {
    names: ['thiodiglycol', 'methylphosphonic dichloride', 'methylphosphonyl difluoride', 'dimethyl methylphosphonate', 'dmmp', 'phosphorus oxychloride', 'phosphorus trichloride', 'pinacolyl alcohol'],
    category: 'cwc_schedule_2_3', action: 'warn',
    reason: 'Listed CWC Schedule 2/3 dual-use chemical. Export and quantity declarations may be required to the national CWC authority.',
    authority: 'Chemical Weapons Convention Schedules 2 & 3 · UK CWA 1996',
  },
];

function normalise(input: string): string {
  return input.trim().toLowerCase().replace(/[_\-\s]+/g, ' ');
}

/**
 * Screen a user query (chemical name or common alias) against the block/warn
 * list. Returns null when the input is not on any list.
 *
 * SMILES strings are not screened here — name-based screening is sufficient
 * for the obvious-misuse threat model, and matching on raw SMILES would
 * produce false positives (e.g. a benign carboxylic acid that happens to
 * share an atom skeleton with a precursor).
 */
export function screenSubstance(query: string): ScreeningResult | null {
  const q = normalise(query);
  if (!q) return null;
  for (const entry of ENTRIES) {
    for (const alias of entry.names) {
      if (q === alias || q.includes(alias)) {
        return {
          category: entry.category,
          action: entry.action,
          matchedName: entry.names[0],
          reason: entry.reason,
          authority: entry.authority,
        };
      }
    }
  }
  return null;
}
