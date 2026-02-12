/**
 * SentinelCRE — Contract Deployment Script
 *
 * Deploys AgentRegistry and SentinelGuardian to Ethereum Sepolia
 * or Tenderly Virtual TestNet.
 *
 * Usage:
 *   bun run scripts/deploy-guardian.ts
 *
 * Environment / secrets:
 *   DEPLOYER_PRIVATE_KEY  — Deploying wallet private key
 *   RPC_URL               — Sepolia or Tenderly RPC endpoint
 *   WORKFLOW_ADDRESS       — (optional) CRE workflow DON address
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface DeployConfig {
  deployerPrivateKey: Hex
  rpcUrl: string
  workflowAddress?: Address
}

function loadConfig(): DeployConfig {
  let secrets: Record<string, string> = {}

  try {
    const secretsPath = join(import.meta.dir, '..', 'config', 'secrets.json')
    secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'))
  } catch {
    // No secrets file — rely on env vars
  }

  const deployerPrivateKey = (
    secrets.DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY ?? ''
  ) as Hex

  const rpcUrl = secrets.RPC_URL ?? process.env.RPC_URL ?? ''

  const workflowAddress = (
    secrets.WORKFLOW_ADDRESS ?? process.env.WORKFLOW_ADDRESS ?? undefined
  ) as Address | undefined

  if (!deployerPrivateKey) {
    throw new Error('Missing DEPLOYER_PRIVATE_KEY. Set in config/secrets.json or as env var.')
  }
  if (!rpcUrl) {
    throw new Error('Missing RPC_URL. Set in config/secrets.json or as env var.')
  }

  return { deployerPrivateKey, rpcUrl, workflowAddress }
}

async function deploy() {
  const config = loadConfig()
  const account = privateKeyToAccount(config.deployerPrivateKey)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.rpcUrl),
  })

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(config.rpcUrl),
  })

  console.log(`Deploying from: ${account.address}`)
  console.log(`RPC: ${config.rpcUrl}`)

  // Load compiled bytecodes from forge output
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

  // Deploy AgentRegistry
  console.log('\nDeploying AgentRegistry...')
  const registryHash = await walletClient.deployContract({
    account,
    abi: registryArtifact.abi,
    bytecode: registryArtifact.bytecode.object as Hex,
    args: [],
  })
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash })
  console.log(`AgentRegistry: ${registryReceipt.contractAddress}`)

  // Deploy SentinelGuardian
  console.log('\nDeploying SentinelGuardian...')
  const guardianHash = await walletClient.deployContract({
    account,
    abi: guardianArtifact.abi,
    bytecode: guardianArtifact.bytecode.object as Hex,
    args: [],
  })
  const guardianReceipt = await publicClient.waitForTransactionReceipt({ hash: guardianHash })
  console.log(`SentinelGuardian: ${guardianReceipt.contractAddress}`)

  // Save deployment info
  mkdirSync(join(import.meta.dir, '..', 'deployments'), { recursive: true })
  const deployment = {
    network: 'sepolia',
    agentRegistry: registryReceipt.contractAddress,
    sentinelGuardian: guardianReceipt.contractAddress,
    deployer: account.address,
    workflowAddress: config.workflowAddress ?? 'not set',
    timestamp: new Date().toISOString(),
  }

  writeFileSync(
    join(import.meta.dir, '..', 'deployments', 'sepolia.json'),
    JSON.stringify(deployment, null, 2),
  )

  console.log('\n=== Deployment Complete ===')
  console.log(JSON.stringify(deployment, null, 2))
}

await deploy()
