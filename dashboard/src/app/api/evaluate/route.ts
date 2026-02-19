import { NextResponse } from 'next/server'
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { validateProposal } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const MOCK_API =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

// On-chain verdict recording — sends real tx to Tenderly Virtual TestNet
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined
const GUARDIAN_ADDRESS = process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS as Hex | undefined

const PROCESS_VERDICT_ABI = [
  {
    name: 'processVerdict',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reportData', type: 'bytes' }],
    outputs: [],
  },
  {
    name: 'unfreezeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
] as const

async function submitVerdictOnChain(
  agentId: string,
  approved: boolean,
  reason: string,
  targetContract: string,
  functionSig: string,
  value: string,
  mintAmount: string,
) {
  if (!RPC_URL || !DEPLOYER_KEY || !GUARDIAN_ADDRESS) return

  try {
    const account = privateKeyToAccount(DEPLOYER_KEY)
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    })

    // Encode the verdict report data
    const fnSig = (functionSig || '0x00000000').slice(0, 10).padEnd(10, '0') as Hex
    const reportData = encodeAbiParameters(
      parseAbiParameters('bytes32, bool, string, address, bytes4, uint256, uint256'),
      [
        agentId as Hex,
        approved,
        reason.slice(0, 200),
        getAddress(targetContract || '0x000000000000000000000000000000000000AA01'),
        fnSig,
        BigInt(value || '0'),
        BigInt(mintAmount || '0'),
      ],
    )

    const hash = await walletClient.writeContract({
      address: GUARDIAN_ADDRESS,
      abi: PROCESS_VERDICT_ABI,
      functionName: 'processVerdict',
      args: [reportData],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log('[On-chain verdict] Recorded:', hash.slice(0, 14), approved ? 'APPROVED' : 'DENIED')

    // If denied, the agent gets frozen — unfreeze it so the next demo scenario works
    if (!approved) {
      try {
        const unfreezeHash = await walletClient.writeContract({
          address: GUARDIAN_ADDRESS,
          abi: PROCESS_VERDICT_ABI,
          functionName: 'unfreezeAgent',
          args: [agentId as Hex],
        })
        await publicClient.waitForTransactionReceipt({ hash: unfreezeHash })
      } catch {
        // Agent might not be frozen (baseline scenarios) — ignore
      }
    }
  } catch (err) {
    console.error('[On-chain verdict] Failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    const { proposal } = await request.json()

    const validationError = validateProposal(proposal)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Step 1: Behavioral analysis (Layer 2)
    let behavioral: any = null
    try {
      const behavioralRes = await fetch(`${MOCK_API}/behavioral/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: proposal.agentId,
          targetContract: proposal.targetContract,
          functionSignature: proposal.functionSignature,
          value: proposal.value,
          mintAmount: proposal.mintAmount,
          recentValues: proposal.recentValues,
        }),
      })
      behavioral = await behavioralRes.json()
    } catch {
      // Behavioral analysis is non-blocking — proceed without it
    }

    // Step 2: Build prompt with behavioral context
    const safeDescription = (proposal.description ?? '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500)

    let prompt = `You are a security sentinel evaluating an AI agent's proposed on-chain action.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${safeDescription}`

    if (behavioral) {
      prompt += `

BEHAVIORAL RISK ANALYSIS (Layer 2):
- Anomaly Score: ${behavioral.totalScore}/100 (threshold: ${behavioral.threshold})
- Status: ${behavioral.flagged ? 'FLAGGED — behavioral anomaly detected' : 'NORMAL'}`
      for (const dim of behavioral.dimensions ?? []) {
        prompt += `\n  - ${dim.name}: ${dim.fired ? `+${dim.score}` : '0'} — ${dim.reason}`
      }
      if (behavioral.flagged) {
        prompt += `\n\nThe behavioral risk engine has FLAGGED this action. Weight this strongly in your verdict.`
      }
    }

    prompt += `

Respond with ONLY valid JSON:
{"verdict":"APPROVED" or "DENIED","confidence":0-100,"reason":"brief explanation"}`

    // Step 3: Evaluate with both AI models
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const [res1, res2] = await Promise.all([
      fetch(`${MOCK_API}/evaluate/model1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      fetch(`${MOCK_API}/evaluate/model2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    ])

    const r1 = await res1.json()
    const r2 = await res2.json()

    const v1 = JSON.parse((r1 as any).content[0].text)
    const v2 = JSON.parse((r2 as any).content[0].text)

    const consensus =
      v1.verdict === 'APPROVED' && v2.verdict === 'APPROVED'
        ? 'APPROVED'
        : 'DENIED'

    // Step 4: Update behavioral profile
    try {
      await fetch(`${MOCK_API}/behavioral/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: proposal.agentId,
          proposal,
          verdict: consensus,
        }),
      })
    } catch {
      // Non-blocking
    }

    // Step 5: Submit verdict on-chain to SentinelGuardian (Tenderly Virtual TestNet)
    await submitVerdictOnChain(
      proposal.agentId,
      consensus === 'APPROVED',
      consensus === 'APPROVED' ? v1.reason : v1.reason,
      proposal.targetContract,
      proposal.functionSignature,
      proposal.value,
      proposal.mintAmount,
    )

    // Compute severity for denied verdicts
    let severity: 'LOW' | 'MEDIUM' | 'CRITICAL' | undefined
    let challengeWindowExpiry: number | undefined
    if (consensus === 'DENIED') {
      const value = BigInt(proposal.value || '0')
      const maxValue = BigInt('1000000000000000000') // 1 ETH
      const mint = BigInt(proposal.mintAmount || '0')
      const maxMint = BigInt('1000000000000000000000000') // 1M tokens

      if (
        (maxValue > 0n && value > maxValue * 10n) ||
        (maxMint > 0n && mint > maxMint * 100n)
      ) {
        severity = 'CRITICAL'
      } else if (
        (maxValue > 0n && value > maxValue * 2n) ||
        (behavioral?.flagged && behavioral?.totalScore >= 60)
      ) {
        severity = 'MEDIUM'
        challengeWindowExpiry = Date.now() + 1800 * 1000
      } else {
        severity = 'LOW'
        challengeWindowExpiry = Date.now() + 3600 * 1000
      }
    }

    return NextResponse.json({
      model1: v1,
      model2: v2,
      consensus,
      proposal,
      timestamp: Date.now(),
      severity,
      challengeWindowExpiry,
      challengeStatus: severity && severity !== 'CRITICAL' ? 'PENDING' : undefined,
      anomalyScore: behavioral?.totalScore ?? null,
      anomalyFlagged: behavioral?.flagged ?? false,
      anomalyDimensions: behavioral?.dimensions ?? null,
    })
  } catch (err) {
    console.error('[evaluate] Internal error:', err)
    return NextResponse.json(
      {
        model1: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        model2: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        consensus: 'DENIED',
        proposal: null,
        timestamp: Date.now(),
        error: 'Evaluation service unavailable',
      },
      { status: 502 },
    )
  }
}
