# Contributing to DMEAST

This is the operating manual for working on dmeastph.com — how the code is
organized, how to set up locally, and how changes get to production.

## Stack

- **Frontend:** React 19 + Vite 8 (plain JavaScript, no TypeScript yet)
- **Backend:** Vercel serverless functions in `/api/`
- **Data:** Firebase Firestore + Firebase Auth
- **Hosting:** Vercel (auto-deploy on push to `main`)
- **Repo:** [github.com/dmeastph/dmeast](https://github.com/dmeastph/dmeast)

## Local development setup

1. Clone the repo (or `git pull` if already cloned).
2. `npm install` — installs dependencies into `node_modules/`.
3. Copy `.env.example` to `.env.local` and fill in real values (ask the
   maintainer or check Vercel Settings → Environment Variables).
4. `npm run dev` — starts the Vite dev server at <http://localhost:5173>.
5. `npm run build` — production build (Vercel runs this on every deploy).
6. `npm run lint` — runs ESLint over the codebase.

## Branching

| Prefix    | When to use                                    | Example                             |
|-----------|------------------------------------------------|-------------------------------------|
| `feat/`   | New user-facing feature                        | `feat/supplier-bulk-edit`           |
| `fix/`    | Bug fix                                        | `fix/pdf-page-break-overflow`       |
| `chore/`  | Tooling, deps, docs, config                    | `chore/upgrade-vite-9`              |
| `refactor/` | Code reshape with no behavior change         | `refactor/extract-firebase-helpers` |
| `test/`   | Adding or updating tests                       | `test/maya-webhook-coverage`        |

Branch from `main`. Keep branches short-lived (≤ 1 week if possible).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) style:

```
<type>: <short description>

[optional body explaining why this change was needed]
```

Common types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`.

Examples:
- `feat: add supplier bulk-edit modal`
- `fix: prevent PDF header overlap on multi-page quotes`
- `chore: bump firebase to 12.13.0`

## Deploy flow

```
local edit → commit → push to feature branch
   ↓
Vercel auto-builds a preview URL on the branch
   ↓
review the preview at dmeast-git-<branch>-dmeastphs-projects.vercel.app
   ↓
open a Pull Request from the branch into `main`
   ↓
once approved, merge the PR
   ↓
Vercel auto-deploys main → dmeastph.com
```

**Never push directly to `main`.** All changes go through a branch + PR + preview review.

## Working with Cowork (AI assistant)

The dmeast website is co-maintained with Cowork. Cowork edits files in
this repo and prepares commits; the human owner pushes via GitHub Desktop
and approves Vercel previews before merging.

For Cowork's running upgrade & maintenance plan, see the project notes
shared in the Cowork session.

## Environment variables

See `.env.example` for the full list with comments. Real values are stored
in Vercel project settings — never commit secrets to the repo.

## Code organization (current → target)

**Current:** Everything lives in `src/App.jsx` (~12k lines).

**Target after Phase 1 refactor:**

```
src/
  pages/           # one file per top-level route
  components/      # reusable UI (Modal, Button, Table, etc.)
  features/        # domain modules (orders, rfq, suppliers, payments, admin)
  hooks/           # custom React hooks
  lib/             # firebase.js, claude.js, maya.js, fiuu.js, emailjs.js
  utils/           # formatting, currency, dates, pdf helpers
  constants/       # bank info, payment toggles, hardcoded data
  App.jsx          # router + providers shell (~100 lines)
  main.jsx
```

## Production data — extra caution

- **No payment / refund / pricing logic changes** without explicit owner sign-off.
- **No Firestore data deletions.** Schema changes should be additive.
- **No DNS or domain changes** without explicit owner sign-off.
- **No pharma-related changes** while `HIDE_PHARMA_PUBLIC=true` is in effect
  (PayRex compliance — see App.jsx version notes).

## Questions?

Owner: Edilberto B. Conde — info@dmeastph.com
