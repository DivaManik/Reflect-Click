import { createPublicClient, http, parseAbiItem } from 'viem';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ── Config ────────────────────────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT = (process.env.REFLEX_ADDRESS || '0xFaF82E200B63Bca0C6225684F53e90C9C6445eE8').toLowerCase();
const PORT = Number(process.env.PORT || 3001);
const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 99n;
const START_BLOCK = BigInt(process.env.START_BLOCK || '27687124');

const client = createPublicClient({
  transport: http(RPC_URL),
  chain: {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  },
});

// ── ABI events ────────────────────────────────────────────────────────────
const EVENTS = {
  MatchCreated:    parseAbiItem('event MatchCreated(uint256 indexed matchId, address indexed host, uint256 stakePerPlayer)'),
  MatchJoined:     parseAbiItem('event MatchJoined(uint256 indexed matchId, address indexed player, uint32 playerCount)'),
  MatchLocked:     parseAbiItem('event MatchLocked(uint256 indexed matchId, uint32 playerCount)'),
  MatchStarted:    parseAbiItem('event MatchStarted(uint256 indexed matchId, uint256 startedAt, uint256 goTimestampMs, uint256 countdownMs)'),
  TapSubmitted:    parseAbiItem('event TapSubmitted(uint256 indexed matchId, address indexed player, uint256 reactionMs)'),
  MatchFinished:   parseAbiItem('event MatchFinished(uint256 indexed matchId, address[3] topPlayers, uint256[3] topReactionMs, uint256[3] prizes, uint8 winnersCount, uint256 fee)'),
  MatchForceSettled: parseAbiItem('event MatchForceSettled(uint256 indexed matchId)'),
};

// ── In-memory store ───────────────────────────────────────────────────────
const matches = new Map();   // matchId (string) → Match
const taps = new Map();      // `${matchId}-${player}` → Tap
const players = new Map();   // address → Player

let lastProcessedBlock = 0n;
let indexedUpTo = 0n;

function getOrCreatePlayer(address) {
  const id = address.toLowerCase();
  if (!players.has(id)) {
    players.set(id, {
      id,
      totalMatches: 0,
      totalWins: 0,
      totalTaps: 0,
      bestReactionMs: null,
      totalEarnedWei: 0n,
    });
  }
  return players.get(id);
}

function getOrCreateMatch(matchId) {
  const id = matchId.toString();
  if (!matches.has(id)) {
    matches.set(id, {
      id,
      matchId: id,
      host: null,
      stakePerPlayer: 0n,
      playerCount: 0,
      tappedCount: 0,
      state: 'Open',
      prizePool: 0n,
      goTimestampMs: null,
      startedAt: null,
      winner1: null, winner1ReactionMs: null, winner1Prize: null,
      winner2: null, winner2ReactionMs: null, winner2Prize: null,
      winner3: null, winner3ReactionMs: null, winner3Prize: null,
      winnersCount: 0,
      platformFee: null,
      createdAt: null,
      finishedAt: null,
    });
  }
  return matches.get(id);
}

// ── Event handlers ────────────────────────────────────────────────────────
function handleMatchCreated(log, blockTs) {
  const { matchId, host, stakePerPlayer } = log.args;
  const m = getOrCreateMatch(matchId);
  m.host = host.toLowerCase();
  m.stakePerPlayer = stakePerPlayer;
  m.prizePool = stakePerPlayer;
  m.playerCount = 1;
  m.state = 'Open';
  m.createdAt = blockTs;

  const p = getOrCreatePlayer(host);
  p.totalMatches++;
}

function handleMatchJoined(log) {
  const { matchId, player, playerCount } = log.args;
  const m = getOrCreateMatch(matchId);
  m.playerCount = Number(playerCount);
  m.prizePool = m.stakePerPlayer * BigInt(m.playerCount);

  const p = getOrCreatePlayer(player);
  p.totalMatches++;
}

