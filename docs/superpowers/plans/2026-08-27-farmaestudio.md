# FarmaEstudio Implementation Plan

> **For agentic workers:** implement each task test-first, commit the result, and do not expose Supabase service-role credentials in the client.

**Goal:** Deliver a desktop-first Spanish pharmacology study web app with Google authentication, an eleven-module reference library, non-repeating quizzes, personal review queues, progress reporting, CSV administration, and a production-ready Supabase schema.

**Architecture:** React + TypeScript + Vite is deployed as a static SPA. A repository interface selects a Supabase implementation when public environment variables exist and an in-browser demo implementation otherwise. Supabase PostgreSQL owns transactional quiz selection, answer submission, RLS-protected history, content imports, and reporting.

**Tech Stack:** React, React Router, TanStack Query, Supabase JS, Zod, Papa Parse, CSS Modules/global tokens, Vitest, Testing Library, Playwright, PostgreSQL/Supabase, Cloudflare Pages.

## Global Constraints

- Spanish UI; reporting timezone `America/Santiago`.
- Desktop-first university-formal design; functional tablet/mobile layouts; WCAG 2.2 AA target.
- Google OAuth is open registration; user roles come from non-user-editable `app_metadata`.
- Exactly four A-D choices and one correct answer per question.
- Module sessions request 20 unseen questions; drug sessions request 5, 10, 15, or 20 and shorten when necessary.
- Normal questions never repeat in a cycle; review is separate and resolves after one correct answer.
- Correct solutions are not sent to students until answer submission.
- Imports are previewed, atomic, and initially draft; `question_code` identifies a logical question across versions.
- No runtime AI, payments, university branding, notifications, rankings, native app, or offline mode.
- Supabase secrets never enter browser code; every exposed table has explicit grants and RLS.

---

### Task 1: Project foundation and visual system

Create the Vite/React project, pinned dependencies and lockfile, test/build configuration, fonts, global design tokens, accessible application shell, routing, public landing/auth states, navigation, reusable UI primitives, and representative empty/loading/error states. Add unit tests for navigation and accessibility-relevant behavior. The signature visual is an editorial pharmacology margin: module codes and fine rules behave like a formal annotated monograph, without mimicking university branding.

### Task 2: Domain model, demo repository, and Supabase contract

Define exact TypeScript domain types and repository interfaces. Build an in-browser demo repository with seeded taxonomy, references, questions, persistent sessions, no-repeat cycles, review behavior, answer locking, and progress calculations using test-first development. Add the complete Supabase migration with taxonomy, versioned content, secure solution storage, user-owned history, RLS/grants, admin checks, transactional quiz/review/cycle RPCs, seed taxonomy, and SQL policy tests. Add the Supabase repository adapter without weakening client-side types.

### Task 3: Student study experience

Implement dashboard, module/topic and drug quiz builders, active/resumable quiz, immediate feedback, session summary, review queue, progress analytics, reference search/filter/list/detail views, and new-cycle flow. Use real seeded academic-demo content clearly marked as illustrative. Cover selection, shorter sessions, answer locking, review resolution, cycle preservation, and search with component and domain tests.

### Task 4: Administration, content import, operational docs, and release QA

Implement admin route protection, CSV template downloads, the exact two CSV schemas, Zod/Papa Parse preview validation, draft import calls, content batch list, individual/group progress views, and the supplied generation prompt. Add environment examples, Cloudflare SPA configuration, Supabase/Google setup, backup/runbook documentation, Playwright smoke tests, accessibility checks, final build/lint/test commands, and security scanning.
