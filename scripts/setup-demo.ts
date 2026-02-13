/**
 * SentinelCRE — Post-Deploy Demo Setup
 *
 * Registers demo agents, sets policies, and grants roles on the
 * freshly deployed contracts. Run after deploy-guardian.ts.
 *
 * Usage:
 *   bun run scripts/setup-demo.ts
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
  parseEther,
  getAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ── Config ──────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL as string

if (!PRIVATE_KEY || !RPC_URL) {
  throw new Error('Set DEPLOYER_PRIVATE_KEY and RPC_URL in .env')
}

const account = privateKeyToAccount(PRIVATE_KEY)

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
})

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

// ── Load ABIs from forge output ─────────────────────────────────────
const guardianArtifact = JSON.parse(
  readFileSync(
    join(import.meta.dir, '..', 'contracts', 'out', 'SentinelGuardian.sol', 'SentinelGuardian.json'),
    'utf-8',
  ),
)
const registryArtifact = JSON.parse(
  readFileSync(
    join(import.meta.dir, '..', 'contracts', 'out', 'AgentRegistry.sol', 'AgentRegistry.json'),
    'utf-8',
  ),
)

// ── Addresses (from latest deployment) ──────────────────────────────
const deploymentPath = join(import.meta.dir, '..', 'deployments', 'sepolia.json')
const deployment = JSON.parse(readFileSync(deploymentPath, 'utf-8'))
const GUARDIAN: Address = deployment.sentinelGuardian
const REGISTRY: Address = deployment.agentRegistry

console.log(`Guardian: ${GUARDIAN}`)
console.log(`Registry: ${REGISTRY}`)
console.log(`Deployer: ${account.address}`)
console.log(`RPC: ${RPC_URL}\n`)

// ── Demo Agents ─────────────────────────────────────────────────────
const APPROVED_DEX: Address = getAddress('0x000000000000000000000000000000000000AA01')

const AGENT_1 = '0x0000000000000000000000000000000000000000000000000000000000000001' as Hex
const AGENT_2 = '0x0000000000000000000000000000000000000000000000000000000000000002' as Hex

async function send(address: Address, abi: any, functionName: string, args: any[]) {
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ${functionName} → ${receipt.status} (${hash.slice(0, 10)}...)`)
  return receipt
}

async function isRegisteredInRegistry(agentId: Hex): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: REGISTRY,
      abi: registryArtifact.abi,
      functionName: 'isRegistered',
      args: [agentId],
    }) as boolean
  } catch { return false }
}

async function existsInGuardian(agentId: Hex): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: GUARDIAN,
      abi: guardianArtifact.abi,
      functionName: 'agentExists',
      args: [agentId],
    }) as boolean
  } catch { return false }
}

async function setup() {
  // 1. Register agents in AgentRegistry (skip if already registered)
  console.log('=== Registering Agents ===')
  if (await isRegisteredInRegistry(AGENT_1)) {
    console.log('  TradingBot already registered in Registry — skipping')
  } else {
    await send(REGISTRY, registryArtifact.abi, 'registerAgent', [
      AGENT_1,
      'TradingBot',
      'DeFi trading agent — executes swaps on approved DEXes',
    ])
  }
  if (await isRegisteredInRegistry(AGENT_2)) {
    console.log('  MintBot already registered in Registry — skipping')
  } else {
    await send(REGISTRY, registryArtifact.abi, 'registerAgent', [
      AGENT_2,
      'MintBot',
      'Stablecoin minting agent — mints tokens within authorized limits',
    ])
  }

  // 2. Register agents in SentinelGuardian with policies (skip if exists, updatePolicy instead)
  console.log('\n=== Setting Agent Policies ===')

  // TradingBot policy: 1 ETH max tx, 10 ETH daily, rate limit 10/60s, approved DEX, blocked function
  const agent1Exists = await existsInGuardian(AGENT_1)
  const fn1 = agent1Exists ? 'updatePolicy' : 'registerAgent'
  await send(GUARDIAN, guardianArtifact.abi, fn1, [
    AGENT_1,
    {
      maxTransactionValue: parseEther('1'),
      maxDailyVolume: parseEther('10'),
      maxMintAmount: 0n,
      rateLimit: 10n,
      rateLimitWindow: 60n,
      approvedContracts: [APPROVED_DEX],
      blockedFunctions: ['0xff00ff00' as Hex, '0x3659cfe6' as Hex], // blocked + upgradeTo
      requireMultiAiConsensus: true,
      isActive: true,
      reserveFeed: getAddress('0x0000000000000000000000000000000000000000'),
      minReserveRatio: 0n,
    },
  ])

  // MintBot policy: 1 ETH max tx, 5 ETH daily, 1M token mint cap, rate limit 5/300s
  const agent2Exists = await existsInGuardian(AGENT_2)
  const fn2 = agent2Exists ? 'updatePolicy' : 'registerAgent'
  await send(GUARDIAN, guardianArtifact.abi, fn2, [
    AGENT_2,
    {
      maxTransactionValue: parseEther('1'),
      maxDailyVolume: parseEther('5'),
      maxMintAmount: parseEther('1000000'), // 1M tokens
      rateLimit: 5n,
      rateLimitWindow: 300n,
      approvedContracts: [APPROVED_DEX],
      blockedFunctions: ['0xff00ff00' as Hex],
      requireMultiAiConsensus: true,
      isActive: true,
      reserveFeed: getAddress('0x0000000000000000000000000000000000000000'),
      minReserveRatio: 0n,
    },
  ])

  // 3. Grant WORKFLOW_ROLE to deployer (so demo can submit verdicts)
  console.log('\n=== Granting Roles ===')
  const WORKFLOW_ROLE = '0x' + Buffer.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode('WORKFLOW_ROLE'))
    ).buffer
  ).toString('hex') as Hex

  // Actually use keccak256 matching Solidity
  const { keccak256, toBytes } = await import('viem')
  const workflowRole = keccak256(toBytes('WORKFLOW_ROLE'))
  const challengerRole = keccak256(toBytes('CHALLENGER_ROLE'))

  await send(GUARDIAN, guardianArtifact.abi, 'grantRole', [workflowRole, account.address])
  await send(GUARDIAN, guardianArtifact.abi, 'grantRole', [challengerRole, account.address])

  // 4. Submit a demo approved verdict for TradingBot
  console.log('\n=== Recording Demo Verdicts ===')

  const { encodeAbiParameters, parseAbiParameters } = await import('viem')

  // Approved trade: 0.5 ETH swap
  const approvedData = encodeAbiParameters(
    parseAbiParameters('bytes32, bool, string, address, bytes4, uint256, uint256'),
    [
      AGENT_1,
      true,
      'Trade within policy limits',
      APPROVED_DEX,
      '0x38ed1739',
      parseEther('0.5'),
      0n,
    ],
  )
  await send(GUARDIAN, guardianArtifact.abi, 'processVerdict', [approvedData])

  // Denied trade: infinite mint attempt
  const deniedData = encodeAbiParameters(
    parseAbiParameters('bytes32, bool, string, address, bytes4, uint256, uint256'),
    [
      AGENT_2,
      false,
      'DENIED: Mint amount (1,000,000,000) exceeds policy cap (1,000,000)',
      APPROVED_DEX,
      '0x40c10f19',
      0n,
      parseEther('1000000000'), // 1B tokens
    ],
  )
  await send(GUARDIAN, guardianArtifact.abi, 'processVerdict', [deniedData])

  // Unfreeze MintBot so it's available for further demos
  console.log('\n=== Unfreezing MintBot for demo ===')
  await send(GUARDIAN, guardianArtifact.abi, 'unfreezeAgent', [AGENT_2])

  // 5. Update tenderly deployment record
  console.log('\n=== Updating Deployment Record ===')
  const tenderlyPath = join(import.meta.dir, '..', 'deployments', 'tenderly-virtual-testnet.json')
  const tenderlyDeployment = JSON.parse(readFileSync(tenderlyPath, 'utf-8'))
  tenderlyDeployment.agentRegistry = REGISTRY
  tenderlyDeployment.sentinelGuardian = GUARDIAN
  tenderlyDeployment.deployer = account.address
  tenderlyDeployment.note = 'Dedicated SentinelCRE Tenderly Pro project testnet — fully set up'
  tenderlyDeployment.timestamp = new Date().toISOString()
  tenderlyDeployment.demoTransactions = {
    note: 'Demo verdicts recorded — 1 approved trade, 1 blocked infinite mint',
  }
  writeFileSync(tenderlyPath, JSON.stringify(tenderlyDeployment, null, 2))

  console.log('\n=== Setup Complete ===')
  console.log(`  AgentRegistry: ${REGISTRY}`)
  console.log(`  SentinelGuardian: ${GUARDIAN}`)
  console.log(`  TradingBot (Agent 1): registered + 1 approved verdict`)
  console.log(`  MintBot (Agent 2): registered + 1 denied verdict + unfrozen`)
}

await setup()
