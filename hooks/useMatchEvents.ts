'use client';

import { useWatchContractEvent } from 'wagmi';
import { REFLEX_ABI } from '@/constants/abi';
import type { TapResult } from '@/types';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

interface UseMatchEventsParams {
  matchId: bigint;
  onMatchStarted?: (goTimestampMs: bigint) => void;
  onTapSubmitted?: (result: TapResult) => void;
  onMatchFinished?: (winner: `0x${string}`, reactionMs: bigint, pot: bigint) => void;
  onMatchJoined?: () => void;
}

export function useMatchEvents({
  matchId,
  onMatchStarted,
  onTapSubmitted,
  onMatchFinished,
  onMatchJoined,
}: UseMatchEventsParams) {
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'MatchStarted',
    args: { matchId },
    pollingInterval: 200,
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { matchId: bigint; goTimestampMs: bigint; totalPlayers: number };
        onMatchStarted?.(args.goTimestampMs);
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'TapSubmitted',
    args: { matchId },
    pollingInterval: 200,
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { matchId: bigint; player: `0x${string}`; reactionMs: bigint };
        onTapSubmitted?.({ player: args.player, reactionMs: args.reactionMs });
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'MatchFinished',
    args: { matchId },
    pollingInterval: 200,
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as {
          matchId: bigint;
          winner: `0x${string}`;
          reactionMs: bigint;
          pot: bigint;
        };
        onMatchFinished?.(args.winner, args.reactionMs, args.pot);
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'MatchJoined',
    args: { matchId },
    pollingInterval: 500,
    onLogs() {
      onMatchJoined?.();
    },
  });
}
