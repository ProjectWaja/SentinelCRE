import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
const GUARDIAN = (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS ?? '').toLowerCase()
const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? '').toLowerCase()

const FN_SIGS: Record<string, string> = {
  '0x1dbd85a5': 'processVerdict',
  '0x2eab3d85': 'unfreezeAgent',
  '0x2f2ff15d': 'grantRole',
  '0x6a5abebd': 'registerAgent',
  '0x292503a7': 'registerAgent',
  '0x62b6b75b': 'updatePolicy',
  '0x095ea7b3': 'approve',
  '0xf37f114f': 'updatePolicy',
}

// Guardian event topic signatures for eth_getLogs
const EVENT_TOPICS: Record<string, string> = {
  '0xdc56bf1a0ac0d4d39cbc7481d9482066026b31f6d2758db520e6adaf9f21efeb': 'ActionApproved',
  '0x08c4d42f62d7bd9e328635cfae0fc2d21b2174ad125a47cf801ee9cf4218cda3': 'ActionDenied',
  '0xfb9546080760f1a70c0be43f384eed586a98ce40363c7d022cc787c673ab05a8': 'CircuitBreakerTriggered',
  '0x504a565d281fa608bb08262d900bbfdea50f90ea4f3174535a82a2da2ffdf403': 'AgentFrozen',
}

interface EventInfo {
  name: string
  agentId: string
  blockNumber: number
  txHash: string
}

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  const json = await res.json()
  return json.result
}

interface TxInfo {
  hash: string
  fn: string
  target: 'guardian' | 'registry' | 'other'
  blockNumber: number
}

export async function GET() {
  if (!RPC_URL) {
    return NextResponse.json({ error: 'RPC_URL not configured' }, { status: 500 })
  }

  try {
    const latestHex = await rpcCall('eth_blockNumber', [])
    const latest = parseInt(latestHex, 16)

    const txs: TxInfo[] = []
    let guardianTxCount = 0
    let registryTxCount = 0

    // Scan last 60 blocks for transactions
    const scanDepth = 60
    for (let i = 0; i < scanDepth; i++) {
      const block = await rpcCall('eth_getBlockByNumber', [
        '0x' + (latest - i).toString(16),
        true,
      ])
      if (!block?.transactions) continue

      for (const tx of block.transactions) {
        const to = (tx.to ?? '').toLowerCase()
        const input = tx.input ?? '0x'
        const fnSig = input.slice(0, 10)
        const fnName = FN_SIGS[fnSig] ?? fnSig

        if (to === GUARDIAN) {
          guardianTxCount++
          txs.push({
            hash: tx.hash,
            fn: fnName,
            target: 'guardian',
            blockNumber: parseInt(block.number, 16),
          })
        } else if (to === REGISTRY) {
          registryTxCount++
          txs.push({
            hash: tx.hash,
            fn: fnName,
            target: 'registry',
            blockNumber: parseInt(block.number, 16),
          })
        }
      }
    }

    // Get the last 6 transactions for the live feed
    const recentTxs = txs.slice(0, 6).map((tx) => ({
      hash: tx.hash.slice(0, 14) + '...',
      fullHash: tx.hash,
      fn: tx.fn,
      target: tx.target,
      block: tx.blockNumber,
    }))

    // Query Guardian on-chain events via eth_getLogs
    const events: EventInfo[] = []
    try {
      const fromBlock = '0x' + Math.max(0, latest - scanDepth).toString(16)
      const toBlock = '0x' + latest.toString(16)
      const logs = await rpcCall('eth_getLogs', [{
        address: GUARDIAN ? '0x' + GUARDIAN.replace('0x', '') : undefined,
        fromBlock,
        toBlock,
        topics: [Object.keys(EVENT_TOPICS)],
      }])

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const topic0 = (log.topics?.[0] ?? '').toLowerCase()
          const eventName = EVENT_TOPICS[topic0]
          if (!eventName) continue
          events.push({
            name: eventName,
            agentId: log.topics?.[1]
              ? log.topics[1].slice(0, 18) + '...'
              : '0x00',
            blockNumber: parseInt(log.blockNumber, 16),
            txHash: log.transactionHash ?? '',
          })
        }
      }
    } catch {
      // eth_getLogs may not be supported on all RPCs — graceful fallback
    }

    return NextResponse.json({
      guardianTxCount,
      registryTxCount,
      recentTxs,
      latestBlock: latest,
      scannedBlocks: scanDepth,
      events: events.slice(0, 10),
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 502 },
    )
  }
}
