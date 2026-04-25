'use client';

import { useReadContract } from 'wagmi';
import { REFLEX_ABI } from '@/constants/abi';
import { MatchState, type MatchFull } from '@/types';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export function useMatch(matchId: bigint | undefined) {
  const { data: raw, refetch: refetchMatch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    functionName: 'matches',
    args: matchId !== undefined ? [matchId] : undefined,
    query: {
      enabled: matchId !== undefined,
      refetchInterval: 800,
    },
  });

  const { data: players, refetch: refetchPlayers } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    functionName: 'getMatchPlayers',
    args: matchId !== undefined ? [matchId] : undefined,
    query: {
      enabled: matchId !== undefined,
      refetchInterval: 800,
    },
  });

  const match: MatchFull | undefined =
    raw && matchId !== undefined
      ? {
          matchId,
          host: raw[0],
          stakePerPlayer: raw[1],
          maxPlayers: Number(raw[2]),
          goTimestampMs: raw[3],
          settleDeadlineMs: raw[4],
          winner: raw[5],
          winnerReactionMs: raw[6],
          tappedCount: Number(raw[7]),
          state: raw[8] as MatchState,
          players: (players as `0x${string}`[]) ?? [],
        }
      : undefined;

  function refetch() {
    refetchMatch();
    refetchPlayers();
  }

  return { match, refetch };
}

export function useMatchCounter() {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    functionName: 'matchCounter',
    query: { refetchInterval: 3000 },
  });
  return data as bigint | undefined;
}
