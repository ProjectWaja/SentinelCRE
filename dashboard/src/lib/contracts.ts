import type { Address } from 'viem'

export const ADDRESSES = {
  sentinelGuardian: (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS ??
    '0x3e2D7CE3CcB520f26dE6fe499bAA38A28cfd476f') as Address,
  agentRegistry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
    '0xb008CE7EE90C66A219C842E69a4fBAF7E5359bbE') as Address,
}

export const MOCK_API_URL =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

export const SENTINEL_GUARDIAN_ABI = [
  {
    name: 'getAgentPolicy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'maxTransactionValue', type: 'uint256' },
      { name: 'maxDailyVolume', type: 'uint256' },
      { name: 'maxMintAmount', type: 'uint256' },
      { name: 'rateLimit', type: 'uint256' },
      { name: 'rateLimitWindow', type: 'uint256' },
      { name: 'requireMultiAiConsensus', type: 'bool' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'isAgentActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'agentStates',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'agentExists',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getActionStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'approved', type: 'uint256' },
      { name: 'denied', type: 'uint256' },
      { name: 'currentWindowActions', type: 'uint256' },
      { name: 'currentDailyVolume', type: 'uint256' },
    ],
  },
  {
    name: 'getIncidentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getIncident',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'timestamp', type: 'uint64' },
          { name: 'agentId', type: 'bytes32' },
          { name: 'incidentType', type: 'uint8' },
          { name: 'reason', type: 'string' },
          { name: 'targetContract', type: 'address' },
          { name: 'attemptedValue', type: 'uint256' },
        ],
      },
    ],
  },
] as const

export const AGENT_REGISTRY_ABI = [
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'registeredAt', type: 'uint64' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getAgentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAgentIdAt',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const AGENT_STATE_LABELS = ['Active', 'Frozen', 'Revoked'] as const
export const INCIDENT_TYPE_LABELS = [
  'PolicyViolation',
  'ConsensusFailure',
  'RateLimit',
  'AnomalyDetected',
  'ManualFreeze',
] as const
