# PRD 08 — Launch Gates

## Goal

Separate “the MVP can be reviewed” from “real clients can use production”.

## Must be true before production

1. Real Admin WhatsApp number, bank account, account holder, and QRIS asset configured.
2. Real Fuja schedule, venue, and online-meeting instructions verified.
3. Fuja profile credentials/publication consent verified.
4. Google SSO + StaffMembership + role checks wired; placeholder auth disabled.
5. Admin payment/cancellation workspace tested with real authorization boundaries.
6. Consent, privacy, safety, cancellation, and payment copy signed off.
7. Email provider and sender domain configured; confirmation/reminder delivery tested.
8. D1 backup/export and restore drill recorded with RPO/RTO evidence.
9. Rate limits, access-token lifecycle, and abuse response documented.
10. UAT covers booking, overlap, hold expiry, manual payment, rejection, confirmation, cancellation, and recovery paths.
11. No demo fixture or placeholder value is presented as production data.
12. Release sign-off is recorded by business, clinical/ethics, operations, finance, and technical owners.

## Not required for current MVP review

- Midtrans onboarding.
- Couple bookable launch.
- Clinical record/EMR.
- Automated WhatsApp provider.
- Full CMS/editor workflow.

## Evidence format

For each gate, record: owner, date, environment, test/result link, and sign-off. Keep the detailed G-1..G-14 checklist in `docs/adr/0096-launch-gate-checklist.md` as reference.
