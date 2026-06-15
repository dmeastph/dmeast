# Changelog

All notable changes to dmeastph.com go here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Note:** Historical version notes (v1.0 – v16.18) live as JSDoc comments
> at the top of `src/App.jsx`. Going forward, new releases get logged here
> instead of growing that comment block further.

## [Unreleased]

### Added
- `.env.example` — documents every environment variable the app reads
- `.gitattributes` — enforces LF line endings, fixes phantom CRLF diffs
- `CONTRIBUTING.md` — documents the deploy flow and branching conventions
- `CHANGELOG.md` — this file

### Notes
- Phase 0 of the upgrade plan: safety scaffolding. No user-visible changes.
- Next: Phase 1 (decompose `src/App.jsx` monolith into modules).

---

## [16.18] — 2026-06-05

### Added
- Suppliers admin tab — full CRUD for supplier master records
- Supplier products per supplier with margin override
- Bulk import via Excel (.xlsx) upload (SUPPLIERS + PRODUCTS sheets)
- RFQ admin tab — AI-powered quote automation via Claude API
- Hybrid review for RFQ matches (auto-confirm high confidence, flag low)
- Margin auto-application by category (Medicine 15%, Supply 27.5%)
- Internal cost sheet export (.xlsx)
- Client quote PDF generation (DMEAST branded)

For older history, see the JSDoc block at the top of `src/App.jsx`.
