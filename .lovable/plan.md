# Invite-only access, client accounts, first-login setup and legal terms

## What you'll get
1. **Aryan's titles:** aryan@chemtraceit.com gets the titles Software Engineer and CTO.
2. **No public sign-up:** the sign-in page only offers "Sign in" and says "Accounts are issued by Chemtraceit. Contact admin@chemtraceit.com for access." The "Continue without account" button is removed. Public sign-up is also switched off on the server, so it can't be used even from outside the page.
3. **New "Client" role:** admins and moderators can create client accounts with an email, name, temporary password and optional company. Moderators can create, disable and re-enable **clients only**. Admins can manage everyone, and the main admin stays protected.
4. **Only signed-in users can use the tools:** the tool (/app), Research ("Ask a chemistry question") and saved projects need a client, moderator or admin login. Signed-out visitors who click "Try it" go to the sign-in page. The home and team pages stay public.
5. **After sign-in:** everyone goes to /app. The top of /app shows a menu button with every page the person can use: Tool, Research, Team, plus Moderator and Admin when they have access. Sign out is in the same menu.
6. **People search:** Admin and Moderator pages get a "People" tab. Staff can search by name, email, role (client, moderator or admin) or title and filter by status (active or disabled). Moderators see everyone but can only change clients.
7. **First sign-in for new accounts (clients and new staff):**
   - Step 1: Choose a new password and type it again to confirm (minimum 10 characters, must differ from the temporary one). Then save.
   - Step 2: Read the Terms of Use and Confidentiality Agreement in a scrollable box. The signature area unlocks only after scrolling to the end. The person ticks "I am 18 or older", ticks "I have read and agree", types their full legal name as a signature and enters today's date, which is filled in automatically. Then save.
   - Until both steps are done, every page sends them back to this setup. Their saved signature (name, date, document version and time) appears on their profile in the Admin page.
   - If the terms are updated later, a new version number makes everyone sign again on their next sign-in.
8. **Legal document (drafted by me):** the Chemtraceit Terms of Use and Confidentiality Agreement. It is a careful draft, not legal advice, and a solicitor should review it before real clients sign. Sections:
   - Eligibility: 18 or older, acting for an organisation, authorised accounts only.
   - Confidentiality: the platform, outputs and pricing are confidential. No sharing of accounts or results.
   - Research use only: outputs are computational suggestions, not validated procedures. Qualified chemists must review them before any lab work.
   - Lawful use: no illicit drugs, chemical weapons or explosives. Compliance with the UK Misuse of Drugs Act 1971, the Chemical Weapons Act 1996 and the CWC schedules, precursor regulations (EU 273/2004 and 111/2005 as retained in UK law), UK and US export controls, REACH/COSHH and local equivalents. Chemtraceit may screen, log, suspend and report misuse.
   - Health and safety: the client is responsible for risk assessments, PPE and handling.
   - No warranty and limitation of liability, including that prices and suppliers are indicative only.
   - Intellectual property, and acceptable use (no scraping or reverse engineering).
   - Data protection under UK GDPR and the Data Protection Act 2018: what we log (searches, usage, IP) and why, retention, and user rights.
   - Account security, suspension and termination.
   - Governing law: England and Wales. Changes to the terms, and contact details.

## Technical details
- Migration: add `client` to `app_role`. Add columns to `profiles`: `must_change_password bool default false`, `terms_version text`, `terms_signed_name text`, `terms_signed_at timestamptz`, `company text`. Add a `terms_acceptances` audit table (user_id, version, signed_name, signed_at, user_agent) with GRANTs and RLS: users insert and read their own rows, staff read all. Add a security-definer `complete_onboarding(signed_name, version)` RPC so users can't edit protected profile fields directly.
- Data: give Aryan the Software Engineer and CTO titles in `user_titles`.
- Auth config: disable sign-ups with `configure_auth` (admin-created users still work through the service role).
- `admin-users` edge function: allow moderators, limited to `role=client` targets for create, disable, enable and reset. Add a `search` action (query, role, status). New users get `must_change_password=true`. Keep the main-admin and self protections.
- Frontend: `useRoles` returns `isClient`, `hasAccess` and profile onboarding state. A `RequireAuth` wrapper for /app, /research and projects redirects to /auth, or to /welcome when onboarding isn't finished. New `/welcome` page for the password step and the terms signing step. Terms text lives in `src/content/terms.ts` with `TERMS_VERSION`. Auth.tsx gets sign-in only. New app header menu. People tab added to Admin and Moderator pages. Header "Try it" leads to /auth when signed out.
- Server-side guard: the orchestrator, retrosynthesis and chemtrace-agent functions reject calls without a valid signed-in user, so the tools can't be used by skipping the pages.
- Verify with Playwright: signed out, /app redirects to sign-in and there is no sign-up tab. A moderator creates a client. The client signs in, is forced to change their password and sign the terms, then lands on /app. A second sign-in skips the setup. The moderator can't open /admin. Test accounts are then deleted.
