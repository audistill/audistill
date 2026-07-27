import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LicenseService, LicenseState } from './license-service'
import { DatabaseService } from './database-service'
import { PolarClient, PolarError, ValidateResult } from './polar-client'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  net: { fetch: vi.fn() },
}))

function createFakePolar() {
  return {
    validate: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  } as unknown as PolarClient
}

function grantedValidation(activationId = 'act-1', meta = {}): ValidateResult {
  return {
    status: 'granted',
    displayKey: '****-E304DA',
    limitActivations: 3,
    lastValidatedAt: '2026-06-10T12:00:00Z',
    expiresAt: null,
    activation: { id: activationId, label: 'MacBook', meta: meta as Record<string, string> },
  }
}

describe('LicenseService', () => {
  let db: DatabaseService
  let polar: ReturnType<typeof createFakePolar>
  let now: number

  beforeEach(() => {
    db = new DatabaseService(':memory:')
    polar = createFakePolar()
    now = new Date('2026-06-13T10:00:00Z').getTime()
  })

  function createService(opts?: { officialBuild?: boolean; machineId?: string }) {
    return new LicenseService({
      db,
      polar: polar as unknown as PolarClient,
      clock: () => now,
      machineId: opts?.machineId ?? 'machine-abc',
      officialBuild: opts?.officialBuild ?? true,
    })
  }

  describe('official build bypass', () => {
    it('returns licensed immediately when not an official build', async () => {
      const service = createService({ officialBuild: false })
      await service.init()
      expect(service.getState()).toBe('licensed')
    })

    it('does not write to database when not an official build', async () => {
      const service = createService({ officialBuild: false })
      await service.init()
      expect(db.getLicenseRecord()).toBeNull()
    })
  })

  describe('trial', () => {
    it('starts trial on first launch', async () => {
      const service = createService()
      await service.init()
      expect(service.getState()).toBe('trial')
    })

    it('writes trial_started_at and machine_id on first launch', async () => {
      const service = createService()
      await service.init()
      const record = db.getLicenseRecord()
      expect(record!.trial_started_at).toBe('2026-06-13T10:00:00.000Z')
      expect(record!.machine_id).toBe('machine-abc')
    })

    it('reports days remaining during trial', async () => {
      const service = createService()
      await service.init()
      expect(service.getTrialDaysRemaining()).toBe(14)
    })

    it('reports fewer days as time passes', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-06-01T10:00:00.000Z',
        machine_id: 'machine-abc',
      })
      now = new Date('2026-06-11T10:00:00Z').getTime()

      const service = createService()
      await service.init()
      expect(service.getState()).toBe('trial')
      expect(service.getTrialDaysRemaining()).toBe(4)
    })
  })

  describe('trial expiry', () => {
    it('transitions to trial-expired after 14 days', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-05-30T10:00:00.000Z',
        machine_id: 'machine-abc',
      })
      now = new Date('2026-06-13T10:00:01.000Z').getTime()

      const service = createService()
      await service.init()
      expect(service.getState()).toBe('trial-expired')
    })
  })

  describe('activation', () => {
    it('activates with a new key (no prior activation)', async () => {
      vi.mocked(polar.validate).mockResolvedValue({
        ...grantedValidation(),
        activation: null,
      })
      vi.mocked(polar.activate).mockResolvedValue({
        activationId: 'act-new',
        label: 'MacBook',
        meta: { machineId: 'machine-abc' },
        licenseStatus: 'granted',
        limitActivations: 3,
      })

      const service = createService()
      await service.init()
      await service.activate('KEY-123')

      expect(service.getState()).toBe('licensed')
      expect(polar.validate).toHaveBeenCalled()
      expect(polar.activate).toHaveBeenCalled()

      const record = db.getLicenseRecord()
      expect(record!.license_key).toBe('KEY-123')
      expect(record!.activation_id).toBe('act-new')
    })

    it('reuses existing activation if machine ID matches (validate-first)', async () => {
      vi.mocked(polar.validate).mockResolvedValue(
        grantedValidation('act-existing', { machineId: 'machine-abc' })
      )

      const service = createService()
      await service.init()
      await service.activate('KEY-123')

      expect(service.getState()).toBe('licensed')
      expect(polar.activate).not.toHaveBeenCalled()

      const record = db.getLicenseRecord()
      expect(record!.activation_id).toBe('act-existing')
    })

    it('activates from trial-expired state', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-05-01T00:00:00.000Z',
        machine_id: 'machine-abc',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockResolvedValue({
        ...grantedValidation(),
        activation: null,
      })
      vi.mocked(polar.activate).mockResolvedValue({
        activationId: 'act-1',
        label: 'Mac',
        meta: { machineId: 'machine-abc' },
        licenseStatus: 'granted',
        limitActivations: 3,
      })

      const service = createService()
      await service.init()
      expect(service.getState()).toBe('trial-expired')

      await service.activate('KEY-123')
      expect(service.getState()).toBe('licensed')
    })

    it('throws PolarError on invalid key', async () => {
      vi.mocked(polar.validate).mockRejectedValue(
        new PolarError('invalid-key', 'Not found')
      )

      const service = createService()
      await service.init()

      await expect(service.activate('BAD-KEY')).rejects.toMatchObject({
        type: 'invalid-key',
      })
      expect(service.getState()).toBe('trial')
    })

    it('throws PolarError on activation limit', async () => {
      vi.mocked(polar.validate).mockResolvedValue({
        ...grantedValidation(),
        activation: null,
      })
      vi.mocked(polar.activate).mockRejectedValue(
        new PolarError('activation-limit', 'Limit reached')
      )

      const service = createService()
      await service.init()

      await expect(service.activate('KEY-123')).rejects.toMatchObject({
        type: 'activation-limit',
      })
      expect(service.getState()).toBe('trial')
    })
  })

  describe('revalidation on launch', () => {
    it('revalidates on init when licensed and updates last_validated_at', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-06-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-12T00:00:00.000Z',
      })

      vi.mocked(polar.validate).mockResolvedValue(grantedValidation())

      const service = createService()
      await service.init()

      expect(service.getState()).toBe('licensed')
      const record = db.getLicenseRecord()
      expect(record!.last_validated_at).toBe('2026-06-13T10:00:00.000Z')
    })

    it('stays licensed on network failure within grace period', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-06-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-10T00:00:00.000Z',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockRejectedValue(
        new PolarError('network-error', 'Offline')
      )

      const service = createService()
      await service.init()

      expect(service.getState()).toBe('licensed')
    })

    it('transitions to license-invalid when grace period expires', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-05-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-05-01T00:00:00.000Z',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockRejectedValue(
        new PolarError('network-error', 'Offline')
      )

      const service = createService()
      await service.init()

      expect(service.getState()).toBe('license-invalid')
    })

    it('transitions to license-invalid immediately on revoked', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-06-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-12T00:00:00.000Z',
      })

      vi.mocked(polar.validate).mockResolvedValue({
        ...grantedValidation(),
        status: 'revoked',
      })

      const service = createService()
      await service.init()

      expect(service.getState()).toBe('license-invalid')
    })
  })

  describe('deactivation', () => {
    it('deactivates and transitions to trial-expired when trial has elapsed', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-05-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-12T00:00:00.000Z',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockResolvedValue(grantedValidation())
      vi.mocked(polar.deactivate).mockResolvedValue(undefined)

      const service = createService()
      await service.init()
      expect(service.getState()).toBe('licensed')

      await service.deactivate()

      expect(service.getState()).toBe('trial-expired')
      expect(polar.deactivate).toHaveBeenCalledWith('KEY-123', 'act-1')

      const record = db.getLicenseRecord()
      expect(record!.license_key).toBeNull()
      expect(record!.activation_id).toBeNull()
    })

    it('deactivates and transitions to trial when days remain', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-06-10T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-12T00:00:00.000Z',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockResolvedValue(grantedValidation())
      vi.mocked(polar.deactivate).mockResolvedValue(undefined)

      const service = createService()
      await service.init()

      await service.deactivate()
      expect(service.getState()).toBe('trial')
    })
  })

  describe('state change events', () => {
    it('emits state-change on activation', async () => {
      vi.mocked(polar.validate).mockResolvedValue({
        ...grantedValidation(),
        activation: null,
      })
      vi.mocked(polar.activate).mockResolvedValue({
        activationId: 'act-1',
        label: 'Mac',
        meta: { machineId: 'machine-abc' },
        licenseStatus: 'granted',
        limitActivations: 3,
      })

      const service = createService()
      await service.init()

      const changes: LicenseState[] = []
      service.onStateChange((state) => changes.push(state))

      await service.activate('KEY-123')
      expect(changes).toEqual(['licensed'])
    })

    it('emits state-change on deactivation', async () => {
      db.upsertLicenseRecord({
        trial_started_at: '2026-05-01T00:00:00.000Z',
        machine_id: 'machine-abc',
        license_key: 'KEY-123',
        activation_id: 'act-1',
        last_validated_at: '2026-06-12T00:00:00.000Z',
      })
      now = new Date('2026-06-13T10:00:00Z').getTime()

      vi.mocked(polar.validate).mockResolvedValue(grantedValidation())
      vi.mocked(polar.deactivate).mockResolvedValue(undefined)

      const service = createService()
      await service.init()

      const changes: LicenseState[] = []
      service.onStateChange((state) => changes.push(state))

      await service.deactivate()
      expect(changes).toEqual(['trial-expired'])
    })
  })
})
