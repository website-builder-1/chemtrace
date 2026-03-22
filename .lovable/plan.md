

# ChemTrace — Implementation Plan

## Current State
The foundation is partially in place: types (`chemtrace.ts`), curated molecule data (`moleculeData.ts`), PubChem client (`pubchem.ts`), export utilities (`exportUtils.ts`), CSS variables, font imports, and keyframe animations are all ready. The Index page is still a placeholder. No UI components exist yet.

## Build Order

### Step 1: Core Layout + Landing Page
Create `Index.tsx` with the full two-panel layout: fixed sidebar (280px, `#1C1F22`) and scrollable main canvas (`#F8F5EE`). Wire up state for `query`, `batchSize`, `location`, `isLoading`, `results`, `error`. Build the sidebar with wordmark, inputs, and buttons. Build the landing canvas with centered hero block and molecule chips. No separate component files for sidebar/landing — keep inline initially to reduce file count.

### Step 2: Results View — Sections A through G
Create individual components under `src/components/chemtrace/`:
- **SectionLabel.tsx** — reusable section divider
- **MoleculeIdentityBar.tsx** — SMILES card + 4 metric chips
- **AIAgentPanel.tsx** — header bar with pulsing dot, initial explanation (hardcoded initially), suggested questions grid, chat history, chat input. Chat sends messages to a Lovable AI edge function.
- **TopRouteCard.tsx** — recommended route card with stats, pathway steps, reagents, citation, risk
- **SupplyChainSection.tsx** — regulatory framework, supplier chips, procurement HTML table
- **AllCandidateRoutes.tsx** — collapsible accordion for each route using Radix Collapsible
- **ProtocolGenerator.tsx** — generate button, protocol display box
- **ExportSection.tsx** — four export buttons
- **ResultsView.tsx** — orchestrates all sections in order

Wire `ResultsView` into `Index.tsx`, shown when `results` is set.

### Step 3: Pipeline Logic
On "Run ChemTrace →": try PubChem first, fall back to curated data. Combine molecule data + routes + regulatory into a `PipelineResults` object. Show loading spinner during fetch.

### Step 4: AI Agent Edge Function
Create `supabase/functions/chemtrace-agent/index.ts` using Lovable AI Gateway (`google/gemini-3-flash-preview`). System prompt is a chemistry expert that receives the molecule context and synthesis routes. Streams responses back. Used for:
- Initial route analysis (auto-triggered on results load)
- Chat Q&A
- Protocol generation

### Step 5: Invoice & PDF
Add an **InvoicePanel.tsx** component within the Supply Chain section. Uses `generateInvoiceData()` from exportUtils. Shows a table of reagent line items with quantities, unit prices, subtotal, VAT, grand total. "Download Invoice (PDF)" button generates PDF client-side using `jsPDF` (add as dependency). "Download Reagents CSV" button uses existing `downloadReagentsCSV()`.

## Technical Decisions

| Concern | Decision |
|---------|----------|
| AI agent | Lovable AI Gateway via edge function (streams SSE) |
| Chemical data | PubChem REST API + curated fallback |
| PDF invoices | jsPDF (client-side) |
| CSV/JSON export | Client-side Blob downloads (already built) |
| State | React useState in Index.tsx |
| Styling | Tailwind + inline hex values matching spec exactly |
| Fonts | Google Fonts (already loaded in index.html) |
| Hugging Face | The AI agent functionality is covered by Lovable AI Gateway which provides superior models. HF token can be integrated later for specialized chemistry models if needed. |

## File Summary

```text
New files:
  src/components/chemtrace/SectionLabel.tsx
  src/components/chemtrace/MoleculeIdentityBar.tsx
  src/components/chemtrace/AIAgentPanel.tsx
  src/components/chemtrace/TopRouteCard.tsx
  src/components/chemtrace/SupplyChainSection.tsx
  src/components/chemtrace/AllCandidateRoutes.tsx
  src/components/chemtrace/ProtocolGenerator.tsx
  src/components/chemtrace/ExportSection.tsx
  src/components/chemtrace/InvoicePanel.tsx
  src/components/chemtrace/ResultsView.tsx
  supabase/functions/chemtrace-agent/index.ts

Modified files:
  src/pages/Index.tsx (full rewrite)

New dependency:
  jspdf
```

