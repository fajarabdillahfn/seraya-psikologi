# 95. Package Cancellation Matrix and Outcome Race Resolution

## Status

Accepted for the MVP working model. Closes `TBC-PACKAGE-CANCEL-01` from `PRD-GUIDELINE-REVIEW.md` Round 1 P1-13, and resolves the `ADR 0024` and `ADR 0051` open follow-ups on "package cancellation/entitlement accounting" and "repeat-request rules". Implements the complete transition matrix for `Booking`, `Appointment`, `PackagePurchase`, and `SessionEntitlement` under cancellation, including the pending-versus-outcome race, repeat/correction rules, atomic package-wide effects, partial-package (1-of-N) semantics, the missing `RescheduleAction` transition table, and couple-package cancellation tied to `BookingParticipant` (`ADR 0090`). Refund vocabulary is left untouched at `full_refund`/`no_refund` only per `ADR 0063`/`0077`; this ADR does not authorize any partial-monetary or per-entitlement refund. No-show terminal semantics (`completed`/`no_show` after 15-minute grace) are governed by `ADR 0027`/`0028`; this ADR adds the explicit race-resolution behavior that runs when an outcome lands before Admin decides.

## Context

`ADR 0024-admin-cancellation-review.md:33–35` and `ADR 0051-cancellation-decision-record.md:33–35` leave four open questions that the implementation cannot answer:

1. **One open CancellationRequest per target.** `ADR 0051` says "repeat requests need a defined rule". `ADR 0025` says pending preserves reservation. The current text does not say whether a second request against the same target is allowed while the first is pending, what to do when two requests race, or how a new request behaves after a terminal `CancellationDecision`.
2. **Pending-versus-outcome race.** A `CancellationRequest` is pending while the `Appointment` is still `confirmed` (`ADR 0025`). The psychologist can still mark the appointment `completed` or `no_show` (per `ADR 0027`, `ADR 0028`) before Admin decides. No rule currently says what happens to the open request — does it auto-resolve, stay open forever, or block outcome marking?
3. **Atomic effects of a package-wide cancellation.** `ADR 0063` says refund is purchase-level `full_refund`/`no_refund`. `ADR 0076` says Admin is case-by-case. The implementation guide says "approval atomically cancels/releases/restores" (`IMPLEMENTATION-GUIDE.md:300–304`). The matrix is not enumerated: which Appointments are closed, which `SessionEntitlement` rows are restored vs closed, whether `PackagePurchase` is closed, and what happens to `PackageValidity` (reset? extended? frozen at last value?).
4. **Partial-package (1-of-N) cancellation.** If a client cancels session 2 of a 3-session package, does this trigger the package-wide path (close everything, restore all unused) or only the per-Appointment path (cancel one, restore one)? The business decision — finalised by Round 3 in `ADR 0077` (`full_refund`/`no_refund` only) — implies that partial-package semantics must be **operational** (per-Appointment state and entitlement) without creating per-entitlement refund allocation. The matrix must reflect this.

Additional open follow-ups inherited from earlier ADRs:

- `RescheduleAction` is referenced from `IMPLEMENTATION-GUIDE.md:159`, `CONTEXT.md:241–243`, and `ADR 0090` but has no transition table of its own. The ticket (`Ticket 10`, line 28–29) explicitly says the reschedule matrix is a Slice 6 deliverable.
- Couple-package cancellation must use `BookingParticipant` and `AppointmentParticipant` (`ADR 0090`). Today, `ADR 0090` defines withdrawal/no-show/reschedule semantics but defers the explicit CancellationDecision transition table to this ADR.

Ticket 04 (`vault/Projects/Seraya Psikologi/Tickets/Ticket 04 — No-show timing & late-arrival correction.md`) is still open; no-show may shift from a 15-minute early-grace checkpoint to a post-session terminal outcome in a future ADR (referenced as `ADR 0092` once accepted; this ADR does not depend on that decision and uses the current `ADR 0027`/`0028` semantics as a stable baseline).

## Decision

The decision is structured as a single canonical transition matrix per target plus race-resolution rules, repeat/correction rules, and couple-package overrides. Every matrix cell is exhaustive — there is no "TBD" cell.

### 1. CancellationRequest — at-most-one-open invariant

#### 1.1 Targets

A `CancellationRequest` may target one of:

| Target type | Meaning | Single-session or package? | Atomic effect scope |
|---|---|---|---|
| `appointment` | One `Appointment.id` | Single-session (one Booking) | That Appointment + linked entitlement (if any) + CapacityReservation |
| `booking` | One `Booking.id` | Single-session with no future linked Appointment (rare; one-appointment single-session Booking) | Same as `appointment` for that Booking's only Appointment |
| `package_purchase` | One `PackagePurchase.id` | Package (n sessions) | All future non-terminal Appointments + all unused SessionEntitlements + PackagePurchase state |

`CancellationRequest` does **not** target `SessionEntitlement` directly. Entitlements are mutated as side effects of decisions on `appointment`/`booking`/`package_purchase` targets. The entitlement has no independent cancellation surface.

#### 1.2 Open-request uniqueness

