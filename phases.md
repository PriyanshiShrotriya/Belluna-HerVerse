# Phases and Work Breakdown — Belluna (working title)

Deadline: **_add date here_** · Demo date: **_add date here_**

Divide the available time proportionally: Phase 0 ≈ 5%, Phase 1 ≈ 20%, Phase 2 ≈ 40%, Phase 3 ≈ 20%, Phase 4 ≈ 15%. Do not start a P1 item until every P0 item in the same phase is done.

---

## Phase 0 — Setup (everyone)

- [ ] GitHub repo, branch protection on `main`, PR template, issue labels (`P0`, `P1`, `P2`, `M1`, `M2`, `M3`)
- [ ] Vite + React + TypeScript (strict), Tailwind, shadcn/ui, ESLint, Prettier
- [ ] vercel Pages connected; first deploy of a blank page works
- [ ] Supabase project created; Auth enabled; keys shared securely (not in chat history or repo)
- [ ] `.env.example` and `.dev.vars.example` committed; `.env` and `.dev.vars` git-ignored
- [ ] Agree final LLM provider (Groq default), team names and roles, deadline
- [ ] Add docs from this pack to `docs/`

**Exit:** blank app deployed, every member can run it locally.

## Phase 1 — Foundations

### Member 1
- [ ] `functions/api/explain.ts` skeleton with Zod request validation and JWT verification
- [ ] `LlmProvider` interface and Groq provider working with a hard-coded prompt
- [ ] Draft the response schema and the system prompt
- [ ] Choose the model after a quick EN/HI quality check
- [ ] Source allowlist file; first 5 KB entries with reviewers
- [ ] Start `tests/safety/cases.json` with cases T1–T15

### Member 2
- [ ] `0001_init.sql` migration applied; RLS verified with two test users
- [ ] Auth flows (sign up, sign in, sign out) and profile trigger
- [ ] Generated DB types; first versions of `ProfileRepo`, `CycleRepo`, `DailyLogRepo`, `SymptomRepo`
- [ ] Seed `symptom_catalog` and the synthetic demo user
- [ ] **Publish the repository interfaces** (architecture §5) so M1 and M3 can code against them

### Member 3
- [ ] App shell: layout, bottom/top navigation, routes (architecture §9), EN/HI switch
- [ ] Shared UI primitives and design tokens; Devanagari font
- [ ] Protected-route wrapper using the auth provider (stub until M2 ships)
- [ ] Placeholder screens for every route

**Checkpoint 1 (end of Phase 1):** a signed-in user sees the shell; `/api/explain` returns a basic answer; two-user RLS test passes.

## Phase 2 — Core modules (parallel)

### Member 1 — Translator and content
- [ ] Full pipeline: pre-screen → KB retrieval → LLM → validate → post-filter → source mapping
- [ ] Emergency, refusal and out-of-scope responses
- [ ] Hindi review of safety-critical wording by a fluent speaker
- [ ] Translator UI hook/contract agreed with M3 (`explain(question, lang)`)
- [ ] SOS rules JSON drafted and verified against two sources (P1)
- [ ] 10–15 KB entries total; medicine library entries (P2)
- [ ] All T1–T15 cases automated where possible

### Member 2 — Tracker
- [ ] Period, daily log and symptom forms (React Hook Form + Zod) — with M3's components
- [ ] History list and timeline
- [ ] Charts: cycle length, pain/flow, symptom frequency
- [ ] `TimelineRepo.getCycleStats()` (P1) and insights rules (P1)
- [ ] Chat schema, RLS and triggers tested (P2)
- [ ] "Delete my data" RPC (P1)

### Member 3 — Experience
- [ ] Translator screen wired to the contract (loading, error, structured result, sources, disclaimer)
- [ ] SOS flow UI using M1's rules (P1)
- [ ] Doctor finder: map, Overpass query, list, manual location, curated fallback (P1)
- [ ] Chat UI: rooms, messages, report, block (P2)
- [ ] Accessibility and 360 px pass on finished screens

**Checkpoint 2 (end of Phase 2):** every P0 feature works end to end locally. Cut line review: decide which P1 and P2 items to drop.

## Phase 3 — Integration

- [ ] Replace all stubs with real modules (M3 leads, owners fix their own bugs)
- [ ] EN/HI coverage check on every P0 screen
- [ ] Run scenarios E1–E6 (and E7 if chat ships) with two real accounts
- [ ] Deploy to vercel Pages with production environment variables
- [ ] Verify RLS on the deployed database, not only locally
- [ ] Performance check on a mid-range phone; lazy-load the map and charts
- [ ] Fix, then freeze features

**Checkpoint 3:** feature freeze. Only bug fixes after this point.

## Phase 4 — Hardening and demo

- [ ] Re-run all safety cases against the deployed proxy
- [ ] Wake the Supabase project; confirm Groq quota; pre-generate fallback answers for demo questions
- [ ] Seed the synthetic demo account; reset script ready
- [ ] Rehearse the demo path (README §10) at least twice with a timer
- [ ] Record a backup demo video (the rules reward a functional MVP shown in the video)
- [ ] README, docs and `.env.example` final; no secrets in the repo history
- [ ] Write the pitch: problem, wedge, what works live, limits, future work

## Cut line (drop in this order if time runs short)

1. Anonymous chat (or ship one read-only moderated room)
2. Medicine library
3. PDF export
4. Personalised translator context
5. Discreet-mode PIN
6. Pattern insights
7. Doctor finder polish (keep the curated fallback)

Never cut: auth, tracker with history, charts, translator, safety pipeline, disclaimers, RLS.

## Dependency map

| Blocked task | Waiting on |
|---|---|
| M3 tracker screens | M2 repository interfaces (Phase 1) |
| M3 translator screen | M1 response contract (Phase 1) |
| M3 SOS UI | M1 `sos-rules.json` (Phase 2) |
| M3 chat UI | M2 chat schema and `ChatRepo` (Phase 2) |
| M1 personalised context | M2 `getCycleStats()` (Phase 2, P2) |
| Demo | Seeded data and clean deployment (Phase 4) |

## Demo checklist

- [ ] Synthetic demo user with three months of data
- [ ] Hindi and English both rehearsed
- [ ] Live entry logged during the demo
- [ ] One emergency phrase and one SOS red-flag run
- [ ] Map works with location denied and allowed
- [ ] Backup video and screenshots ready
- [ ] Clear statement of limits: not a diagnosis tool, not clinically validated

## Weekly sync template

1. What shipped since last sync (demo it)
2. What is blocked, and by whom
3. Cut-line decision
4. Next checkpoint tasks
