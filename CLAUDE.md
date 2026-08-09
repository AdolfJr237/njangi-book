# CLAUDE.md — NjangiBook

Project context file. Read this fully before writing or changing any code in this repository.

## What this project is

NjangiBook is a mobile record keeping app for njangi (tontine/rotating savings) groups in Cameroon. It replaces the treasurer's paper notebook. It tracks member contributions, a welfare fund, loans, and fines, and shows whose turn it is to collect the pot.

Built by Adolf (AGBOR TARH ADOLF JUNIOR), final year BTech Computer Engineering student at the University of Buea, as a portfolio project positioned for real deployment in Cameroon.

## The single most important rule

**NjangiBook is a ledger, not a bank. The app NEVER holds, moves, or processes money.**

- The app records claims about money. It does not validate or transfer money.
- The treasurer receives cash or MoMo outside the app, then records the payment inside it.
- MoMo screenshots attached to payments are evidence stored alongside a record. The app never reads, verifies, or acts on them.
- No wallet, no balance held by the app, no payouts, no payment API integration in this version.
- Reason: holding pooled member money is deposit taking under COBAC/CEMAC regulation in Cameroon. Doing it without a licence is illegal. A money-holding version is a documented future phase that requires a registered company, a licence, and an MTN MoMo or Orange Money partnership. Do not build any of it now.

If a requested feature involves the app touching money, stop and flag it instead of building it.

## Tech stack

