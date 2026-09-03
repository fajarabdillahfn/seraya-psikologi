# PRD 07 — Staff & Admin Operations

Status: **Business review closed** on 2026-09-02. Implementation intentionally deferred.

## Goal

Give authorized staff the minimum workspace needed to verify payment, operate bookings, and maintain the schedule and holidays. The launch is single-tenant with a small staff: one Superadmin, at least one Admin, and one psychologist (Fuja Rahayu Kinanti). All operational work happens on the Admin dashboard, and staff identity is verified through Google SSO.

## Roles

- **Superadmin**: single bootstrap account. Owns platform configuration, staff membership, role assignment, and the holiday/schedule exception calendar. The Superadmin is also able to perform any Admin action when needed.
- **Admin**: verifies payments, records and verifies payment evidence, decides cancellation and refund, runs the cancellation/refund workflow, maintains the holiday calendar, and updates withdrawal notes. Admins are operational. The launch requires at least one Admin in addition to the Superadmin.
- **Psychologist**: Fuja Rahayu Kinanti for launch. Has scoped access to confirmed appointments where the psychologist is the assigned provider. May not view other clients, other bookings, payment evidence, or full profile data outside the booking’s operational fields.

The Client role is covered in PRD 01 and PRD 06.

## Bootstrap

- **Superadmin**: one. The Superadmin is created out-of-band by the operator who runs the platform, then logs in with Google SSO and is bound to a `StaffMembership` row. The Superadmin cannot be removed or demoted by any other role.
- **Admin**: any number, with the launch requirement of at least one Admin besides the Superadmin. The two-Admin bootstrap is preserved: there is always at least one Admin besides the Superadmin, and the bootstrap procedure is owned by PRD 07.
- **Psychologist**: one for launch. A new psychologist can be invited only by the Superadmin.
- No self-signup. All staff are invited; the invite flow uses a signed token sent to a verified Google account.

## Session and access

- All staff sign in with **Google SSO**. The Google account email is the staff identity.
- The staff session is bound to a `StaffMembership` row. The role (`superadmin`, `admin`, `psychologist`) is read from the membership, not from the SSO claim.
- Session is HTTP-only, secure, and short-lived, with refresh tokens handled by the platform session manager. The exact session lifetime is operational and is owned by PRD 07.
- Sessions, role checks, and audit events are recorded for every privileged action.
- Role changes and staff removals are recorded in the audit trail. Removing the last Admin (other than the Superadmin) is protected: the system refuses the action and prompts the operator to appoint a replacement first.
- Recovery: a lost Superadmin account is recovered through a documented out-of-band process, not a self-service reset. The process is owned by PRD 07.

## Access matrix

| Capability | Superadmin | Admin | Psychologist |
|---|---|---|---|
| Verify or reject payment | Yes | Yes | No |
| Record or upload payment evidence | Yes | Yes | No |
| Approve or reject cancellation/refund | Yes | Yes | No |
| Refund execution and refund evidence | Yes | Yes | No |
| Mark a date or slot as withdrawn, with public reason | Yes | Yes | No |
| Maintain holiday and recurring-exception calendar | Yes | Yes | No |
| Manage staff membership and roles | Yes | No | No |
| Read full client profile | Yes | Yes | No (scoped to operational fields) |
| Read psychologist-shared fields for a confirmed booking | Yes | Yes | Yes (own bookings only) |
| Read full payment evidence detail for any booking | Yes | Yes | No |
| Read audit log | Yes | Yes | No (own action audit only) |

## Admin dashboard

All operational work happens on the Admin dashboard, surfaced as separate queues. Each queue shows the data Admin needs and a clear primary action.

### Payment verification queue

- Lists bookings in `pending_manual_payment` with payment proof pending or submitted.
- For each booking, Admin can:
  - Open the booking detail and the immutable OfferSnapshot.
  - Open the payment evidence (file/URL) recorded by Admin from WhatsApp.
  - Mark the booking as **Verified** or **Rejected**, with a short reason.
  - Add a manual note (for example, the top-up conversation or the overpayment return).

