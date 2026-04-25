'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useWriteContract } from 'wagmi'
import { formatEther } from 'viem'
import { useMatch } from '@/hooks/useMatch'
import { useMatchEvents } from '@/hooks/useMatchEvents'
import { PlayerList } from '@/components/PlayerList'
import { TapButton } from '@/components/TapButton'
import { Leaderboard } from '@/components/Leaderboard'
import { REFLEX_ABI, REFLEX_CONTRACT_ADDRESS } from '@/constants/abi'
import { MatchState } from '@/types'

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { address } = useAccount()
  const matchId = id ? BigInt(id) : null

  const { match, isLoading, refetch } = useMatch(matchId)
  const { goTimestampMs, tapResults, finishedData } = useMatchEvents(matchId)
  const { writeContractAsync, isPending } = useWriteContract()

  const [alreadyTapped, setAlreadyTapped] = useState(false)
  const [txError, setTxError] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isHost = match && address &&
    match.host.toLowerCase() === address.toLowerCase()

  const isPlayer = match && address &&
    match.players.some((p) => p.toLowerCase() === address.toLowerCase())

  async function callContract(
    functionName: string,
    args: unknown[],
    value?: bigint
  ) {
    setTxError('')
    try {
      await writeContractAsync({
        address: REFLEX_CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: functionName as never,
        args: args as never,
        value,
      })
      refetch()
    } catch (err) {
      const msg = (err as Error & { shortMessage?: string }).shortMessage ?? (err as Error).message
      setTxError(msg)
    }
  }

  function handleJoin() {
    if (!match) return
    callContract('joinMatch', [matchId], match.stakePerPlayer)
  }

  function handleLock() {
    callContract('lockMatch', [matchId])
  }

  function handleSettle() {
    callContract('settleMatch', [matchId])
  }

  // Host: random 1-5s visual countdown then fire startMatch on-chain
  function handleStartSequence() {
    if (countdown !== null) return
    const delay = Math.floor(Math.random() * 4000) + 1000
    const steps = Math.ceil(delay / 1000)
    setCountdown(steps)
    let remaining = steps
    countdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(countdownRef.current!)
        setCountdown(null)
        callContract('startMatch', [matchId])
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }

  function handleTap() {
    if (alreadyTapped || match?.state !== MatchState.Active) return
    setAlreadyTapped(true)
    // Reaction time = Date.now() - goTimestampMs (same baseline for all players)
    callContract('submitTap', [matchId, BigInt(Date.now())])
  }

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!matchId || (isLoading && !match)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-2 border-monad border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-600 text-sm">Loading match #{id}…</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-400 text-lg">Match #{id} not found</p>
        <button onClick={() => router.push('/')} className="text-neutral-600 hover:text-neutral-400 text-sm">
          ← Back to lobby
        </button>
      </div>
    )
  }

  // ── Phase: Active — full-screen green TAP ────────────────────────────────
  if (match.state === MatchState.Active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 bg-[#0f0f0f]">
        <div className="text-center space-y-1">
          <p className="text-neutral-400 uppercase tracking-widest text-sm font-semibold">
            Match #{id}
          </p>
          <p className="text-white text-lg font-bold">
            Pot: {formatEther(match.stakePerPlayer * BigInt(match.players.length))} MON
          </p>
        </div>

        <TapButton
          onTap={handleTap}
          disabled={!isPlayer || alreadyTapped || isPending}
          alreadyTapped={alreadyTapped}
        />

        <p className="text-neutral-600 text-sm">
          {match.tappedCount}/{match.players.length} tapped
        </p>

        {/* Live results as they come in */}
        {tapResults.length > 0 && (
          <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-neutral-600 uppercase tracking-widest">Live</p>
            {tapResults.slice(0, 5).map((r, i) => (
              <div key={r.player} className="flex justify-between font-mono text-sm">
                <span className="text-neutral-400">
                  #{i + 1} {r.player.slice(0, 6)}…{r.player.slice(-4)}
                </span>
                <span className={i === 0 ? 'text-go font-bold' : 'text-neutral-500'}>
                  {Number(r.reactionMs)}ms
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Host manual settle after deadline */}
        {isHost && (
          <button
            onClick={handleSettle}
            disabled={isPending}
            className="text-neutral-700 hover:text-neutral-500 text-xs border border-neutral-800 rounded-lg px-4 py-2 transition-colors"
          >
            Force Settle (after 5s deadline)
          </button>
        )}

        {txError && <p className="text-red-400 text-sm text-center max-w-sm">{txError}</p>}
      </div>
    )
  }

  // ── Phase: Finished ──────────────────────────────────────────────────────
  if (match.state === MatchState.Finished) {
    const pot = match.stakePerPlayer * BigInt(match.players.length)
    const displayResults =
      tapResults.length > 0
        ? tapResults
        : [{ player: match.winner, reactionMs: match.winnerReactionMs }]

    return (
      <div className="flex flex-col items-center px-6 py-12 min-h-screen gap-6">
        <h1 className="text-5xl font-black tracking-widest">MATCH OVER</h1>
        <div className="w-full max-w-md">
          <Leaderboard
            results={displayResults}
            winner={match.winner}
            pot={pot}
            currentAddress={address}
          />
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-monad hover:bg-purple-700 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    )
  }

  // ── Phase: Open / Locked — Lobby ─────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-6 py-10 min-h-screen gap-5">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-neutral-600 hover:text-neutral-400 text-sm">
            ← Home
          </button>
          <span
            className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
              match.state === MatchState.Open
                ? 'bg-yellow-900/40 text-yellow-400'
                : 'bg-blue-900/40 text-blue-400'
            }`}
          >
            {match.state === MatchState.Open ? 'Open' : 'Locked'}
          </span>
        </div>

        {/* Match stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Match', value: `#${id}` },
            { label: 'Stake', value: `${formatEther(match.stakePerPlayer)} MON` },
            { label: 'Pot', value: `${formatEther(match.stakePerPlayer * BigInt(match.players.length))} MON` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-900 rounded-xl p-3 text-center space-y-1">
              <p className="text-xs text-neutral-600 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-white font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Share link */}
        <div className="bg-neutral-900 rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-neutral-500 truncate">
            {typeof window !== 'undefined' ? window.location.href : `/match/${id}`}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="text-xs text-monad hover:text-purple-400 font-semibold whitespace-nowrap transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Player list */}
        <PlayerList
          players={match.players}
          maxPlayers={match.maxPlayers}
          currentAddress={address}
          host={match.host}
        />

        {/* Join — non-players only, Open phase */}
        {!isPlayer && match.state === MatchState.Open && (
          <button
            onClick={handleJoin}
            disabled={isPending}
            className="w-full bg-monad hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-5 rounded-2xl text-lg transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining…
              </span>
            ) : (
              `Join — ${formatEther(match.stakePerPlayer)} MON`
            )}
          </button>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="bg-neutral-900 rounded-2xl p-4 space-y-3 border border-neutral-800">
            <p className="text-xs text-monad uppercase tracking-widest font-bold">Host Controls</p>

            {match.state === MatchState.Open && match.players.length >= 2 && (
              <button
                onClick={handleLock}
                disabled={isPending}
                className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {isPending ? 'Locking…' : 'Lock Lobby'}
              </button>
            )}

            {match.state === MatchState.Locked && countdown === null && (
              <button
                onClick={handleStartSequence}
                disabled={isPending}
                className="w-full bg-go hover:bg-green-600 disabled:opacity-50 text-black font-black py-4 rounded-xl text-lg transition-colors"
              >
                Start Game
              </button>
            )}

            {countdown !== null && (
              <div className="text-center py-2 space-y-1">
                <p className="text-neutral-500 text-sm">Starting in…</p>
                <p className="text-white text-7xl font-black">{countdown}</p>
              </div>
            )}
          </div>
        )}

        {/* Non-host waiting */}
        {!isHost && match.state === MatchState.Locked && (
          <div className="bg-neutral-900 rounded-2xl p-6 text-center space-y-3">
            <p className="text-neutral-400">Lobby locked. Waiting for host to start…</p>
            <div className="w-6 h-6 border-2 border-monad border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {txError && (
          <p className="text-red-400 text-sm bg-red-950/30 rounded-xl px-4 py-3">{txError}</p>
        )}
      </div>
    </div>
  )
}
