# Personal Portfolio (Plain HTML)

## Purpose

Anan's personal portfolio site — zero-dependency rebuild in plain HTML/CSS/JS. No build step, no framework. Full feature parity with the original Next.js version.

## Run

```bash
# Open index.html directly in a browser, or serve locally:
npx serve .
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Homepage — hero video carousel, services, featured projects (3), workflow, CTA |
| `about.html` | About page — portrait, bio, values, experience timeline, awards, moments gallery |
| `work.html` | All work — filter grid (All / Personal / Client / Competition / Others) |
| `projects/aibin.html` | AiBin case study |
| `projects/sdas.html` | S.D.A.S case study |
| `projects/electrofuel.html` | Electrofuel.co case study |
| `projects/mediassist.html` | MediAssist AI case study |
| `css/global.css` | Tokens, navbar, footer, preloader, modal, lightbox, CTA |
| `css/home.css` | Homepage-specific styles |
| `css/work.css` | Work page + filter styles |
| `css/case-study.css` | All case study block styles (cs-block pattern) |
| `js/main.js` | Preloader, navbar, hamburger, booking modal (4-step), lightbox, scroll reveal |
| `js/hero.js` | 24-video crossfade carousel |
| `js/work.js` | Filter logic + empty state |
| `js/case-study.js` | Metric bar IntersectionObserver animation |
| `js/supabase-client.js` | Booking + contact form DB writes |
| `js/supabase-config.js` | Supabase project URL + anon key (gitignored) |
| `scripts/upload-assets.js` | Bulk push local assets → Supabase Storage + rewrite HTML src URLs |
| `vercel.json` | Security headers + deploy config |

## Asset Folders

| Folder | Contents |
|--------|---------|
| `hero/` | hero-01.mp4 … hero-24.mp4 — homepage video carousel clips |
| `aibin/` | AiBin product images, app screenshots, CAD renders, demo videos |
| `sdas/` | in-car-setup.jpeg, product-shot.jpeg, electronics-internals.jpeg, app-screenshot.jpeg, wiring-diagram.jpeg, lab-setup.jpeg, demo.mp4 |
| `mediassist/` | app-queue-display.jpeg, app-smartqueue.jpeg, bem-team.jpeg |
| `zeta/` | preview.png — screenshot used for work page card |
| `about/` | Portrait, biography images, moments gallery photos, videos |

## Projects on Work Page

| Project | Type | Status | File |
|---------|------|--------|------|
| AiBin | Personal | Live | `projects/aibin.html` |
| S.D.A.S | Competition | Live | `projects/sdas.html` |
| Electrofuel.co | Others | Live | `projects/electrofuel.html` |
| MediAssist AI | Competition | Live | `projects/mediassist.html` |
| ZeTa Esport | Client | In Development (no case study yet) | — |

## Architecture Notes

- All pages share `css/global.css` and `js/main.js`
- Case study pages follow the `cs-block` pattern — each block has `cs-block-label`, `cs-block-title`, and block-specific inner elements
- Booking modal: 4 steps (date, time, name/email/budget/message, confirm) — inserts to Supabase `bookings` table
- Contact form: inserts to Supabase `contact_messages` table
- Supabase Edge Function (`send-booking-email`) fires on DB insert via webhook — sends dual emails via Resend + creates Google Meet via Calendar API
- `scripts/upload-assets.js`: run once to push all local assets to Supabase Storage buckets and rewrite `src` URLs in HTML files

## Backend Setup (Required Before Deploy)

1. Create Supabase project — run SQL in `supabase/schema.sql`
2. Create Storage buckets: `images`, `videos`
3. Set Supabase secrets: `RESEND_API_KEY`, `OWNER_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_TIMEZONE`
4. Copy `.env.example` → `.env` and fill in `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
5. Run `node scripts/upload-assets.js` to migrate assets to Storage
6. Deploy to Vercel — `vercel.json` handles headers and routing
