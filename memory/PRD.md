# IWM Research Website — PRD

## Problem Statement (verbatim summary)
A full-stack professional academic researcher website for Innovative Waste Management. Must include Home, Team, Gallery (masonry + lightbox, image/video/YouTube), Contact (with optional file attachment), and a hidden admin panel at a secret URL for CRUD of team + gallery. Contact form is reused on every page. Email submissions via Resend. Object storage via Emergent managed storage (switchable to AWS S3 by env var later). SQLAlchemy-backed database (SQLite for demo, PostgreSQL for AWS RDS production — code unchanged). Professional, non-generic academic design (Spectral + IBM Plex Sans, terracotta accent on stone neutrals).

## User choices (verbatim)
- Stack: React + FastAPI + SQLAlchemy (SQLite dev / PostgreSQL prod). No MongoDB.
- Storage: Emergent managed object storage.
- Email: Resend (key provided).
- Admin credentials: defaults from spec (`adminuser` / `Admin@Secure123`).
- Seed content: yes — researcher-themed team + gallery.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn primitives (heavily customised). Routing via react-router-dom. Auth via JWT in `localStorage`, `axios` interceptor.
- Backend: FastAPI + SQLAlchemy (sync) + bcrypt + JWT (python-jose). Emergent object storage via `requests`. Resend via official SDK, run in thread.
- DB tables: `team_members`, `gallery_items`, `contact_submissions`, `admin_users` — auto-created on startup; idempotent seed for admin/team/gallery.

## Public pages
- `/` Home — hero, premise, urgency, four innovations, outcomes, research highlights, invitation, contact form.
- `/team` Team — grid, loading/error/empty states, fallback avatar.
- `/gallery` Gallery — masonry, lightbox (image/video/YouTube).
- `/contact` Contact — full form, org info, office hours.
- All public pages render a shared contact section at the bottom.

## Admin
- `/x7k2-manage-9qp` → login (rate limited, 5 fails → 15-min lockout, server-enforced).
- `/x7k2-manage-9qp/dashboard` → Team CRUD + reorder (up/down arrows, persisted to `display_order`), Gallery upload (image/video), embed (YouTube/Vimeo auto-normalised to /embed/), caption edit, delete.
- `robots.txt` disallows the admin path. `<meta name="robots" content="noindex,nofollow">` injected on admin pages.

## What's been implemented (2026-02-19)
- Full schema + auto migrations + idempotent seed (admin user bcrypt-hashed, 6 team members with photos pulled from source URLs into Emergent object storage, 4 images + 2 YouTube embeds in gallery).
- All endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/team`, `/api/admin/team (POST/PUT/DELETE/reorder)`, `/api/gallery`, `/api/admin/gallery/upload`, `/api/admin/gallery/embed`, `/api/admin/gallery/:id (PUT/DELETE)`, `/api/contact`, `/api/files/{path:path}`.
- JWT auth with Bearer token, server-enforced on all admin endpoints.
- Contact form with optional attachment (validated client + server), DB log is source of truth, Resend email best-effort.
- Editorial archival design — Spectral + IBM Plex Sans + JetBrains Mono, stone/terracotta palette, sharp corners, asymmetric grids, ticker, ruled sections, noindex admin, robots.txt.

## Update (2026-02-19 · R2 · Canadian polish)
- Added admin-editable **Site Settings** (singleton): org_name, tagline, email, phone, address_line1/2, city, region, postal_code, country, office_hours, affiliation.
- Seeded defaults to **Truro, Nova Scotia, Canada** (Atlantic time, +1 902) with Dalhousie Faculty of Agriculture affiliation badge.
- `GET /api/settings` (public), `PUT /api/admin/settings` (admin JWT).
- New admin tab **Site** in the dashboard (SettingsManager) — 12 editable fields with validation.
- Navbar logo, Footer, Contact page, and Home hero location pill all read from settings — editing any field in the admin panel reflects on every page.
- Polished page title + OG/Twitter meta (Truro · Nova Scotia branding).
- Testing: 27/27 backend pytest pass, all frontend flows verified (iteration_2.json).

## Update (2026-02-19 · R3 · Publications)
- Added a **Publications** feature with a public page at `/publications` (after Team in the nav) and a dedicated admin tab.
- Model: `publications` table with title, authors, venue, year, abstract, `external_url` or `file_path` (mutually exclusive), display_order.
- 5 sample publications seeded.
- Endpoints: `GET /api/publications` (public), `POST/PUT/DELETE /api/admin/publications` (admin JWT), `PUT /api/admin/publications/reorder`.
- **Server invariant**: every publication must have EXACTLY ONE of external_url or file_path — enforced on create and update (400 when both or neither). Update accepts an explicit `source_mode` = `link | document | ''` for unambiguous switching.
- **Admin UI**: mutually-exclusive source tabs in the modal — selecting "Use a link" disables the file input; selecting "Upload a document" disables the link input. Reorder via up/down arrows.
- **Public UI**: editorial archival listing, each row has a "Learn more" button that always opens in a **new tab** (`target="_blank" rel="noopener noreferrer"`); link rows point to the external URL, document rows point to the backend file-proxy URL (inline PDF render).
- Testing: **38/38 backend pytest pass** (11 new TestPublications + 27 regression), **100% frontend flows verified** (iteration_3.json). No issues, no regressions.

## Update (2026-02-19 · R4 · Team redesign + social links)
- **Team page layout redesigned** from a multi-column grid to a **vertical stack of horizontal rows** — each researcher occupies one full-width row with photo on the left and role/name/bio/socials on the right (`md:grid-cols-[320px_1fr]`).
- **7 social link fields** on TeamMember: `website`, `email`, `linkedin`, `twitter`, `github`, `scholar` (Google Scholar), `facebook` (**replaced the earlier ORCID field** — R4.1). All optional.
- **Idempotent column-add migration** (`_ensure_team_social_columns`) using `ALTER TABLE` so pre-existing SQLite DBs pick up the new columns automatically.
- **Seed data back-filled** — existing sample researchers got realistic sample URLs (some deliberately omit Facebook/GitHub/Twitter/Website to prove the hiding invariant).
- **Admin dialog** gained all 7 social inputs (`admin-team-{field}-input`), empty blank values clear the link.
- **Public UI rule**: the social icon for a field is rendered *iff* the field is a non-empty string — otherwise the icon is hidden. Email opens via `mailto:`; all other icons open in a new tab with `rel="noopener noreferrer"`.
- **Bug fixes along the way**: (a) `PUT /api/admin/team/{id}` previously could not clear a social field because FastAPI coerced empty-string Form values to None — fixed by reading `await request.form()` directly; (b) POST handler missed the ORCID→Facebook rename — fixed by adding `facebook` Form param and dropping `orcid` ORM kwarg.
- Testing: **51/51 backend pytest pass** (iteration_7), 100% frontend flows verified.

## Backlog (not blocking)
- P1: drag-and-drop reorder (currently up/down arrows — spec allowed either).
- P1: pagination for gallery when item count exceeds ~60.
- P2: admin-facing submissions browser (inbox) — submissions are logged to DB but there's no UI for them.
- P2: AWS S3 storage driver behind `STORAGE_PROVIDER=s3`.
- P2: sitemap.xml generation.

## Next tasks
- Run testing agent end-to-end, address any blockers, then declare first finish.
