# 71. Launch Counseling Before Psychological Assessment

## Status

Accepted for launch planning.

## Context

SERAYA PULANG is the only bookable launch program. Its initial brief includes both counseling and psychological assessment, but the team wants to reduce launch scope and operational complexity.

## Decision

Launch SERAYA PULANG with **psychological counseling** as the initial paid ServiceOffering scope. **Psychological assessment is deferred beyond launch** and must not appear as an active bookable/purchasable ServiceOffering until its assessment type, instrument/process, professional responsibility, result delivery, consent, retention, and operational workflow are explicitly designed and approved.

Counseling remains subject to the existing boundary: the MVP stores booking/payment/appointment operations only and does not store clinical notes, diagnosis, assessment results, or session records.

## Consequences

Positive:

- launch catalog and availability model focus on one service family;
- no premature assessment-result or instrument data boundary;
- simpler payment/refund, consent, and UAT scope.

Costs and constraints:

- visitors may see assessment described as future capability rather than bookable service;
- future assessment launch requires a separate product/clinical-operational design pass;
- counseling's concrete mode, duration, price, psychologist assignment, and package options still need decisions.

## Open follow-up

Define the initial counseling offerings: online/offline mode, duration, price, psychologist assignment, availability, single-session/package options, intake/consent wording, and public scope. Keep psychological assessment out of active launch catalog.
