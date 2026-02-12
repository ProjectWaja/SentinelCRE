import { createPublicClient, http } from 'viem'
import { sepolia, foundry } from 'viem/chains'

export function getRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RPC_URL ??
    'http://127.0.0.1:8545'
  )
}

export function getClient() {
  const rpcUrl = getRpcUrl()
  const isLocal = rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost')

  return createPublicClient({
    chain: isLocal ? foundry : sepolia,
    transport: http(rpcUrl),
  })
}
