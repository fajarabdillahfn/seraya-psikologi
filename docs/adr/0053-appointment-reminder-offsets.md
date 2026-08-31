# 53. Use 24-hour and 2-hour Appointment Reminders

## Status

Accepted for the MVP working model; exact opt-out, quiet hours, and provider failure behavior remain open.

## Context

A single reminder may be missed; too many reminders add noise. The practice uses Asia/Jakarta operational time and needs predictable behavior when an Appointment is rescheduled or cancelled.

## Decision

Schedule two transactional email reminders by default:

- 24 hours before Appointment start;
- 2 hours before Appointment start.

Offsets are configurable by Admin within the notification policy. ReminderSchedule computes them from the Appointment's canonical instant and renders Asia/Jakarta local date/time. Reschedule/cancellation/terminal outcome cancels stale reminders and creates new ones where applicable. Each send has an idempotency key so retries cannot duplicate a reminder.

## Consequences

Positive:

- predictable minimal reminder cadence;
- local-time copy matches operational schedule;
- reschedule behavior is explicit;
- duplicate delivery is preventable.

Costs and constraints:

- appointments created inside an offset may skip one reminder;
- scheduler clock/timezone tests are required;
- email failure/manual support path remains necessary;
- quiet hours and client preferences need policy.

## Open follow-up

Define package-expiry offsets, notification opt-out/mandatory rules, quiet hours, and late-created appointment behavior.
