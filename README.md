# Belluna — Women's Health Companion (working title)

> A privacy-first, Hindi/English web app that helps women **understand** their health, **track** their cycle and symptoms, and **act** when something is wrong — built for recHERsion 2026, Problem Statement 1: Women's Healthcare.

**Status:** pre-development · **Stack:** React + Vite + TypeScript · Supabase · Groq · versel Pages

> **Medical disclaimer:** Belluna provides general health education and personal tracking. It does **not** diagnose, prescribe, or replace a doctor. In an emergency call **112** or go to the nearest hospital.

---

## 1. The problem

Women often wait years for a correct diagnosis of conditions such as endometriosis and PCOS (press coverage of an ICMR study cites roughly 7 years for endometriosis in India — verify before quoting on a slide). Contributing factors include normalised pain, low health literacy, language barriers, scarce specialists, stigma, and tracking tools that log data but do not help a woman understand it or decide what to do next.

## 2. What Belluna does

| # | Module | What the user gets | Owner | Priority |
|---|---|---|---|---|
| 1 | **Health Literacy Translator** | Ask a health question in Hindi or English; get a structured, simple-language explanation with trusted-source references and safety notes | Member 1 | P0 |
| 2 | **Period & Symptom Tracker** | Log periods, flow, pain and symptoms; see history, timeline and charts | Member 2 | P0 |
| 3 | **Auth & private profiles** | Secure sign-in; each user's data visible only to them | Member 2 | P0 |
| 4 | **Period SOS** | Short triage questions → clear next step (emergency / see a doctor soon / self-care) | Member 3 (UI) · Member 1 (content) | P1 |
| 5 | **Nearest-doctor finder** | Map of nearby clinics and hospitals (Leaflet + OpenStreetMap) | Member 3 | P1 |
| 6 | **Medicine library & awareness content** | Plain-language info on common medicines and reproductive-health topics, with sources | Member 1 | P2 |
| 7 | **Anonymous peer chat** | Moderated, pseudonymous rooms with report and block | Member 3 (UI) · Member 2 (data) | P2 |
| 8 | **Pattern insights** *(recommended addition)* | Rule-based "worth discussing with a doctor" flags from the user's own logs | Member 2 + 1 | P1 |

Priorities decide what gets cut first. See [`docs/phases.md`](docs/phases.md).

## 3. Documentation

| File | Purpose |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | Personas, functional and non-functional requirements, safety requirements, acceptance tests |
| [`docs/architecture.md`](docs/architecture.md) | System design, data model and RLS, API contracts, AI safety pipeline, deployment |
| [`docs/phases.md`](docs/phases.md) | Work breakdown per member, integration checkpoints, demo checklist |
| [`docs/rules.md`](docs/rules.md) | Working agreements for the team and for AI-assisted coding, medical-content rules |

## 4. Tech stack

| Purpose | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide React |
| Navigation | React Router |
| Forms | React Hook Form + Zod |
| Backend / database | Supabase (Postgres, Row Level Security) |
| Login | Supabase Auth |
| Live chat | Supabase Realtime |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap |
| AI explanations | Groq API (free-tier limits apply) via a server-side proxy |
| PDF export (if needed) | jsPDF |
| Version control | Git + GitHub |
| Hosting | versel Pages (+ Pages Functions for the AI proxy) |

