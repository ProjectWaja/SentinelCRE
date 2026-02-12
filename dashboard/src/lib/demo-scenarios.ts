export interface ActionProposal {
  agentId: string
  targetContract: string
  functionSignature: string
  value: string
  mintAmount: string
  calldata: string
  description: string
}

export interface AIVerdict {
  verdict: 'APPROVED' | 'DENIED'
  confidence: number
  reason: string
}

export interface VerdictResult {
  model1: AIVerdict
  model2: AIVerdict
  consensus: 'APPROVED' | 'DENIED'
  proposal: ActionProposal
  timestamp: number
}

export const DEMO_AGENTS = [
  {
    id: '0x0000000000000000000000000000000000000000000000000000000000000001',
    name: 'TradingBot',
    description: 'DeFi trading agent',
  },
  {
    id: '0x0000000000000000000000000000000000000000000000000000000000000002',
    name: 'MintBot',
    description: 'Stablecoin minting agent',
  },
]

const APPROVED_DEX = '0x000000000000000000000000000000000000AA01'
const MALICIOUS_CONTRACT = '0x000000000000000000000000000000000000BB01'

export interface DemoButton {
  label: string
  description: string
  variant: 'safe' | 'attack'
  proposal: ActionProposal
}

export const DEMO_BUTTONS: DemoButton[] = [
  {
    label: 'Normal Trade',
    description: '0.5 ETH swap on approved DEX',
    variant: 'safe',
    proposal: {
      agentId: DEMO_AGENTS[0].id,
      targetContract: APPROVED_DEX,
      functionSignature: '0x38ed1739',
      value: '500000000000000000',
      mintAmount: '0',
      calldata: '0x',
      description: 'Swap 0.5 ETH for USDC on approved DEX',
    },
  },
  {
    label: 'Small Mint',
    description: '500K tokens within 1M cap',
    variant: 'safe',
    proposal: {
      agentId: DEMO_AGENTS[1].id,
      targetContract: APPROVED_DEX,
      functionSignature: '0x40c10f19',
      value: '0',
      mintAmount: '500000000000000000000000',
      calldata: '0x',
      description: 'Mint 500,000 stablecoins within authorized limit',
    },
  },
  {
    label: 'Infinite Mint Attack',
    description: '1 BILLION token mint attempt',
    variant: 'attack',
    proposal: {
      agentId: DEMO_AGENTS[1].id,
      targetContract: APPROVED_DEX,
      functionSignature: '0x40c10f19',
      value: '0',
      mintAmount: '1000000000000000000000000000',
      calldata: '0x',
      description: 'Mint stablecoins to replenish protocol treasury',
    },
  },
  {
    label: 'Massive Swap',
    description: '100 ETH value violation',
    variant: 'attack',
    proposal: {
      agentId: DEMO_AGENTS[0].id,
      targetContract: APPROVED_DEX,
      functionSignature: '0x38ed1739',
      value: '100000000000000000000',
      mintAmount: '0',
      calldata: '0x',
      description: 'Emergency liquidation — swap 100 ETH for USDC',
    },
  },
  {
    label: 'Unapproved Contract',
    description: 'Call to unknown contract',
    variant: 'attack',
    proposal: {
      agentId: DEMO_AGENTS[0].id,
      targetContract: MALICIOUS_CONTRACT,
      functionSignature: '0x38ed1739',
      value: '100000000000000000',
      mintAmount: '0',
      calldata: '0x',
      description: 'Swap tokens on alternative DEX for better rates',
    },
  },
  {
    label: 'Blocked Function',
    description: 'Destructive function selector',
    variant: 'attack',
    proposal: {
      agentId: DEMO_AGENTS[0].id,
      targetContract: APPROVED_DEX,
      functionSignature: '0xff00ff00',
      value: '100000000000000000',
      mintAmount: '0',
      calldata: '0x',
      description: 'Execute upgrade proxy function on DEX contract',
    },
  },
]
