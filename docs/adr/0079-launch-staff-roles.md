# 79. Launch with Admin and Psychologist Staff Roles

## Status

Accepted for launch planning.

## Context

The technical model includes Admin, Psychologist, and Editor staff capabilities. The launch team currently has one confirmed psychologist and does not need a separate editorial operator to manage public content.

## Decision

Active staff roles at launch:

- **Admin** — operational owner for catalog, availability, Booking/Appointment, payment/refund, cancellation/reschedule, privacy, staff membership, and protected content;
- **Psychologist** — own profile/availability inputs and assigned operational appointment/outcome actions within the existing minimum-data boundary.

**Editor** remains a future-capable role but is not active/assigned at launch. Admin handles narrative content publication and protected catalog/professional changes until an Editor is explicitly invited and enabled.

Visitor and guest ClientAccess remain public/client capabilities, not staff roles. No staff member self-claims a role through SSO or email domain.

## Consequences

Positive:

- smaller permission surface for launch;
- clear separation between operational Admin and own-work Psychologist access;
- no unused editorial privilege is granted before needed.

Costs and constraints:

- Admin carries content-publishing workload;
- adding an Editor later requires explicit StaffMembership/RoleAssignment and permission review;
- role assignment and removal must be audited.

## Open follow-up

Choose staff identity provider/invite flow, Admin recovery/break-glass policy, exact Psychologist visibility/actions, and the explicit conditions for enabling Editor later.
