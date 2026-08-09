# NjangiBook — Navigation Routes & UX Standards

Reference for building screens. Follow the route structure and apply the UX practices to every screen that loads or submits data.

## Navigation structure

Two layers: a top level shown when no group is open (no bottom tab bar), and a nested in-group stack (five-tab bar) that opens when a group is entered, scoped by group id.

### Auth stack (logged out)
- `/splash`
- `/onboarding`
- `/signup`
- `/login`
- `/forgot-password`

### Top level (logged in, no group open) — no bottom bar
- `/dashboard` — list of the user's groups (home base)
- `/create-group`
- `/join-group`
- `/notifications`
- `/profile`

### In-group stack (five-tab bar: Home, Contributions, Funds, Members, More)

Home tab:
- `/group/:id/home` — group dashboard (whose turn, pot, standing)

Contributions tab:
- `/group/:id/contributions` — the ledger
- `/group/:id/contributions/record` — treasurer only
- `/group/:id/contributions/mine` — my contributions
- `/group/:id/rotation` — rotation schedule

Funds tab:
- `/group/:id/welfare`
- `/group/:id/welfare/record` — treasurer only
- `/group/:id/loans`
- `/group/:id/loans/:loanId` — loan detail
- `/group/:id/fines`
- `/group/:id/fines/add` — treasurer only

Members tab:
- `/group/:id/members`
- `/group/:id/members/:memberId` — member detail

More tab:
- `/group/:id/more` — overflow menu
- `/group/:id/reports`
- `/group/:id/settings` — treasurer only

Back arrow on group home pops back to `/dashboard`. MVP builds only the auth stack, the top level, and the Home + Contributions tabs. Funds, member detail, and More come in phase two.

## UX standards — apply to every screen

### The four states (mandatory on every screen that loads or submits data)

1. **Loading state.** While fetching, show a skeleton layout matching the shape of the incoming content, not a blank screen or a lone spinner. Connections are often slow; a frozen-looking screen reads as broken.

2. **Empty state.** When there is genuinely no data, show a friendly message explaining what the screen is for and what happens next (e.g. "No contributions recorded yet. The treasurer will add payments after each meeting."). Never a blank void.

3. **Error state.** When a request fails, show a calm message with a retry action. Never show a raw technical error or nothing. Treat network failure as a normal path, not an edge case.

4. **Success/feedback state.** Confirm every successful action visibly (toast, checkmark, brief message). Silent success feels like failure and causes double-taps, which risks duplicate ledger records.

### Six more practices

5. **Consistent, predictable navigation.** Every drilled-into screen has an obvious way back, and back goes where the user expects. Never strand a user without an exit.

6. **Inline input validation.** Validate as the user types or on blur, not only on submit. Give specific messages ("Phone number must be 9 digits"), never a generic "invalid input." Name exactly what is wrong. password must be at least 8 characters

7. **Prevent double actions.** When a button triggers a request, disable it and show progress until the request completes. Critical for "record payment" — a double tap must never create two entries.

8. **Clear visual hierarchy.** The most important element (amount, whose turn, primary action) is the loudest via size, weight, and navy color. Money values and status are always the most prominent things on screen.

9. **Accessible touch targets and readable text.** Comfortable tap sizes and legible text, since users span a wide age range including older members. Generous spacing; no cramped tiny controls.

10. **Confirm destructive actions.** Ask before anything hard to undo (remove member, delete record, leave group). Use sparingly — only for real consequences — so confirmations keep their meaning.

## Priority note

States 1–4 matter most. A mockup only shows the full, happy, populated screen. A shipped app must handle waiting, empty, broken, and just-succeeded. Build all four states for every data screen from the start.
