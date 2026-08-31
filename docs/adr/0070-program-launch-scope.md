# 70. Separate Public Program Pillars from Bookable Launch Scope

## Status

Accepted for launch planning.

## Context

Seraya has four public program pillars with different operating models: SERAYA PULANG covers counseling and psychological assessment; SERAYA BERDAYA covers learning programs and professional collaboration; SERAYA BERSAMA covers offline community/events; SERAYA BERBAGI covers limited free Friday counseling. The MVP booking/payment model is designed for concrete psychology service offerings, not every future event or community activity.

## Decision

All four programs appear in the public website's program architecture at launch:

- **SERAYA PULANG** is the only launch program that exposes bookable ServiceOffering(s), availability, Booking, Appointment, and payment flow.
- **SERAYA BERDAYA** is public narrative/program content only at launch; webinars, seminars, workshops, and collaborations do not create Booking/Payment records in the MVP.
- **SERAYA BERSAMA** is public narrative/program content only at launch; offline events do not create Booking/Payment records in the MVP.
- **SERAYA BERBAGI** is public narrative/program content only at launch; its free limited Friday counseling is not represented by the paid booking/payment flow unless a later explicit operational design introduces a separate capacity/intake model.

The program names remain stable brand concepts. Concrete ServiceOffering, ServiceOfferingRevision, availability, price, duration, mode, and package decisions are made only for SERAYA PULANG launch services.

## Consequences

Positive:

- the public site can communicate the complete Seraya vision without pretending every program is operationally bookable;
- payment, availability, refund, and appointment logic stays within the launch service boundary;
- future event/free-program workflows can be designed explicitly instead of being forced into counseling booking semantics.

Costs and constraints:

- three programs need clear narrative labels such as coming soon, inquiry, or program information so visitors do not expect checkout;
- SERAYA BERBAGI's Friday capacity and intake process remain a future operational decision;
- launch catalog work must now define the concrete paid SERAYA PULANG offerings.

## Open follow-up

Define SERAYA PULANG's concrete bookable services, psychologist assignment/availability, duration, mode, price, package structure, and public scope. Define launch copy/CTA for the three non-bookable programs.
