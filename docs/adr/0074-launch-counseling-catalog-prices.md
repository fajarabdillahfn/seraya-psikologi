# 74. Launch Counseling Catalog and Prices

## Status

Accepted for launch planning; prices and package structures are recorded from the business catalog brief. Psychologist assignment, exact availability, venue, validity, and operational policy remain open.

## Context

SERAYA PULANG launches psychological counseling online and offline, with individual and couple formats. The domain supports concrete ServiceOffering/ServiceOfferingRevision snapshots, single-session Booking, and full-upfront ServicePackage purchases with ordered SessionEntitlement units.

## Decision

Use the following initial IDR catalog for launch planning:

### Individual counseling

- Online, 60 minutes: **Rp125.000** per session.
- Offline, 60 minutes: **Rp200.000** per session.

### Individual counseling packages

- Online, 2 sessions: **Rp235.000**; reference saving Rp15.000.
- Online, 3 sessions: **Rp345.000**; reference saving Rp30.000.
- Offline, 2 sessions: **Rp380.000**; reference saving Rp20.000.
- Offline, 3 sessions: **Rp555.000**; reference saving Rp45.000.

### Couple counseling package

- Three meetings, online: **Rp350.000**; reference saving Rp25.000.
- Three meetings, offline: **Rp550.000**; reference saving Rp50.000.

The couple package's planned sequence is:

1. individual session for partner A;
2. individual session for partner B;
3. joint couple session.

All package purchases are paid in full upfront. The listed price, mode, duration, package count, sequence, and offering revision are snapshotted at purchase. The stated “format and number of sessions may be adjusted based on need and psychologist consideration” is not an authorization to silently mutate a paid package; any change requires an explicit Admin-supported package/appointment resolution, consent where relevant, and an audited record.

The savings figures are reference catalog copy, not an entitlement-level financial allocation. Refunds remain purchase-level Admin decisions under the existing RefundAction model.

## Consequences

Positive:

- the launch catalog has concrete prices and purchasable variants;
- individual packages map cleanly to sequential entitlements;
- the couple package has an explicit default sequence instead of an ambiguous “three sessions” label;
- historical OfferSnapshot/PackagePurchase values remain stable when catalog prices change.

Costs and constraints:

- psychologist assignment, price ownership, and availability must be defined before production slots are published;
- couple booking needs participant identity/consent and communication handling without introducing clinical records;
- package validity and cancellation/refund policy still affect the final product behavior;
- offline venue and mode-specific instructions are launch prerequisites.

## Open follow-up

Confirm which psychologist(s) can deliver each variant, mode-specific availability and venue, package validity, couple participant/consent model, booking cutoff, and cancellation/refund policy. Confirm whether “adjusted format/number” is handled only as Admin-created replacement offerings or as a documented package exception flow.
