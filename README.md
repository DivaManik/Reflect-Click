# Reflex — Reaction-Time Wagering Game on Monad

> **Fastest tap wins the pot. Real money. Monad speed.**

## What is Reflex?

Reflex is an on-chain multiplayer reaction-time game built on Monad Testnet. Players stake MON tokens to join a match. The host triggers a 3-second countdown, a **GO** signal fires on-chain, and every player races to tap as fast as possible. The fastest reactions win the pot — automatically, trustlessly, in under a second.

No backend. No trusted server for timing. The blockchain is the referee.

---

## The Problem We're Solving

Most blockchain games claim to be "on-chain" but cheat where it matters most — timing. A reaction-time game where the server decides who wins isn't trustless. It's just a server game with extra steps.

**The challenge:** Can you build a fair, verifiable, real-money reflex game where timing is enforced entirely on-chain — with no trusted intermediary — and still deliver a smooth user experience?

**The bottleneck:** On most chains, this is impossible. Block times of 2–15 seconds make on-chain timing meaningless for a reaction game. By the time your tap transaction confirms, the window is long gone.

---

## Why Monad Makes This Possible

Monad's ~800ms finality and high throughput change the equation entirely:

| Property | Ethereum | Monad Testnet |
|---|---|---|
| Block time | ~12s | ~500ms |
| Finality | ~15 min | ~800ms |
| Tx throughput | ~15 TPS | 10,000+ TPS |

With Monad, tap transactions confirm fast enough that **on-chain timestamps are meaningful** as a reaction-time metric. The `goTimestampMs` is written to the chain by the host's transaction. Each player's tap timestamp is recorded when their transaction is included. The delta is the reaction time — no server needed.

---

## How It Works

```
Host creates match → Players join (stake MON) → Host locks & starts countdown
→ GO signal emitted on-chain → Players tap → Transactions race to chain
→ Smart contract records arrival order → Match ends → Winners paid out instantly
```

### Match States
```
Open → Locked → Active → Finished
```

- **Open**: Players can join by staking the required MON amount
- **Locked**: Host locks the lobby (min. 2 players required), starts 3s countdown
- **Active**: GO signal fired — tapping window open
- **Finished**: Host ends match, winners paid out atomically

### Auto-Scale Prize Distribution

The contract automatically adjusts payouts based on how many players tapped:

| Players who tapped | Winners | Split |
|---|---|---|
| 1 – 4 | 1 winner | 100% |
| 5 – 10 | 2 winners | 65% / 35% |
| 11+ | 3 winners | 60% / 30% / 10% |

Platform fee: **2% of total pot**, taken before distribution.

### Safety Mechanisms
- Anyone can call `forceSettle()` after 5 minutes if the host disappears
- No player cap — O(1) player verification via mapping (no arrays)
- Double-tap prevention per match per address

---

## Architecture

```
frontend/       Next.js 14 + wagmi v2 + viem
contracts/      Foundry — Solidity 0.8.20
indexer/        Custom polling indexer (viem + Hono, no Docker)
```

### Smart Contracts (Monad Testnet — Chain ID: 10143)

| Contract | Address |
|---|---|
| Reflex | `0xFaF82E200B63Bca0C6225684F53e90C9C6445eE8` |
| ReflexLeaderboard | `0xE55bC6a831013fF0849F9285FBcEE2378735C7D3` |

### Frontend Stack
- **wagmi v2** — contract reads/writes and event watching
- **viem** — ABI encoding, event parsing, transaction receipts
- **injected() connector** — MetaMask and any injected wallet, no third-party auth
- **Next.js 14** — mobile-first UI

---

## Running Locally

### Prerequisites
- Node.js 18+
- MetaMask with Monad Testnet added (Chain ID: `10143`, RPC: `https://testnet-rpc.monad.xyz`)
- Some MON testnet tokens

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

`.env.local` values:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xFaF82E200B63Bca0C6225684F53e90C9C6445eE8
NEXT_PUBLIC_LEADERBOARD_ADDRESS=0xE55bC6a831013fF0849F9285FBcEE2378735C7D3
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
```

### Contracts (Foundry)

```bash
cd contracts
forge test        # run all tests (18/18)
forge build
```

To redeploy:
```bash
cp .env.example .env   # fill in PRIVATE_KEY and MONAD_RPC
forge script script/Deploy.s.sol --rpc-url $MONAD_RPC --broadcast --legacy
```

---

## What This Proves

1. **On-chain timing is viable at Monad speed.** Sub-second finality makes reaction-time measurement meaningful on-chain for the first time.

2. **Trustless real-money games don't need a server.** The smart contract handles join, timing, tap ordering, prize calculation, and payout atomically. No backend can cheat the result.

3. **UX can be smooth.** With wagmi's event watching and Monad's fast blocks, the game feels responsive. Players see GO, tap, and see results — all driven by on-chain events.

4. **Scalability by default.** No player cap. O(1) lookups. Auto-scaling prize tiers handle any crowd size without extra code.
