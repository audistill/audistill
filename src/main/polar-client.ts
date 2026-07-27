import { net } from 'electron'

export type PolarErrorType = 'invalid-key' | 'activation-limit' | 'network-error' | 'unknown'

export class PolarError extends Error {
  type: PolarErrorType

  constructor(type: PolarErrorType, message: string) {
    super(message)
    this.type = type
    this.name = 'PolarError'
  }
}

export interface ValidateResult {
  status: 'granted' | 'revoked' | 'disabled'
  displayKey: string
  limitActivations: number
  lastValidatedAt: string | null
  expiresAt: string | null
  activation: { id: string; label: string; meta: Record<string, string> } | null
}

export interface ActivateResult {
  activationId: string
  label: string
  meta: Record<string, string>
  licenseStatus: string
  limitActivations: number
}

export interface PolarClientConfig {
  baseUrl: string
  organizationId: string
}

export class PolarClient {
  private baseUrl: string
  private organizationId: string

  constructor(config: PolarClientConfig) {
    this.baseUrl = config.baseUrl
    this.organizationId = config.organizationId
  }

  async validate(key: string, activationId?: string): Promise<ValidateResult> {
    const body: Record<string, string> = {
      key,
      organization_id: this.organizationId,
    }
    if (activationId) {
      body.activation_id = activationId
    }

    const data = await this.post('/v1/customer-portal/license-keys/validate', body)

    return {
      status: data.status,
      displayKey: data.display_key,
      limitActivations: data.limit_activations,
      lastValidatedAt: data.last_validated_at ?? null,
      expiresAt: data.expires_at ?? null,
      activation: data.activation
        ? { id: data.activation.id, label: data.activation.label, meta: data.activation.meta ?? {} }
        : null,
    }
  }

  async activate(key: string, label: string, meta: Record<string, string>): Promise<ActivateResult> {
    const data = await this.post('/v1/customer-portal/license-keys/activate', {
      key,
      organization_id: this.organizationId,
      label,
      meta,
    })

    return {
      activationId: data.id,
      label: data.label,
      meta: data.meta ?? {},
      licenseStatus: data.license_key.status,
      limitActivations: data.license_key.limit_activations,
    }
  }

  async deactivate(key: string, activationId: string): Promise<void> {
    await this.post('/v1/customer-portal/license-keys/deactivate', {
      key,
      organization_id: this.organizationId,
      activation_id: activationId,
    })
  }

  private async post(path: string, body: unknown): Promise<any> {
    let response: Response
    try {
      response = await net.fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new PolarError('network-error', 'Failed to reach Polar API')
    }

    if (response.status === 404) {
      throw new PolarError('invalid-key', 'License key not recognized')
    }
    if (response.status === 403) {
      throw new PolarError('activation-limit', 'Device activation limit reached')
    }
    if (!response.ok) {
      throw new PolarError('unknown', `Unexpected response: ${response.status}`)
    }

    if (response.status === 204) return null
    return response.json()
  }
}
