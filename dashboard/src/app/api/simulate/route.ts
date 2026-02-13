import { NextRequest, NextResponse } from 'next/server'
import { simulateTransaction, isTenderlyConfigured, type SimulationResult } from '@/lib/tenderly'
import { encodeFunctionData, encodeAbiParameters, parseAbiParameters, type Hex } from 'viem'

export const dynamic = 'force-dynamic'

const GUARDIAN_ADDRESS = process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS ?? ''
const DEPLOYER = '0x23fC03ec91D319e4Aa14e90b6d3664540FDf2446'

// Minimal ABI for processVerdict
const GUARDIAN_ABI = [
  {
    name: 'processVerdict',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reportData', type: 'bytes' }],
    outputs: [],
  },
] as const

export async function POST(req: NextRequest) {
  if (!isTenderlyConfigured()) {
    return NextResponse.json(
      { error: 'Tenderly API not configured' },
      { status: 503 },
    )
  }

  try {
    const body = await req.json()
    const { mode, proposal, custom } = body

    let result: SimulationResult

    if (mode === 'custom') {
      result = await simulateTransaction({
        from: custom.from || DEPLOYER,
        to: custom.to,
        input: custom.input || '0x',
        value: custom.value || '0',
        gas: custom.gas || 8_000_000,
      })
    } else {
      const reportData = encodeAbiParameters(
        parseAbiParameters('bytes32, bool, string, address, bytes4, uint256, uint256'),
        [
          proposal.agentId as Hex,
          true, // simulate as if AI approved — let on-chain policy decide
          'Simulated verdict',
          proposal.targetContract as `0x${string}`,
          proposal.functionSignature as Hex,
          BigInt(proposal.value || '0'),
          BigInt(proposal.mintAmount || '0'),
        ],
      )

      const calldata = encodeFunctionData({
        abi: GUARDIAN_ABI,
        functionName: 'processVerdict',
        args: [reportData],
      })

      result = await simulateTransaction({
        from: DEPLOYER,
        to: GUARDIAN_ADDRESS,
        input: calldata,
        value: '0',
      })
    }

    return NextResponse.json({
      success: result.success,
      gasUsed: result.gasUsed,
      revertReason: result.revertReason,
      stateChanges: result.stateChanges.slice(0, 20),
      balanceChanges: result.balanceChanges,
      callTrace: result.callTrace,
      logs: result.logs,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Simulation failed' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isTenderlyConfigured(),
    guardian: GUARDIAN_ADDRESS,
  })
}