function handleMatchLocked(log) {
  const { matchId } = log.args;
  const m = getOrCreateMatch(matchId);
  m.state = 'Locked';
}

function handleMatchStarted(log) {
  const { matchId, startedAt, goTimestampMs } = log.args;
  const m = getOrCreateMatch(matchId);
  m.state = 'Active';
  m.startedAt = startedAt;
  m.goTimestampMs = goTimestampMs;
}

function handleTapSubmitted(log, blockTs) {
  const { matchId, player, reactionMs } = log.args;
  const tapId = `${matchId}-${player.toLowerCase()}`;

  if (taps.has(tapId)) return; // dedup

  const m = getOrCreateMatch(matchId);
  m.tappedCount++;

  const tap = {
    id: tapId,
    matchId: matchId.toString(),
    player: player.toLowerCase(),
    reactionMs,
    timestamp: blockTs,
    rank: null,
    prize: 0n,
  };
  taps.set(tapId, tap);

  const p = getOrCreatePlayer(player);
  p.totalTaps++;
  if (p.bestReactionMs === null || reactionMs < p.bestReactionMs) {
    p.bestReactionMs = reactionMs;
  }
}

function handleMatchFinished(log, blockTs) {
  const { matchId, topPlayers, topReactionMs, prizes, winnersCount, fee } = log.args;
  const ZERO = '0x0000000000000000000000000000000000000000';

  const m = getOrCreateMatch(matchId);
  m.state = 'Finished';
  m.finishedAt = blockTs;
  m.winnersCount = Number(winnersCount);
  m.platformFee = fee;

  const slots = [
    { key: 'winner1', reactionKey: 'winner1ReactionMs', prizeKey: 'winner1Prize' },
    { key: 'winner2', reactionKey: 'winner2ReactionMs', prizeKey: 'winner2Prize' },
    { key: 'winner3', reactionKey: 'winner3ReactionMs', prizeKey: 'winner3Prize' },
  ];

  slots.forEach(({ key, reactionKey, prizeKey }, i) => {
    const addr = topPlayers[i];
    if (!addr || addr === ZERO) return;

    m[key] = addr.toLowerCase();
    m[reactionKey] = topReactionMs[i];
    m[prizeKey] = prizes[i];

    // Update tap rank + prize
    const tapId = `${matchId}-${addr.toLowerCase()}`;
    if (taps.has(tapId)) {
      taps.get(tapId).rank = i + 1;
      taps.get(tapId).prize = prizes[i];
    }

    // Update player stats
    const p = getOrCreatePlayer(addr);
    if (i === 0) p.totalWins++;
    p.totalEarnedWei += prizes[i];
  });
}

function handleMatchForceSettled(log) {
  const { matchId } = log.args;
  const m = getOrCreateMatch(matchId);
  m.state = 'Finished';
}

