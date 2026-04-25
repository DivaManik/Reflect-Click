'use client';

import { Crown, User } from 'lucide-react';
import clsx from 'clsx';

interface PlayerListProps {
  players: `0x${string}`[];
  maxPlayers: number;
  host: `0x${string}`;
  currentUser?: `0x${string}`;
  tappedPlayers?: Set<string>;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PlayerList({
  players,
  maxPlayers,
  host,
  currentUser,
  tappedPlayers = new Set(),
}: PlayerListProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <div className="space-y-2">
      {players.map((addr) => {
        const isHost = addr.toLowerCase() === host.toLowerCase();
        const isYou = currentUser && addr.toLowerCase() === currentUser.toLowerCase();
        const hasTapped = tappedPlayers.has(addr.toLowerCase());

        return (
          <div
            key={addr}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              isYou
                ? 'border-primary/40 bg-primary/10'
                : 'border-white/[0.06] bg-surface'
            )}
          >
            <div
              className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isHost ? 'bg-yellow-500/20' : 'bg-white/[0.06]'
              )}
            >
              {isHost ? (
                <Crown size={14} className="text-yellow-400" />
              ) : (
                <User size={14} className="text-text-muted" />
              )}
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-text-primary">
                  {shortAddr(addr)}
                </span>
                {isYou && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    You
                  </span>
                )}
                {isHost && (
                  <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                    Host
                  </span>
                )}
              </div>
            </div>

            {hasTapped && (
              <div className="h-2 w-2 rounded-full bg-tap" />
            )}
          </div>
        );
      })}

      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-3"
        >
          <div className="h-8 w-8 rounded-lg border border-dashed border-white/[0.08]" />
          <span className="text-sm text-text-muted">Waiting for player…</span>
        </div>
      ))}
    </div>
  );
}
