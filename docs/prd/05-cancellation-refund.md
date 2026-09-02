# PRD 05 — Cancellation & Refund

Status: **Business review in progress** (2026-09-02). Client-side handling and the Admin-side evidence model are now defined.

## Goal

Make cancellation and refund straightforward for the client (one channel, manual handling) and auditable for the Admin (clear status, evidence, and decision history). No public cancellation/refund form is added; the website only displays the policy in Terms and Conditions.

## Client side

- All cancellation and refund requests from the client are handled manually through Admin WhatsApp.
- The website does not host a self-service cancel or refund button, and the booking confirmation page does not include public cancel/refund links.
- The public statement in Terms and Conditions captures the policy summary:
  - Cancellation and refund are handled manually by Admin via WhatsApp.
  - The client can ask for a full refund (`full_refund`) or no refund (`no_refund`); partial refund is not offered in launch.
  - Admin reviews each case and the final decision is recorded in the booking.
  - Admin may also ask the client to top up an underpayment or return an overpayment, in line with PRD 02.
- The Terms and Conditions page is the single public source for the cancellation and refund wording; the FAQ page links to it.

## Admin side: status

A booking has a `cancellation_status` field that is independent of `booking.state`. The status represents where the booking sits in the cancellation/refund workflow, not the operational state of the session.

| Status | Meaning |
|---|---|
| `none` | The booking has not been discussed for cancellation/refund. This is the default for any confirmed booking. |
| `requested` | A cancellation or refund request has been received from the client (for example via WhatsApp), but Admin has not yet decided. |
| `approved` | Admin has approved the cancellation; the booking is closed and the slot/capacity is released or rolled back per the cancellation matrix. |
| `rejected` | Admin has rejected the cancellation/refund request; the booking continues as confirmed. |
| `refund_pending` | A refund has been approved and the client has been notified; the refund itself has not yet been transferred. |
| `refund_completed` | The refund transfer is complete and the evidence is attached. |
| `refund_failed` | The refund transfer was attempted but did not succeed; the booking remains `approved` and the slot/capacity is closed until the refund is retried successfully. |

The status is `none` by default and only changes when an Admin takes an action or records a client request. Status changes are append-only at the audit level; the current status is the latest in the audit chain.

## Admin evidence

Two evidence types are required for the Admin-side procedure:

1. **Cancellation evidence**
   - Required: a screenshot of the WhatsApp conversation that contains the client’s request.
   - Stored as `cancellation_evidence` on the booking or its cancellation record, with file URL or attachment reference, the Admin actor, and the timestamp.
   - Captures the channel (Admin WhatsApp), the date, the request, and any reply sent by the Admin.
   - Acceptable file types: PNG, JPG, or PDF. The Admin workspace validates that at least one file is uploaded before the request can move to `approved` or `rejected`.

2. **Refund evidence**
   - Required: proof of the refund transfer (bank/QRIS confirmation screenshot, transaction reference, or e-wallet receipt).
   - Stored as `refund_evidence` on the `RefundAction` record, with file URL, the Admin actor, the timestamp of the transfer, and the external transfer reference.
   - Captures the manual channel used (bank, e-wallet, or QRIS refund), the transfer amount, the recipient, and the confirmation.
   - Acceptable file types: PNG, JPG, or PDF. The Admin workspace validates that at least one file is uploaded before the refund can be marked `refund_completed`.

Evidence files are stored with the rest of the operational records; the specific storage backend is part of PRD 07 and is not defined here. A placeholder storage URL is acceptable during development, as long as the URL points to a real, accessible file when the audit requires it.

## Admin workflow

1. **Capture the request** (required to leave `none`)
   - Admin receives the cancellation/refund request on WhatsApp.
   - Admin records the request in the workspace: client booking reference, request summary, and the date of the request.
   - Admin uploads the WhatsApp screenshot.
   - The `cancellation_status` becomes `requested`.

2. **Decide** (required to leave `requested`)
   - Admin reviews the case against the public policy in Terms and Conditions.
   - Admin selects `approve` or `reject`, with a short reason in free text.
   - On `approve`:
     - The booking state transitions per the cancellation matrix (booking, appointment, or package). The slot and capacity are released.
     - The status becomes `approved` immediately.
   - On `reject`:
     - The booking state remains `confirmed`. No slot or capacity is released.
     - The status becomes `rejected` and a reason is recorded.

3. **Refund** (separate from approve, when applicable)
   - After `approved`, Admin decides whether the refund amount is `full_refund` or `no_refund`. The default for a cancellation by the client with no fault is `full_refund`, but the Admin can choose `no_refund` if the policy or the case supports it.
   - On `full_refund` decision, the status becomes `refund_pending` and the `RefundAction` is recorded.
   - When the manual refund transfer is done, Admin uploads the refund evidence and the status becomes `refund_completed`.
   - If the transfer fails, the status becomes `refund_failed` and Admin retries. The booking state is not re-opened during retry; only the `RefundAction` is updated.

## Required Admin fields

For each cancellation/refund action, the workspace records:

- `actor_membership_id` — which Admin took the action.
- `actor_at` — the timestamp.
- `decision_reason` — short free text.
- `evidence_file_url` — at least one evidence file URL (WhatsApp screenshot for cancellation, transfer proof for refund).
- `external_reference` — for refund, the external transfer reference.
- `status_before` and `status_after` — for audit clarity.

## Acceptance checks

- The website does not expose a public cancel or refund endpoint.
- A cancellation/refund request cannot move beyond `none` without WhatsApp evidence uploaded by Admin.
- A refund cannot be marked `refund_completed` without refund evidence uploaded by Admin.
- Every status change writes a new audit record with actor, timestamp, decision reason, and evidence reference.
- A status change is idempotent: repeating the same action with the same inputs does not create duplicate state changes.
- The current status is the latest in the audit chain and can be reconstructed from the audit history.
- The accepted public policy in Terms and Conditions is reachable from the booking confirmation page, from the FAQ, and from the footer.

## Still open for this PRD

- The exact free-text reasons and their default values per case type. The PRD records the requirement; the operational templates are owned by PRD 07.
- The storage backend for the evidence files. The PRD requires a real, accessible URL when the audit requires it; the implementation detail is in PRD 07.
- The acceptance threshold for refund evidence: any signed screenshot of a transfer confirmation, a real bank mutation row, or a real e-wallet receipt. The PRD allows any of these; a stricter rule can be added later.
- The retention duration of the cancellation/refund records and the evidence files, and whether the public-facing version of these records exists. Retention is owned by PRD 06.
- The Admin-side SLA for responding to a cancellation or refund request. The default is “during business hours, as soon as practical,” and the PRD records this; tightening to a fixed SLA is a separate operational decision.
- The UX of the Admin workspace for status transitions, evidence upload, and reason input. The PRD records the required fields; the UI is owned by PRD 07.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/03-website-content.md`
- `docs/prd/04-availability-scheduling.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/adr/0076-case-by-case-cancellation.md`
- `docs/adr/0077-launch-full-or-no-refund.md`
- `docs/adr/0095-package-cancellation-matrix.md`

## Change log

- 2026-09-02: Initial rule from PRD 04: cancellation/refund handled by Admin via WhatsApp; no public UI; public policy in Terms and Conditions.
- 2026-09-02: Expanded with Admin status model (`none`, `requested`, `approved`, `rejected`, `refund_pending`, `refund_completed`, `refund_failed`) and evidence requirements (WhatsApp screenshot for cancellation, transfer proof for refund), and the required fields per Admin action.
