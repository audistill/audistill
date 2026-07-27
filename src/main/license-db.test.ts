import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from './database-service'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
}))

describe('DatabaseService - license table', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  it('returns null when no license record exists', () => {
    const record = db.getLicenseRecord()
    expect(record).toBeNull()
  })

  it('inserts a license record on first upsert', () => {
    db.upsertLicenseRecord({
      trial_started_at: '2026-06-01T00:00:00.000Z',
      machine_id: 'abc123',
    })

    const record = db.getLicenseRecord()
    expect(record).not.toBeNull()
    expect(record!.trial_started_at).toBe('2026-06-01T00:00:00.000Z')
    expect(record!.machine_id).toBe('abc123')
    expect(record!.license_key).toBeNull()
    expect(record!.activation_id).toBeNull()
    expect(record!.last_validated_at).toBeNull()
  })

  it('updates an existing license record on subsequent upsert', () => {
    db.upsertLicenseRecord({
      trial_started_at: '2026-06-01T00:00:00.000Z',
      machine_id: 'abc123',
    })

    db.upsertLicenseRecord({
      license_key: 'AUDISTILL_xxxx-yyyy',
      activation_id: 'act-001',
      last_validated_at: '2026-06-10T12:00:00.000Z',
    })

    const record = db.getLicenseRecord()
    expect(record!.trial_started_at).toBe('2026-06-01T00:00:00.000Z')
    expect(record!.machine_id).toBe('abc123')
    expect(record!.license_key).toBe('AUDISTILL_xxxx-yyyy')
    expect(record!.activation_id).toBe('act-001')
    expect(record!.last_validated_at).toBe('2026-06-10T12:00:00.000Z')
  })

  it('partial update only changes specified fields', () => {
    db.upsertLicenseRecord({
      trial_started_at: '2026-06-01T00:00:00.000Z',
      machine_id: 'abc123',
      license_key: 'AUDISTILL_xxxx-yyyy',
      activation_id: 'act-001',
      last_validated_at: '2026-06-10T12:00:00.000Z',
    })

    db.upsertLicenseRecord({
      last_validated_at: '2026-06-11T08:00:00.000Z',
    })

    const record = db.getLicenseRecord()
    expect(record!.license_key).toBe('AUDISTILL_xxxx-yyyy')
    expect(record!.activation_id).toBe('act-001')
    expect(record!.last_validated_at).toBe('2026-06-11T08:00:00.000Z')
  })

  it('can clear fields by setting them to null', () => {
    db.upsertLicenseRecord({
      trial_started_at: '2026-06-01T00:00:00.000Z',
      machine_id: 'abc123',
      license_key: 'AUDISTILL_xxxx-yyyy',
      activation_id: 'act-001',
    })

    db.upsertLicenseRecord({
      license_key: null,
      activation_id: null,
    })

    const record = db.getLicenseRecord()
    expect(record!.license_key).toBeNull()
    expect(record!.activation_id).toBeNull()
    expect(record!.trial_started_at).toBe('2026-06-01T00:00:00.000Z')
  })
})
