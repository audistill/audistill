export type SourceLocator =
  | { kind: 'remote'; value: string }
  | { kind: 'local'; value: string }

export type OpenSourceLocatorResult =
  | { success: true }
  | { success: false; error: string }
