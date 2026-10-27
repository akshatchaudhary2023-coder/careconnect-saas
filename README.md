# CareConnect — Counselling Centre Management SaaS

CareConnect is a student-project prototype for counselling-centre operations. It brings together a client directory, appointment coordination, role-aware workspace views, and operational reporting in one responsive interface.

**Important:** this is a prototype, not a clinically validated product and not ready for real client information. Use fictional data only. The default app runs in local demo mode. Its role switcher demonstrates the UX concept; it is not a security boundary. Cloud authentication/database integration requires a configured Supabase project and policy testing.

## What's included

- Responsive React + Vite frontend with a polished workspace UI
- Demo sign-in and role preview for Admin, Counsellor and Client
- Overview dashboard and today's appointment schedule
- Appointment creation, search and status updates
- Client directory, add-client flow, search and CSV export
- Operational reports derived from current demo records
- Team/access explanation and privacy reminders
- Supabase client setup via environment variables
- PostgreSQL schema with profiles, centres, client profiles, appointments, audit events, indexes and starter Row Level Security (RLS) policies
- Deployment and viva notes

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). No Supabase credentials are required for demo mode. Demo changes are stored in browser `localStorage` and do not sync between devices.

To verify the production build:

```bash
npm run build
npm run preview
```

## Optional Supabase setup

1. Create a Supabase project for development/testing.
2. In Supabase SQL Editor, review and run `supabase/schema.sql` in a clean project.
3. Configure authentication providers and test accounts for each role.
4. Add `.env` locally based on `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run the app again. The login form will use Supabase email/password authentication when configured.
6. **Important implementation gap:** the current UI's appointment and client CRUD flows are local demo data; they are not yet wired to Supabase tables. Connect and test those operations before describing cloud database CRUD as implemented. The SQL schema is the proposed database design and RLS starter, not proof of a deployed backend.
7. Test RLS using separate test accounts for Admin, Counsellor and Client. Review every policy with a security-aware supervisor before any sensitive data is used. Do not expose a service-role key in frontend code.

## Deploying a demo

### Frontend on Vercel
1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: Vite; build command: `npm run build`; output directory: `dist`.
4. For a static UI demonstration, no environment variables are required. The site will remain in demo mode.
5. To use Supabase login, add the two `VITE_SUPABASE_*` variables in Vercel project settings and redeploy.
6. Open the public URL and test on desktop and mobile.

A public URL is not created by this repository itself. You must connect GitHub/Vercel and verify the deployed site before claiming deployment is complete.

## Architecture

- **Presentation:** React SPA (Vite), responsive CSS, accessible form labels and keyboard focus states.
- **Identity (planned/configurable):** Supabase Auth with email/password.
- **Data (designed, not wired for CRUD yet):** Supabase PostgreSQL tables with RLS policies.
- **Operational modules:** overview, appointments, client directory, reports, team/access and settings.
- **Hosting target:** Vercel for frontend; Supabase for authentication and PostgreSQL.

See `docs/architecture-and-review-notes.md` for architecture, ER model, API design and honest review/demo talking points.

## Privacy and safety principles

- Never use real counselling notes or client identifiers in this student demo.
- Collect the minimum data necessary for scheduling and operations.
- Use least-privilege access and enforce authorization on the server/database, not only in the UI.
- A real deployment would require access auditing, backups/recovery, retention/deletion rules, secure account recovery, abuse/rate limiting, and review against applicable law and institutional policy.
- This software supports administrative coordination only; it does not provide diagnosis or treatment recommendations.

## Suggested project explanation

“CareConnect is a cloud-oriented SaaS prototype for counselling-centre administration. It is designed around three roles—Admin, Counsellor and Client—and focuses on appointment coordination, client-directory management and operational reporting. The React frontend is runnable in demo mode, while the included Supabase schema and RLS policies document the planned cloud data layer. Cloud CRUD integration and live deployment are remaining validation steps, so we do not present them as completed until they have been configured and tested.”