- **Frontend:** React Native with Expo (TypeScript). Single codebase for Android and iOS.
- **Backend:** FastAPI (Python).
- **Database:** PostgreSQL in production, SQLite acceptable for early local development.
- **Auth:** JWT. Phone number is the unique user identity (not email).
- **Testing devices:** Expo Go on the developer's two iPhones and an Android phone during development.
- **Builds and shipping:** EAS Build (Expo's cloud build service) for both platforms. No local Mac exists; all iOS builds go through EAS. Apple Developer account activated at App Store submission stage.
- **Deployment:** Backend on Render (same pattern as the developer's previous HomeEASY project).
- The API key / model layer of any future ML feature lives behind the FastAPI backend. The mobile app never calls external APIs directly.

## Architecture rules

- Mobile app talks to the FastAPI backend over JSON. All business logic (rotation advancement, balances, interest math, role checks) lives in the backend, never in the app.
- The app displays state and submits actions. It never computes ledger truth locally.
- Role-based access enforced server side: a treasurer-only endpoint must reject ordinary members even if the UI hides the button.
- Every ledger write records who entered it and a timestamp. Records are never hard-deleted or silently edited; corrections create a visible trail.

## Roles

Two roles, scoped per group (a user can be treasurer in one group and ordinary member in another):

- **Treasurer:** records contributions, welfare entries, loans, repayments, fines. Manages group settings, invite code, and membership. Created automatically as the person who creates the group.
- **Member:** views everything, edits nothing. Receives notifications when their payment is recorded and can confirm or dispute.

UI rule: members and treasurers see the same screens. The treasurer additionally sees edit controls and a floating action button (FAB). Never build separate screens per role; build one screen and gate actions by role.

## Data model

Core entities. Almost every ledger row shares one shape: someone, an amount, a date, who recorded it.

- **User:** name, phone number (unique login), password hash, optional photo.
- **Group:** name, contribution amount, meeting frequency, creator, start date, invite code.
- **Membership:** many-to-many join of User and Group. Carries per-group role (treasurer/member) and rotation position.
- **Meeting/Cycle:** scheduled meeting date and which member collects the pot that round. Drives "whose turn" logic. The current turn is a pointer that advances each cycle.
- **Contribution:** one row per member per meeting: payer, amount, date, recorded_by, timestamp, optional MoMo screenshot attachment. The core ledger and audit trail.
- **WelfareEntry:** separate ledger for the trouble bank. Contributions in and payouts out, payouts carry a reason (funeral, sickness, birth).
- **Loan:** borrower, principal, interest rate, date taken, due date. Has child **Repayment** records. Remaining balance is derived, not stored.
- **Fine:** member, amount, reason, paid/unpaid status.
- **Notification:** user, message, read/unread state. Fired when a payment is recorded against a member, plus turn reminders and loan due dates.

## Screens (25 total)

Auth flow:
1. **Splash** — logo, checks session, routes to Dashboard or Login.
2. **Onboarding** — 2–3 intro cards, first install only.
3. **Sign Up** — name, phone, password.
4. **Login** — phone and password.
5. **Forgot Password** — OTP to phone, then reset.

Home and groups:
6. **Dashboard** — list of the user's groups as cards (next contribution due, whose turn). Create/join buttons. Bell and avatar in top bar.
7. **Create Group** — name, amount, frequency, start date. Creator becomes treasurer.
8. **Join Group** — invite code entry.
9. **Group Dashboard (Home tab)** — hub for one njangi: whose turn, total pot, welfare balance, own standing.

Contributions:
10. **Contributions Ledger** — all meetings and payment statuses. Read only for members; treasurer sees FAB.
11. **Record Contribution** — treasurer only: pick member and meeting, mark paid, optional MoMo screenshot. Saving fires a notification.
12. **My Contributions** — the user's personal payment history.
13. **Rotation Schedule** — collection order: past collectors done, current highlighted, future muted.

Funds:
14. **Welfare Fund** — balance plus ledger of ins and outs with reasons.
15. **Record Welfare Entry** — treasurer form for welfare contribution or payout.
16. **Loans** — list of active loans (borrower, amount, interest, due date, owing).
17. **Loan Detail** — one loan in full with repayment history. Member can request; treasurer records repayments.
18. **Fines** — list of fines with paid/unpaid status.
19. **Add Fine** — treasurer form.

People and records:
20. **Members** — everyone with role and rotation position.
21. **Member Detail** — one member's complete record across all four ledgers. The dispute-settling screen.
22. **Reports** — year end statement, PDF export. Premium feature later.

General:
23. **Notifications** — alerts with confirm/dispute actions on payment records.
24. **Profile** — account details, password change, logout.
25. **Group Settings** — treasurer only: amount, frequency, invite code, membership.

## Navigation

Two layers:

- **Top level (no group open):** Dashboard is home. No bottom bar. Notification bell and profile avatar in the top app bar.
- **Inside a group:** bottom tab bar with exactly five tabs: **Home, Contributions, Funds, Members, More.** Funds groups welfare, loans, and fines. More holds reports, settings, invite code, leave group.
- Back arrow on the group Home returns to the Dashboard and hides the tab bar. Mental model: Dashboard is the lobby, tabs are one group's rooms.
- Treasurer record actions live on a FAB shown only to treasurers on Contributions and Funds. Never give recording its own tab.

## Design system

Solid navy blue and white identity. Financial-tool feel, trustworthy, not playful.

- Primary navy: `#16244C` (top bar, primary buttons, active states, bottom nav background)
- White: `#FFFFFF` (backgrounds, cards)
- Light grey surface: `#F4F6FA` (page background behind cards, input fills, dividers)
- Secondary text: `#6B7280`
- Status colors, used ONLY for money states: green `#1E9E5A` (paid/positive), red `#D64545` (unpaid/overdue), amber `#E0A100` (pending/due soon)
- No other brand colors. Navy and white carry identity; status colors carry meaning.
- Typography: Inter or Poppins. Bold for amounts and headings. Money values are the loudest element on every screen.
- Components: white cards with 16px radius and soft shadow; solid navy primary buttons; status pills; list rows of name/amount/date/pill.
- Currency displayed as XAF/FCFA.
- Figma mockups exist (built via Figma Make, navy/white theme, gallery grid). Treat them as visual reference; the Make-generated code is web React and must NOT be copied into the app.

## Product decisions already made (do not reopen)

- Multiple groups per user is supported (more realistic; people belong to several njangis).
- Phone number login, not email.
- Validation of money receipt is out of scope on purpose: the treasurer is the source of truth, the app is the trusted record. Notification + audit trail + optional MoMo screenshot give accountability without payment processing.
- Framework is React Native, not Flutter. Cross platform from one codebase; iOS shipped via EAS.
- Android is the primary market (Cameroon is heavily Android) but iOS is fully supported and tested on real iPhones.

## Monetization model (context, not to build yet)

- Group subscription: the whole group pays one small fee (roughly 1,000–2,000 FCFA/month), paid by the treasurer from group funds. Not per member.
- Freemium: one group free with basic contribution tracking; loans, welfare, fines, multiple groups, and PDF reports/statements are the paid tier.
- No ads, ever.
- Future growth path (pitch only): MoMo partnership for in-app collection with a per-transaction cut. Requires licensing and partnership; see the single most important rule above.

## Roadmap

- **Phase 1 (now):** the ledger app described in this file. Currently in validation: a Jotform survey is collecting responses (target 40–50) before development starts. Survey results decide feature priorities (especially whether groups actually run loans and fines).
- **Phase 2 (after real usage data exists):** ML layer on the app's own behavioral data: a default risk predictor (classification on payment history, lateness, fines) flagging members likely to miss their next contribution, and a contribution/pot forecast (time series). Models run in Python on the FastAPI backend, never on the phone.
- **Phase 3 (separate company/licensing effort, not a coding task):** money-holding escrow version with MoMo integration and automatic payouts. Blocked on COBAC licensing, registered company, KYC, telco partnership.

## Working style for Claude in this repo

- Adolf is learning by building. Explain the why behind schema shapes, backend-vs-app decisions, and non-obvious logic as you implement. Don't just hand over finished code silently.
- Keep explanations plain. No em dashes, no AI-flavored filler, vary sentence length, active voice.
- When something touches money movement, regulation, or holding funds, stop and flag rather than build.
- Reuse patterns from HomeEASY where they fit (JWT auth flow, FastAPI structure, Render deployment) instead of inventing new ones.

