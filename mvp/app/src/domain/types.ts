/**
 * Domain types — shared vocabulary used across modules.
 * ADR 0089 §4.1–§4.4, ADR 0090 (BookingParticipant/AppointmentParticipant),
 * ADR 0094 (Client fields), ADR 0095 (cancellation matrix).
 */

export type Currency = "IDR";

export type ProgramPillar = "pulang" | "berdaya" | "bersama" | "berbagi";

export type ServiceMode = "online" | "offline";
export type AudienceKind = "individual" | "couple";

export type BookingState =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "failed"
  | "paid_late";

export type AppointmentState =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export type PaymentStatus =
  | "created"
  | "pending"
  | "settled"
  | "paid_late"
  | "failed"
  | "expired"
  | "refunded";

export type PaymentMethod = "qris" | "va";

export type RefundOutcome = "full_refund" | "no_refund";

export type RefundStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "reversed";

export type CancellationTargetKind =
  | "booking"
  | "appointment"
  | "package_purchase";

export type CancellationOutcome = "approve" | "deny";

export type CancellationRequestState = "pending" | "decided" | "withdrawn";

export type PartyRole = "payer" | "participant_a" | "participant_b";

export type AttendanceMode = "individual_a" | "individual_b" | "joint_both";

export type AudienceMatch =
  | "eligible_18_40"
  | "minor_16_17_guardian"
  | "out_of_scope";

export type CredentialStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "not_published";

export type PublishStatus = "published" | "not_published";

export type StaffRole = "admin" | "psychologist";

export type NotificationRecipientKind =
  | "client"
  | "staff"
  | "booking_participant";

export type NotificationEvent =
  | "booking.confirmed"
  | "booking.paid_late"
  | "booking.cancelled"
  | "appointment.scheduled"
  | "appointment.reminder_24h"
  | "appointment.reminder_2h"
  | "appointment.outcome_recorded"
  | "couple.consent_required";

export type ContentKind = "page" | "section" | "legal";

export interface OfferSnapshot {
  id: string;
  offeringId: string;
  packageId: string | null;
  priceIdr: number;
  currency: Currency;
  durationMinutes: number;
  transitionBufferMin: number;
  mode: ServiceMode;
  policyVersion: string;
  createdAt: string;
}

export interface Client {
  id: string;
  displayName: string;
  contactEmail: string;
  contactEmailVerifiedAt: string | null;
  contactPhone: string | null;
  dateOfBirth: string | null;
  ageAtBooking: number | null;
  isMinor: boolean;
  audienceMatch: AudienceMatch;
  guardianPayload: unknown | null;
  redactedAt: string | null;
  pseudonym: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  offerSnapshotId: string;
  state: BookingState;
  isPackage: boolean;
  isCouple: boolean;
  intakeShortMessage: string | null;
  crisisAck: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingParticipant {
  id: string;
  bookingId: string;
  partyRole: PartyRole;
  clientId: string;
  displayNameSnapshot: string;
  contactEmailSnapshot: string;
  consentRecordId: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  bookingId: string;
  psychologistId: string;
  offeringId: string;
  sessionStartsAtUtc: string;
  sessionEndsAtUtc: string;
  state: AppointmentState;
  outcomeAt: string | null;
  outcomeBy: string | null;
  outcomeReason: string | null;
  lateArrivalAt: string | null;
  correctionWindowUntil: string | null;
  createdAt: string;
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  bookingParticipantId: string;
  attendanceMode: AttendanceMode;
}

export interface CapacityReservation {
  id: string;
  psychologistId: string;
  reservationKind: "slot_hold" | "appointment";
  parentId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  state: "hold_active" | "confirmed" | "released" | "consumed" | "expired";
  createdAt: string;
  releasedAt: string | null;
}

export interface SlotHold {
  id: string;
  bookingId: string;
  slotId: string;
  expiresAt: string;
  state: "active" | "consumed" | "released" | "expired";
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amountIdr: number;
  currency: Currency;
  method: PaymentMethod;
  provider: string;
  status: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
  settledAt: string | null;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  providerEventId: string;
  receivedAt: string;
  verified: boolean;
  signatureStatus: string;
  payloadAmountIdr: number;
  payloadMethod: PaymentMethod;
  payloadOrderId: string;
  payloadMerchantId: string;
  amountMatch: boolean;
  currencyMatch: boolean;
  orderMatch: boolean;
  merchantMatch: boolean;
  processingStatus:
    | "received"
    | "applied"
    | "rejected"
    | "replay"
    | "unknown";
}

export interface RefundAction {
  id: string;
  paymentId: string;
  outcome: RefundOutcome;
  amountIdr: number;
  currency: Currency;
  reasonCategory: string;
  policyVersion: string;
  actorMembershipId: string | null;
  approvalMembershipId: string | null;
  status: RefundStatus;
  providerReference: string | null;
  idempotencyKey: string;
  createdAt: string;
  finalizedAt: string | null;
}

export interface CancellationRequest {
  id: string;
  targetKind: CancellationTargetKind;
  targetId: string;
  clientId: string;
  intakeChannel: string;
  intakeSummary: string | null;
  state: CancellationRequestState;
  createdAt: string;
  decidedAt: string | null;
}

export interface CancellationDecision {
  id: string;
  cancellationRequestId: string;
  outcome: CancellationOutcome;
  reasonCategory: string;
  policyVersion: string;
  actorMembershipId: string;
  actorAt: string;
  effectsAppliedAt: string | null;
  refundActionId: string | null;
}

export interface AuditRecord {
  id: string;
  actorKind: "staff" | "client" | "system";
  actorId: string | null;
  command: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  beforeState: string | null;
  afterState: string | null;
  recordedAt: string;
}

export interface StaffMembership {
  id: string;
  googleSubject: string;
  email: string;
  displayName: string;
  state: "active" | "disabled";
  invitedByMembershipId: string | null;
  invitedAt: string;
  activatedAt: string | null;
}

export interface ClientAccessToken {
  id: string;
  clientId: string;
  bookingId: string | null;
  tokenHash: string;
  purpose: "booking_view" | "booking_reschedule" | "couple_view";
  issuedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  resendInvalidates: boolean;
}

export interface ConsentRecord {
  id: string;
  clientId: string;
  purpose: string;
  version: string;
  source: string;
  acknowledgedAt: string;
  policyTextSnapshot: string;
}

/** Typed error surface used across modules (ADR 0089 §5.2). */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const IntakeErrors = {
  MissingName: "E-INTAKE-MISSING-NAME",
  MissingEmail: "E-INTAKE-MISSING-EMAIL",
  InvalidConsentVersion: "E-INTAKE-INVALID-CONSENT-VERSION",
  CrisisAckNotSet: "E-INTAKE-CRISIS-ACK-NOT-SET",
  ClinicalNarrative: "E-INTAKE-CLINICAL-NARRATIVE",
  InvalidPhone: "E-INTAKE-INVALID-PHONE",
  MinorNoGuardian: "E-MINOR-NO-GUARDIAN",
  MinorInvalidGuardianConsent: "E-MINOR-INVALID-GUARDIAN-CONSENT",
  OutOfScope: "E-ELIGIBILITY-OUT-OF-SCOPE",
  CutoffTooLate: "E-CUTOFF-TOO-LATE",
} as const;