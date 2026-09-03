import { describe, expect, it } from "vitest";
import { DomainError, IntakeErrors } from "../../app/src/domain/types";
import {
  validateClientProfile,
  type ClientProfileInput,
} from "../../app/src/modules/client";

const profile = (overrides: Partial<ClientProfileInput> = {}): ClientProfileInput => ({
  namaPanggilan: "Budi",
  dateOfBirth: "1990-01-01",
  jenisKelamin: "Laki-laki",
  pekerjaan: "Karyawan",
  pendidikan: "Sarjana",
  contactPhone: "08123456789",
  statusPernikahan: "Belum Menikah",
  agama: "Islam",
  negara: "Indonesia",
  provinsi: "Jawa Timur",
  kotaKabupaten: "Kabupaten Malang",
  alamatLengkap: "Jalan Contoh Nomor 10, Kepuharjo",
  ...overrides,
});

describe("client profile validation", () => {
  it("normalizes an Indonesian phone number", () => {
    expect(validateClientProfile(profile()).contactPhone).toBe("+628123456789");
  });

  it("requires every profile field", () => {
    expect(() => validateClientProfile(profile({ agama: "" }))).toThrow(DomainError);
  });

  it("rejects an under-18 client", () => {
    try {
      validateClientProfile(profile({ dateOfBirth: "2010-01-01" }));
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(IntakeErrors.OutOfScope);
    }
  });

  it("accepts an adult on their exact birthday in Jakarta", () => {
    expect(() => validateClientProfile(
      profile({ dateOfBirth: "2008-09-03" }),
      new Date("2026-09-02T17:00:00.000Z"),
    )).not.toThrow();
  });
});


describe("profile data minimization", () => {
  it("keeps the profile field contract explicit", () => {
    const value = validateClientProfile(profile());
    expect(Object.keys(value).sort()).toEqual([
      "alamatLengkap",
      "agama",
      "contactPhone",
      "dateOfBirth",
      "jenisKelamin",
      "kotaKabupaten",
      "negara",
      "namaPanggilan",
      "pekerjaan",
      "pendidikan",
      "provinsi",
      "statusPernikahan",
    ].sort());
  });
});

export {};
