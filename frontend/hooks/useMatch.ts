'use client'

import { useReadContract } from 'wagmi'
import { REFLEX_ABI, REFLEX_CONTRACT_ADDRESS } from '@/constants/abi'
import { Match, MatchState } from '@/types'

export function useMatch(matchId: bigint | null) {
  const { data: matchData, isLoading, refetch: refetchMatch } = useReadContract({
    address: REFLEX_CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    functionName: 'matches',
    args: matchId != null ? [matchId] : undefined,
    query: {
      enabled: matchId != null,
      refetchInterval: 1000,
    },
  })

  const { data: players, refetch: refetchPlayers } = useReadContract({
    address: REFLEX_CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    functionName: 'getMatchPlayers',
    args: matchId != null ? [matchId] : undefined,
    query: {
      enabled: matchId != null,
      refetchInterval: 1000,
    },
  })

  const match: Match | null =
    matchData && players
      ? {
          host: matchData[0],
          stakePerPlayer: matchData[1],
          maxPlayers: matchData[2],
          goTimestampMs: matchData[3],
          settleDeadlineMs: matchData[4],
          winner: matchData[5],
          winnerReactionMs: matchData[6],
          tappedCount: matchData[7],
          state: matchData[8] as MatchState,
          players: [...players] as `0x${string}`[],
        }
      : null

  return {
    match,
    isLoading,
    refetch: () => {
      refetchMatch()
      refetchPlayers()
    },
  }
}
