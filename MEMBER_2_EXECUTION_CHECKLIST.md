# Member 2 — Backend + Health Tracking Closure Checklist

Updated 2026-10-25. This checklist distinguishes local implementation evidence
from hosted Supabase verification. No hosted database operations were performed
for this audit.

## Priority assessment

| Priority | Requirement | Current status |
|---|---|---|
| P0 | AU-1 email authentication | Implemented in source; hosted authentication is integration-unverified. |
| P0 | AU-2 automatic pseudonymous profile | Defined by the migration trigger; hosted trigger execution is unverified. |
| P0 | AU-3 owner-only profile read/update | Client repository verifies the current session and filters by its user ID; RLS is SQL-defined only and needs hosted verification. |
| P0 | AU-4 saved, app-wide EN/HI preference | Implemented through the authenticated profile repository and language provider; locally unit-tested, hosted read/write is integration-unverified. |
| P0 | TK-1 through TK-6, TK-11 | Implemented locally with unit coverage; live Supabase persistence is integration-unverified. |
| P0 | TK-10 RLS | Owner policies and grants are defined in SQL, but enforcement is not verified against the hosted database. |
| P1 | TK-7 estimate | Implemented locally; estimate remains non-diagnostic and uses the median of up to three recent intervals. |
| P1 | TK-8 rule-based pattern insights | Deferred; not required to finish the P0 MVP flow. |
| P1 | AU-6 data deletion | Incomplete; requires a carefully authorized deletion workflow and integration testing. |
| P2 | AU-5 adult confirmation and CH-1 through CH-8 chat data | Chat schema, moderation/rate-limit functions and SQL access controls are defined in `0001_init.sql`; hosted security/Realtime behavior is unverified, and there is no complete client chat workflow. Do not enable chat until adult confirmation and moderation are integration-tested. |
| P2 | TK-9 PDF export | Deferred; requirements identify this as a nice-to-have and it is cut before P0/P1. |

## Implemented and locally verified

| Requirement | Status | Evidence |
|---|---|---|
| TK-1 Period create/edit/delete and validation | Implemented locally | `belluna/src/features/tracker/HealthHistory.tsx`, `trackerRepositories.ts`, `trackerData.ts`; date order, calendar date, duplicate start-date and notes constraints are validated. Mocked tests cover validation and missing-update confirmation. |
| TK-2 Daily logs: flow, pain, mood and notes | Implemented locally | `dailyLogUtils.ts`, `dailyLogsService.ts`, `PeriodTracker.tsx`; flow 0–4, pain 0–10, six schema-supported moods including `irritable`, and notes are mapped/validated. Tests cover mapping, ranges and authenticated owner filtering. |
| TK-3 Bilingual symptoms and severity | Implemented locally | `HealthHistory.tsx`, `trackerRepositories.ts`, `trackerData.ts`, `supabase/seed.sql`; UI supports catalogue selection and severity 1–5. Seed rows are static bilingual catalogue data; team linguistic/content review remains advisable. |
| TK-4 Newest-first history | Implemented locally | Cycle and symptom repositories request descending dates; visible history lists use descending order. |
| TK-5 Combined health timeline | Implemented locally | `trackerData.ts` combines cycles, daily logs and symptoms in ascending order; `HealthHistory.tsx` reverses it for newest-first presentation. |
| TK-6 Charts and empty states | Implemented locally | `HealthHistory.tsx` renders cycle lengths, daily flow/pain and symptom frequency from fetched records; empty/sparse histories show localized messages. Recharts history is lazy-loaded. |
| TK-7 Next-period estimate | Implemented locally | `trackerData.ts` estimates from the median of up to three recent cycle intervals. It is labeled and disclaimed in English/Hindi; outlier regression coverage is in `trackerData.test.ts`. No records are filtered or changed. |
| TK-11 Typed repositories | Implemented locally | `belluna/src/lib/db/tracker.ts` exports cycle, daily-log and symptom contracts; repositories verify current authenticated user and scope queries/writes to that ID. |
| AU-3/AU-4 Profile read and saved language | Implemented locally; service tests pass | `belluna/src/features/auth/profileRepository.ts` selects/updates only the session-verified profile and only writes `preferred_language`; `ProfileLanguageProvider.tsx` loads the preference on account changes and applies it app-wide. Tests cover ownership mismatch, scoped updates and missing-row confirmation. Hosted behavior remains unverified. |
| Unknown daily-log mood values | Fixed and locally tested | `dailyLogUtils.ts` rejects unknown stored moods instead of silently mapping them to “okay”; a regression test covers the behavior. |
| Local tracker storage isolation | Implemented and unit-tested | `trackerStorage.ts` scopes browser storage by user ID, preserves legacy copies, and does not adopt the unscoped legacy key. Tests cover two users and signed-out behavior. |
| Local automated checks | Verified | From `belluna/`: `npm test`, `npm run build`, and repository-level `git diff --check`; final results are recorded below after rerun. |

