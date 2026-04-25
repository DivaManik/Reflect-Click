'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { parseEther, formatEther } from 'viem';
import clsx from 'clsx';
import { ArrowLeft, Users, Lock, Play, Zap, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { useMatch } from '@/hooks/useMatch';
import { useMatchEvents } from '@/hooks/useMatchEvents';
import { REFLEX_ABI } from '@/constants/abi';
import { wagmiConfig } from '@/lib/wagmiConfig';
import { MatchState, type TapResult } from '@/types';
import { Header } from '@/components/Header';
import { PlayerList } from '@/components/PlayerList';
import { Leaderboard } from '@/components/Leaderboard';
import { QRShare } from '@/components/QRShare';
import { TapButton } from '@/components/TapButton';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

type HostStartState = 'idle' | 'locking' | 'countdown' | 'starting';

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const matchId = BigInt(params.id as string);
  const { match, refetch } = useMatch(matchId);

  // ── Event-driven state (reacts faster than polling) ──────────────────────
  const [goTimestampMs, setGoTimestampMs] = useState<bigint | null>(null);
  const [tapResults, setTapResults] = useState<TapResult[]>([]);
  const [finishedData, setFinishedData] = useState<{
    winner: `0x${string}`;
    reactionMs: bigint;
    pot: bigint;
  } | null>(null);

  // ── TAP state ────────────────────────────────────────────────────────────
  const hasTappedRef = useRef(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [myReactionMs, setMyReactionMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const rafRef = useRef<number>();

  // ── Host start-game flow ─────────────────────────────────────────────────
  const [hostStartState, setHostStartState] = useState<HostStartState>('idle');
  const [countdownSec, setCountdownSec] = useState(0);

  // ── Tx error ─────────────────────────────────────────────────────────────
  const [txError, setTxError] = useState('');

  // Derived values
  const effectiveState: MatchState = (() => {
    // Events take precedence over polled state for real-time feel
    if (finishedData) return MatchState.Finished;
    if (goTimestampMs !== null) return MatchState.Active;
    return match?.state ?? MatchState.Open;
  })();

  const isHost =
    address && match ? address.toLowerCase() === match.host.toLowerCase() : false;
  const isPlayer =
    address && match
      ? match.players.some((p) => p.toLowerCase() === address.toLowerCase())
      : false;

  const displayedGoTimestampMs = goTimestampMs ?? match?.goTimestampMs ?? 0n;

  // ── Event subscriptions ──────────────────────────────────────────────────
  useMatchEvents({
    matchId,
    onMatchStarted: (ts) => {
      setGoTimestampMs(ts);
    },
    onTapSubmitted: (result) => {
      setTapResults((prev) => {
        if (prev.find((r) => r.player.toLowerCase() === result.player.toLowerCase()))
          return prev;
        return [...prev, result];
      });
    },
    onMatchFinished: (winner, reactionMs, pot) => {
      setFinishedData({ winner, reactionMs, pot });
      refetch();
    },
    onMatchJoined: refetch,
  });

  // ── Elapsed timer during active phase ────────────────────────────────────
  useEffect(() => {
    if (effectiveState !== MatchState.Active || hasTapped) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const goMs = Number(displayedGoTimestampMs);

    function tick() {
      setElapsedMs(Date.now() - goMs);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [effectiveState, hasTapped, displayedGoTimestampMs]);

  // Sync from contract state on initial load / refresh
  useEffect(() => {
    if (!match) return;
    // If refreshed mid-game, restore goTimestampMs from contract
    if (match.state === MatchState.Active && match.goTimestampMs > 0n && goTimestampMs === null) {
      setGoTimestampMs(match.goTimestampMs);
    }
    if (match.state === MatchState.Finished && match.winner !== ZERO_ADDR) {
      setFinishedData({
        winner: match.winner,
        reactionMs: match.winnerReactionMs,
        pot: match.stakePerPlayer * BigInt(match.players.length),
      });
    }
  }, [match, address]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!authenticated) { login(); return; }
    if (!match) return;
    setTxError('');

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'joinMatch',
        args: [matchId],
        value: match.stakePerPlayer,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      refetch();
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      setTxError(e.shortMessage ?? e.message ?? 'Transaction failed');
    }
  }

  async function handleStartGame() {
    if (!match) return;
    setTxError('');

    try {
      if (match.state === MatchState.Open) {
        setHostStartState('locking');
        const lockHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: REFLEX_ABI,
          functionName: 'lockMatch',
          args: [matchId],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: lockHash });
      }

      // Random delay 1-5 seconds — players see "GET READY" the whole time
      const delayMs = Math.floor(Math.random() * 4000) + 1000;
      const endAt = Date.now() + delayMs;
      setHostStartState('countdown');
      setCountdownSec(Math.ceil(delayMs / 1000));

      const tick = setInterval(() => {
        const remaining = Math.ceil(Math.max(0, endAt - Date.now()) / 1000);
        setCountdownSec(remaining);
        if (remaining <= 0) clearInterval(tick);
      }, 200);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      clearInterval(tick);

      setHostStartState('starting');
      const startHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'startMatch',
        args: [matchId],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: startHash });
      setHostStartState('idle');
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      setTxError(e.shortMessage ?? e.message ?? 'Transaction failed');
      setHostStartState('idle');
    }
  }

  async function handleSettle() {
    setTxError('');
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'settleMatch',
        args: [matchId],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      refetch();
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      setTxError(e.shortMessage ?? e.message ?? 'Transaction failed');
    }
  }

  const handleTap = useCallback(async () => {
    if (hasTappedRef.current || effectiveState !== MatchState.Active) return;
    hasTappedRef.current = true;

    const clientTimestampMs = BigInt(Date.now());
    const reactionMs = Number(clientTimestampMs - displayedGoTimestampMs);

    setHasTapped(true);
    setMyReactionMs(reactionMs);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (navigator.vibrate) navigator.vibrate(60);

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'submitTap',
        args: [matchId, clientTimestampMs],
      });
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      setTxError(e.shortMessage ?? e.message ?? 'Tap submission failed');
    }
  }, [effectiveState, displayedGoTimestampMs, matchId, writeContractAsync]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!match) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  // Not found
  if (match.host === ZERO_ADDR) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertCircle size={40} className="text-text-muted" />
          <p className="text-lg font-bold text-text-primary">Match not found</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  // ── Active Phase — full-screen green ─────────────────────────────────────
  if (effectiveState === MatchState.Active) {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ backgroundColor: '#00e676', touchAction: 'none' }}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <span className="font-mono text-sm font-bold text-black/50">
            Match #{matchId.toString()}
          </span>
          {!hasTapped && (
            <div className="flex items-center gap-1.5 font-mono text-sm font-black text-black">
              <Clock size={14} />
              <span>{elapsedMs}ms</span>
            </div>
          )}
        </div>

        <TapButton
          onTap={handleTap}
          tapped={hasTapped}
          reactionMs={myReactionMs ?? undefined}
          disabled={hasTapped}
        />

        {txError && (
          <p className="px-6 pb-6 text-center text-sm text-black/70">{txError}</p>
        )}
      </div>
    );
  }

  // ── Finished Phase ───────────────────────────────────────────────────────
  if (effectiveState === MatchState.Finished && (finishedData ?? match.winner !== ZERO_ADDR)) {
    const winner = finishedData?.winner ?? match.winner;
    const pot = finishedData?.pot ?? match.stakePerPlayer * BigInt(match.players.length);

    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
          <h1 className="text-xl font-black text-text-primary">Results</h1>

          <Leaderboard
            results={tapResults.length > 0 ? tapResults : []}
            players={match.players}
            winner={winner}
            currentUser={address}
            pot={pot}
          />

          <div className="mt-2 flex gap-3">
            <button
              onClick={() => router.push('/create')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition-all hover:bg-primary-dim active:scale-95"
            >
              <Play size={15} />
              New match
            </button>
            <Link
              href="/"
              className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-surface py-3.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Lobby
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Lobby Phase (Open + Locked) ──────────────────────────────────────────
  const canJoinFull =
    authenticated && !isPlayer && match.state === MatchState.Open;

  const isDeadlinePassed =
    match.state === MatchState.Active &&
    Number(match.settleDeadlineMs) > 0 &&
    Date.now() > Number(match.settleDeadlineMs);

  const hostCanStart =
    isHost &&
    (match.state === MatchState.Open || match.state === MatchState.Locked) &&
    match.players.length >= 2 &&
    hostStartState === 'idle';

  const statusLabel: Record<MatchState, string> = {
    [MatchState.Open]: 'Open',
    [MatchState.Locked]: 'Locked',
    [MatchState.Active]: 'Live',
    [MatchState.Finished]: 'Finished',
  };

  const statusColor: Record<MatchState, string> = {
    [MatchState.Open]: 'bg-emerald-500/20 text-emerald-400',
    [MatchState.Locked]: 'bg-yellow-500/20 text-yellow-400',
    [MatchState.Active]: 'bg-tap/20 text-tap',
    [MatchState.Finished]: 'bg-white/10 text-text-muted',
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <Header />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
        {/* Back */}
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          Lobby
        </Link>

        {/* Match header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Match #{matchId.toString()}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={clsx(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  statusColor[effectiveState]
                )}
              >
                {statusLabel[effectiveState]}
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-text-secondary">
                <Users size={13} />
                {match.players.length}/{match.maxPlayers}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-text-muted">Pot</p>
            <p className="text-xl font-black text-text-primary">
              {formatEther(match.stakePerPlayer * BigInt(match.players.length))}
              <span className="ml-1 text-sm font-semibold text-text-secondary">MON</span>
            </p>
          </div>
        </div>

        {/* Stake info */}
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface px-4 py-3">
          <Zap size={14} className="text-primary" />
          <span className="text-sm text-text-secondary">
            Stake:{' '}
            <span className="font-semibold text-text-primary">
              {formatEther(match.stakePerPlayer)} MON
            </span>{' '}
            per player · Winner takes all
          </span>
        </div>

        {/* GET READY state for Locked */}
        {effectiveState === MatchState.Locked && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 py-6">
            <div className="animate-breathe">
              <p className="text-2xl font-black text-yellow-400">GET READY</p>
            </div>
            {isHost && hostStartState === 'countdown' && (
              <p className="font-mono text-4xl font-black text-yellow-300">{countdownSec}</p>
            )}
            {isHost && hostStartState === 'starting' && (
              <p className="flex items-center gap-2 text-sm text-yellow-400/70">
                <Spinner className="h-4 w-4" />
                Starting…
              </p>
            )}
            {!isHost && (
              <p className="text-sm text-yellow-400/70">Waiting for host to start</p>
            )}
          </div>
        )}

        {/* QR share — only when open */}
        {match.state === MatchState.Open && <QRShare matchId={matchId.toString()} />}

        {/* Player list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Players
          </p>
          <PlayerList
            players={match.players}
            maxPlayers={match.maxPlayers}
            host={match.host}
            currentUser={address}
          />
        </div>

        {/* Error */}
        {txError && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {txError}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-6">
          {/* Non-player: Join */}
          {canJoinFull && match.players.length < match.maxPlayers && (
            <button
              onClick={handleJoin}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dim active:scale-[0.98]"
            >
              Join · {formatEther(match.stakePerPlayer)} MON
            </button>
          )}

          {/* Not connected */}
          {!authenticated && match.state === MatchState.Open && (
            <button
              onClick={login}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-white transition-all hover:bg-primary-dim active:scale-[0.98]"
            >
              Connect to join
            </button>
          )}

          {/* Host: Start game */}
          {hostCanStart && (
            <button
              onClick={handleStartGame}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-tap py-4 text-base font-bold text-black transition-all hover:bg-tap-dim active:scale-[0.98]"
            >
              <Play size={18} strokeWidth={2.5} />
              {match.players.length < 2
                ? `Need ${2 - match.players.length} more player`
                : 'Start Game'}
            </button>
          )}

          {/* Host: loading states */}
          {isHost && hostStartState !== 'idle' && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-surface py-4 text-sm text-text-secondary">
              <Spinner className="h-4 w-4" />
              {hostStartState === 'locking' && 'Locking match…'}
              {hostStartState === 'countdown' && `Starting in ${countdownSec}…`}
              {hostStartState === 'starting' && 'Calling start…'}
            </div>
          )}

          {/* Settle if deadline passed */}
          {isDeadlinePassed && match.winner !== ZERO_ADDR && (
            <button
              onClick={handleSettle}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-3.5 text-sm font-bold text-yellow-400 transition-colors hover:bg-yellow-500/20"
            >
              <Lock size={14} />
              Settle match
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
