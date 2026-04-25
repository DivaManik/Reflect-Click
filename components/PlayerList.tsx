'use client';

import { Crown, User } from 'lucide-react';
import clsx from 'clsx';

interface PlayerListProps {
  playerCount: number;
  host: `0x${string}`;
  currentUser?: `0x${string}`;
  tappedCount?: number;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PlayerList({ playerCount, host, currentUser, tappedCount = 0 }: PlayerListProps) {
  const isHostYou = currentUser && host.toLowerCase() === currentUser.toLowerCase();

  return (
    <div className="space-y-2">
      {/* Host row */}
      <div
        className={clsx(
          'flex items-center gap-3 rounded-xl border px-4 py-3',
          isHostYou ? 'border-primary/40 bg-primary/10' : 'border-white/[0.06] bg-surface'
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20">
          <Crown size={14} className="text-yellow-400" />
        </div>
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium text-text-primary">
            {shortAddr(host)}
          </span>
          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400">
            Host
          </span>
          {isHostYou && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              You
            </span>
          )}
        </div>
      </div>

      {/* Other players summary */}
      {playerCount > 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <User size={14} className="text-text-muted" />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-text-secondary">
              +{playerCount - 1} other {playerCount - 1 === 1 ? 'player' : 'players'}
            </span>
            {tappedCount > 0 && (
              <span className="text-xs text-tap font-semibold">
                {tappedCount} tapped
              </span>
            )}
          </div>
        </div>
      )}

      {/* Waiting slot */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-3">
        <div className="h-8 w-8 rounded-lg border border-dashed border-white/[0.08]" />
        <span className="text-sm text-text-muted">Share the link to invite more players</span>
      </div>
    </div>
  );
}
