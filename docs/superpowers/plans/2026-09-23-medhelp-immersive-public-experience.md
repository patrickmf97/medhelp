# MEDHELP Immersive Public Experience Plan

> **Executor:** use `superpowers:executing-plans` with strict RED → GREEN verification.

**Goal:** Turn the public MEDHELP experience into a modern, clinical-premium acquisition surface with restrained parallax, meaningful interaction, and a functional Supabase-backed content explorer.

**Architecture:** Keep public routes as Server Components and isolate browser behavior in small Client Components. Read published catalog data through the existing publishable Supabase client and RLS policies, then pass serializable records into a client-side explorer. Use CSS transforms and observers for motion; no animation dependency.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Testing Library, Vitest, Playwright, CSS.

**Spec:** `docs/superpowers/specs/2026-09-22-medhelp-design.md`

## Global Constraints

- Preserve the approved headline and exact price of R$ 30 per month.
- Do not publish invented medical guidance or imply that the Atlas preview is a diagnostic tool.
- Use the publishable Supabase key only; RLS remains the authorization boundary.
- Keep Server Components as the default and Client Components narrowly scoped.
- All interactions must be keyboard operable and understandable without animation.
- Respect `prefers-reduced-motion` and avoid layout-shifting scroll effects.
- Keep authenticated, editorial, and admin pages visually functional.

## Review Focus

- Mobile navigation focus, escape behavior, and correct home-section links from `/explorar`.
- Public content queries expose only released rows allowed by RLS and degrade safely when unavailable.
- Tabs, filters, and Atlas controls expose correct accessible state.
- Parallax and reveal behavior does not run when reduced motion is requested.
- Existing auth/editor/dashboard styles do not regress.

---

### Task 1: Synchronize the remote content foundation

**Files:** existing content workflow, domain files, migrations, and documentation already present on remote `main`.

**Interfaces:**
- Produces: local parity with the remote content repository and schema.

- [ ] Verify the synchronized files match the remote snapshot.
- [ ] Run `pnpm test`; expect 44 passing tests.
- [ ] Commit with `chore: synchronize content workflow`.

### Task 2: Build interactive homepage journeys

**Files:**
- Create: `apps/web/components/public/study-planner.tsx`
- Create: `apps/web/components/public/study-planner.test.tsx`
- Create: `apps/web/components/public/atlas-explorer.tsx`
- Create: `apps/web/components/public/atlas-explorer.test.tsx`
- Modify: `apps/web/components/public/header.tsx`
- Modify: `apps/web/components/public/header.test.tsx`
- Modify: `apps/web/components/public/hero.tsx`
- Modify: `apps/web/components/public/features.tsx`
- Modify: `apps/web/components/public/atlas-demo.tsx`
- Modify: `apps/web/components/public/study-journey.tsx`

**Interfaces:**
- Produces: accessible cycle tab selector and system-based Atlas preview.
- Produces: scroll progress and mobile menu behavior in the public header.

- [ ] Add failing tests for cycle selection, Atlas system selection, and menu state.
- [ ] Run focused tests and verify missing components/behavior cause RED.
- [ ] Implement the client islands and compose them into the Server Component sections.
- [ ] Run focused tests and expect GREEN.
- [ ] Commit with `feat: add interactive public study journeys`.

### Task 3: Add the Supabase-backed public explorer

**Files:**
- Create: `apps/web/lib/content/public-catalog.ts`
- Create: `apps/web/lib/content/public-catalog.test.ts`
- Create: `apps/web/components/public/content-explorer.tsx`
- Create: `apps/web/components/public/content-explorer.test.tsx`
- Create: `apps/web/app/(public)/explorar/page.tsx`
- Create: `apps/web/app/(public)/explorar/loading.tsx`
- Modify: `apps/web/app/(public)/page.tsx`

**Interfaces:**
- Produces: `listPublicCatalog(): Promise<PublicCatalogItem[]>`.
- Produces: client filters for query, cycle, and access level.

- [ ] Add failing tests for public record mapping, search, cycle/access filters, and empty results.
- [ ] Run focused tests and verify missing modules cause RED.
- [ ] Implement a server-side Supabase query with a safe unavailable/empty state.
- [ ] Implement the interactive explorer and public route.
- [ ] Run focused tests and expect GREEN.
- [ ] Commit with `feat: add public content explorer`.

### Task 4: Complete the clinical-premium visual system

**Files:**
- Create: `apps/web/components/public/motion-shell.tsx`
- Modify: `apps/web/app/(public)/layout.tsx`
- Modify: `apps/web/app/(public)/page.tsx`
- Modify: `apps/web/components/public/{hero,features,atlas-demo,study-journey,pricing,faq,footer,logo}.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/page.test.tsx`
- Modify: `apps/web/tests/e2e/public-home.spec.ts`

**Interfaces:**
- Produces: CSS-variable parallax, reveal states, bento feature hierarchy, refined pricing/FAQ/CTA, responsive layouts.

- [ ] Extend the homepage/E2E assertions for the premium sections and interactive landmarks; run and verify RED.
- [ ] Implement the redesigned composition, motion shell, tokens, responsive states, and reduced-motion override.
- [ ] Run unit tests, lint, typecheck, build, and Playwright accessibility/responsive checks.
- [ ] Commit with `feat: redesign immersive public experience`.

### Task 5: Review, verify, and publish

**Files:** all files changed in Tasks 1–4.

- [ ] Run the React best-practices review and fix Important findings with RED → GREEN tests.
- [ ] Run the complete verification suite and inspect the production build output.
- [ ] Perform a fresh whole-branch review against the approved scope.
- [ ] Push the verified commit tree to `codex/foundation` and `main`.
- [ ] Validate the production Vercel URL on desktop and mobile.
