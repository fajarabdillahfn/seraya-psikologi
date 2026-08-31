# 57. Launch with One Payment Gateway Behind an Adapter

## Status

Accepted for launch planning; Midtrans + Snap is selected by ADR 0068 and the initial method categories are QRIS + bank transfer/Virtual Account by ADR 0069. Exact activated method set, merchant eligibility, gateway limits, method-specific refund coverage/fees, and reconciliation cadence remain pre-launch verification items.

## Context

Supporting multiple gateways at launch multiplies PaymentEvent verification, refund behavior, failure modes, and reconciliation. The domain already separates Payment, PaymentEvent, and RefundAction from provider details, so a second provider can be added later without making it a launch requirement.

## Decision

Launch with Midtrans as the single gateway-of-record and Snap as the initial hosted checkout behind an internal PaymentGatewayAdapter boundary (ADR 0068). The adapter maps create-intent, verify webhook/event, expire/cancel, refund, and reconciliation operations to provider-neutral PaymentEvent/RefundAction state. Domain records never depend on provider-specific status names or redirect assumptions.

Manual/WhatsApp fallback may exist as a support path but is not an automated second payment source in MVP.

## Consequences

Positive:

- one integration/reconciliation path to validate;
- provider changes do not leak into domain entities;
- future second gateway can implement the same adapter contract;
- operational support can focus on one failure model.

Costs and constraints:

- provider lock-in remains at adapter implementation/configuration;
- chosen gateway must support required intent/webhook/refund operations;
- failover is not available at launch;
- provider selection needs merchant onboarding/capability verification; Midtrans + Snap is selected for launch;
- activated methods, method-specific refund coverage/fees, webhook verification, and reconciliation still need evidence.

## Open follow-up

Verify exact Midtrans QRIS and bank transfer/VA method codes, merchant onboarding, limits, fees, refund coverage, webhook payloads, retry/dead-letter handling, and reconciliation cadence. Provider-of-record, Snap checkout surface, and launch method categories are resolved by ADR 0068/0069.
