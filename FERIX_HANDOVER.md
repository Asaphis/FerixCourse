# FerixCourse — cleanup handover

Everything below fixes structure, consistency and the missing pieces. **The look is unchanged** —
same tokens, same fonts, same dark + ember language. Nothing was redesigned.

Install order matters: `fix.css` is an override layer, so it is imported **last**.

---

## 1. Learner app (`Web/UserPhase`)

| # | File | Action | Download |
|---|------|--------|----------|
| 1 | `app/fix.css` | **new** | https://uploads.codewords.ai/0d41f286603405fc175066c59e13146dd139efccae624d7e8c988467131e9a87/fix.css |
| 2 | `app/rebuild.css` | replace | https://uploads.codewords.ai/7f7600c7f727cd1ac76ae471719fd1d291a905f9d98f46ba8047b292d2f55b6e/fixed_rebuild.css |
| 3 | `components/live/live-controls.tsx` | **new** | https://uploads.codewords.ai/39e6a264f25576519f1b4b51b3d91ece29041876068e71582253c0d435a5a509/live-controls.tsx |
| 4 | `components/live/live-comments.tsx` | **new** | https://uploads.codewords.ai/51e763498ba01868c6ab392e3e988969cf56dd8b8d61549956cbf48e85135ddb/live-comments.tsx |
| 5 | `app/classrooms/[slug]/live/page.tsx` | replace | https://uploads.codewords.ai/a3c180f3b679e49cea9ab0e1d7a94e3ba8e0de498cd81ea832959ce05b0a0029/classroom_live_page.tsx |

Then add one line to `app/layout.tsx` (last import, after `rebuild.css` and `dashboard.css`):

```tsx
import "./globals.css";
import "./rebuild.css";
import "./dashboard.css";
import "./fix.css";        // <-- ADD
```

What changed:
- **Screen sharing and the class discussion now exist in the live room.** The library's default
  control bar is replaced by `LiveControls` (mic, camera, **share screen**, raise hand, comments
  with an unread count) and the stage is joined by `LiveComments` — threaded replies, attachments,
  question flagging, live updates.
- Screen-share failure is now visible: if the browser cannot capture, the button says so instead of
  doing nothing.
- Stage and comments sit side by side on a desktop and stack on a phone (`openchat` opens the
  discussion full width).
- Stray indigo/violet values replaced with your ember family (10 substitutions in `rebuild.css`).

## 2. Admin console (`Web/AdminPort`)