Invariant: **at most one CancellationRequest with `state = open` per target**. Enforced by unique partial index on `(target_type, target_id)` where `state = 'open'`.

| Incoming event | Existing target state | Behaviour |
|---|---|---|
| `RequestCancellation` | no existing open request | Create `CancellationRequest` with `state = open`, return new record |
| `RequestCancellation` | one open request already | Return the existing open request with `idempotent_replay = true`; do **not** create a second row; the second intake may append a note via `AppendCancellationNote` (audit only, no state mutation) |
| `RequestCancellation` | one `decided` (approved/denied) request already | Allowed: create new `CancellationRequest` with `state = open`, `correction_of = previous_cancellation_request_id`. This is the repeat/correction path (§4). |
| `RequestCancellation` | one `auto_resolved` request already | Allowed: create new `CancellationRequest` with `state = open`, `prior_auto_resolve_reason` snapshotted for Admin context. |

The intake channel is Admin WhatsApp → Admin Cancellation & Refund Workspace (`ADR 0024`/`0067`). Client cannot directly create a `CancellationRequest`.

#### 1.3 CancellationRequest state machine

```
                RequestCancellation (idempotent; see §1.2)
                          │
                          ▼
                       ┌──────┐
                       │ open │ ◀──────────────────────────┐
                       └──┬───┘                            │
                          │                                │
        ┌─────────────────┼──────────────────┐             │
        │                 │                  │             │
        ▼                 ▼                  ▼             │
  ┌──────────┐      ┌──────────┐     ┌──────────────┐     │
  │ approved │      │  denied  │     │ auto_resolved│     │
  └────┬─────┘      └────┬─────┘     └──────┬───────┘     │
       │                 │                  │             │
       │ DecideCancellation │                │             │
       │ (approve/deny)    │                │ outcome race│
       │                   │                │ (§2)        │
       └──────┬────────────┘                │             │
              │                             │             │
              │ superseded_by_correction    │             │
              ▼                             ▼             │
        ┌────────────────┐             (terminal)         │
        │  superseded    │                                │
        └────────────────┘                                │
                                                          │
                       RequestCancellation (correction)──┘
```

| State | Terminal? | Set by | Notes |
|---|---|---|---|
| `open` | no | `RequestCancellation` (first time) or correction intake | visible in Admin workspace; emits no capacity effect |
| `approved` | yes (operational) | `DecideCancellation` approve | atomic effect per target type (§3); triggers optional separate `RefundAction` per `ADR 0063`/`0077` |
| `denied` | yes | `DecideCancellation` deny | no mutation to Booking/Appointment/PackagePurchase/SessionEntitlement/Payment |
| `auto_resolved` | yes | system on outcome race (§2) | no capacity/entitlement effect; reason code recorded |
| `superseded` | yes | system when a new `CancellationRequest` on the same target reaches `approved`/`denied` while this one is in `approved`/`denied` | original record remains immutable history per `ADR 0051`; new decision is the operational truth |

All terminal transitions write an `AuditRecord` with `target_type = cancellation_request`, `actor = admin | system`, `before_state`, `after_state`, `reason_code`, and `correlation_id`.

### 2. Pending-versus-outcome race resolution

Rule: **`Appointment` outcome (`completed`/`no_show`) is terminal and wins.** The open `CancellationRequest` does not block outcome marking, and the outcome does not retroactively cancel an already-approved decision. The four race cells:

#### 2.1 Race matrix

| Order | Event A | Event B | Result for CancellationRequest | Result for Appointment | Result for SessionEntitlement | Reason code |
|---|---|---|---|---|---|---|
| **R1** | Outcome `completed` (psychologist mark) lands | `CancellationRequest` is still `open` | `CancellationRequest` transitions `open → auto_resolved`; review skipped | `completed` (unchanged) | consumed (per `ADR 0027`) | `outcome_already_recorded_completed` |
| **R2** | Outcome `no_show` (after 15-minute grace per `ADR 0028`) lands | `CancellationRequest` is still `open` | `CancellationRequest` transitions `open → auto_resolved` | `no_show` (unchanged) | consumed (per `ADR 0027`) | `outcome_already_recorded_no_show` |
| **R3** | `CancellationDecision` `approved` lands first | Outcome marking would follow | Cancellation effective per §3 (target=appointment → that Appointment → `cancelled`; target=package → all future non-terminal Appointments → `cancelled`) | For target=appointment: `cancelled` (outcome marking now impossible — state is terminal-cancelled, not `completed`/`no_show`). For target=package: only future non-terminal Appointments are cancelled. Terminal-outcome Appointments keep their outcome. | per §3 | `cancellation_approved_before_outcome` |
| **R4** | `RescheduleAction` lands | `CancellationRequest` is still `open` against the original Appointment | `CancellationRequest` does **not** auto-resolve. Reason: reschedule is not a terminal outcome (`ADR 0039`); the original Appointment transitions to `rescheduled` and a replacement is created. The open request is **rebound** to the replacement Appointment (see §5 for matrix). | `rescheduled` (original) + replacement `scheduled`/`confirmed` | not consumed; rebound to replacement | `request_rebound_to_replacement` |

