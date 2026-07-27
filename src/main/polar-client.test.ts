import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolarClient, PolarError } from './polar-client'

vi.mock('electron', () => ({
  net: {
    fetch: vi.fn(),
  },
}))

import { net } from 'electron'

const mockFetch = vi.mocked(net.fetch)

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('PolarClient', () => {
  let client: PolarClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new PolarClient({
      baseUrl: 'https://api.polar.sh',
      organizationId: 'org-test-123',
    })
  })

  describe('validate', () => {
    it('returns granted status on successful validation', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(200, {
          id: 'lk-1',
          status: 'granted',
          display_key: '****-E304DA',
          limit_activations: 3,
          last_validated_at: '2026-06-10T12:00:00Z',
          expires_at: null,
          activation: {
            id: 'act-1',
            label: 'MacBook Pro',
            meta: { machineId: 'abc' },
          },
        })
      )

      const result = await client.validate('KEY-123', 'act-1')

      expect(result).toEqual({
        status: 'granted',
        displayKey: '****-E304DA',
        limitActivations: 3,
        lastValidatedAt: '2026-06-10T12:00:00Z',
        expiresAt: null,
        activation: { id: 'act-1', label: 'MacBook Pro', meta: { machineId: 'abc' } },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polar.sh/v1/customer-portal/license-keys/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'KEY-123',
            organization_id: 'org-test-123',
            activation_id: 'act-1',
          }),
        })
      )
    })

    it('returns revoked status', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(200, {
          id: 'lk-1',
          status: 'revoked',
          display_key: '****-E304DA',
          limit_activations: 3,
          last_validated_at: '2026-06-10T12:00:00Z',
          expires_at: null,
          activation: null,
        })
      )

      const result = await client.validate('KEY-123')
      expect(result.status).toBe('revoked')
    })

    it('throws invalid-key error on 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse(404, { detail: 'Not found' }))

      await expect(client.validate('BAD-KEY')).rejects.toThrow(PolarError)
      await expect(client.validate('BAD-KEY')).rejects.toMatchObject({
        type: 'invalid-key',
      })
    })

    it('throws network-error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND'))

      await expect(client.validate('KEY-123')).rejects.toThrow(PolarError)
      await expect(client.validate('KEY-123')).rejects.toMatchObject({
        type: 'network-error',
      })
    })
  })

  describe('activate', () => {
    it('returns activation id on success', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(200, {
          id: 'act-new',
          license_key_id: 'lk-1',
          label: 'My Mac',
          meta: { machineId: 'xyz' },
          created_at: '2026-06-11T00:00:00Z',
          license_key: {
            id: 'lk-1',
            status: 'granted',
            limit_activations: 3,
          },
        })
      )

      const result = await client.activate('KEY-123', 'My Mac', { machineId: 'xyz' })

      expect(result).toEqual({
        activationId: 'act-new',
        label: 'My Mac',
        meta: { machineId: 'xyz' },
        licenseStatus: 'granted',
        limitActivations: 3,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polar.sh/v1/customer-portal/license-keys/activate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'KEY-123',
            organization_id: 'org-test-123',
            label: 'My Mac',
            meta: { machineId: 'xyz' },
          }),
        })
      )
    })

    it('throws activation-limit error on 403', async () => {
      mockFetch.mockResolvedValue(jsonResponse(403, { detail: 'Activation limit reached' }))

      await expect(client.activate('KEY-123', 'Mac', {})).rejects.toThrow(PolarError)
      await expect(client.activate('KEY-123', 'Mac', {})).rejects.toMatchObject({
        type: 'activation-limit',
      })
    })

    it('throws invalid-key error on 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse(404, { detail: 'Not found' }))

      await expect(client.activate('BAD', 'Mac', {})).rejects.toThrow(PolarError)
      await expect(client.activate('BAD', 'Mac', {})).rejects.toMatchObject({
        type: 'invalid-key',
      })
    })

    it('throws network-error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('ETIMEDOUT'))

      await expect(client.activate('KEY', 'Mac', {})).rejects.toThrow(PolarError)
      await expect(client.activate('KEY', 'Mac', {})).rejects.toMatchObject({
        type: 'network-error',
      })
    })
  })

  describe('deactivate', () => {
    it('resolves on 204 success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
      } as Response)

      await expect(client.deactivate('KEY-123', 'act-1')).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polar.sh/v1/customer-portal/license-keys/deactivate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'KEY-123',
            organization_id: 'org-test-123',
            activation_id: 'act-1',
          }),
        })
      )
    })

    it('throws invalid-key error on 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse(404, { detail: 'Not found' }))

      await expect(client.deactivate('BAD', 'act-1')).rejects.toMatchObject({
        type: 'invalid-key',
      })
    })

    it('throws network-error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNRESET'))

      await expect(client.deactivate('KEY', 'act-1')).rejects.toMatchObject({
        type: 'network-error',
      })
    })
  })

  describe('environment selection', () => {
    it('uses sandbox URL when configured', async () => {
      const sandboxClient = new PolarClient({
        baseUrl: 'https://sandbox-api.polar.sh',
        organizationId: 'org-sandbox-456',
      })

      mockFetch.mockResolvedValue(
        jsonResponse(200, {
          id: 'lk-1',
          status: 'granted',
          display_key: '****-AABB',
          limit_activations: 2,
          last_validated_at: null,
          expires_at: null,
          activation: null,
        })
      )

      await sandboxClient.validate('KEY-SANDBOX')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.polar.sh/v1/customer-portal/license-keys/validate',
        expect.anything()
      )
    })
  })
})
