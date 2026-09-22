# MEDHELP Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the commercial MEDHELP web platform with public acquisition, authentication, subscription access, study tools, content administration and the integration boundary consumed by the Atlas 3D.

**Architecture:** Use a pnpm monorepo with a Next.js App Router application and focused domain packages. Supabase owns PostgreSQL, Auth and RLS; external providers are accessed through typed adapters. The Atlas remains a separate package and communicates with the platform through explicit props and typed events.

**Tech Stack:** Node.js 22, pnpm 10, TypeScript strict, Next.js App Router, React, Tailwind CSS, Vitest, Testing Library, Playwright, Supabase, Mercado Pago, Cloudflare R2, Resend, Sentry, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-22-medhelp-design.md`

## Global Constraints

- Price is exactly BRL 30.00 per month in the initial product.
- Card renews automatically; confirmed PIX grants exactly 30 days of access.
- Card payment failure has a three-day grace period.
- Public roles are `student`, `editor` and `admin`; no teacher UI ships in the MVP.
- Catalog hierarchy is Cycle → Discipline → Module → Lesson.
- Content access is `free` or `premium`; losing premium access never deletes learning data.
- All private tables deny access by default through RLS.
- Payment access is changed only from verified server-side provider state, never a browser redirect.
- Ebooks cannot be published without rights metadata.
- UI copy and primary experience are Brazilian Portuguese and mobile-first.
- Public pages meet WCAG 2.2 AA and authenticated pages must remain keyboard operable.
- Keep files focused; application routes orchestrate services and must not contain domain algorithms.
- Pin installed package versions in `pnpm-lock.yaml` after bootstrap.

## Review Focus

- Duplicate or out-of-order payment webhooks must produce one valid access transition.
- A logged-in student without premium access must retain progress but be unable to fetch premium files.
- An editor must never gain billing, role-management or access-grant permissions.
- Publishing an ebook with absent or incompatible rights metadata must fail at database and UI boundaries.
- Concurrent flashcard answers must not create two active schedules for the same card and student.

## Planned File Map

```text
apps/web/app/                    # routes, layouts and server actions
apps/web/components/             # route-specific UI composition
apps/web/lib/                    # provider adapters and server infrastructure
apps/web/tests/e2e/              # Playwright journeys
packages/ui/src/                 # design-system primitives
packages/domain/src/access/      # subscription and authorization rules
packages/domain/src/study/       # progress and spaced-repetition rules
packages/domain/src/content/     # catalog and publishing contracts
packages/atlas-contract/src/     # shared platform/Atlas interface only
supabase/migrations/             # versioned schema and RLS
supabase/tests/                  # pgTAP authorization tests
```

---

### Task 1: Bootstrap the monorepo and quality gates

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`
- Create: `packages/domain/package.json`, `packages/ui/package.json`, `packages/atlas-contract/package.json`
- Test: `apps/web/src/smoke.test.ts`

**Interfaces:**
- Produces: workspace commands `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.

- [ ] **Step 1: Create the workspace manifests and strict TypeScript configuration**

```json
{
  "name": "medhelp",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:e2e": "pnpm --filter @medhelp/web test:e2e",
    "build": "turbo build"
  }
}
```

- [ ] **Step 2: Add a failing smoke test for the public home module**

```ts
import { describe, expect, it } from 'vitest';
import { siteConfig } from './site-config';

describe('siteConfig', () => {
  it('exposes the approved price and headline', () => {
    expect(siteConfig.monthlyPriceCents).toBe(3000);
    expect(siteConfig.headline).toBe('Medicina é difícil. Estudar não precisa ser.');
  });
});
```

- [ ] **Step 3: Run `pnpm test` and verify failure because `site-config` is absent**

- [ ] **Step 4: Implement `apps/web/src/site-config.ts`, run lint, typecheck, test and build**

```ts
export const siteConfig = {
  name: 'MEDHELP',
  headline: 'Medicina é difícil. Estudar não precisa ser.',
  monthlyPriceCents: 3000,
  locale: 'pt-BR'
} as const;
```

- [ ] **Step 5: Commit with `chore: bootstrap medhelp monorepo`**

### Task 2: Define domain contracts for roles and subscription access

**Files:**
- Create: `packages/domain/src/access/types.ts`, `packages/domain/src/access/evaluate-access.ts`
- Create: `packages/domain/src/index.ts`
- Test: `packages/domain/src/access/evaluate-access.test.ts`

**Interfaces:**
- Produces: `evaluateAccess(input: AccessInput, now: Date): AccessDecision`.
- Produces: roles `student | editor | admin` and subscription states `pending | active | grace | expired | canceled | refunded`.

- [ ] **Step 1: Write tests for active, grace, canceled-before-end and expired access**

```ts
expect(evaluateAccess({ state: 'grace', accessUntil: '2026-09-25T00:00:00Z' }, new Date('2026-09-24')))
  .toEqual({ canAccessPremium: true, reason: 'grace_period' });
