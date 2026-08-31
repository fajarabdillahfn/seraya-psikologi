# 30. Allow Editors to Publish CMS Content Directly

## Status

Accepted for the MVP working model; exact content types, fields, media handling, and admin rollback authority remain open.

## Context

The MVP has an Editor role and needs a lightweight CMS for public service/team/FAQ/editorial content. Requiring a separate review state would slow the small team if the user intentionally grants editors publishing authority. Direct publish still needs attribution, revision history, and rollback to avoid untraceable public changes.

## Decision

ContentEntry supports draft, published, and archived states. An Editor may directly publish content within the content domain. Every create/edit/publish/archive operation creates a ContentRevision/audit record with actor, timestamp, and status transition. Admin retains operational oversight and rollback/disable authority. Content entities cannot contain client, payment, booking, or clinical records.

## Consequences

Positive:

- small team can publish without an extra approval bottleneck;
- public content remains attributable and reversible;
- editor permissions stay separate from operational/PII access;
- content lifecycle is simple enough for MVP.

Costs and constraints:

- editor training and content standards matter;
- accidental publication needs rollback and audit;
- media/SEO/cache invalidation need explicit behavior;
- admin cannot rely on review state as a safety net.

## Open follow-up

Define supported content types, required fields, slug/version behavior, media storage, rollback semantics, cache invalidation, and whether profile/service facts require admin lock fields.
