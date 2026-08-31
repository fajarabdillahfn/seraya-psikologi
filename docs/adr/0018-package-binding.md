# 18. Bind a Package to One Psychologist and Offering

## Status

Accepted for the MVP working model; package binding is single psychologist/offering. If that bound offering becomes unavailable, ADR 0060 requires same-offering resolution first and explicit client-approved refund/credit/transfer exception; automatic transfer remains prohibited.

## Context

A multi-session package needs stable continuity, duration/price semantics, availability generation, and refund accounting. Allowing sessions to move freely across psychologists or offerings would turn one package into a cross-catalog entitlement with many policy branches.

## Decision

A ServicePackage is bound to exactly one psychologist and one ServiceOffering for its normal lifecycle. All SessionEntitlement units and resulting Appointments inherit that binding.

Changing psychologist or ServiceOffering is not normal client behavior. If the practice later needs an exception, an authorized admin must perform an audited transfer/replacement operation with explicit policy and notification effects.

## Consequences

Positive:

- continuity expectations are clear to client and psychologist;
- package duration, price, and service semantics remain stable;
- availability and entitlement checks are simpler;
- refund/expiry calculations have fewer branches.

Costs and constraints:

- client cannot casually switch provider inside a package;
- provider unavailability needs an admin exception policy;
- package publication must display the binding clearly before purchase;
- future transfer support needs a separate audited operation.

## Open follow-up

Define package-unavailability resolution SLA, eligible events, client response timeout, refund/credit formula, extension behavior, and transfer terms/consent under ADR 0060.