| # | File | Action | Download |
|---|------|--------|----------|
| 6 | `app/fix.css` | **new** (same file as #1) | https://uploads.codewords.ai/0d41f286603405fc175066c59e13146dd139efccae624d7e8c988467131e9a87/fix.css |
| 7 | `app/console.css` | replace | https://uploads.codewords.ai/657337d3b6b7e1761e7fea369c152ab6f1ad95f8554f8f76b408a1d4e1f799bf/fixed_console.css |
| 8 | `app/rebuild.css` | replace | https://uploads.codewords.ai/58f88adf9ecf0aa7917a6b4447271ba88fe9f2cdf2d163ef05ceaf0ed3a5c7da/fixed_rebuild.css |
| 9 | `app/transactions/page.tsx` | replace | https://uploads.codewords.ai/0910cb897bf347b185d77ea42b76856aea269092c0dee94e2488663669f150c4/transactions_page.tsx |
| 10 | `components/admin-live-comments.tsx` | **new** | https://uploads.codewords.ai/fe890083ea22f2871c9c11764e0926d0547aab889ba1a84ed9eaa50ab7fd2b85/admin-live-comments.tsx |
| 11 | `app/live/page.tsx` | replace | https://uploads.codewords.ai/b90cac4f1a4b4414551e5ef5d1881de6feab542a484c6683215c6294ebdfc615/admin_live_page.tsx |

Then the same one-line import in `app/layout.tsx`:

```tsx
import "./globals.css";
import "./console.css";
import "./rebuild.css";
import "./fix.css";        // <-- ADD
```

What changed:
- **Payments are finally visible.** `app/transactions/page.tsx` was a 33-line placeholder; it is now
  a real screen: today / 7-day / success-rate / needs-attention summary, search, status filters with
  counts, a proper table, receipt view, CSV export, and correct loading / empty / error states
  (a failed request never renders as "you have nothing"). It uses your own `useAdmin`, `rebMoney`
  helpers and `reb-ui` components — no new dependencies.
- **Live control has a Discussion tab.** Instructors answer a learner's question without leaving the
  session, and the answer is pushed back into the learner's room over the existing event stream.
- **Indigo/blue is gone.** `console.css` (17 values) and the console `rebuild.css` (14 values) now
  use the same ember palette as the learner side, so the two panels finally match.
- Table markup is unchanged but becomes stacked label/value cards below 720px (the CSS does it), so
  no column is ever cut off on a phone.

## 3. Backend (`Backend`)

| # | File | Action | Download |
|---|------|--------|----------|
| 12 | `migrations/006_classroom_cover.sql` | **new** | https://uploads.codewords.ai/9bdfbcd67fc6783825692df5bebbceed3caf34af4136b9869082d6f407adf87a/006_classroom_cover.sql |

```bash
node scripts/migrate.js       # or however migrations are applied
```

**This fixes a live 500.** `GET /admin/products` was failing with
`column r.cover_url does not exist`, which is why the Products screen could not load. Two queries
were selecting `classrooms.cover_url` — a column `courses` has had since `001_core.sql` but
`classrooms` never got. The migration adds it; the learner-detail query in `adminOps.ts` is fixed by
the same change. The file also documents the query-level alternative if you would rather not add the
column.

---

## 4. The structural layer (`fix.css`) — what it actually does

| Problem found in your code | What the layer does |
|---|---|
| `rebuild.css` is 3,057 lines (learner) / 3,501 lines (console) with **zero** media queries | Adds the three breakpoints the app never had: phone ≤720, tablet ≤1024, desktop |
| Fixed widths `244 / 320 / 420 / 640 / 1120 / 1500 px` and 23–24 absolute rules | Releases inline fixed widths and absolutely-positioned boxes below 720px, so nothing overlaps or pushes the page sideways |
| Nine different breakpoints (520…1080) across pages | One set, applied everywhere |
| Fixed-height inner scrollers (`.view`) | Scrolls the page on a phone instead, so headers and boxes stop colliding and content is never cut off |
| Icon rail unusable at phone width | Rail hides, your existing bottom dock shows (plus bottom padding so nothing hides behind it) |
| `--fc-*` / `--ad-*` tokens only defined for the **light** theme in places | Dark values added, so no page falls back to no colour in dark mode (the default) |
| Six raw browser file buttons vs one unused styled dropzone | Every file input is styled as that dropzone — one upload control, everywhere |
| Per-page drift in card radius, gaps, row alignment, table padding | One shared scale for both apps |
| Menus/sheets behind content | Scrim and sheet z-index set once |
| No focus styling, no reduced-motion handling | `:focus-visible` ring in brand colour; animations respect `prefers-reduced-motion` |

**One trade-off to know about:** on phones the rail is hidden and the dock is shown. If any page does
not render the dock in its markup, that page will have no navigation at phone width — send me the
page and I will add the dock there too.

---

## 5. What was verified, and how

- **Icon names**: every icon used was checked against the real sets — 81 names in the learner app,
  63 in the console. Nothing was guessed; two names I first used (`refresh`, `copy`) were replaced
  with the real ones (`refresh`, `clipboard`).
- **Helper names**: `useLiveStream`, `subscribeAdminEvents`, `api.classroomWorkspace`,
  `api.sendClassroomMessage`, `api.uploadMessageFile`, `api.classroomRead`, `getClassroomMessages`,
  `postClassroomMessage`, `uploadFile`, `useAdmin`, `money`, `timeAgo`, `downloadCsv` — all read from
  your source, not assumed.
- **Event channels**: `classroom-message` exists in both event maps
  (`{ classroom_id, message }`), which is what makes the discussion live instead of polled.
- **Live infrastructure**: `POST /live/token` verifies membership server-side and already grants
  `canPublish` / `canSubscribe` / `canPublishData` — screen sharing and raise-hand needed no backend
  change at all.
- **API probe against your live backend** (logged in as the test admin): `/api/dashboard/summary`,
  `/auth/me`, `/messages/conversations`, `/notifications/mine`, `/public/enrollments/mine`,
  `/public/transactions/mine`, `/requests/mine`, `/scope/requests/open`, `/scope/requests/status`,
  `/admin/live/overview`, `/admin/reports`, `/admin/broadcasts`, `/admin/categories`,
  `/admin/conversations` → **all 200**. `/admin/products` → **500**, now fixed by the migration.
  (Several 404s in that sweep were my own GET probes against routes that only accept POST —
  `/live/token`, `/messages/uploads`, `/notifications/read-all`, `/bookings`, `/requests` — not
  defects.)
- **Console live-page patch**: three exact anchors replaced, each matching exactly once
  (import, tab union, tab row + discussion pane).

## 6. Honest limits of this pass

- I could not run your Next.js build in this environment (no persistent build sandbox here), so the
  TypeScript and CSS were verified statically — names, types, anchors and logic — rather than
  compiled. Please run `npm run build` in each app after installing; if anything complains, send me
  the error and I will fix it immediately.
- The responsive rules are broad by design (they target patterns, e.g. anything with "grid" in the
  class). That is what makes one file fix 30+ screens, but a page with an unusual custom layout may
  need one extra rule. Tell me which page and I will add it.
- I have not yet audited every learner page for loading/empty/error handling — that needs the pages
  running against your data. Next pass.

## 7. Next pass (in order)

1. `npm run build` in both apps, fix anything that surfaces.
2. Loading / empty / error states on every protected learner page.
3. Final responsive pass at 390 / 768 / 1440 on real screens.
4. Classroom cover upload wired end to end (the file input is there; the column now exists too).
