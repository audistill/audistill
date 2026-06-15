export function isLicenseError(err: unknown): boolean {
  const message = typeof err === 'string' ? err : (err as { message?: string })?.message ?? ''
  return message.includes('Trial has ended') || message.includes('License could not be verified')
}
