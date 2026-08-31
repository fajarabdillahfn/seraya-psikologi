# 72. Launch Counseling Online and Offline

## Status

Accepted for launch planning.

## Context

SERAYA PULANG launches with psychological counseling. The initial program brief supports both online and offline delivery, and the booking domain supports mode as part of the concrete ServiceOffering/OfferSnapshot.

## Decision

Launch psychological counseling in both **online** and **offline** modes. Treat the modes as concrete bookable offering variants under SERAYA PULANG, with their own availability/location/operational constraints where needed. The selected mode, duration, price, psychologist, and any location/meeting instructions are snapshotted into the booking/appointment context and are not silently changed after confirmation.

Online/offline mode does not change the clinical-record boundary: the MVP still stores operational booking/payment/appointment data only, not clinical notes or session records.

## Consequences

Positive:

- clients can choose the delivery mode that fits them at launch;
- the offering model is tested against more than one operational mode;
- future mode-specific pricing, duration, location, or capacity can be represented explicitly.

Costs and constraints:

- launch needs separate online and offline availability/location rules;
- offline requires a confirmed venue/address/privacy/accessibility policy before production booking;
- booking copy must clearly distinguish online meeting instructions from offline location instructions;
- UAT must cover both modes, including reminders and reschedule/cancellation effects.

## Open follow-up

Define mode-specific duration, price, psychologist availability, offline venue/location, transition buffer, meeting-link handling, access instructions, and public copy.