// ── Poller ────────────────────────────────────────────────────────────────
async function poll() {
  try {
    const latest = await client.getBlockNumber();
    if (lastProcessedBlock === 0n) {
      lastProcessedBlock = START_BLOCK > 1n ? START_BLOCK - 1n : 0n;
    }

    if (latest <= lastProcessedBlock) return;

    const from = lastProcessedBlock + 1n;
    const to = from + BATCH_SIZE > latest ? latest : from + BATCH_SIZE;

    const allEvents = Object.values(EVENTS);
    const logs = await client.getLogs({
      address: CONTRACT,
      events: allEvents,
      fromBlock: from,
      toBlock: to,
    });

    // Fetch block timestamps for logs that need it
    const blockNums = [...new Set(logs.map((l) => l.blockNumber))];
    const blockTs = new Map();
    await Promise.all(
      blockNums.map(async (bn) => {
        const blk = await client.getBlock({ blockNumber: bn });
        blockTs.set(bn, blk.timestamp);
      })
    );

    // Process in block order
    logs.sort((a, b) => Number(a.blockNumber - b.blockNumber) || Number(a.logIndex - b.logIndex));

    for (const log of logs) {
      const ts = blockTs.get(log.blockNumber) ?? 0n;
      switch (log.eventName) {
        case 'MatchCreated':    handleMatchCreated(log, ts); break;
        case 'MatchJoined':     handleMatchJoined(log); break;
        case 'MatchLocked':     handleMatchLocked(log); break;
        case 'MatchStarted':    handleMatchStarted(log); break;
        case 'TapSubmitted':    handleTapSubmitted(log, ts); break;
        case 'MatchFinished':   handleMatchFinished(log, ts); break;
        case 'MatchForceSettled': handleMatchForceSettled(log); break;
      }
    }

    lastProcessedBlock = to;
    indexedUpTo = to;

    if (logs.length > 0) {
      console.log(`[${new Date().toISOString()}] Blocks ${from}-${to}: ${logs.length} events | matches=${matches.size} taps=${taps.size}`);
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}

// ── API ───────────────────────────────────────────────────────────────────
const app = new Hono();
app.use('*', cors());

// Serialize BigInt for JSON
function serialize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

// Status
app.get('/', (c) => c.json({ status: 'ok', indexedUpTo: indexedUpTo.toString(), matches: matches.size, taps: taps.size, players: players.size }));

// All matches (paginated)
app.get('/matches', (c) => {
  const limit = Number(c.req.query('limit') || 20);
  const offset = Number(c.req.query('offset') || 0);
  const state = c.req.query('state');

  let list = [...matches.values()].sort((a, b) => Number(BigInt(b.matchId) - BigInt(a.matchId)));
  if (state) list = list.filter((m) => m.state === state);

  return c.json(serialize({ total: list.length, data: list.slice(offset, offset + limit) }));
});

// Single match
app.get('/matches/:id', (c) => {
  const m = matches.get(c.req.param('id'));
  if (!m) return c.json({ error: 'not found' }, 404);
  return c.json(serialize(m));
});

// Taps for a match
app.get('/matches/:id/taps', (c) => {
  const id = c.req.param('id');
  const matchTaps = [...taps.values()]
    .filter((t) => t.matchId === id)
    .sort((a, b) => Number(a.reactionMs - b.reactionMs));
  return c.json(serialize(matchTaps));
});

// Leaderboard (fastest players)
app.get('/leaderboard', (c) => {
  const limit = Number(c.req.query('limit') || 20);
  const list = [...players.values()]
    .filter((p) => p.bestReactionMs !== null)
    .sort((a, b) => Number(a.bestReactionMs - b.bestReactionMs))
    .slice(0, limit);
  return c.json(serialize(list));
});

// Single player
app.get('/players/:address', (c) => {
  const p = players.get(c.req.param('address').toLowerCase());
  if (!p) return c.json({ error: 'not found' }, 404);
  // Include tap history
  const playerTaps = [...taps.values()]
    .filter((t) => t.player === p.id)
    .sort((a, b) => Number(b.timestamp - a.timestamp));
  return c.json(serialize({ ...p, tapHistory: playerTaps }));
});

// Taps leaderboard for a specific match (for live results page)
app.get('/matches/:id/results', (c) => {
  const id = c.req.param('id');
  const m = matches.get(id);
  if (!m) return c.json({ error: 'not found' }, 404);

  const matchTaps = [...taps.values()]
    .filter((t) => t.matchId === id)
    .sort((a, b) => Number(a.reactionMs - b.reactionMs));

  return c.json(serialize({ match: m, taps: matchTaps }));
});

// ── Start ─────────────────────────────────────────────────────────────────
console.log(`Starting Reflex Indexer on port ${PORT}...`);
console.log(`RPC: ${RPC_URL}`);
console.log(`Contract: ${CONTRACT}`);

// Initial poll then interval
await poll();
setInterval(poll, POLL_INTERVAL_MS);

serve({ fetch: app.fetch, port: PORT });
console.log(`API running at http://localhost:${PORT}`);
