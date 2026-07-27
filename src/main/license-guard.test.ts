import { describe, it, expect, vi } from 'vitest'
import { requireLicense, LicenseRequiredError } from './license-guard'
import { LicenseService } from './license-service'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  net: { fetch: vi.fn() },
}))

function mockLicenseService(state: string) {
  return { getState: () => state } as unknown as LicenseService
}

describe('requireLicense', () => {
  it('does not throw when state is trial', () => {
    expect(() => requireLicense(mockLicenseService('trial'))).not.toThrow()
  })

  it('does not throw when state is licensed', () => {
    expect(() => requireLicense(mockLicenseService('licensed'))).not.toThrow()
  })

  it('throws LicenseRequiredError with reason trial-expired', () => {
    expect(() => requireLicense(mockLicenseService('trial-expired'))).toThrow(LicenseRequiredError)
    try {
      requireLicense(mockLicenseService('trial-expired'))
    } catch (err) {
      expect((err as LicenseRequiredError).reason).toBe('trial-expired')
    }
  })

  it('throws LicenseRequiredError with reason license-invalid', () => {
    expect(() => requireLicense(mockLicenseService('license-invalid'))).toThrow(LicenseRequiredError)
    try {
      requireLicense(mockLicenseService('license-invalid'))
    } catch (err) {
      expect((err as LicenseRequiredError).reason).toBe('license-invalid')
    }
  })
})
