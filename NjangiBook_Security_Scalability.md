# NjangiBook — Security, Scalability & Integrity

Reference for building the backend and data layer. Read alongside CLAUDE.md. The rules here are enforced server-side and shape the data model, so apply them before building the features they touch — several are far cheaper to bake in now than to retrofit.

## Security

### Authentication and passwords
- Hash passwords with a strong, slow algorithm (bcrypt or argon2). Never store plain passwords. Never use fast hashes (MD5, plain SHA).
- Sign JWTs with a strong secret kept in an environment variable, never in code or the repo.
- Set a sensible token expiry. Consider refresh tokens so a stolen token does not work indefinitely.

### Authorization (the most important rule)
- Every treasurer-only action MUST be verified on the backend, for every request, independently of the UI. Hiding a button is presentation, not security.
- The server must confirm, per request, that the caller has the required role in that specific group. A member who calls a treasurer endpoint directly must be rejected.

### Input validation
- Validate everything server-side, even when the app already validates. The app can be bypassed by calling the API directly, so the backend never trusts client input.
- Check types and ranges: amounts positive, dates sane, references valid. Reject a contribution for a group the caller does not belong to.

### Data scoping
- A user may only ever access data for groups they belong to. Scope every query to the caller's memberships.
- Never expose an endpoint that returns group data purely because the caller is logged in. Every group-scoped request confirms membership first, so IDs cannot be walked to read other groups' records.

### Audit trail integrity
- `recorded_by` and timestamps are set by the backend from the authenticated user, never accepted from the client. A client-supplied "recorded_by" makes the audit trail worthless.

### Transport and secrets
- All traffic over HTTPS, always. Never talk to the backend over plain HTTP.
- Database URL, JWT secret, and any API keys live in environment variables. Add `.gitignore` for `.env` from day one. Never commit secrets.

### Rate limiting
- Limit login attempts and request rates per user/IP to blunt brute-force and abuse. Not required for MVP, but easy and worth adding.

## Scalability

Scalability is not the near-term problem — the app will have few groups and users for a long time. Do NOT over-engineer for scale. Build so scaling later is not blocked, rather than scaling now. Only the first two items below are worth attention early.

- **Indexing (do early).** Index columns queried and filtered often: phone number, memberships, and foreign keys on ledger tables. Cheap, big payoff as data grows.
- **Avoid N+1 queries (watch while building).** When loading a list with related data (e.g. contributions with member names), load them together, not one query per row in a loop. The most common performance killer in apps like this.
- **Pagination.** Page long lists (ledgers, histories) and load in chunks as the user scrolls, rather than returning hundreds of rows at once.
- **Stateless backend.** Keep all state in the database, nothing in server memory between requests. Preserves the option to run multiple instances later. FastAPI + JWT is stateless by default; do not start caching user state in memory.
- **Connection pooling.** On Postgres, reuse connections via pooling (SQLAlchemy handles this). Matters once there are real concurrent users.

Not needed now and not to be built yet: caching layers, microservices, load balancing.

## Data integrity and trust (design decisions to settle before building the features they touch)

These come from a flaw review. The real risks in this app are not hacker attacks — they are trust and integrity within the group and the operational failure modes of one person (the treasurer) holding all control.

### Full-ledger transparency
- Make the full group ledger visible to all members, not just each member's own row. The group collectively auditing the treasurer is the strongest check on the one person with edit rights. This is the main defense against a treasurer under-recording or favouring themselves.

### Soft deletion, not hard deletion
- Do NOT hard-delete members, contributions, or groups. Deleting a member must not erase their history — mark them inactive and keep their records. A financial ledger is append-mostly; true deletion breaks integrity and destroys the record needed to settle past disputes. Decide this before building any delete feature.

### Additive corrections
- Corrections are additive, not destructive. To fix a wrong entry, add a correcting entry so both the original and the fix remain visible, rather than editing history in place. If any edit is allowed at all, log every edit with who and when. This keeps the audit trail meaningful.

### Treasurer handover and recovery
- The treasurer is a single point of control and failure. Build a way to transfer the treasurer role to another member, and a password/account recovery path. Without handover, a group is stuck if the treasurer loses their phone, forgets their password, or leaves. This is a real operational failure mode — design it in.

### Disputes surface, humans resolve
- The dispute feature surfaces a disagreement (member says paid, treasurer says not) clearly. It does not and should not pretend to resolve it — resolution happens between people in the group. Do not over-promise automated settlement.

### Phone-number identity edge cases
- Phone-number-as-identity has known wrinkles: people change numbers, share them, or reuse a number that belonged to someone else. Consider what happens when a number changes hands. Not urgent, but a known limitation to keep in mind.

## The through-line

Backend-enforced authorization and data scoping are the security must-haves. Full-ledger transparency, soft deletion, additive corrections, and treasurer handover are the integrity decisions that make the app trustworthy in the messy real world. Settle those before building the features they touch.
