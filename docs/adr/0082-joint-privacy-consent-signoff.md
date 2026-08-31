# 82. Joint Privacy and Consent Sign-off

## Status

Accepted for launch planning.

## Context

Seraya's MVP handles sensitive transactional and contact data around psychological services while intentionally excluding clinical records. Privacy, consent, retention, public clinical wording, and technical controls cross both clinical/ethical and engineering responsibilities.

## Decision

Use joint sign-off with distinct ownership:

- **Clinical/ethical owner (istri/clinical lead):** consent purpose/wording, public clinical and crisis-boundary wording, professional profile/service claims, client-facing privacy expectations related to psychological services, and ethical suitability of data collection.
- **Technical/data owner (user):** data inventory, access control, retention implementation, deletion/redaction/anonymization mechanics, security logging, provider configuration, and technical verification.
- **Joint sign-off:** cross-cutting consent/retention policy, launch privacy wording, and any change that alters both clinical meaning and data behavior.

The PRD records decisions and implementation boundaries; it does not claim external legal approval. External review may be added if the owners decide it is needed, but it is not introduced as an automatic MVP blocker by this ADR.

## Consequences

Positive:

- clinical meaning is not decided by engineering alone;
- technical retention/access behavior is not left implicit in clinical copy;
- sign-off responsibility is visible for future policy changes.

Costs and constraints:

- some changes require both owners to review;
- unresolved retention/consent choices remain explicit rather than silently defaulted;
- implementation cannot publish clinical/professional claims without the clinical owner sign-off.

## Open follow-up

Set category-specific retention durations/triggers, consent versions/purpose text, PrivacyRequest handling, public privacy copy, and the evidence/checklist used by both owners for launch sign-off.