`R1` and `R2` are auto-resolution: the system writes the transition with `actor = system`, `reason_code` as above, and an `AuditRecord`. Admin sees the auto-resolved request in the workspace with a clear "skipped because outcome already recorded" note; manual re-intake is possible if the client reopens the case.

`R3` is the atomic-operation guarantee from `ADR 0025`/`0051`/`IMPLEMENTATION-GUIDE.md:300–304`. Outcome marking that arrives **after** `approved` must be rejected at the command boundary with typed failure `E-APPOINTMENT-ALREADY-CANCELLED`; the psychologist cannot mark `completed`/`no_show` on a cancelled Appointment. This is enforced both at app-level (`MarkAppointmentOutcome` precondition) and at DB level (trigger or CHECK constraint restricting outcome transitions to non-cancelled/non-rescheduled states).

`R4` is a bound, not a termination. The cancellation now targets the replacement Appointment; if the replacement is also `rescheduled`, the binding walks the chain until the current Appointment, then stops. If the chain ends in a terminal-cancelled Appointment, the request auto-resolves with reason `target_chain_terminal_cancelled`.

#### 2.2 Notification effect

- `R1`/`R2` auto-resolve: client receives an email "Permintaan pembatalan tidak dapat diproses karena sesi telah ditandai selesai/tidak hadir oleh psikolog". Admin workspace shows the auto-resolved row with the reason code.
- `R3`: client receives the standard cancellation email per `IMPLEMENTATION-GUIDE.md §10.1`; no outcome email.
- `R4`: client receives the reschedule email per `IMPLEMENTATION-GUIDE.md §10.1` plus a note "Pembatalan yang Anda ajukan akan dievaluasi terhadap jadwal pengganti".

### 3. Atomic effects per target — full matrix

#### 3.1 Target = `appointment` (single-session, single Booking)

Precondition: `target.state ∈ {scheduled, confirmed, rescheduled-replacement-active}` AND `target.outcome_state IS NULL`. The check is on the Appointment row at decision time.

| `DecideCancellation` outcome | Appointment transition | CapacityReservation | SessionEntitlement (if linked) | Payment | Slot reuse |
|---|---|---|---|---|---|
| `approve`, target is `scheduled`/`confirmed` | `scheduled`/`confirmed` → `cancelled` | `confirmed`/`hold_active` → `cancelled` (`release_reason = appointment_cancelled`) per `ADR 0091` §9 | restore if `state = scheduled` AND `PackageValidity.valid_until >= now` AND session not yet started → `available`; else `closed_unrecoverable` | no mutation (refund is separate `RefundAction`) | if `target.starts_at > now` AND not held by another → `available` for rescheduling/booking; else retained as history |
| `approve`, target is `rescheduled` and chain-bound replacement is current (per §2 R4) | replacement transitions to `cancelled`; original `rescheduled` unchanged | replacement reservation transitions to `cancelled` | same restore rule applied to entitlement bound to the replacement | no mutation | replacement slot released per same rule |
| `approve`, but target's outcome is already `completed`/`no_show` (`R3` boundary violation) | rejected with typed failure `E-APPOINTMENT-OUTCOME-ALREADY-RECORDED` | no change | no change | no change | no change |
| `deny` | no mutation | no change | no change | no change | no change |

Atomicity: the three writes (Appointment.state, CapacityReservation.state, SessionEntitlement.state) happen in one DB transaction per `ADR 0089` D1 batch semantics; any failure rolls back all three.

#### 3.2 Target = `package_purchase`

Precondition: `PackagePurchase.state ∈ {active, partially_consumed}` AND at least one future, non-terminal Appointment or unused SessionEntitlement exists. The decision applies to the entire package; partial-package atomic effects are derived (not partial-application of a smaller scope).

`DecideCancellation` `approve` on `package_purchase` triggers the following **single-transaction** effects:

1. **Appointment sweep.** Iterate all `Appointment` rows where `package_purchase_id = target.id` AND `state ∈ {scheduled, confirmed}` AND `starts_at > now` AND `outcome_state IS NULL`. Transition each to `cancelled`. Original `rescheduled` Appointments are kept as history (terminal); only their **current** replacement is cancelled.
2. **CapacityReservation sweep.** For each cancelled Appointment, transition its `CapacityReservation` (`reservation_kind = confirmed`) to `cancelled` (`release_reason = appointment_cancelled`) per `ADR 0091` §9.
3. **SessionEntitlement sweep.** For each `SessionEntitlement` where `package_purchase_id = target.id` AND `state ∈ {available, scheduled}` AND `valid_until >= now`:
   - If the entitlement has never been bound to a started/cancelled Appointment AND `PackageValidity.valid_until >= now`: transition to `closed_restored_by_cancellation` (restored into the validity window; can be rescheduled by Admin within the same package if package re-opens — see step 6).
   - Else: transition to `closed_cancelled_with_package` (no longer usable; reported as "closed by package cancellation" in Admin workspace).
   - Entitlements with `state = consumed` (already terminal-outcome Appointments) keep their state and are NOT refunded here (refund is separate `RefundAction` per `ADR 0063`).
   - Entitlements with `state = expired` (past `valid_until`) keep their state and are not touched.
