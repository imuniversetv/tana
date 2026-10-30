export type StructuredContentCode =
  'aborted' | 'empty_response' | 'invalid_json' | 'schema_mismatch' | 'request_failed'

export class StructuredContentError extends Error {
  readonly code: StructuredContentCode

  constructor(code: StructuredContentCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'StructuredContentError'
    this.code = code
  }
}
