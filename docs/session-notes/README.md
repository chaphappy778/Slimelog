# Session Notes

One file per working session, dated `YYYY-MM-DD.md`. Captures what happened that day so if the project sits idle, the next session can pick up cleanly.

## Convention

- **Filename:** `YYYY-MM-DD.md` (e.g. `2026-07-23.md`). One file per date. If a session spans midnight, use the date it started.
- **Status header:** `IN PROGRESS` while the day is active, `CLOSED` when we wrap. Update at close.
- **Sections:**
  - **Shipped** — commits that landed with SHAs and one-line summaries
  - **Opened** — tracker tickets created that day (T-numbers only, details live in the tracker)
  - **In flight / carried over** — work not yet complete, with pickup notes
  - **Next session pickup** — the intended first move for the next working day
  - **Process notes** — anything worth remembering about how the work went (false alarms, close calls, patterns learned)

## Why this exists

The tracker holds forward-looking work. This directory holds the running log. Both append-only. If we ever put SlimeLog down for a stretch after launch and come back to it, the most recent session note is where to start reading.

## Not a substitute for

- **The tracker** (`docs/SlimeLog_Tracker.md`) — ticket queue and status
- **The error-tracker** (`docs/error-tracker.md`) — bug patterns + prevention rules
- **The cost-tracker** (`docs/cost-tracker.md`) — query cost + scaling watch
- **Handoffs** (`docs/handoffs/`) — design briefs and multi-session handoff docs

Session notes are the "what happened" log, not the "what to do" plan.