4. **PackagePurchase transition.** `PackagePurchase.state` transitions `active | partially_consumed → closed_by_cancellation`. This is terminal for the package.
5. **PackageValidity.** `PackageValidity.valid_until` is **not** modified (no extension, no reset) per `ADR 0062` (restored-entitlement expiry). The validity calendar value at the time of cancellation is the final value. Restored entitlements in step 3 use the original `valid_until` snapshot; the calendar does not slide forward.
6. **No re-open.** A `closed_by_cancellation` `PackagePurchase` cannot be re-opened by a subsequent `DecideCancellation deny` or any other command. If Admin later determines the cancellation was wrong, the path is: create a **new** `PackagePurchase` (new PaymentIntent required) — the closed one remains immutable history. This matches `ADR 0051` "corrections create a new audited decision rather than rewriting the old one".
7. **Refund.** Out of scope of this transaction. Admin creates a separate `RefundAction` (`full_refund` or `no_refund` per `ADR 0063`/`0077`) linked by `cancellation_decision_id`. `RefundAction` carries its own audit and provider-retry semantics.

`DecideCancellation` `deny` on `package_purchase`:

- No mutation to any `Appointment`, `CapacityReservation`, `SessionEntitlement`, `PackagePurchase`, `PackageValidity`, or `Payment`.
- Record `CancellationDecision` with `outcome = deny`, `reason_code`, `actor = admin`.
- Audit only.

#### 3.3 Target = `booking` (single-session Booking with one Appointment)

Same as `target = appointment` (§3.1); the Booking is the single parent and the only Appointment row is the operational target. Booking.state transitions to `cancelled` only when its sole Appointment transitions to `cancelled` (no separate Booking-level cancellation mutation for single-session — `Booking` is just the parent reference). Booking aggregate is preserved as immutable history.

### 4. Repeat / correction rule for CancellationDecision

`CancellationDecision` is append-only and immutable per `ADR 0051`/`0065`. Corrections are modelled as a **new** decision on the same target with `correction_of` linkage.

| Situation | Behaviour |
|---|---|
| Admin reconsiders an `approved` decision before any downstream effect has been relied on (e.g., `RefundAction` not yet executed) | Admin records a new `CancellationRequest` (target=appointment/package_purchase), gets a new `CancellationRequest` row. The new `DecideCancellation` `deny` transitions the new request to `denied` and writes `supersedes_decision_id = <original_decision_id>`. The original `CancellationDecision` remains `approved` historically but is marked `superseded_by = <new_decision_id>` and the system publishes a `CancellationCorrectionApplied` notification. **No retroactive rollback of the operational effects already applied** (Appointment is already `cancelled`; CapacityReservation already `cancelled`; entitlement already `closed_*`). Recovery requires explicit re-booking. |
| Admin reconsiders a `denied` decision (decides the cancellation should have been approved) | Admin records a new `CancellationRequest`, gets a new decision row. New `DecideCancellation` `approve` applies the §3 atomic effects afresh (idempotently — already-cancelled entities are skipped). Original `denied` decision is marked `superseded_by`. Client is notified that the cancellation is now approved and which Appointments/entitlements are affected. |
| Outcome race lands after the decision (§2 R1/R2) | The decision is `approved` historically, but the Appointment is `completed`/`no_show`. Capacity was not released (the Appointment never went `cancelled`), entitlement was consumed. Admin sees the conflict in the workspace and decides whether to issue a `RefundAction` (`full_refund` for the unused portion only at purchase level per `ADR 0063`); no further cancellation atomic effects are re-applied. |

Idempotency: every `DecideCancellation` carries `idempotency_key`. A retry with the same key returns the existing decision without side effects. A retry with a different key against a request already in `approved`/`denied`/`auto_resolved` returns typed failure `E-DECISION-ALREADY-RECORDED` and instructs the caller to open a correction.

### 5. RescheduleAction transition matrix

`RescheduleAction` is an audited administrative operation (`CONTEXT.md:241–243`, `ADR 0039`) that preserves the original Appointment as `rescheduled` and creates a replacement. The matrix below is the canonical one for MVP; it previously lived only as prose and was missing from `IMPLEMENTATION-GUIDE.md §6`.

#### 5.1 Preconditions and forbidden transitions

| Source Appointment state | Reschedule allowed? | Reason |
|---|---|---|
| `scheduled` | yes | normal path |
| `confirmed` | yes | normal path; replacement inherits confirmation once verified PaymentEvent covers it (single-session only — package replacement references the same Payment and PackagePurchase per `ADR 0039`) |
| `rescheduled` (original) | no — already terminal-rescheduled | typed failure `E-RESCHEDULE-ALREADY-RESCHEDULED` |
| `cancelled` | no | typed failure `E-RESCHEDULE-CANCELLED` |
| `completed` | no (post-session outcome is terminal) | typed failure `E-RESCHEDULE-OUTCOME-COMPLETED` |
| `no_show` | no | typed failure `E-RESCHEDULE-OUTCOME-NO-SHOW` |
| `pending_payment` (PackagePurchase first session not yet confirmed) | no | reschedule applies to scheduled/confirmed only; pending_payment means no Appointment yet to reschedule |

