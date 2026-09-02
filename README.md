# Seraya Psikologi

Booking and payment MVP for Seraya Psikologi.

## Start here

- Project overview: [`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md)
- Workboard: [`docs/WORKBOARD.md`](docs/WORKBOARD.md)
- Focused PRDs: [`docs/prd/README.md`](docs/prd/README.md)
- Long-form technical decisions: [`docs/adr/`](docs/adr/)

## Live

- Documentation: https://seraya-psikologi-docs.pages.dev
- MVP Worker: https://seraya-psikologi.aurinko-jar-ai.workers.dev
- GitHub: https://github.com/fajarabdillahfn/seraya-psikologi

## Current launch path

The MVP uses manual payment: the client receives a PDF/text invoice, transfers via the configured bank/QRIS method, sends proof to Admin WhatsApp, and Admin verifies it in the workspace. Midtrans is deferred.

## Important boundary

This is not an EMR. It must not store clinical notes, diagnoses, assessment results, transcripts, or session notes.

## Local development

```bash
npm install
npx wrangler dev
```

See `mvp/README.md` for implementation limitations and production gates. Demo seed data is available through `scripts/seed-d1.sh`; demo schedule/payment values are not production evidence.
