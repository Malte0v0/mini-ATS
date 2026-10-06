# mini-ATS

A small Applicant Tracking System. Admins create accounts for customers; customers post jobs, add candidates and move them through a hiring pipeline on a compact kanban board. An AI feature gives a first-pass assessment of a candidate's CV against the job.

**Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, React Router, Supabase (Postgres, Auth, Storage, Edge Functions), OpenRouter (LLM).

## Features

- **Accounts:** admins create admin and customer accounts (public sign-up is disabled).
- **Login** with email and password.
- **Jobs:** create, edit, close and reopen jobs, with candidate counts.
- **Candidates:** name, email, phone, LinkedIn URL, notes, stage and a PDF CV.
- **Kanban board:** six stages (Applied → Hired / Rejected), drag and drop between columns, filter by job and search by candidate name.
- **Admin "Acting as":** admins pick a customer in the header and can do everything that customer can, on their behalf.
- **AI CV assessment:** one click sends the CV and job description to an LLM and stores a 1-10 fit score, a short summary, strengths and concerns. The score shows as a badge on the kanban card.

## Architecture

```
Browser (React SPA)
   │  publishable key + user JWT
   ▼
Supabase
   ├─ Postgres ── Row Level Security decides which rows each user can touch
   ├─ Storage ─── private "cvs" bucket, same owner-or-admin rule
   ├─ Auth ────── email + password, sign-up disabled
   └─ Edge Functions (server-side, hold secrets)
        ├─ create-user  admin-only: creates the login + profile (needs the secret key)
        └─ score-cv     runs as the caller, sends CV + job to OpenRouter
```

### Security model

The React app talks to the database directly, so **the database enforces access, not the frontend**:

- Every job and candidate has an `owner_id` (the customer). RLS policies allow access when `owner_id = auth.uid()` **or** the user is an admin (`is_admin()`).
- `with check` clauses stop users from writing rows they don't own (e.g. inserting a job with someone else's `owner_id`).
- A composite foreign key `candidates (job_id, owner_id) → jobs (id, owner_id)` guarantees a candidate's job belongs to the same customer.
- Only admins can update profiles, so customers can't promote themselves to admin.
- Route guards in React (`RequireAuth`, `RequireAdmin`) are UX only.
- The Supabase secret key and the OpenRouter key exist only in Edge Functions.

### AI CV assessment

`supabase/functions/score-cv` loads the candidate and job (as the calling user, so RLS applies), downloads the PDF from Storage and sends it to `anthropic/claude-haiku-4.5` via OpenRouter:

- The PDF is passed natively to the model (no OCR step).
- **Structured outputs** force a JSON answer in a fixed schema; the response is validated again with Zod before it is saved.
- The prompt scores against evidence in the CV only, excludes protected characteristics (age, gender, ethnicity, ...) and treats the CV as data, so instructions hidden in a CV are flagged instead of followed.
- The UI labels it as a first-pass screening, not a decision.

## Project structure

```
src/
  auth/        AuthProvider (session + profile), route guards
  owner/       OwnerProvider: whose data we're working on ("Acting as")
  pages/       BoardPage (kanban), JobsPage, AdminPage, LoginPage
  components/  Layout, CandidateDrawer, JobForm
  lib/         Supabase client, shared types
supabase/
  migrations/  001 schema + RLS, 002 service_role grants, 003 CV storage
  functions/   create-user, score-cv
  seed_demo.sql
```

## Running it yourself

1. **Supabase project:** create one, then run the files in `supabase/migrations/` in order in the SQL Editor (as `postgres`). Under Authentication, disable "Allow new users to sign up".
2. **First admin:** add a user under Authentication > Users, then run the insert at the bottom of `001_init.sql` with their email.
3. **Edge Functions:** deploy `create-user` and `score-cv` (dashboard editor or `supabase functions deploy`). Add the secret `OPENROUTER_API_KEY`.
4. **Frontend:**
   ```bash
   npm install
   cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
   npm run dev
   ```
5. **Demo data (optional):** create a customer in the app, put their email in `supabase/seed_demo.sql` and run it.

Deployment: any static host works. `vercel.json` rewrites all paths to `index.html` so client-side routes survive a page refresh.

## Assumptions

- One customer account = one company. Data is scoped per customer account (no teams or multiple recruiters per company).
- Admins are internal staff who onboard customers and hand over credentials; there is no self sign-up or password reset flow.
- A candidate belongs to one job. The same person applying for two jobs is two candidate records.
- Jobs are closed rather than deleted, so candidate history is kept. Candidates can be deleted (e.g. GDPR requests).
- The pipeline stages are fixed: Applied, Screening, Interview, Offer, Hired, Rejected.
- CVs are PDFs up to 5 MB.

## Next steps

- Separate `candidates` and `applications` tables so one person can apply to several jobs.
- Teams: several users per customer company, with roles.
- Activity log / comments per candidate, and stage-change history.
- Configurable pipeline stages per job.
- Touch-friendly drag and drop (e.g. dnd-kit) and keyboard support for moving cards.
- Generated TypeScript types from the database schema (`supabase gen types`).
- Supabase CLI + `supabase/config.toml` so migrations and functions deploy from the repo.
- AI: an evaluation set of CVs with known scores to measure and tune the prompt, plus bias checks.
