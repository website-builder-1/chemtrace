# Admin and Moderator Logins and Staff Pages

## What you'll get
- **Main admin account:** aryan@chemtraceit.com. It has full control of the site and can't be demoted or removed by other admins. It's created once with the password you gave. Change that password after your first sign-in.
- **Admin page (`/admin`, admins only):**
  - **Staff:** create staff logins (email, temporary password, role: Admin or Moderator). Choose one or more company titles for each person. Change roles, reset passwords, and disable, re-enable or delete accounts.
  - **Titles:** starts with Founder, CEO, CTO, COO, Chemical Lead and Software Engineer. Admins can add, rename or remove titles.
  - **Accuracy Benchmark:** moved here, admins only.
  - **Usage log:** AI requests, speed and errors.
- **Moderator page (`/moderator`, moderators and admins):**
  - **Feedback review:** approve or reject customer ratings and corrections.
  - **Checked facts:** turn approved feedback into trusted facts, or add them by hand.
  - **Suppliers and prices:** edit supplier products, prices and links.
  - **Saved runs:** read-only list of customer searches.
- **Navigation:** staff see an "Admin" or "Moderator" link after signing in. Everyone else sees nothing, and visiting those pages shows "page not found".
- **Public sign-up stays open.** New sign-ups are ordinary customers. Only an admin can give someone a staff role.

## Technical details
- New `profiles` table (display name, disabled flag), plus `company_titles` and `user_titles` (many-to-many). All three have GRANTs and RLS: staff can read them and only admins can write.
- Roles stay in the existing `user_roles` table and are checked with `has_role`. Add RLS policies so moderators can manage feedback, validated facts and supplier products, and can read runs.
- New `admin-users` edge function uses the service role and checks the caller's token plus `has_role(admin)` before acting. It handles create, set role, reset password, disable (ban), enable and delete. It blocks any action against the main admin account.
- A one-time server call creates the aryan@chemtraceit.com account and assigns the admin role. The password is never stored in code.
- A `useRoles` hook plus `RequireRole` wrapper protect the pages. Benchmark moves under `/admin`.
- Verify: sign in as the admin, create a test moderator, sign in as them, and confirm they can reach `/moderator` but not `/admin`.
