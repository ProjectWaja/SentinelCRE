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

    return NextResponse.json({
      guardianTxCount,
      registryTxCount,
      recentTxs,
      latestBlock: latest,
      scannedBlocks: scanDepth,
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 502 },
    )
  }
}
