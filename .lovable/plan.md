# Chemtraceit Chemical Intelligence Engine — staged plan

The AI stops being "the chatbot that answers". It becomes a coordinator sitting on top of chemical databases, literature search, RDKit calculations, checked reactions and a verification step. Every claim gets a label: **Documented**, **Supported inference**, **Plausible hypothesis** or **Insufficient evidence**.

Everything runs on the existing cloud backend (Lovable Cloud database, functions, pgvector). No personal computer is involved. The target cost is £0/month.

## What already exists and gets reused
- RDKit in the route engine: validates structures and checks atom balance.
- Live PubChem lookups, with the NCI name-lookup service as a fallback.
- CrossRef citations and green-chemistry scores.
- The checked-routes table (13 chemicals), the saved-results cache, the per-visitor rate limit and saved runs.
- The controlled-substance screen and user sign-in.

## Stage 0 — Architecture document (delivered first, before any code)
A written report in Files covering the 12 items the brief asks for:
- recommended architecture
- free vs paid comparison with current free limits
- expected monthly cost
- candidate AI models
- candidate chemical databases
- candidate retrosynthesis models
- how literature search works
- database design
- how the functions fit together
- security
- deployment
- known limitations

Free limits are checked live at build time, not assumed.

## Stage 1 — Foundations
- **Swappable AI providers:** one "model router" maps each task (chemistry reasoning, summarising, classifying, embeddings) to a provider and model, set in the database. Hugging Face is the default, but providers like Groq, Gemini (Google AI Studio), Cloudflare Workers AI or OpenRouter free models can be added without rewriting anything.
- **Compound database:** every lookup stores name, synonyms, SMILES, InChI, InChIKey, formula, weight and source. Properties always come from databases, never from the AI.
- **Chemistry tools function:** RDKit descriptors, fingerprints, similarity, substructure search and structure comparison. The AI calls these instead of calculating anything itself.
- **Lookup caching:** compound lookups, literature searches and embeddings are all cached.

## Stage 2 — Literature and reaction knowledge
- **Literature collection:** pulls abstracts from PubMed, Europe PMC, OpenAlex and CrossRef. Each abstract is cleaned, de-duplicated, tagged with the chemicals it mentions, split into chunks and embedded with a free embedding model.
- **Hybrid search:** keyword search plus meaning-based search plus filters by chemical and year, then a re-ranking step. Citations are kept with every result.
- **Reaction database:** reactions with reactants, products, reagents, catalysts, solvents, temperature, time, atmosphere, yield and source. It starts from the 13 checked chemicals plus open reaction data (the USPTO subset, Open Reaction Database). Each condition is labelled Documented, Analogous or Model hypothesis.
- **Knowledge graph links:** compound → reaction → product / reagent / solvent → paper, stored as linked tables.

## Stage 3 — New retrosynthesis pipeline
```text
target -> RDKit analysis -> template disconnections (open reaction templates)
       -> documented reaction lookup -> AI proposals (only to fill gaps)
       -> atom-balance check -> literature check -> scoring -> ranked routes
```
- Template-based disconnections come first. AI proposals only fill the gaps.
- An optional hook for a hosted open retrosynthesis model (for example AiZynthFinder on a free Hugging Face Space, or IBM RXN's free tier), behind the same swappable connection. It's switched off if unavailable.
- A route is only marked "Documented" when a literature or database match supports it.

## Stage 4 — Orchestrator and verification
- **Specialist modules:** question analyser, structure analyser, literature researcher, reaction researcher, retrosynthesis planner, evidence analyser, calculation tool, safety checker and answer composer.
- **Three effort levels:** easy questions use minimal computation, medium ones add tools, and hard ones run the full decomposition and verification pipeline.
- **Verification pass:** each important claim in the draft answer is checked against the evidence that was retrieved. Claims are labelled, conflicting sources are flagged, and unsupported claims become "Insufficient evidence".
- **Evidence labels in the app:** colour-coded chips beside claims, plus an expandable list of sources.

## Stage 5 — Memory, feedback, benchmark
- **Projects:** saved compounds, reactions and notes per user.
- **Feedback buttons on every answer:** Good / Bad / Correct this / Source wrong / Chemistry wrong / Missing info. Each correction is stored with the question, the answer, the reason and the source.
- **Validated knowledge:** information only becomes validated when it comes from a trusted source or a reviewer approves it. The AI's own output is never saved as fact automatically.
- **Benchmark page:** about 50 starter test cases covering identification, properties, reactions, conditions, retrosynthesis and hallucination traps. It shows accuracy, retrieval quality, citation accuracy and hallucination rate, and gets re-run after every AI change.
- **Fine-tuning:** deferred until enough reviewed examples exist.

## Throughout
- **Security:** all AI and outside calls go through backend functions, with keys kept on the server, rate limits, request logging and access rules on every table.
- **Safety:** the controlled-substance screen extends to the orchestrator. It refuses weaponisation, toxic-agent and explosive synthesis, and dual-use precursors need an acknowledgement.

## Known limitations (up front)
- No full retrosynthesis model (AiZynthFinder, Chemformer, etc.) can run inside the backend functions. A free Hugging Face Space works but sleeps when idle, so the first request after a pause is slow. Without it, template and database routes plus AI proposals are the best free option.
- Free AI tiers have daily limits and can change. The model router and caching soften this.
- Full-text papers and patents are mostly paywalled, so the literature layer uses abstracts and open-access text only.

## Proposed order
Stage 0 report, then Stages 1 to 5, each verified in the preview before the next one starts. Stage 3 changes what users see most.

## Technical details
- **New tables:** `ai_providers`, `model_routes`, `compounds`, `compound_synonyms`, `literature_docs`, `literature_chunks` (pgvector embedding plus a tsvector column), `reactions`, `reaction_participants`, `reaction_conditions`, `graph_edges`, `projects`, `project_items`, `feedback`, `validated_facts`, `benchmark_cases`, `benchmark_runs`, `request_log`. Every table gets GRANTs and row-level security; roles live in `user_roles` via `has_role`.
- **New functions:** `ai-router` (provider abstraction), `chem-tools` (RDKit), `literature-ingest`, `literature-search` (hybrid search with Reciprocal Rank Fusion and re-ranking), `orchestrator` (tiered pipeline, SSE streaming), `benchmark-run`. `retrosynthesis` is refactored to call these.
- **Embeddings:** a free open model (for example BAAI bge-small or bge-base) through the provider abstraction. The vector dimension is fixed per model version so the model can be re-embedded later.
- **Kept conventions:** no Lovable AI Gateway; no `response_format` on Hugging Face; strip code fences before parsing JSON; the atom-balance check stays mandatory.
