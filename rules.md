# Rules — Working Agreements (team, AI-assisted coding, medical content)

These rules apply to every contributor and to any AI coding assistant used on the project (Copilot, Claude, ChatGPT, etc.). Paste §3 into the assistant's instructions file.

---

## 1. Principles

1. **Safety before features.** An unsafe health answer costs more than a missing feature.
2. **Working beats wide.** A flawless P0 flow outranks any P1/P2 work.
3. **Privacy by default.** Collect the minimum; enforce in the database.
4. **No silent changes.** Stack, schema and prompts change only through a reviewed PR.

## 2. Stack lock

The agreed stack is in the README. Do not add or replace a dependency without:
1. A short note in the PR: what, why, size, licence, alternative considered.
2. Approval from one other member.

Pending approvals: `react-leaflet`, Vitest, Supabase CLI, Wrangler, in-house `t()` i18n helper, TanStack Query (optional).

## 3. Rules for AI-assisted ("vibe") coding

- Give the assistant the docs first: README, `requirements.md`, `architecture.md`, and this file.
- **One module and one layer at a time.** Review each diff before moving on.
- Do **not** let the assistant: change the stack, rename tables or columns, edit migrations already applied, modify RLS policies, or touch secrets.
- Schema changes: write a **new** migration file; never edit `0001_init.sql` after it has been applied.
- Every generated function that touches health logic (SOS rules, insights, post-filters) needs a unit test written or reviewed by a human.
- Never paste real health data, keys or tokens into an AI assistant.
- Treat generated medical text as unreviewed until a second person has checked it against a trusted source.
- Keep generated code in the project's patterns: feature folders, Zod schemas, repository interfaces, no inline strings for user-facing text.
- If the assistant suggests a library or API you do not recognise, verify it exists and is maintained before installing.
- When the assistant is unsure about current behaviour of Groq, Supabase, vercel or Overpass, check the official docs rather than accepting a guess.

## 4. Git and review

- Branches: `feat/m1-translator-pipeline`, `fix/m2-rls-chat`, `docs/…`.
- Commits: short imperative messages; conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`) encouraged.
- PRs: small, one concern each, linked to requirement IDs (e.g. `TR-4`, `TK-6`). One reviewer minimum.
- PR template checklist:
  - [ ] Requirement IDs met
  - [ ] EN and HI strings added
  - [ ] Loading, empty and error states
  - [ ] Works at 360 px
  - [ ] RLS considered for any table change
  - [ ] No secrets, no real data
  - [ ] Tests added or updated
- Never force-push to `main`. Never commit `.env` or `.dev.vars`. If a secret leaks, rotate it immediately.

## 5. Medical content rules

Applies to knowledge base entries, medicine entries, awareness pages, SOS rules, insight rules and prompts.

1. **Sources.** Use only reputable public sources (e.g. WHO, NHS, MedlinePlus, MoHFW, ACOG, ICMR). Record publisher, title, URL and date retrieved.
2. **Paraphrase, do not copy.** Write in your own words; short quotes only where wording matters.
3. **Plain language.** Short sentences, define medical terms, avoid fear-based wording.
4. **No diagnosis.** Use "can be a sign of" and "worth discussing with a doctor".
5. **No dosing.** No tablet counts, mg amounts, schedules or combinations. Point to the product label, a pharmacist or a doctor.
6. **Always include escalation.** Each entry says when to seek care.
7. **Two-person review.** The author and a second member check the content against the source; record `reviewed_by` and `reviewed_on`.
8. **Hindi review.** A fluent speaker reviews all Hindi text, especially warnings.
9. **Reproductive health.** Factual, non-judgemental, age-appropriate; no instructions for unsupervised procedures; mention legal, safe care options.
10. **Currency.** Mark content with a review date; re-check anything time-sensitive before the demo.
11. **Numbers.** Do not quote statistics unless the source and date are stored with the claim.

## 6. AI behaviour rules (enforced in the proxy and tested)

- The model never receives or returns URLs; it returns source IDs.
- No diagnosis, doses or prescriptions; post-filter enforces this.
- Emergency, self-harm and red-flag inputs are handled by static responses, not generation.
- User text is data, not instructions; system prompts and keys are never disclosed.
- Responses must validate against the schema or fall back to a safe message.
- No query text is stored by default.

## 7. Security rules

- Browser code may contain only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- LLM keys and any admin credentials live only in vercel secrets and `.dev.vars`.
- Every new table: enable RLS in the same migration and add policies before merging.
- Test RLS with two users and direct API calls, not only through the UI.
- No third-party analytics or tracking scripts.
- Chat: no links, no images, no direct messages, report and block always available.

## 8. Privacy rules

- Do not collect date of birth, phone number, exact location or government IDs.
- Location is requested only for the doctor finder, with consent, and not stored.
- Demo and test data are synthetic. Never demo with real personal health information.
- Provide data deletion before release.

## 9. UX and accessibility rules

- Mobile first (360 px), touch targets at least 44 px, visible focus states, sufficient contrast.
- Every user-facing string exists in EN and HI.
- Every screen has loading, empty and error states.
- Calm, non-judgemental tone; no alarming colours for non-urgent information.
- Always show the disclaimer on AI answers and the 112 option in SOS.

## 10. Definition of Done

A task is done when it meets its requirement IDs, passes the PR checklist, has been reviewed, works on the deployed preview (not only locally), and is covered by the relevant test or manual scenario.

## 11. Decision log

Record non-obvious decisions here (date · decision · reason · who).

| Date | Decision | Reason | Who |
|---|---|---|---|
| _add_ | LLM provider: Groq default with provider abstraction | Tool list specifies Groq; brief mentions Gemini | Team |