### Cancellation/refund queue

- Lists bookings by `cancellation_status`: `requested`, `approved`, `rejected`, `refund_pending`, `refund_completed`, `refund_failed`.
- For each booking, Admin can:
  - Open the WhatsApp screenshot evidence and any previous notes.
  - Move the booking from `requested` to `approved` or `rejected`.
  - When approving, decide `full_refund` or `no_refund`.
  - When `full_refund` is chosen, the queue shows the refund as `refund_pending` until Admin uploads the transfer proof, then moves to `refund_completed`.
  - If the refund transfer fails, Admin can move the booking to `refund_failed` and retry.

### Schedule and holiday calendar

- Lists days for the next 90 days.
- For each day, Admin can:
  - Mark it as a one-off closed day (with a short internal reason).
  - Remove a one-off closed day.
  - The recurring weekly closed-day pattern is configured in a separate **Recurring Exception** panel.
  - Mark a specific slot as withdrawn, with a short internal reason that is not shown to the client.

### Booking and client queue

- Lists recent bookings with state, `cancellation_status`, and any open issues.
- Filter by state, by service, by psychologist, and by date.
- Open a booking to see the profile (full for Admin and Superadmin, scoped for Psychologist), the slot history, the payment evidence, and the cancellation/refund history.

### Staff and role management

- Available to the Superadmin only.
- Lists the current staff, with role, status (active/disabled), and last-seen time.
- The Superadmin can invite, change role, or disable staff.
- The Superadmin cannot disable itself, and cannot remove the last active Admin.

## Operational procedures

### Verify or reject a payment

1. Admin receives the proof through Admin WhatsApp from the client.
2. Admin opens the payment verification queue and selects the booking.
3. Admin records the proof metadata and uploads the screenshot or text reference.
4. Admin checks the bank account or QRIS history for the matching transfer.
5. Admin clicks **Verify** or **Reject**, with a short reason.
6. The system updates the booking and the payment proof atomically. The verified invoice is generated by PRD 02 at this point.
7. Admin contacts the client through Admin WhatsApp to confirm the outcome.

### Underpayment

1. Admin sees the difference between the booking amount and the transfer amount.
2. Admin contacts the client through Admin WhatsApp and records the top-up request.
3. The booking remains in `pending_manual_payment` (or a parallel admin state if added later). The slot hold may be extended at Admin’s discretion.
4. When the top-up is received, Admin re-runs the verification step.

### Overpayment

1. Admin contacts the client through Admin WhatsApp to inform them of the overpayment and the returned amount.
2. Admin returns the difference to the client through the agreed manual channel.
3. Admin records the return in the payment proof notes and uploads the transfer proof.
4. The booking can be `confirmed` for the full service price; the refund is logged as a separate `RefundAction` later.

### Cancellation

1. Admin receives the cancellation request through Admin WhatsApp.
2. Admin uploads the WhatsApp screenshot evidence and records the request in the queue.
3. Admin decides `approved` or `rejected`, with a short reason.
4. On `approved`, the booking is closed and the slot/capacity is released or rolled back per the cancellation matrix. On `rejected`, the booking remains `confirmed` with a reason recorded.

### Refund execution

1. Admin records the chosen refund outcome (`full_refund` or `no_refund`) in the queue.
2. For `full_refund`, Admin returns the money through the agreed manual channel.
3. Admin uploads the transfer proof and the booking moves to `refund_completed`. If the transfer fails, Admin moves the booking to `refund_failed` and retries.

### Holiday and exception management

1. Admin opens the schedule and holiday calendar.
2. Admin marks closed days (one-off or recurring) and adds a short internal reason.
3. Admin can mark individual slots as withdrawn.
4. The same calendar view is exposed to the Superadmin, and the Superadmin can override.

### Staff onboarding and offboarding