#### 5.2 Atomic effects

| Source state | RescheduleAction outcome | Original Appointment | Replacement Appointment | CapacityReservation | SessionEntitlement | PackagePurchase |
|---|---|---|---|---|---|---|
| `scheduled`/`confirmed` | success | `state → rescheduled` (terminal); `outcome_state` stays NULL; replacement chain pointer set | new Appointment with `state = scheduled`; on verified payment for single-session: `state = confirmed`; for package: `state = confirmed` after first-session payment per `ADR 0039` | original reservation `confirmed → cancelled` (`release_reason = appointment_cancelled`); new reservation inserted for replacement (`hold_active → confirmed` on payment, or `confirmed` directly for package) | for package: entitlement bound to source rebinds to replacement (no new consumption); for single-session: no entitlement | no mutation |
| `scheduled`/`confirmed` | failure (capacity overlap on replacement slot) | no mutation | not created | not created | not touched | no mutation |

#### 5.3 Reschedule for couple package

Per `ADR 0090` §6: Admin and Psychologist may reschedule A/B/joint Appointments; Client/guest (including partner via ClientAccess) may not. The replacement must remain within `PackageValidity.valid_until` and respect both `BookingParticipant` records (joint replacement cannot be proposed if either partner has withdrawn — the request is rejected with `E-RESCHEDULE-JOINT-PARTNER-WITHDRAWN`).

#### 5.4 Reschedule while CancellationRequest is open

This is the §2 R4 rebound. The original Appointment transitions to `rescheduled`; the open `CancellationRequest.target_appointment_id` is updated to the replacement `Appointment.id` in the same transaction that performs the reschedule (or rebinds via `AppendCancellationNote` + workspace view update). The replacement inherits the request; Admin continues to review against the replacement's slot.

### 6. Couple-package cancellation rules

Couple package binds exactly two `BookingParticipant` rows (`ADR 0090` §1). Cancellation rules layered on top of §1–§5:

#### 6.1 Target resolution

