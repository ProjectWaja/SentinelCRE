/**
 * Tenderly Pro API client — server-side only
 *
 * Wraps the Tenderly Simulation API for transaction simulation,
 * gas profiling, and decoded call traces.
 */

const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY ?? ''
const TENDERLY_ACCOUNT_SLUG = process.env.TENDERLY_ACCOUNT_SLUG ?? ''
const TENDERLY_PROJECT_SLUG = process.env.TENDERLY_PROJECT_SLUG ?? ''

const BASE_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}`

// ── Types ────────────────────────────────────────────────────────────

export interface SimulationRequest {
  from: string
  to: string
  input: string // encoded calldata
  value: string // hex or decimal wei
  gas?: number
}

export interface StateChange {
  address: string
  key: string
  before: string
  after: string
}

export interface BalanceChange {
  address: string
  before: string
  after: string
  diff: string
}

export interface CallTraceEntry {
  type: string // CALL, STATICCALL, DELEGATECALL, CREATE
  from: string
  to: string
  value: string
  gas: number
  gasUsed: number
  input: string
  output: string
  decodedInput?: string
  decodedOutput?: string
  error?: string
  calls?: CallTraceEntry[]
}

export interface SimulationResult {
  success: boolean
  gasUsed: number
  gasPrice: string
  revertReason?: string
  stateChanges: StateChange[]
  balanceChanges: BalanceChange[]
  callTrace: CallTraceEntry | null
  logs: Array<{
    address: string
    topics: string[]
    data: string
    decoded?: { name: string; args: Record<string, string> }
  }>
  raw: any
}

// ── Helpers ──────────────────────────────────────────────────────────

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Access-Key': TENDERLY_ACCESS_KEY,
  }
}

// ── Simulate a single transaction ───────────────────────────────────

export async function simulateTransaction(
  tx: SimulationRequest,
): Promise<SimulationResult> {
  if (!TENDERLY_ACCESS_KEY) {
    throw new Error('TENDERLY_ACCESS_KEY not configured')
  }

  const body = {
    network_id: '11155111', // Sepolia
    from: tx.from,
    to: tx.to,
    input: tx.input,
    value: tx.value,
    gas: tx.gas ?? 8_000_000,
    gas_price: '0',
    save: true,
    save_if_fails: true,
    simulation_type: 'full',
  }

  const res = await fetch(`${BASE_URL}/simulate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tenderly simulation failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return parseSimulationResult(data)
}

// ── Simulate a bundle of sequential transactions ────────────────────

export async function simulateBundle(
  transactions: SimulationRequest[],
): Promise<SimulationResult[]> {
  if (!TENDERLY_ACCESS_KEY) {
    throw new Error('TENDERLY_ACCESS_KEY not configured')
  }

  const simulations = transactions.map((tx) => ({
    network_id: '11155111',
    from: tx.from,
    to: tx.to,
    input: tx.input,
    value: tx.value,
    gas: tx.gas ?? 8_000_000,
    gas_price: '0',
    save: true,
    save_if_fails: true,
    simulation_type: 'full',
  }))

  const res = await fetch(`${BASE_URL}/simulate-bundle`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ simulations }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tenderly bundle simulation failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const results: SimulationResult[] = []

  for (const sim of data.simulation_results ?? []) {
    results.push(parseSimulationResult(sim))
  }

  return results
}

// ── Parse Tenderly response into our typed result ───────────────────

function parseSimulationResult(data: any): SimulationResult {
  const tx = data.transaction ?? data.simulation?.transaction ?? {}
  const traceData = data.transaction?.transaction_info ?? tx.transaction_info ?? {}

  const success = tx.status === true || tx.status === 1 || traceData.call_trace?.error === ''
  const gasUsed = traceData.gas_used ?? tx.gas_used ?? 0

  // State changes
  const stateChanges: StateChange[] = []
  for (const change of traceData.state_diff ?? []) {
    for (const [key, val] of Object.entries(change.raw ?? change.soltype ?? {})) {
      const v = val as any
      stateChanges.push({
        address: change.address ?? '',
        key: key,
        before: v.original ?? v.from ?? '',
        after: v.dirty ?? v.to ?? '',
      })
    }
  }

  // Balance changes
  const balanceChanges: BalanceChange[] = []
  for (const change of traceData.balance_diff ?? []) {
    balanceChanges.push({
      address: change.address ?? '',
      before: change.original ?? '0',
      after: change.dirty ?? '0',
      diff: change.is_miner
        ? 'miner'
        : String(BigInt(change.dirty ?? '0') - BigInt(change.original ?? '0')),
    })
  }

  // Call trace
  const rawTrace = traceData.call_trace ?? null
  const callTrace = rawTrace ? parseCallTrace(rawTrace) : null

  // Logs
  const logs = (traceData.logs ?? []).map((log: any) => ({
    address: log.raw?.address ?? '',
    topics: log.raw?.topics ?? [],
    data: log.raw?.data ?? '',
    decoded: log.name
      ? { name: log.name, args: log.inputs?.reduce((a: any, i: any) => ({ ...a, [i.soltype?.name ?? i.name ?? '']: i.value }), {}) }
      : undefined,
  }))

  return {
    success,
    gasUsed,
    gasPrice: tx.gas_price ?? '0',
    revertReason: !success ? (traceData.call_trace?.error ?? traceData.error_message ?? 'Unknown revert') : undefined,
    stateChanges,
    balanceChanges,
    callTrace,
    logs,
    raw: data,
  }
}

function parseCallTrace(trace: any): CallTraceEntry {
  return {
    type: trace.call_type ?? trace.type ?? 'CALL',
    from: trace.from ?? '',
    to: trace.to ?? '',
    value: trace.value ?? '0',
    gas: trace.gas ?? 0,
    gasUsed: trace.gas_used ?? 0,
    input: trace.input ?? '',
    output: trace.output ?? '',
    decodedInput: trace.decoded_input ?? trace.function_name ?? undefined,
    decodedOutput: trace.decoded_output ?? undefined,
    error: trace.error || undefined,
    calls: (trace.calls ?? []).map(parseCallTrace),
  }
}

// ── Check if Tenderly API is configured ─────────────────────────────

export function isTenderlyConfigured(): boolean {
  return !!(TENDERLY_ACCESS_KEY && TENDERLY_ACCOUNT_SLUG && TENDERLY_PROJECT_SLUG)
}
