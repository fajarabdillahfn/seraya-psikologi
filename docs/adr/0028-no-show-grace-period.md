# 28. Mark No-show After a Fifteen-minute Grace Period

## Status

Accepted for the MVP working model.

## Context

A client may be late or experience a small access problem. Marking no-show exactly at the scheduled start is too eager; leaving the state open indefinitely makes package balance and operational reporting unreliable.

## Decision

An Appointment may be marked `no_show` after a 15-minute grace period from its scheduled start in Asia/Jakarta. The psychologist for that Appointment or an authorized admin may perform the action. The action consumes the related SessionEntitlement by default under ADR 0027 and is audited.

The threshold is operational only; it does not record why a client did not attend or any clinical judgment.

## Consequences

Positive:

- predictable client and staff expectation;
- enough time for ordinary lateness/access issues;
- package balance eventually reaches a defined state;
- role ownership is clear.

Costs and constraints:

- timezone and clock consistency are required;
- client support may need an exception path;
- correction after a late arrival requires admin override/audit;
- reminder copy should state the grace period if policy requires.

## Open follow-up

Define whether the grace period can vary by ServiceOffering, whether a late arrival can be marked completed, the correction window, and notification behavior. Initial/correction authority is resolved by ADR 0054.
