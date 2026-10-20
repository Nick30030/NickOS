# Task and project creation

`npm test` includes regression checks for authenticated ownership, rejected cloud writes, missing authentication, successful local writes and local quota failures.

For a browser test, start an isolated local server with `npm run dev`, then run:

```sh
CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:creation-browser
```

Set `CREATION_BASE_URL` when using a different local port. Alternatively install the Playwright browser with `npx playwright install chromium` and omit `CHROMIUM_EXECUTABLE`.

The browser checks project/task creation, immediate display and persistence after reload in local storage. It also exercises the real Supabase SDK and forms against an intercepted test API, including ownership and rejected writes. No real cloud credentials or database writes are used by these tests.

## Supabase setup

Configure the project URL and public key, then sign in in **Config → Compte Supabase** with an existing Supabase Auth account. A public key alone does not authenticate a user. An administrator can create an account in the project's Supabase dashboard under **Authentication → Users**.

The schema in `supabase/schema.sql` must be applied. Before creating a task/project the repository ensures the signed-in user's profile exists without overwriting an existing profile, and sends that user's `user_id` with the insert. The existing RLS policies remain in force.

Cloud creation failures now keep the form open and display the database error. They no longer silently create a local substitute that disappears on the next cloud read. Existing local data is preserved; this change does not migrate previously hidden fallback records to the cloud. Switching to local storage makes those locally saved records available again. The separate legacy plan-upload feature is not a migration of projects/goals and their references.

Local quota errors likewise keep the form open. Export your data before freeing space; do not clear browser storage as a troubleshooting shortcut.
