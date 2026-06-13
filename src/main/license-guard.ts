import { LicenseService } from './license-service'

export class LicenseRequiredError extends Error {
  reason: 'trial-expired' | 'license-invalid'

  constructor(reason: 'trial-expired' | 'license-invalid') {
    super(reason === 'trial-expired' ? 'Trial has ended' : 'License could not be verified')
    this.name = 'LicenseRequiredError'
    this.reason = reason
  }
}

export function requireLicense(licenseService: LicenseService): void {
  const state = licenseService.getState()
  if (state === 'trial-expired' || state === 'license-invalid') {
    throw new LicenseRequiredError(state)
  }
}