expect(evaluateAccess({ state: 'expired', accessUntil: '2026-09-20T00:00:00Z' }, new Date('2026-09-24')))
  .toEqual({ canAccessPremium: false, reason: 'expired' });
```

- [ ] **Step 2: Run the focused test and verify the missing-export failure**

- [ ] **Step 3: Implement exhaustive state evaluation with no provider-specific values**

```ts
export type AccessDecision = {
  canAccessPremium: boolean;
  reason: 'active' | 'grace_period' | 'paid_period' | 'pending' | 'expired' | 'refunded';
};
```

- [ ] **Step 4: Run domain tests and typecheck**

- [ ] **Step 5: Commit with `feat: define access domain rules`**

### Task 3: Create the database foundation, roles and RLS

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202609220001_identity_access.sql`
- Create: `supabase/tests/identity_access_test.sql`
- Create: `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/client.ts`

**Interfaces:**
- Consumes: access states from Task 2.
- Produces: `profiles`, `roles`, `user_roles`, `subscriptions`, `access_grants`, `legal_acceptances`, `audit_logs`.

- [ ] **Step 1: Write pgTAP tests proving deny-by-default, self-profile access and editor/admin separation**

```sql
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anonymous users cannot list profiles'
);
```

- [ ] **Step 2: Run `supabase db reset` followed by `supabase test db` and verify failure**

- [ ] **Step 3: Add tables, constraints, indexes, updated-at trigger and RLS policies**

```sql
create type public.app_role as enum ('student', 'editor', 'admin');
alter table public.profiles enable row level security;
create policy "profile owner reads self" on public.profiles
for select using (id = auth.uid());
```

- [ ] **Step 4: Add server/client factories using cookie-aware SSR auth; rerun database and TypeScript tests**

- [ ] **Step 5: Commit with `feat: add identity schema and row level security`**

### Task 4: Build the clinical-premium design system and public site

**Files:**
- Create: `packages/ui/src/{button,card,field,badge,dialog}.tsx`
- Create: `apps/web/app/globals.css`, `apps/web/app/(public)/layout.tsx`, `apps/web/app/(public)/page.tsx`
- Create: `apps/web/components/public/{header,hero,features,atlas-demo,pricing,faq,footer}.tsx`
- Test: `apps/web/components/public/hero.test.tsx`, `apps/web/tests/e2e/public-home.spec.ts`

**Interfaces:**
- Consumes: `siteConfig` from Task 1.
- Produces: accessible public navigation and CTA URLs `/cadastro` and `/explorar`.

- [ ] **Step 1: Write component and E2E tests for headline, visible R$ 30 price, both CTAs and mobile navigation**

```ts
await expect(page.getByRole('heading', { name: 'Medicina é difícil. Estudar não precisa ser.' })).toBeVisible();
await expect(page.getByText('R$ 30/mês')).toBeVisible();
```

- [ ] **Step 2: Run tests and verify the routes/components are missing**

- [ ] **Step 3: Implement tokens, an accessible SVG logo lockup matching the approved cross-and-open-book concept, page sections and reduced-motion behavior**

```css
:root { --navy: #0b1f3a; --emerald: #16a085; --surface: #f6f8fb; --text: #102033; }
@media (prefers-reduced-motion: reduce) { *,::before,::after { animation-duration: .01ms !important; } }
```

- [ ] **Step 4: Run unit, E2E, axe accessibility and responsive viewport checks**

- [ ] **Step 5: Commit with `feat: add public clinical premium experience`**

### Task 5: Implement authentication and protected route shells