1. Superadmin invites a new staff member by their verified Google account email.
2. The new staff member signs in with Google SSO and is bound to a `StaffMembership` row.
3. Offboarding is initiated by the Superadmin by disabling the staff membership. The disabled staff loses access immediately; their audit history is retained.
4. The Superadmin cannot disable itself. The system refuses the last-Admin removal and prompts for a replacement.

## Service-level targets

The launch SLA for staff responses is:

- **Admin responds to client requests within 1 hour, between 08.00 and 20.00 WIB.** Outside that window, the response is delayed to the next window. The Admin WhatsApp number is configured with an out-of-hours message that says the response is in the next window.
- The Superadmin responds within the same window for staff or platform-level issues.
- The psychologist responds to booking conversations through Admin WhatsApp, with the same window for the first response.

The SLA is a target, not a hard contract. The system records the response timestamp in the audit trail; the operator uses the trail to review whether the SLA is being met.

## Audit trail

Every privileged action records:

- `actor_membership_id`
- `actor_role` at the time of action
- `actor_at` (ISO 8601 timestamp)
- `action` (for example, `payment.verify`, `payment.reject`, `cancellation.approve`, `refund.complete`, `schedule.withdraw_slot`, `holiday.set`, `staff.invite`, `staff.disable`, `staff.change_role`)
- `subject_type` and `subject_id` (for example, the booking, the slot, the staff membership)
- `decision_reason` (short free text)
- `evidence_file_url` (when applicable)
- `request_id` (a per-request id used to correlate with logs)

The audit trail is append-only. It is the source of truth for the SLA, for the cancellation/refund history, and for any internal review.

## Acceptance checks

- All staff sign in with Google SSO. There is no email/password fallback.
- Roles are read from the `StaffMembership` row, not from the SSO claim.
- Removing the last Admin (other than the Superadmin) is rejected.
- Removing or demoting the Superadmin is impossible through the dashboard.
- The psychologist cannot read other clients, other bookings, payment evidence, or full profile fields outside the scoped view.
- The payment queue shows the difference between the booking amount and the transfer amount.
- The cancellation/refund queue allows the status transitions defined in PRD 05 and writes the evidence required.
- The holiday and exception calendar is a single source of truth shared with the public slot list.
- Every privileged action is recorded in the audit trail with actor, role, timestamp, action, subject, reason, and evidence.
- Out-of-hours response SLA is configured as the default behavior, with the wording set in the Admin WhatsApp out-of-hours message.
- Operational procedures are documented and reachable from the Admin dashboard (for example, as a help link), not only from this PRD.

## Still open for this PRD

- Exact session lifetime, refresh policy, and CSRF defenses. Operational defaults are recorded; the final values are owned by PRD 07.
- Out-of-hours Admin WhatsApp message wording. Placeholder is acceptable during development; the final wording is owned by PRD 03 and the launch review.
- Holiday calendar source. The Admin maintains the list in the dashboard. A future integration with a national-holiday API is out of scope for the launch.
- The exact list of withdrawal reasons and the wording shown to the client. The PRD records the requirement; the catalog is operational.
- The on-call rotation or the escalation path when the primary Admin is unavailable. The launch does not require a formal on-call; the Superadmin can perform Admin actions in the launch.
- The minimum evidence retention window for staff actions, aligned with PRD 06.
- The two-Admin bootstrap procedure when the platform goes live for the first time, including how the second Admin is invited and verified.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/04-availability-scheduling.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/06-privacy-consent.md`
- `docs/adr/0079-launch-staff-roles.md`
- `docs/adr/0080-google-sso-staff-access.md`
- `docs/adr/0081-two-admin-bootstrap.md`

## Status

**Business review closed. Implementation intentionally deferred.**

The remaining items are technical security settings, operational templates, and implementation follow-ups; they do not reopen the role or workflow decisions.

## Change log

- 2026-09-02: Initial role and bootstrap rules from the Round 2 review.
- 2026-09-02: Recorded product-owner decisions: Superadmin/Admin/Psychologist roles; one Superadmin; dashboard-based operations; Admin response SLA 1 hour during 08.00–20.00 WIB.
