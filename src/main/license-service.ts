import { DatabaseService } from './database-service'
import { PolarClient, PolarError } from './polar-client'

export type LicenseState = 'trial' | 'trial-expired' | 'licensed' | 'license-invalid'

const TRIAL_DAYS = 14
const GRACE_DAYS = 30
const MS_PER_DAY = 86_400_000

export interface LicenseServiceConfig {
  db: DatabaseService
  polar: PolarClient
  clock: () => number
  machineId: string
  officialBuild: boolean
}

export class LicenseService {
  private db: DatabaseService
  private polar: PolarClient
  private clock: () => number
  private machineId: string
  private officialBuild: boolean
  private state: LicenseState = 'trial'
  private listeners: Array<(state: LicenseState) => void> = []

  constructor(config: LicenseServiceConfig) {
    this.db = config.db
    this.polar = config.polar
    this.clock = config.clock
    this.machineId = config.machineId
    this.officialBuild = config.officialBuild
  }

  async init(): Promise<void> {
    if (!this.officialBuild) {
      this.state = 'licensed'
      return
    }

    let record = this.db.getLicenseRecord()

    if (!record) {
      this.db.upsertLicenseRecord({
        trial_started_at: new Date(this.clock()).toISOString(),
        machine_id: this.machineId,
      })
      record = this.db.getLicenseRecord()!
      this.state = 'trial'
      return
    }

    if (record.license_key && record.activation_id) {
      await this.revalidateOnLaunch(record)
      return
    }

    this.state = this.isTrialExpired(record.trial_started_at!) ? 'trial-expired' : 'trial'
  }

  getState(): LicenseState {
    return this.state
  }

  getTrialDaysRemaining(): number {
    const record = this.db.getLicenseRecord()
    if (!record?.trial_started_at) return 0
    const elapsed = this.clock() - new Date(record.trial_started_at).getTime()
    const remaining = TRIAL_DAYS - Math.floor(elapsed / MS_PER_DAY)
    return Math.max(0, remaining)
  }

  async activate(key: string): Promise<void> {
    const validateResult = await this.polar.validate(key)

    if (validateResult.activation?.meta?.machineId === this.machineId) {
      this.db.upsertLicenseRecord({
        license_key: key,
        activation_id: validateResult.activation.id,
        last_validated_at: new Date(this.clock()).toISOString(),
      })
      this.setState('licensed')
      return
    }

    const hostname = await this.getHostname()
    const activateResult = await this.polar.activate(key, hostname, { machineId: this.machineId })

    this.db.upsertLicenseRecord({
      license_key: key,
      activation_id: activateResult.activationId,
      last_validated_at: new Date(this.clock()).toISOString(),
    })
    this.setState('licensed')
  }

  async deactivate(): Promise<void> {
    const record = this.db.getLicenseRecord()
    if (!record?.license_key || !record.activation_id) return

    await this.polar.deactivate(record.license_key, record.activation_id)

    this.db.upsertLicenseRecord({
      license_key: null,
      activation_id: null,
      last_validated_at: null,
    })

    const newState = this.isTrialExpired(record.trial_started_at!) ? 'trial-expired' : 'trial'
    this.setState(newState)
  }

  onStateChange(listener: (state: LicenseState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private setState(newState: LicenseState): void {
    if (newState !== this.state) {
      this.state = newState
      for (const listener of this.listeners) {
        listener(newState)
      }
    }
  }

  private isTrialExpired(trialStartedAt: string): boolean {
    const elapsed = this.clock() - new Date(trialStartedAt).getTime()
    return elapsed >= TRIAL_DAYS * MS_PER_DAY
  }

  private isGraceExpired(lastValidatedAt: string): boolean {
    const elapsed = this.clock() - new Date(lastValidatedAt).getTime()
    return elapsed >= GRACE_DAYS * MS_PER_DAY
  }

  private async revalidateOnLaunch(record: { license_key: string | null; activation_id: string | null; last_validated_at: string | null; trial_started_at: string | null }): Promise<void> {
    try {
      const result = await this.polar.validate(record.license_key!, record.activation_id!)

      if (result.status === 'granted') {
        this.db.upsertLicenseRecord({
          last_validated_at: new Date(this.clock()).toISOString(),
        })
        this.setState('licensed')
      } else {
        this.setState('license-invalid')
      }
    } catch (err) {
      if (err instanceof PolarError && err.type === 'network-error') {
        if (record.last_validated_at && !this.isGraceExpired(record.last_validated_at)) {
          this.setState('licensed')
        } else {
          this.setState('license-invalid')
        }
      } else {
        this.setState('license-invalid')
      }
    }
  }

  private async getHostname(): Promise<string> {
    const os = await import('os')
    return os.hostname()
  }
}
