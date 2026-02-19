const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const BYTES4_RE = /^0x[0-9a-fA-F]{8}$/
const HEX_RE = /^0x[0-9a-fA-F]*$/
const NUMERIC_RE = /^\d+$/

export function isBytes32(v: unknown): v is string {
  return typeof v === 'string' && BYTES32_RE.test(v)
}

export function isAddress(v: unknown): v is string {
  return typeof v === 'string' && ADDRESS_RE.test(v)
}

export function isBytes4(v: unknown): v is string {
  return typeof v === 'string' && BYTES4_RE.test(v)
}

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v)
}

export function isNumericString(v: unknown): v is string {
  return typeof v === 'string' && NUMERIC_RE.test(v)
}

export function validateProposal(p: any): string | null {
  if (!p || typeof p !== 'object') return 'Missing proposal'
  if (!isBytes32(p.agentId)) return 'Invalid agentId'
  if (!isAddress(p.targetContract)) return 'Invalid targetContract'
  if (p.functionSignature && !isBytes4(p.functionSignature)) return 'Invalid functionSignature'
  if (p.value && !isNumericString(p.value)) return 'Invalid value'
  if (p.mintAmount && !isNumericString(p.mintAmount)) return 'Invalid mintAmount'
  return null
}