**Files:**
- Create: `apps/web/app/(auth)/{entrar,cadastro,recuperar-senha,redefinir-senha}/page.tsx`
- Create: `apps/web/app/auth/callback/route.ts`
- Create: `apps/web/middleware.ts`, `apps/web/lib/auth/require-role.ts`
- Test: `apps/web/lib/auth/require-role.test.ts`, `apps/web/tests/e2e/auth.spec.ts`

**Interfaces:**
- Produces: `requireUser()`, `requireRole(allowed: AppRole[])`, `/aluno` and `/admin` protected shells.

- [ ] **Step 1: Write tests for registration, confirmation callback, reset and forbidden editor billing access**

```ts
await page.goto('/admin/pagamentos');
await expect(page).toHaveURL(/\/acesso-negado$/);
```

- [ ] **Step 2: Run tests and verify protected routes do not exist**

- [ ] **Step 3: Implement server actions with Zod validation and generic credential error messages**

```ts
const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(10) });
```

- [ ] **Step 4: Verify cookies, redirects, role checks and no account-enumeration response**

- [ ] **Step 5: Commit with `feat: implement authentication journeys`**

### Task 6: Implement the academic catalog and publishing workflow

**Files:**
- Create: `supabase/migrations/202609220002_content.sql`
- Create: `packages/domain/src/content/types.ts`, `packages/domain/src/content/publishing.ts`
- Create: `apps/web/app/admin/conteudos/**`
- Create: `apps/web/lib/content/repository.ts`, `apps/web/lib/storage/media-upload.ts`
- Test: `packages/domain/src/content/publishing.test.ts`, `apps/web/lib/storage/media-upload.test.ts`, `supabase/tests/content_rls_test.sql`

**Interfaces:**
- Produces: `Cycle`, `Discipline`, `Module`, `Lesson`, `ContentStatus`, `AccessLevel`.
- Produces: `publishLesson(id: string, actorId: string): Promise<Lesson>`.

- [ ] **Step 1: Test hierarchy integrity, valid status transitions, editor permissions and rejection of disallowed media MIME/size**

```ts
expect(() => transitionContent('archived', 'published')).toThrow('Archived content must return to draft');
```

- [ ] **Step 2: Run domain/database tests and verify failure**

- [ ] **Step 3: Add normalized tables, slugs, ordering, soft deletion, relations and audit trigger**

- [ ] **Step 4: Implement admin list/editor/preview, direct signed R2 media upload and draft → review → published → archived transitions**

```ts
export const contentStatuses = ['draft', 'review', 'published', 'archived'] as const;
```

- [ ] **Step 5: Test publication, scheduling and unauthorized mutation; commit `feat: add academic content workflow`**

### Task 7: Build the student dashboard, lesson player and progress persistence

**Files:**
- Create: `supabase/migrations/202609220003_learning.sql`
- Create: `apps/web/app/aluno/{page.tsx,disciplinas/**,resumos/**,progresso/**}`
- Create: `apps/web/lib/study/progress-service.ts`
- Test: `apps/web/lib/study/progress-service.test.ts`, `apps/web/tests/e2e/student-study.spec.ts`

**Interfaces:**
- Produces: `saveLessonProgress(input: LessonProgressInput): Promise<void>` and `getStudentDashboard(userId)`.

- [ ] **Step 1: Test monotonic completion, resume position and preservation after subscription expiry**

```ts
expect(mergeProgress({ seconds: 120, complete: false }, { seconds: 30, complete: false }).seconds).toBe(120);
```

- [ ] **Step 2: Run tests and verify missing service**

- [ ] **Step 3: Add progress/favorites/streak tables, RLS and idempotent upserts**

- [ ] **Step 4: Build dashboard, catalog, lesson blocks, auto-save and locked premium previews**

- [ ] **Step 5: Run E2E on desktop/mobile and commit `feat: add student learning experience`**

### Task 8: Implement spaced-repetition flashcards

**Files:**
- Create: `packages/domain/src/study/scheduler.ts`
- Create: `supabase/migrations/202609220004_flashcards.sql`
- Create: `apps/web/app/aluno/flashcards/**`, `apps/web/lib/study/flashcard-service.ts`
- Test: `packages/domain/src/study/scheduler.test.ts`, `apps/web/tests/e2e/flashcards.spec.ts`

