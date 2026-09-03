# PRD 04 — Availability & Scheduling

Status: **Business review closed** on 2026-09-02. Implementation intentionally deferred.

## Goal

Expose only slots that are genuinely bookable for the selected offering and protect psychologist capacity. Make the schedule readable and the rules predictable for the client and for the Admin.

## Locked rules

- Canonical timezone: `Asia/Jakarta` (WIB).
- Session duration: **60 minutes**.
- Transition buffer: 15 minutes before and after a reservation.
- **Slot grid: 60-minute session blocks with fixed buffer-aware starts.** Sessions remain 60 minutes, but starts are generated from the operating windows with the 15-minute transition buffer included. Morning examples: 09.00–10.00 and 10.30–11.30. Evening examples: 16.00–17.00, 17.30–18.30, and 18.45–19.45. The exact generated starts are the source of truth; the system must not offer a slot whose session plus buffer exceeds the operating window.
- Booking horizon: 90 days.
- Booking cutoff: 2 hours before start.
- Booking days: **Senin sampai Minggu** (Monday through Sunday).
- **Closed on national holidays** (hari libur tutup). The closed-day list is operational and managed by the Admin; the public site must reflect the same closed days in the slot list.
- Online launch services: **Chat** and **Call**.
- Individual offline counseling launch schedule: **09.00–12.00 and 16.00–20.00 WIB**.
- Offline venue: **Havana Park Blok H-3, Kepuharjo, Karangploso, Kab. Malang, 65152**.
- Online and offline offerings use the same **60-minute slot grid**.
- Overlapping active holds/reservations for the same psychologist are rejected.
- Booking changes between online and offline are not self-service. The client may ask Admin via WhatsApp; Admin confirms whether the change is allowed.

## Public slot list

- The site shows the next 90 days of slots, scoped to the selected offering and the day’s open window.
- For online offerings, the day’s open windows are 09.00–12.00 and 16.00–20.00 WIB, with fixed buffer-aware session starts defined above.
- For offline individual counseling, the day’s open windows are the same hours at Havana Park, with fixed buffer-aware session starts defined above.
- Slots that are at or within 2 hours of session start are not selectable. The client sees them only as informational or hidden, depending on design.
- A slot that is already held or booked is not selectable.
- A day that is on the closed-day list shows no bookable slot.
- All times in the public UI are explicitly labelled `WIB` (Asia/Jakarta).

## Schedule exceptions

- Public holidays: the site shows them as closed. The list of public holidays is a calendar the Admin maintains, matching the Indonesian national-holiday calendar. Operational ownership of the list is in PRD 07.
- Recurring exceptions: the Admin can mark a specific weekday as a regular closed day, for example a recurring training day.
- One-off exceptions: the Admin can mark a specific date or a specific slot as withdrawn, with a short public reason such as “Cuti”, “Pelatihan”, or “Tidak tersedia”. The reason is internal and is not shown to the client.
- A withdrawn slot becomes unavailable immediately. A paid booking affected by a withdrawal is handled by the Admin and is recorded in the Admin’s notes for the booking.

## Capacity and overlap

- The capacity is one slot per psychologist per start time. Two clients cannot book the same psychologist at the same hour.
- The 15-minute transition buffer is added around each reservation. The next client-visible slot starts after that buffer.
- A pending `SlotHold` (10 minutes by default) holds the slot while the client completes intake. The hold expires automatically.

## Booking changes (online ↔ offline)

- The client may ask to move from online to offline or from offline to online, with these rules:
  - The request goes through **Admin WhatsApp**; there is no public self-service change button.
  - Admin may approve the change only when the psychologist’s schedule can still accommodate the new mode, the new time window, and the venue.
  - The price difference is recorded as a manual adjustment. If the new mode is more expensive, the client tops up before the change is confirmed; if the new mode is cheaper, the difference is recorded as a manual refund via the manual payment/refund flow.
  - The change is recorded as a separate `RescheduleAction` in the audit trail. The original booking is not silently overwritten; the new mode becomes a new offer with a snapshot of its own.

## Operational procedure: cancellation because the psychologist is unavailable

- If the psychologist is unable to attend a confirmed booking (for example, sickness, family emergency, or administrative error), Admin contacts the client via WhatsApp as the first channel, and follows up with email if the contact is unsuccessful.
- Admin offers a free reschedule or a full refund, per the cancellation and refund PRD (PRD 05).
- A booking that is not rescheduled by mutual agreement is refunded, and the slot is released for other clients.

## Acceptance checks

- Slot list respects offering, schedule windows, holiday list, withdrawal, and active reservations.
- A slot at or within 2 hours of session start is not selectable.
- A day on the closed-day list shows no bookable slot.
- The 15-minute transition buffer is enforced between adjacent slots.
- Two overlapping booking attempts cannot both win.
- Expired holds release capacity.
- Displayed time is explicitly `WIB` (Asia/Jakarta) on every visible time.
- Booking changes between online and offline are only done by Admin and are recorded as a `RescheduleAction`.
- Cancellation because the psychologist is unavailable starts with an Admin WhatsApp contact and is recorded with the action taken (reschedule or refund).

## Still open for this PRD

- The Admin’s process for maintaining the public-holiday and recurring-exception calendar. The PRD records the outcome (the slot list must respect those dates); the operational procedure belongs to PRD 07.
- Operational SLA for reaching the client when a psychologist is unavailable, for example, “Admin contacts the client via WhatsApp within X hours.” The decision is operational and is not a launch blocker.
- The Admin workspace UI for marking days or slots as withdrawn and the audit trail for those changes. The PRD records the user-visible behavior; the implementation detail is in PRD 07.
- Final wording for the closed-day list on the public site. Placeholder text is acceptable during development; final copy is owned by PRD 03 and PRD 06.
- The minimum time between a confirmed booking and a change-of-mode request, if any. The default is to allow Admin to review on a case-by-case basis, and this is acceptable for the launch.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/adr/0091-capacity-overlap-buffer.md`

## Status

**Business review closed. Implementation intentionally deferred.**

The remaining operational and Admin UI details are implementation/planning follow-ups, not unresolved business rules.
## Change log

- 2026-09-02: Initial locked rules based on the PRD 01 review (timezone, duration, transition buffer, horizon, cutoff, offline schedule, venue, online services).
- 2026-09-02: Locked booking days to Senin–Minggu, closed on public holidays, 60-minute slot grid shared by online and offline, contact by Admin WhatsApp for psychologist unavailability, and online↔offline change by Admin request.