| Withdrawal pattern | Effective target | Notes |
|---|---|---|
| One partner withdraws from individual Appointment A or B before start | `target = appointment` (the individual Appointment) | per §3.1; entitlement #1 or #2 in scope |
| One partner withdraws from joint Appointment before start | `target = appointment` (the joint Appointment) | joint cancellation restores entitlement #3 per `ADR 0090` §5; the matrix in §3.1 applies (restore if valid) |
| Both partners withdraw / cancel the entire couple booking | `target = package_purchase` | per §3.2; atomic sweep of A, B, joint Appointments + all unused entitlements |
| One partner initiates, the other does not | `target = appointment` (the requesting partner's individual Appointment only) | per `ADR 0090` §4 visibility, the non-requesting partner is not shown the request in their ClientAccess; Admin sees both `BookingParticipant` rows and may decide; decision applies only to the targeted Appointment |

#### 6.2 Consent and visibility on cancellation

- `CancellationRequest` on joint Appointment: `joint_session_consent` for both partners must already be `verified` for the cancellation path to allow `approve` (precondition check). If either partner withdrew `joint_session_consent`, Admin sees the request with a "consent withdrawn by <party_role>" flag and may only `deny` (joint session cannot be cancelled by an absent partner as a workaround for outcome marking).
- `CancellationRequest` on individual A or B: per-participant consent must be `verified` (or `pending` only if the request is for an Appointment that has not started and the partner never verified — Admin's discretion per `ADR 0090` §3).
- `BookingParticipant` rows are read by Admin from the workspace; partner-identifying data is captured in audit per `ADR 0090` §10.

#### 6.3 Mid-session withdrawal (not a cancellation, kept distinct)

Per `ADR 0090` §5: a partner who withdraws mid-session does **not** trigger a CancellationRequest. The psychologist marks `completed` with `withdrawn_mid_session` on the withdrawing partner's `AppointmentParticipant.presence_status`. Entitlement #3 is consumed (session was held). This is **not** covered by the cancellation matrix; it lives in `OutcomeCorrection` / `AppointmentOutcome` semantics per `ADR 0054` and is referenced here only to disambiguate.

#### 6.4 Couple-package-wide cancellation atomic effects

Same as §3.2 with the couple-specific note that the Appointment sweep includes A, B, and joint rows. Joint Appointment is cancelled in the same transaction as A and B; restored entitlements are #1/#2/#3 per individual validity window.

### 7. Acceptance criteria (test scenarios)

The integration test from `Ticket 10` acceptance criteria is fully specified:

1. **Single-session cancellation happy path.** Booking with one confirmed Appointment. Admin approves. Appointment → `cancelled`; CapacityReservation → `cancelled`; no entitlement to restore (single-session). Slot `available` for re-booking. Idempotent retry of `DecideCancellation` with same key returns the existing decision without re-running effects.

2. **Single-session pending-vs-completed race (R1).** Booking with confirmed Appointment, CancellationRequest open. Psychologist marks `completed`. CancellationRequest auto-resolves with `outcome_already_recorded_completed`; client notification "permintaan tidak diproses"; no capacity release; entitlement consumed.

3. **Single-session pending-vs-no-show race (R2).** Same as R1 with `no_show` after 15-minute grace. Auto-resolve with `outcome_already_recorded_no_show`.

4. **Single-session reschedule-vs-pending (R4).** Open request, Admin reschedules the Appointment. Request rebinds to replacement; Admin workspace shows the rebound target; original Appointment transitions to `rescheduled` per §5.2.

5. **Package-wide cancellation.** PackagePurchase with 3 future Appointments (A, B, joint for couple; or sessions 1/2/3 for individual package), 3 unused SessionEntitlements, no consumed. Admin approves on `target = package_purchase`. Atomic transaction:
   - 3 Appointments → `cancelled`.
   - 3 CapacityReservations → `cancelled`.
   - 3 SessionEntitlements → `closed_restored_by_cancellation`.
   - PackagePurchase → `closed_by_cancellation`.
   - PackageValidity.valid_until unchanged.
   - No re-open possible.
   - RefundAction (`full_refund` or `no_refund`) is a separate command/record.

6. **Partial-package (1-of-N) cancellation.** 3-session package, session 1 already completed (consumed), sessions 2 and 3 scheduled. Admin approves on `target = appointment` for session 2 only. Session 2 Appointment → `cancelled`; session 2 entitlement → `closed_restored_by_cancellation`; session 3 untouched; PackagePurchase stays `partially_consumed` (not closed). This is the per-Appointment path — the package-wide path is reserved for full-cancellation decisions on `target = package_purchase`.

7. **Repeat request while one is open.** Client messages twice about the same Appointment. Second intake returns the existing open request (`idempotent_replay = true`); no second row created. Admin sees both intake notes under one open request.

8. **Repeat request after terminal decision.** First CancellationDecision `denied`. Client messages again. New `CancellationRequest` opens with `correction_of = <previous_decision_id>`. Admin re-reviews; second decision `approve` applies §3.1 effects afresh (idempotent on already-cancelled entities). Original `denied` decision marked `superseded_by`.

9. **Outcome race after approval (R3 violation).** CancellationDecision `approved` lands; then psychologist tries to mark `completed`. Command rejected with `E-APPOINTMENT-ALREADY-CANCELLED`. No state change.

10. **Reschedule forbidden on completed.** Try to reschedule an Appointment in `completed`. Command rejected with `E-RESCHEDULE-OUTCOME-COMPLETED`.

11. **Reschedule capacity overlap.** Original Appointment confirmed; replacement slot overlaps an existing `confirmed` reservation for the same psychologist. Reschedule rejected; original Appointment unchanged.

12. **Couple individual-A cancellation.** Couple booking, partner A withdraws from individual A. Admin approves on `target = appointment` for A only. Appointment A → `cancelled`; entitlement #1 → `closed_restored_by_cancellation`; B and joint untouched; PackagePurchase stays `partially_consumed`. Partner B sees no change in their ClientAccess; partner A sees "sesi A Anda dibatalkan" email.

13. **Couple joint pre-start cancellation.** Couple booking, partner A withdraws from joint before start. Admin approves on `target = appointment` for joint. Joint Appointment → `cancelled`; entitlement #3 → `closed_restored_by_cancellation` (joint cancellation before start is the explicit restore case per `ADR 0090` §5); A and B individual sessions untouched.

14. **Couple package-wide cancellation.** Couple booking, both partners withdraw from the entire package. Admin approves on `target = package_purchase`. A, B, joint all → `cancelled`; all three entitlements → `closed_restored_by_cancellation`; PackagePurchase → `closed_by_cancellation`; no re-open.

15. **Idempotency and retry safety.** All `RequestCancellation` and `DecideCancellation` retries with the same `idempotency_key` return the existing record/decision without side effects. All retries with different keys against a decided request return `E-DECISION-ALREADY-RECORDED`.

### 8. Migration schema (canonical)

No new tables are introduced. The matrix is enforced by:

- Unique partial index on `cancellation_request (target_type, target_id)` where `state = 'open'` — enforces §1.2.
- Trigger / CHECK constraint on `appointment.state` blocking transitions `cancelled → completed|no_show` and `rescheduled → *` — enforces §2 R3 and §5.1.
- Trigger on `appointment` outcome write checking `cancellation_request` open/approved state and auto-resolving on completion (`actor = system`) — enforces §2 R1/R2.
- `package_purchase` state CHECK constraint preventing `closed_by_cancellation → active|partially_consumed` — enforces §3.2 step 6.
- `session_entitlement` state enum extension adding `closed_restored_by_cancellation` and `closed_cancelled_with_package` — enforces §3.2 step 3.

```sql
-- 0095_cancellation_matrix.sql (D1/SQLite canonical; Postgres equivalent in §9)

-- §1.2: at most one open request per target
CREATE UNIQUE INDEX cancellation_request_open_unique
  ON cancellation_request (target_type, target_id)
  WHERE state = 'open';

-- §2 R3: cancellation is terminal; outcome marking is forbidden afterwards
CREATE TRIGGER appointment_no_outcome_after_cancel
BEFORE UPDATE OF state ON appointment
WHEN NEW.state IN ('cancelled', 'rescheduled') AND OLD.outcome_state IS NULL
BEGIN
  -- allow transition to cancelled/rescheduled; outcome_state stays NULL
  -- (no-op trigger; explicit guard below)
END;

CREATE TRIGGER appointment_block_outcome_after_cancel
BEFORE UPDATE OF outcome_state ON appointment
WHEN OLD.state IN ('cancelled', 'rescheduled')
BEGIN
  SELECT RAISE(ABORT, 'E-APPOINTMENT-ALREADY-CANCELLED')
  WHERE NEW.outcome_state IS NOT NULL AND NEW.outcome_state != OLD.outcome_state;
END;

-- §3.2 step 6: closed_by_cancellation is terminal
CREATE TRIGGER package_purchase_no_reopen
BEFORE UPDATE OF state ON package_purchase
WHEN OLD.state = 'closed_by_cancellation'
BEGIN
  SELECT RAISE(ABORT, 'E-PACKAGE-CLOSED-BY-CANCELLATION')
  WHERE NEW.state IN ('active', 'partially_consumed');
END;
```

The `session_entitlement` enum extension is a D1 schema migration; existing rows are unaffected because new values are only set on forward transitions from `available`/`scheduled`.

### 9. Postgres equivalent (per `ADR 0089`)

```sql
-- 0095_cancellation_matrix.sql (Postgres)

CREATE UNIQUE INDEX cancellation_request_open_unique
  ON cancellation_request (target_type, target_id)
  WHERE state = 'open';

CREATE OR REPLACE FUNCTION appointment_block_outcome_after_cancel()
RETURNS trigger AS $$
BEGIN
  IF OLD.state IN ('cancelled', 'rescheduled') AND NEW.outcome_state IS DISTINCT FROM OLD.outcome_state THEN
    RAISE EXCEPTION 'E-APPOINTMENT-ALREADY-CANCELLED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_block_outcome_after_cancel
BEFORE UPDATE OF outcome_state ON appointment
FOR EACH ROW EXECUTE FUNCTION appointment_block_outcome_after_cancel();

CREATE OR REPLACE FUNCTION package_purchase_no_reopen()
RETURNS trigger AS $$
BEGIN
  IF OLD.state = 'closed_by_cancellation' AND NEW.state IN ('active', 'partially_consumed') THEN
    RAISE EXCEPTION 'E-PACKAGE-CLOSED-BY-CANCELLATION';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER package_purchase_no_reopen
BEFORE UPDATE OF state ON package_purchase
FOR EACH ROW EXECUTE FUNCTION package_purchase_no_reopen();
```

The Postgres variant is selected when `TBC-STACK-01` resolves to a Postgres runtime; the trigger logic is identical. The D1 variant is the launch canonical.

### 10. Audit and notifications

Every state transition in §1–§6 writes an `AuditRecord` row:

- `target_type ∈ {cancellation_request, appointment, capacity_reservation, session_entitlement, package_purchase, booking}`
- `action ∈ {request_intake, request_rebound_to_replacement, decide_approve, decide_deny, auto_resolve, supersede, restore_entitlement, close_entitlement, cancel_appointment, close_package}`
- `actor ∈ {admin, psychologist, system}`
- `correlation_id` shared across atomic-effect rows for one decision
- `before_state`, `after_state` (enum string only, no PII)
- `reason_code` (typed enum: `outcome_already_recorded_completed`, `outcome_already_recorded_no_show`, `cancellation_approved_before_outcome`, `request_rebound_to_replacement`, `target_chain_terminal_cancelled`, `correction_of_<id>`, etc.)
- `idempotency_key` of the originating command

Email notifications per `IMPLEMENTATION-GUIDE.md §10.1`:

- `R1`/`R2` auto-resolve: client email "Permintaan pembatalan tidak diproses" + reason summary.
- `R3`/`R4` and standard approve/deny: existing templates.
- Package-wide approval: client email enumerates each cancelled Appointment and each restored/closed entitlement by ordinal (sesi 1/2/3).
- Couple individual Appointment cancellation: client email addressed to the affected partner's ClientAccess scope per `ADR 0090` §7.

## Consequences

Positive:

- Single canonical matrix covers Booking, Appointment, PackagePurchase, and SessionEntitlement for every cancellation target; no cell is `TBD`.
- Pending-versus-outcome race is resolved deterministically (R1–R4); admin never faces an open request against a terminal outcome.
- Repeat/correction rule preserves `ADR 0051` immutability while allowing Admin to recover from wrong decisions without rewriting history.
- Package-wide cancellation atomicity is enforced at DB level (trigger + CHECK) in addition to app-level transaction per `ADR 0089` D1 batch semantics.
- Partial-package (1-of-N) is clearly distinguished from package-wide via the target field; the per-Appointment path keeps the package open with one less session.
- RescheduleAction transition matrix closes the open gap flagged by `Ticket 10` and `CONTEXT.md:241–243`.
- Couple-package cancellation is consistent with `ADR 0090` and uses the same atomic-effect primitives; no separate matrix.
- Refund remains purchase-level `full_refund`/`no_refund` per `ADR 0063`/`0077`; this ADR adds no refund semantics.

Costs and constraints:

- New `closed_restored_by_cancellation` and `closed_cancelled_with_package` enum values on `session_entitlement` are additive but require migration in any environment that already has `session_entitlement` rows.
- Auto-resolution (`R1`/`R2`) means the Admin workspace shows requests that resolved without admin action; the UI must explain the reason clearly so Admin does not attempt a manual decision.
- The "no re-open" rule for `closed_by_cancellation` means recovery from an incorrect package-wide approval is administratively expensive (new PackagePurchase + new payment). This is intentional and aligned with `ADR 0063`/`0077`; the cost is the cost of audit integrity.
- Race resolution depends on trigger-level enforcement; teams must maintain the trigger alongside the application code (no divergence).
- `RescheduleAction` was previously prose-only; this ADR formalises it and creates new typed failures (`E-RESCHEDULE-OUTCOME-COMPLETED`, etc.) that the Admin workspace must surface.

## Open follow-up

- Closed by this ADR: `TBC-PACKAGE-CANCEL-01` (Round 1 P1-13), `ADR 0024` open follow-up on package cancellation/entitlement accounting, `ADR 0051` open follow-up on repeat-request rules and `RescheduleAction` transition table.
- Carry-forward:
  - `ADR 0092-appointment-outcome-timing.md` (Ticket 04) — when no-show terminal semantics shift from 15-minute early-grace to post-session terminal, this ADR's `R1`/`R2` outcome-race resolution continues to apply without change (terminal outcome is terminal outcome), but the grace window logic moves.
  - `TBC-STAFF-SESSION-01` — Admin workspace UI for surfacing auto-resolved requests, rebound requests, and supersede linkage is `TBC-ADMIN-01` dependent; this ADR provides the data, not the UI.
  - `TBC-NO-SHOW-01` — explicit "early checkpoint vs terminal outcome" decision (Round 1 P1-12) is independent of this matrix but is referenced by `R1`/`R2`.
  - `TBC-PACKAGE-01` — exact package validity calendar semantics; `closed_restored_by_cancellation` uses the snapshotted `valid_until` from `OfferSnapshot`/`PackageValidity` per `ADR 0055`, which already freezes the policy.
  - Couple package minor (`ADR 0090` follow-up) — DEFERRED post-MVP; if a minor-in-couple cancellation ever ships, the consent precondition in §6.2 must extend to guardian consent; out of scope here.

## Reference

- `ADR 0024-admin-cancellation-review.md` — Admin review intake
- `ADR 0025-cancellation-pending-reservation.md` — pending preserves reservation
- `ADR 0027-no-show-consumption.md` — no_show consumes entitlement by default
- `ADR 0028-no-show-grace-period.md` — 15-minute no-show grace
- `ADR 0051-cancellation-decision-record.md` — append-only CancellationDecision
- `ADR 0054-outcome-correction-events.md` — correction events for outcomes
- `ADR 0062-restored-entitlement-expiry.md` — restored-entitlement expiry policy
- `ADR 0063-package-refund-at-purchase-level.md` — purchase-level refund, no per-entitlement split
- `ADR 0066-flexible-admin-whatsapp-support.md` — WhatsApp optional manual support
- `ADR 0067-admin-cancellation-refund-workspace.md` — Admin workspace
- `ADR 0076-case-by-case-cancellation.md` — no automatic cutoff, Admin case-by-case
- `ADR 0077-launch-full-or-no-refund.md` — `full_refund`/`no_refund` only
- `ADR 0078-one-admin-separate-refund-action.md` — one Admin separate actions
- `ADR 0089-architecture-worker-d1.md` — D1 batch transaction model
- `ADR 0090-couple-participant-model.md` — couple package model, withdrawal/no-show/reschedule authority
- `ADR 0091-capacity-overlap-buffer.md` — CapacityReservation transition on cancellation
- `ADR 0094-intake-eligibility-cutoff.md` — booking cutoff (independent of this matrix)
- `IMPLEMENTATION-GUIDE.md` §6.2, §6.3, §6.5, §8.2, §10.1, §11 — patched alongside this ADR
- `DOMAIN-MODEL.md` Lifecycle § — patched alongside this ADR
- `PRD-GUIDELINE-REVIEW.md` Round 1 P1-13, TBC register `TBC-PACKAGE-CANCEL-01` — closed by this ADR
- `vault/Projects/Seraya Psikologi/Tickets/Ticket 10 — Package cancellation matrix & outcome race.md` — source ticket
- `vault/Projects/Seraya Psikologi/Tickets/Ticket 04 — No-show timing & late-arrival correction.md` — open; not blocking this ADR