**Interfaces:**
- Produces: `scheduleReview(previous: ReviewState | null, grade: ReviewGrade, reviewedAt: Date): ReviewState`.
- Grades: `again | hard | good | easy` mapped in UI to Errei, Difícil, Bom, Fácil.

- [ ] **Step 1: Write deterministic interval tests and a concurrency test for duplicate submissions**

```ts
expect(scheduleReview(null, 'again', now).dueAt).toEqual(addMinutes(now, 10));
expect(scheduleReview(null, 'easy', now).intervalDays).toBe(4);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement pure scheduling, review uniqueness and transactional update**

- [ ] **Step 4: Build daily queue, card interaction, counts and keyboard controls**

- [ ] **Step 5: Run concurrency, unit and E2E tests; commit `feat: add spaced repetition flashcards`**

### Task 9: Implement questions and simulations

**Files:**
- Create: `supabase/migrations/202609220005_quizzes.sql`
- Create: `packages/domain/src/study/scoring.ts`
- Create: `apps/web/app/aluno/questoes/**`, `apps/web/app/admin/questoes/**`
- Test: `packages/domain/src/study/scoring.test.ts`, `apps/web/tests/e2e/quiz.spec.ts`

**Interfaces:**
- Produces: `scoreAttempt(questions: ScorableQuestion[], answers: Answer[]): AttemptResult`.

- [ ] **Step 1: Test unanswered, correct, incorrect and immutable submitted attempts**

```ts
expect(scoreAttempt([{ id: 'q1', correctOptionId: 'b' }], [{ questionId: 'q1', optionId: 'b' }]).correct).toBe(1);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Add question/options/attempt tables, RLS and scoring service**

- [ ] **Step 4: Build admin authoring, student filters, simulation and commented review**

- [ ] **Step 5: Verify results cannot be changed after submission; commit `feat: add questions and simulations`**

### Task 10: Implement the licensed ebook library

**Files:**
- Create: `supabase/migrations/202609220006_ebooks.sql`
- Create: `packages/domain/src/content/ebook-license.ts`
- Create: `apps/web/app/{biblioteca,admin/biblioteca}/**`
- Create: `apps/web/lib/storage/signed-files.ts`
- Test: `packages/domain/src/content/ebook-license.test.ts`, `supabase/tests/ebooks_test.sql`

**Interfaces:**
- Produces: `validateEbookLicense(input: EbookLicenseInput): ValidationResult` and `createSignedDownload`.

- [ ] **Step 1: Test rejection of missing author, source, license type or license URL**

```ts
expect(validateEbookLicense({ type: 'open', licenseUrl: '' }).ok).toBe(false);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Add database constraints and server validation preventing invalid publication**

- [ ] **Step 4: Build library search, detail, admin form and short-lived download URL**

- [ ] **Step 5: Verify free/premium access and commit `feat: add rights-aware ebook library`**

### Task 11: Integrate Mercado Pago subscriptions and PIX

**Files:**
- Create: `apps/web/lib/billing/{provider,mercado-pago,event-processor}.ts`
- Create: `apps/web/app/api/billing/{checkout,webhook}/route.ts`
- Create: `supabase/migrations/202609220007_billing.sql`
- Test: `apps/web/lib/billing/event-processor.test.ts`, `apps/web/tests/e2e/billing.spec.ts`

**Interfaces:**
- Produces: `BillingProvider`, `processPaymentEvent(event: NormalizedPaymentEvent): Promise<ProcessResult>`.
- Produces: checkout for recurring card and 30-day PIX access.

- [ ] **Step 1: Test duplicate, out-of-order, invalid-signature, refund and card-grace scenarios**

```ts
await processPaymentEvent(event);
await expect(processPaymentEvent(event)).resolves.toEqual({ status: 'duplicate' });
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Add payment event ledger, unique provider event ID and transactional access transitions**

- [ ] **Step 4: Implement provider adapter, server checkout, webhook verification and provider reconciliation**

- [ ] **Step 5: Run sandbox integration/E2E tests and commit `feat: integrate subscription billing`**

### Task 12: Add transactional notifications and account billing UI

**Files:**
- Create: `apps/web/lib/notifications/{provider,resend,templates}.ts`
- Create: `apps/web/app/aluno/assinatura/page.tsx`
- Create: `apps/web/app/api/jobs/subscription-reminders/route.ts`
- Test: `apps/web/lib/notifications/templates.test.ts`, `apps/web/tests/e2e/account-billing.spec.ts`

**Interfaces:**
- Produces: `NotificationProvider.send(message)` and reminder job protected by a secret header.

- [ ] **Step 1: Test PIX expiry, card recovery and cancel-at-period-end templates**

```ts
expect(renderReminder({ kind: 'pix_expiring', days: 2 }).subject).toContain('2 dias');
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement provider adapter, templates, delivery log and retry-safe job**

- [ ] **Step 4: Build subscription status, payment history and cancellation UI**

- [ ] **Step 5: Verify no secrets or payment instrument data appear in logs; commit `feat: add billing notifications`**

### Task 13: Add administration metrics, audit and exports

**Files:**
- Create: `apps/web/app/admin/{page.tsx,usuarios/**,pagamentos/**,auditoria/**}`
- Create: `apps/web/lib/admin/{metrics,export}.ts`
- Test: `apps/web/lib/admin/metrics.test.ts`, `apps/web/tests/e2e/admin.spec.ts`

**Interfaces:**
- Produces: `getAdminMetrics(range)`, `exportStudentsCsv(filters)`; both admin-only.

- [ ] **Step 1: Test confirmed revenue only, CSV formula escaping and editor denial**

```ts
expect(csvCell('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement aggregate queries, audit viewer and safe CSV serializer**

- [ ] **Step 4: Build dashboards and manual access grant/suspension with mandatory reason**

- [ ] **Step 5: Run role-based E2E tests and commit `feat: add operational administration`**

### Task 14: Define and expose the Atlas integration contract

**Files:**
- Create: `packages/atlas-contract/src/index.ts`
- Create: `apps/web/components/atlas/atlas-shell.tsx`
- Create: `apps/web/app/{atlas,explorar/atlas}/page.tsx`
- Test: `packages/atlas-contract/src/index.test.ts`, `apps/web/components/atlas/atlas-shell.test.tsx`

**Interfaces:**
- Produces: `AtlasViewerProps`, `AtlasEvent`, `AtlasAccessPolicy` consumed by the separate Atlas plan.

- [ ] **Step 1: Write compile/runtime tests for props, events and free-demo allowlist**

```ts
export type AtlasEvent =
  | { type: 'structure_selected'; structureId: string }
  | { type: 'favorite_changed'; structureId: string; favorite: boolean }
  | { type: 'viewer_error'; code: string; recoverable: boolean };
```

- [ ] **Step 2: Run tests and verify missing exports**

- [ ] **Step 3: Implement the contract and lazy shell behind an error boundary**

- [ ] **Step 4: Verify premium authorization is server-derived and demo IDs are explicit**

- [ ] **Step 5: Commit with `feat: define atlas platform contract`**

### Task 15: Finish security, privacy, accessibility, SEO and launch verification

**Files:**
- Create: `apps/web/app/{termos,privacidade,creditos}/page.tsx`
- Create: `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`
- Create: `apps/web/lib/security/rate-limit.ts`, `apps/web/instrumentation.ts`
- Create: `apps/web/tests/e2e/{accessibility,authorization,critical-paths}.spec.ts`
- Create: `docs/operations/{backup-restore,incident-response,launch-checklist}.md`

**Interfaces:**
- Consumes: every preceding platform module.
- Produces: monitored, documented, release-ready platform candidate.

- [ ] **Step 1: Add failing tests for authorization matrix, signed URL expiry, keyboard flow and noindex on private routes**

```ts
await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
```

- [ ] **Step 2: Run the full suite and record failures**

- [ ] **Step 3: Implement rate limits, security headers, Sentry redaction, legal pages and SEO metadata**

- [ ] **Step 4: Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` plus pgTAP**

- [ ] **Step 5: Execute the launch checklist on mobile and desktop, document results and commit `chore: prepare platform release candidate`**

## Plan Completion Gate

Platform implementation is complete only when all 15 task commits exist, the full verification command passes from a clean checkout, Supabase RLS tests pass, Mercado Pago sandbox journeys reconcile correctly, and the Atlas contract package is consumable without importing application internals.
