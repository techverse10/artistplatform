# Stagelight — artist booking platform

One shared REST API (`apps/api`) for the web app (`apps/web`) and the future React Native / Expo app.

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router) + React 19, plain CSS design system |
| API | Node.js + Express + TypeScript, zod validation |
| Database | PostgreSQL + Prisma |
| Auth | JWT access token (15 min) + rotating opaque refresh token (30 days), sent as `Authorization: Bearer` so mobile works the same as web |
| Media | Local disk in dev (`apps/api/uploads`); swap for S3 / R2 / Cloudinary in production |

> **Status:** the code was written but **not yet installed, type-checked or run** — the sandbox it was written in blocked the npm registry. Expect to fix a few small type or typo errors on first run.

## Run it

```bash
docker compose up -d                       # Postgres
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm install
cd apps/api && npx prisma migrate dev --name init && npm run seed && cd ../..
npm run dev:api                            # http://localhost:4000
npm run dev:web                            # http://localhost:3000
```

Demo logins (after seeding), password `password123`:
- Fan: `fan@example.com`
- Artist: `aarav_strings@example.com` (also `meera_moves@…`, `dj_nilotpal@…`, etc.)

## API overview (`/api`)

| Method & path | Who | Purpose |
|---|---|---|
| `POST /auth/register` `/login` `/refresh` `/logout`, `GET /auth/me` | all | Accounts. Register with `role: USER` or `ARTIST` (+ `handle`) |
| `GET /artists` | public | Search/filter: `q, category, city, maxPrice, sort, page` |
| `GET /artists/categories`, `GET /artists/:handle` | public | Profile with packages and `following` flag |
| `POST/DELETE /artists/:id/follow` | signed in | Follow |
| `PATCH /artists/me/profile`, `POST/DELETE /artists/me/packages` | ARTIST | Manage profile and packages |
| `GET /posts` | public | Feed: `type=PHOTO\|AUDIO\|VIDEO\|REEL, handle, cursor` |
| `POST /posts` (multipart: `type, caption, media, thumbnail?`) | ARTIST | Upload content |
| `POST/DELETE /posts/:id/like`, `GET/POST /posts/:id/comments` | signed in | Engagement |
| `POST /bookings` | USER | Request a booking |
| `GET /bookings/mine` / `GET /bookings/incoming` | USER / ARTIST | Lists |
| `PATCH /bookings/:id/status` | both | Artist: accept/decline/complete. Customer: cancel |

## Design: "Stagelight"

Three-column social layout (sidebar, feed, right rail) in the logo's amber, flame and crimson on plum-black. Headlines use Bricolage Grotesque, body uses Figtree.

- **Spotlight hero:** the featured artist's cover sits in the dark and a stage light follows the cursor. It drifts on its own on touch devices and stays still for reduced-motion users.
- **Feed:** photos, reels (autoplay muted in view), video and inline audio, with likes and comments. Every post has a **Book from ₹X** button.
- **Story-ring avatars** in the logo gradient, a notched **admit-one ticket** for the booking summary.
- **Light and dark themes:** light is the default. The sun/moon button in the top bar switches, remembers the choice, and applies it before the page paints so there is no flash. The spotlight hero, audio panels and booking ticket stay dark in both themes.
- **Responsive:** full sidebar and right rail on desktop, icon rail on tablet, bottom tab bar on phones.

## Before launch (not built yet)

Payments, notifications, availability calendar, reviews, reporting/moderation, S3 upload with video transcoding, rate limiting, tests.


## Glass and mobile notes

- iPhone-style frosted glass is used only on small fixed chrome (top bar, floating tab bar, sheets, pills). Large scrolling cards stay solid so phones scroll smoothly.
- Mobile stability: `svh` heights, `overflow-x: clip`, long-text wrapping, safe-area insets, 16px inputs.
- Test performance with `npm run build && npm run start`, not `next dev`. On a phone, set the API URL to your computer's LAN IP, not `localhost`.
- The code has not been run end to end here (package installs were blocked), so please report anything that looks off.