Anything outside this list needs team agreement first — see [`docs/rules.md`](docs/rules.md#2-stack-lock).

## 5. Architecture at a glance

```
 Browser (React SPA on versel Pages)
   │
   ├── Supabase (Auth · Postgres + RLS · Realtime)   ← tracker, profiles, chat
   │
   ├── /api/explain  (versel Pages Function)     ← verifies Supabase JWT, rate-limits,
   │        │                                            safety-screens, calls Groq, validates output
   │        └── Groq API  (key never reaches the browser)
   │
   └── Overpass API + OSM tiles (Leaflet)            ← nearby clinics and map
```

Details: [`docs/architecture.md`](docs/architecture.md).

## 6. Getting started

### Prerequisites
- Node.js (current LTS) and npm
- A Supabase project (free tier; choose the region closest to your users)
- A Groq API key
- A versel account (for deployment)

### Setup
```bash
git clone <repo-url>
cd Belluna
npm install
cp .env.example .env            # frontend variables
cp .dev.vars.example .dev.vars  # server-side secrets for Pages Functions (never commit)
```

### Environment variables

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | Public |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Public; safe only because RLS is enabled on every table |
| `SUPABASE_URL` | `.dev.vars` / versel | Used by the proxy |
| `SUPABASE_ANON_KEY` | `.dev.vars` / versel | Proxy calls Supabase as the user |
| `GROQ_API_KEY` | `.dev.vars` / versel | **Secret** |
| `GROQ_MODEL` | `.dev.vars` / versel | Check Groq's current free-tier model list before choosing |
| `LLM_PROVIDER` | `.dev.vars` / versel | `groq` (default); provider abstraction allows `gemini` |
| `AI_DAILY_LIMIT` | `.dev.vars` / versel | Per-user daily request cap |

Never put the service-role key or any LLM key in a `VITE_` variable.

### Database
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push            # applies supabase/migrations/*
npx supabase gen types typescript --linked > src/types/database.ts
```
Enable **Anonymous sign-ins** in Supabase Auth settings if the chat uses them.

### Run locally
```bash
npm run dev          # frontend only (Vite)
npm run dev:cf       # frontend + Pages Functions (AI proxy) — check versel's current wrangler flags
npm run typecheck
npm run lint
npm test             # includes the AI safety test cases
```

### Deploy (versel Pages)
1. Connect the GitHub repo to versel Pages.
2. Build command `npm run build`, output directory `dist`.
3. Add the environment variables above in the Pages dashboard.
4. Each pull request gets a preview deployment; `main` deploys to production.

## 7. Project structure

```
.
├── README.md
├── docs/                  requirements · architecture · phases · rules
├── content/
│   ├── kb/                trusted knowledge snippets (with source metadata)
│   ├── medicines/         medicine library entries (no dosing)
│   └── symptoms.json      symptom catalogue (EN/HI)
├── functions/             versel Pages Functions (AI proxy)
│   ├── api/explain.ts
│   └── _lib/              llm · safety · kb · auth
├── supabase/
│   ├── migrations/
│   └── seed.sql           synthetic demo data only
├── src/
│   ├── app/               routes, layout, providers
│   ├── components/ui/     shadcn/ui components
│   ├── features/          translator · tracker · sos · doctors · chat · medicines · auth
│   ├── lib/               supabase client, db repositories, utils
│   ├── i18n/              en.json · hi.json
│   └── types/
└── tests/safety/          unsafe-response and accuracy test cases
```

## 8. Team and ownership

| Role | Owns | Deliverable |
|---|---|---|
| **Member 1** — AI + Healthcare Intelligence | AI proxy, translator, sources and disclaimers, medicine library, awareness content, safety tests | A working translator returning a structured, readable explanation |
| **Member 2** — Backend + Health Tracking | Supabase schema and RLS, auth, tracker, timeline and charts, shared DB interfaces | Save cycle and symptom entries and display history securely |
| **Member 3** — Frontend + Safety Experience | Layout, navigation, Period SOS UI, doctor finder, chat UI, integration, deployment, demo | A coherent, mobile-friendly app connecting every module |

Names and contact details: _add here_.

## 9. Workflow

- `main` is protected and always deployable. Work on `feat/<member>-<topic>` branches and open a PR; one teammate reviews.
- Schema changes only via migration files, reviewed by Member 2.
- Content or prompts that affect medical output are reviewed by a second person (see [`docs/rules.md`](docs/rules.md)).

## 10. Demo path (what judges will see)

1. Sign in as the **synthetic demo user** with three months of seeded cycle and symptom data.
2. Open the **timeline and charts** — the pattern is visible.
3. Ask the **translator** a question in Hindi; get a structured explanation with sources.
4. Run **Period SOS** with a red-flag answer; get a clear next step and the nearest clinics on the map.
5. (If shipped) Post, report and block in the **anonymous chat**.
6. Log a **new entry live** to prove the flow works end to end.

Only synthetic data is used in demos.

## 11. Safety and privacy

- No diagnosis, no dosing, no prescriptions. Emergencies are routed to 112, not to the AI.
- The AI never invents links: it returns source IDs that map to a curated, reviewed source list.
- Row Level Security on every table; minimal data; user-initiated data deletion.
- The AI key stays on the server. Queries are not logged by default.

## 12. Known limitations

- Free tiers (Groq, Supabase, versel, Overpass) have rate limits and can change; a Supabase free project may pause when inactive — wake it before the demo.
- OpenStreetMap coverage of clinics in India is incomplete; a curated fallback list covers the demo city.
- Rules and content are not clinically validated beyond informal review.

## 13. Credits

Map data © OpenStreetMap contributors. Health content cites WHO, NHS, MedlinePlus, MoHFW and similar public sources, listed per item.

## 14. Licence

_To be decided by the team._
