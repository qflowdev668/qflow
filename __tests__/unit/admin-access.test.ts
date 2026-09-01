import {
  normalizeSaPhone,
  getAdminOtpConfig,
  isBootstrapAdminPhone,
  isAuthorizedAdminPhone,
  resolveAdminByPhone,
} from "@/lib/admin-access"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

describe("Admin access helpers", () => {
  const prevPhone = process.env.ADMIN_OTP_PHONE
  const prevEmail = process.env.ADMIN_OTP_EMAIL

  afterEach(() => {
    process.env.ADMIN_OTP_PHONE = prevPhone
    process.env.ADMIN_OTP_EMAIL = prevEmail
  })

  it("normalizes SA mobiles to 0XXXXXXXXX", () => {
    expect(normalizeSaPhone("0821234567")).toBe("0821234567")
    expect(normalizeSaPhone("+27821234567")).toBe("0821234567")
    expect(normalizeSaPhone("27821234567")).toBe("0821234567")
  })

  it("normalizes 9-digit and overlong leading-zero inputs", () => {
    expect(normalizeSaPhone("821234567")).toBe("0821234567")
    expect(normalizeSaPhone("0821234567999")).toBe("0821234567")
  })

  it("reads bootstrap config from env", () => {
    process.env.ADMIN_OTP_PHONE = "0821234567"
    process.env.ADMIN_OTP_EMAIL = "admin@example.com"
    expect(getAdminOtpConfig()).toEqual({
      phone: "0821234567",
      email: "admin@example.com",
    })
  })

  it("returns null bootstrap config when incomplete", () => {
    process.env.ADMIN_OTP_PHONE = ""
    process.env.ADMIN_OTP_EMAIL = "admin@example.com"
    expect(getAdminOtpConfig()).toBeNull()

    process.env.ADMIN_OTP_PHONE = "0821234567"
    process.env.ADMIN_OTP_EMAIL = "not-an-email"
    expect(getAdminOtpConfig()).toBeNull()
  })

  it("detects bootstrap phone", () => {
    process.env.ADMIN_OTP_PHONE = "0821234567"
    process.env.ADMIN_OTP_EMAIL = "admin@example.com"
    expect(isBootstrapAdminPhone("0821234567")).toBe(true)
    expect(isBootstrapAdminPhone("0830000000")).toBe(false)
  })

  it("isAuthorizedAdminPhone mirrors bootstrap check", () => {
    process.env.ADMIN_OTP_PHONE = "0821234567"
    process.env.ADMIN_OTP_EMAIL = "admin@example.com"
    expect(isAuthorizedAdminPhone("0821234567")).toBe(true)
    expect(isAuthorizedAdminPhone("0830000000")).toBe(false)
  })

  it("returns false bootstrap check when env unset", () => {
    delete process.env.ADMIN_OTP_PHONE
    delete process.env.ADMIN_OTP_EMAIL
    expect(isBootstrapAdminPhone("0821234567")).toBe(false)
  })

  it("resolveAdminByPhone returns bootstrap identity", async () => {
    process.env.ADMIN_OTP_PHONE = "0821234567"
    process.env.ADMIN_OTP_EMAIL = "admin@example.com"
    const service = {
      from: jest.fn(),
    } as unknown as SupabaseClient<Database>

    const identity = await resolveAdminByPhone(service, "0821234567")
    expect(identity).toEqual({
      phone: "0821234567",
      email: "admin@example.com",
      name: "QFlow Admin",
      accountId: null,
      isBootstrap: true,
    })
    expect(service.from).not.toHaveBeenCalled()
  })

  it("resolveAdminByPhone returns null for short phone", async () => {
    const service = { from: jest.fn() } as unknown as SupabaseClient<Database>
    await expect(resolveAdminByPhone(service, "123")).resolves.toBeNull()
  })

  it("resolveAdminByPhone loads active DB admin", async () => {
    process.env.ADMIN_OTP_PHONE = "0829999999"
    process.env.ADMIN_OTP_EMAIL = "bootstrap@example.com"

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "admin-row-1",
        name: "Clinic Admin",
        cell_number: "0821234567",
        email: "  clinic@example.com ",
        is_active: true,
      },
      error: null,
    })
    const service = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle,
      })),
    } as unknown as SupabaseClient<Database>

    const identity = await resolveAdminByPhone(service, "0821234567")
    expect(identity).toEqual({
      phone: "0821234567",
      email: "clinic@example.com",
      name: "Clinic Admin",
      accountId: "admin-row-1",
      isBootstrap: false,
    })
  })

  it("resolveAdminByPhone rejects inactive DB admin", async () => {
    process.env.ADMIN_OTP_PHONE = "0829999999"
    process.env.ADMIN_OTP_EMAIL = "bootstrap@example.com"

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "admin-row-2",
        name: "Inactive",
        cell_number: "0821234567",
        email: "inactive@example.com",
        is_active: false,
      },
      error: null,
    })
    const service = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle,
      })),
    } as unknown as SupabaseClient<Database>

    await expect(resolveAdminByPhone(service, "0821234567")).resolves.toBeNull()
  })
})
