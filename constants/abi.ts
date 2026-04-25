export const REFLEX_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'MatchCreated',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'host', type: 'address', indexed: false },
      { name: 'stake', type: 'uint256', indexed: false },
      { name: 'maxPlayers', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchJoined',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: false },
      { name: 'currentCount', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchStarted',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'goTimestampMs', type: 'uint256', indexed: false },
      { name: 'totalPlayers', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TapSubmitted',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: false },
      { name: 'reactionMs', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchFinished',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'reactionMs', type: 'uint256', indexed: false },
      { name: 'pot', type: 'uint256', indexed: false },
    ],
  },
  // ── Write Functions ──────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'createMatch',
    stateMutability: 'payable',
    inputs: [{ name: 'maxPlayers', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinMatch',
    stateMutability: 'payable',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'lockMatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'startMatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitTap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'clientTimestampMs', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'settleMatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
  },
  // ── Read Functions ───────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'matches',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    // Returns struct fields excluding the dynamic `players[]` array
    outputs: [
      { name: 'host', type: 'address' },
      { name: 'stakePerPlayer', type: 'uint256' },
      { name: 'maxPlayers', type: 'uint8' },
      { name: 'goTimestampMs', type: 'uint256' },
      { name: 'settleDeadlineMs', type: 'uint256' },
      { name: 'winner', type: 'address' },
      { name: 'winnerReactionMs', type: 'uint256' },
      { name: 'tappedCount', type: 'uint8' },
      { name: 'state', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'getMatchPlayers',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'hasTapped',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'bestReactionMs',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'matchCounter',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
