'use client'

import { useState } from 'react'
import { useWatchContractEvent } from 'wagmi'
import { REFLEX_ABI, REFLEX_CONTRACT_ADDRESS } from '@/constants/abi'
import { TapResult } from '@/types'

export function useMatchEvents(matchId: bigint | null) {
  const [goTimestampMs, setGoTimestampMs] = useState<bigint | null>(null)
  const [tapResults, setTapResults] = useState<TapResult[]>([])
  const [finishedData, setFinishedData] = useState<{
    winner: `0x${string}`
    reactionMs: bigint
    pot: bigint
  } | null>(null)

  // MatchStarted — all clients use this goTimestampMs as the shared baseline
  useWatchContractEvent({
    address: REFLEX_CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'MatchStarted',
    onLogs(logs) {
      for (const log of logs) {
        if (log.args.matchId === matchId && log.args.goTimestampMs != null) {
          setGoTimestampMs(log.args.goTimestampMs)
        }
      }
    },
    enabled: matchId != null,
  })

  // TapSubmitted — build live leaderboard sorted fastest → slowest
  useWatchContractEvent({
    address: REFLEX_CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'TapSubmitted',
    onLogs(logs) {
      setTapResults((prev) => {
        const updated = [...prev]
        for (const log of logs) {
          if (log.args.matchId !== matchId) continue
          if (!log.args.player || log.args.reactionMs == null) continue
          const already = updated.find((r) => r.player === log.args.player)
          if (!already) {
            updated.push({
              player: log.args.player as `0x${string}`,
              reactionMs: log.args.reactionMs as bigint,
            })
          }
        }
        return updated.sort((a, b) => Number(a.reactionMs - b.reactionMs))
      })
    },
    enabled: matchId != null,
  })

  // MatchFinished — winner + payout
  useWatchContractEvent({
    address: REFLEX_CONTRACT_ADDRESS,
    abi: REFLEX_ABI,
    eventName: 'MatchFinished',
    onLogs(logs) {
      for (const log of logs) {
        if (log.args.matchId !== matchId) continue
        if (!log.args.winner || log.args.reactionMs == null || log.args.pot == null) continue
        setFinishedData({
          winner: log.args.winner as `0x${string}`,
          reactionMs: log.args.reactionMs as bigint,
          pot: log.args.pot as bigint,
        })
      }
    },
    enabled: matchId != null,
  })

  return { goTimestampMs, tapResults, finishedData }
}
