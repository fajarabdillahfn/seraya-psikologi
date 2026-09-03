import { describe, expect, it } from "vitest";
import {
  BookingModule,
  normalizeIndonesianPhone,
  type IntakeInput,
} from "../../app/src/modules/booking";
import { DomainError, IntakeErrors } from "../../app/src/domain/types";

const baseIntake = (overrides: Partial<IntakeInput> = {}): IntakeInput => ({
  displayName: "Test Client",
  contactEmail: "client@example.com",
  contactPhone: "+628123456789",
  dateOfBirth: "1990-01-01",
  consentVersion: "v1",
  crisisAck: true,
  ...overrides,
});

const validate = (input: IntakeInput, now = "2026-09-03T06:59:59.999Z") => {
  const module = new BookingModule({} as never, {} as never);
  try {
    module.validateIntake(
      input,
      "2026-09-03T09:00:00.000Z",
      new Date(now),
    );
  } catch (error) {
    return error;
  }
  return null;
};

describe("BookingModule booking rules", () => {
  it("rejects booking exactly at the two-hour cutoff", () => {
    const error = validate(baseIntake(), "2026-09-03T07:00:00.000Z");

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.CutoffTooLate);
  });

  it("accepts booking one millisecond before the two-hour cutoff", () => {
    expect(validate(baseIntake())).toBeNull();
  });

  it("requires a WhatsApp phone number", () => {
    const error = validate(baseIntake({ contactPhone: "" }));

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.InvalidPhone);
  });

  it("accepts canonical Indonesian mobile numbers", () => {
    expect(validate(baseIntake({ contactPhone: "+628123456789" }))).toBeNull();
  });

  it("rejects non-Indonesian phone numbers", () => {
    const error = validate(baseIntake({ contactPhone: "+14155552671" }));

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.InvalidPhone);
  });

  it("normalizes common Indonesian phone input formats", () => {
    expect(normalizeIndonesianPhone("0812 3456 789")).toBe("+628123456789");
    expect(normalizeIndonesianPhone("0812.3456.789")).toBe("+628123456789");
    expect(normalizeIndonesianPhone("628123456789")).toBe("+628123456789");
    expect(normalizeIndonesianPhone("+628123456789")).toBe("+628123456789");
  });

  it("rejects clients younger than 18", () => {
    const error = validate(baseIntake({ dateOfBirth: "2010-01-01" }));

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.OutOfScope);
  });

  it("requires date of birth", () => {
    const error = validate(baseIntake({ dateOfBirth: "" }));

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.OutOfScope);
  });

  it("accepts a client on their exact 18th birthday in Jakarta", () => {
    const error = validate(
      baseIntake({ dateOfBirth: "2008-09-03" }),
      "2026-09-03T00:00:00.000Z",
    );
    expect(error).toBeNull();
  });

  it("rejects invalid date values", () => {
    const error = validate(baseIntake({ dateOfBirth: "invalid-date" }));
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(IntakeErrors.OutOfScope);
  });
});


describe("phone normalization", () => {
  it("leaves unsupported prefixes unchanged for validation to reject", () => {
    expect(normalizeIndonesianPhone("+14155552671")).toBe("+14155552671");
  });
});



describe("AvailabilityModule cutoff query", () => {
  it("queries only slots strictly after now plus two hours", async () => {
    const { AvailabilityModule } = await import("../../app/src/modules/availability");
    let query = "";
    let params: unknown[] = [];
    const db = {
      query: async <T>(q: { sql: string; params?: unknown[] }) => {
        query = q.sql; params = q.params ?? [];
        return { rows: [] as T[], rows_read: 0, rows_written: 0 };
      },
      batch: async () => ({ rows: [], rows_read: 0, rows_written: 0 }),
    };
    await new AvailabilityModule(db as never).listAvailableSlots({
      offeringId: "offering",
      now: new Date("2026-09-03T07:00:00.000Z"),
    });
    expect(query).toContain("s.starts_at_utc > ?");
    expect(params[1]).toBe("2026-09-03T09:00:00.000Z");
  });
});
