'use client';

import { Crown, Trophy, Medal } from 'lucide-react';
import clsx from 'clsx';
import type { TapResult } from '@/types';

interface LeaderboardProps {
  results: TapResult[];
  players: `0x${string}`[];
  winner: `0x${string}`;
  currentUser?: `0x${string}`;
  pot: bigint;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatMon(wei: bigint) {
  const mon = Number(wei) / 1e18;
  return mon % 1 === 0 ? mon.toFixed(0) : mon.toFixed(3);
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown size={16} className="text-yellow-400" />;
  if (rank === 2) return <Trophy size={16} className="text-slate-400" />;
  if (rank === 3) return <Medal size={16} className="text-amber-600" />;
  return (
    <span className="w-4 text-center font-mono text-xs font-bold text-text-muted">
      {rank}
    </span>
  );
};

export function Leaderboard({ results, players, winner, currentUser, pot }: LeaderboardProps) {
  const sorted = [...results].sort((a, b) => Number(a.reactionMs - b.reactionMs));
  const dnf = players.filter(
    (p) => !results.find((r) => r.player.toLowerCase() === p.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Winner banner */}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/70">
          Winner
        </p>
        <p className="mt-1 font-mono text-lg font-bold text-yellow-400">
          {shortAddr(winner)}
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          +{formatMon(pot)} MON
        </p>
      </div>

      {/* Ranked list */}
      <div className="space-y-2">
        {sorted.map((r, i) => {
          const rank = i + 1;
          const isYou = currentUser && r.player.toLowerCase() === currentUser.toLowerCase();
          const isWinner = r.player.toLowerCase() === winner.toLowerCase();

          return (
            <div
              key={r.player}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3',
                isWinner
                  ? 'border-yellow-500/30 bg-yellow-500/10'
                  : isYou
                  ? 'border-primary/30 bg-primary/10'
                  : 'border-white/[0.06] bg-surface'
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                {rankIcon(rank)}
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-text-primary">
                    {shortAddr(r.player)}
                  </span>
                  {isYou && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                      You
                    </span>
                  )}
                </div>
              </div>

              <span
                className={clsx(
                  'font-mono text-sm font-bold',
                  isWinner ? 'text-yellow-400' : 'text-text-secondary'
                )}
              >
                {Number(r.reactionMs).toLocaleString()}ms
              </span>
            </div>
          );
        })}

        {dnf.map((addr) => {
          const isYou = currentUser && addr.toLowerCase() === currentUser.toLowerCase();
          return (
            <div
              key={addr}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3 opacity-50',
                isYou ? 'border-primary/20 bg-primary/5' : 'border-white/[0.04] bg-surface'
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                <span className="font-mono text-xs font-bold text-text-muted">—</span>
              </div>
              <span className="flex-1 font-mono text-sm font-medium text-text-muted">
                {shortAddr(addr)}
              </span>
              <span className="font-mono text-xs text-text-muted">DNF</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
