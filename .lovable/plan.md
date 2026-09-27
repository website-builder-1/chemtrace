# Chemtraceit updates from the team group chat

I went through the chat from 29 June to 27 September 2026. Most of it is meetings, pitches and legal or incorporation talk. Only the items below are actual decisions or problems that affect the website.

## Confirmed items to build

1. **Public landing page (home page)**
   - Aryan confirmed (13 Sep) that landing pages are next.
   - Hero message aimed at new compounds. The three key questions come from Emilia's wording (21 Jul):
     - "How do I synthesise a completely novel compound?"
     - "Where can I source the starting materials reliably?"
     - "Which predicted pathway minimises risk and cost?"
   - Sections: what it does (route planning, reagent sourcing, risk and compliance checks, invoice), how it works in three steps, and a comparison against route-planning-only tools. Synthia is named as the main competitor; Chemtraceit adds risk and compliance on top.
   - "Try it" button that opens the current tool, which moves to /app.

2. **Meet the Team page**
   - Requested 13 Sep.
   - Cards for Aryan, Emilia (correct spelling, fixed on 21 Jul), Minal and Renee, each with photo, role and short bio.
   - Uses placeholder photos and text until the team sends the real ones.

3. **Contact details**
   - admin@chemtraceit.com shown in the footer and on a simple Contact section (confirmed 16 Aug).

4. **Stable when several people search at once**
   - This caused the investor-demo crash (30 Jun), and Renee needs a reliable demo.
   - One user can only have one search running at a time. Extra clicks are ignored while a search runs, and a clear "already running" note is shown.
   - Repeat searches for the same molecule are served instantly from saved results.
   - A short per-visitor limit on the route engine returns a friendly "please wait a moment" message instead of failing.

5. **Subscriptions via Square (not Stripe)**
   - Aryan decided on Square on 21 Jul. A free-trial model was discussed.
   - This needs a plan price and trial length before it can be built. See Open questions.
   - It will be a separate follow-up plan once those details are confirmed.

## Deliberately not changed

- **Company name:** stays "Chemtraceit". Rename ideas (LatticeRoute, Hodex, etc.) were never agreed.
- **Synthia-inspired features:** the list was sent as an image that isn't in the export, so there is nothing concrete to build yet.
- **"Claude science" suggestion:** an idea only, not a decision. The site stays on Hugging Face AI, as you asked earlier.

## Security warning (action for you)

The chat contains the GitHub login email and password in plain text (25 Aug). Please change that password and turn on two-factor login. Anyone with the export can get in.

## Open questions

- Square plan price and trial length. Monthly or yearly?
- Renee's preferred contact email to show alongside admin@.
- Team photos and bios for the Meet the Team page.

## Technical details

- Routes: `/` becomes the landing page, the current dashboard moves to `/app`, and `/team` is added. `/auth` stays as it is.
- New components: `Landing.tsx`, `Team.tsx`, and a shared `SiteHeader` and `SiteFooter` (with mobile menu). They use the existing parchment and teal colours and the existing fonts.
- Concurrency: an in-flight guard in the `Index.tsx` run handler with the button disabled while running. A per-IP limit in the `retrosynthesis` function (small `rate_limits` table, with GRANTs and RLS, keeping the last N minutes). The existing canonical-SMILES cache is reused.
- Update index.html meta for the landing page.
- Square is out of scope for this plan.