## Defined in SQL, not verified against hosted Supabase

| Requirement | SQL evidence | What remains unverified |
|---|---|---|
| TK-10 Owner-only tracker access | `supabase/migrations/0001_init.sql` defines RLS owner policies, table grants and constraints for `cycle_entries`, `daily_logs`, and `symptom_entries`. | Migration application state, effective grants/policies, and actual owner isolation have not been checked against the hosted project. |
| Duplicate cycle start protection | `supabase/migrations/0002_unique_cycle_start_dates.sql` checks for duplicates, then adds a per-user unique index without deleting rows. | Migration is unapplied here. Check duplicates and confirm migration history before applying it. |
| Symptom catalogue availability | `supabase/seed.sql` inserts bilingual rows using `ON CONFLICT DO NOTHING`. | Seed has not been run; availability and team-approved translations are not verified live. |
| Profile creation and moderator assignment | `0001_init.sql` defines profile creation trigger and moderator table without client write grants. | Trigger/policy behavior and trusted moderator provisioning have not been tested in the hosted project. |

## Still requiring manual or authorized integration verification

- [ ] Apply pending migrations only after confirming target project and migration
  history. Do not rerun `0001_init.sql`; inspect existing duplicate cycle starts
  before considering migration `0002`.
- [ ] Apply/review the symptom catalogue seed and verify authenticated catalogue
  reads.
- [ ] Use two synthetic accounts and direct authenticated requests to test
  select/insert/update/delete on cycles, daily logs and symptoms; confirm
  cross-user and signed-out access is denied. Mocked unit tests do not verify
  RLS.
- [ ] In a browser, test sign-out/account switch during pending requests,
  refresh persistence, failed network/save states, cycle CRUD, daily log
  persistence, symptom logging, timeline ordering and chart rendering.
- [ ] Verify authentication/profile requirements against the intended project.
  Test automatic profile creation, profile read/update RLS, and saved-language
  persistence across sign-in and account switching.
- [ ] Review accessibility and mobile presentation manually, including
  keyboard operation and a 360px viewport.

## Incomplete or deferred requirements

- AU-6 account/data deletion is P1 and is not implemented.
- TK-8 rule-based pattern insights are P1 and deferred until the P0 flow is
  integrated; TK-9 PDF export is P2 and deferred.
- AU-5 and CH-1 through CH-8 remain P2: database protections are defined in
  SQL, but a complete adult-confirmation and chat client workflow is not
  implemented or live-verified.
- Hosted TK-10 RLS verification remains pending.
- Live Supabase persistence and production deployment are not verified.
- The symptom schema supports date and severity only; it has no symptom time or
  notes fields.
- The P0 implementation is locally code-complete but not end-to-end closed:
  authorized integration must verify profile creation/language persistence,
  health-data persistence and two-user RLS.

## Verification record

- `cd belluna; npm test` — passed: 7 test files, 33 tests.
- `cd belluna; npm run build` — passed: TypeScript check and Vite production
  build. Vite emitted a non-blocking warning that the main JavaScript chunk is
  larger than 500 kB.
- `git diff --check` — passed.
- `belluna/src/i18n/hi.json` parses as valid UTF-8 JSON and
  `supabase/seed.sql` is valid UTF-8; both contain Hindi Unicode characters and
  no Unicode replacement characters.

These checks do not verify hosted Supabase, live persistence, RLS, deployment,
or browser-level account switching.
