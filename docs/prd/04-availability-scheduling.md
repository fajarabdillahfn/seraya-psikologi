# PRD 04 — Availability & Scheduling

## Goal

Expose only slots that are genuinely bookable for the selected offering and protect psychologist capacity.

## Locked rules

- Canonical timezone: `Asia/Jakarta`.
- Session duration: 60 minutes.
- Transition buffer: 15 minutes before and after a reservation.
- Slot grid: 30-minute granularity in the domain model; current demo fixtures use 60-minute starts.
- Booking horizon: 90 days.
- Booking cutoff: 2 hours before start.
- Overlapping active holds/reservations for the same psychologist are rejected.

## Current demo fixture

The live D1 currently contains demo weekday slots for testing. These are not Fuja's production schedule and must not be treated as launch evidence.

## Next work

- Confirm recurring schedule and exceptions.
- Confirm offline venue and online-meeting mechanism.
- Add operational procedure for withdrawal, reschedule, and capacity release.

## Acceptance checks

- Slot list respects offering, horizon, cutoff, withdrawal, and active reservations.
- Two overlapping booking attempts cannot both win.
- Expired holds release capacity.
- Displayed time is clearly Asia/Jakarta/WIB.
