'use client';

import { Crown, Trophy, Medal } from 'lucide-react';
import clsx from 'clsx';
import type { FinishedData, TapResult } from '@/types';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

interface LeaderboardProps {
  finished: FinishedData;
  tapResults: TapResult[];
  currentUser?: `0x${string}`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatMon(wei: bigint) {
  const mon = Number(wei) / 1e18;
  if (mon === 0) return '0';
  return mon < 0.001 ? mon.toFixed(6) : mon < 1 ? mon.toFixed(3) : mon.toFixed(2);
}

const RANK_ICONS = [
  <Crown key={1} size={16} className="text-yellow-400" />,
  <Trophy key={2} size={16} className="text-slate-400" />,
  <Medal key={3} size={16} className="text-amber-600" />,
];

const RANK_COLORS = [
  'border-yellow-500/30 bg-yellow-500/10',
  'border-slate-500/30 bg-slate-500/10',
  'border-amber-700/30 bg-amber-700/10',
];

export function Leaderboard({ finished, tapResults, currentUser }: LeaderboardProps) {
  const winners = finished.topPlayers
    .map((player, i) => ({
      player,
      reactionMs: finished.topReactionMs[i],
      prize: finished.prizes[i],
      rank: i + 1,
    }))
    .filter((w) => w.player !== ZERO_ADDR);

  // DNF = tapped but not top winner, or didn't tap at all
  const dnf = tapResults.filter(
    (r) => !winners.find((w) => w.player.toLowerCase() === r.player.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Winners */}
      {winners.map(({ player, reactionMs, prize, rank }) => {
        const isYou = currentUser && player.toLowerCase() === currentUser.toLowerCase();
        return (
          <div
            key={player}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              RANK_COLORS[rank - 1],
              isYou && 'ring-1 ring-primary/40'
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
              {RANK_ICONS[rank - 1]}
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-text-primary">
                  {shortAddr(player)}
                </span>
                {isYou && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    You
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-text-muted">
                {Number(reactionMs).toLocaleString()}ms
              </span>
            </div>
            {prize > 0n && (
              <span className="font-mono text-sm font-bold text-tap">
                +{formatMon(prize)} MON
              </span>
            )}
          </div>
        );
      })}

      {/* DNF */}
      {dnf.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted px-1">
            Other tappers
          </p>
          {dnf
            .sort((a, b) => Number(a.reactionMs - b.reactionMs))
            .map((r) => {
              const isYou = currentUser && r.player.toLowerCase() === currentUser.toLowerCase();
              return (
                <div
                  key={r.player}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 opacity-60',
                    isYou ? 'border-primary/20 bg-primary/5' : 'border-white/[0.04] bg-surface'
                  )}
                >
                  <div className="h-6 w-6 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-text-muted">—</span>
                  </div>
                  <span className="flex-1 font-mono text-sm font-medium text-text-muted">
                    {shortAddr(r.player)}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {Number(r.reactionMs).toLocaleString()}ms
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {winners.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-surface px-4 py-6 text-center text-sm text-text-muted">
          No one tapped — pot goes to platform
        </div>
      )}
    </div>
  );
}
