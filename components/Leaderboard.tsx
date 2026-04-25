'use client'

import { formatEther } from 'viem'
import { TapResult } from '@/types'

interface Props {
  results: TapResult[]
  winner: `0x${string}`
  pot: bigint
  currentAddress?: `0x${string}`
}

const MEDALS = ['🥇', '🥈', '🥉']

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function Leaderboard({ results, winner, pot, currentAddress }: Props) {
  const isWinner = winner.toLowerCase() === currentAddress?.toLowerCase()

  return (
    <div className="w-full space-y-4">
      {/* Winner Banner */}
      <div className="bg-neutral-900 border border-go rounded-2xl p-6 text-center space-y-1">
        <p className="text-go text-xs font-bold uppercase tracking-widest">Winner</p>
        <p className="text-white text-2xl font-extrabold font-mono">
          {isWinner ? '🎉 YOU!' : shortAddr(winner)}
        </p>
        <p className="text-go text-xl font-bold">+{formatEther(pot)} MON</p>
      </div>

      {/* Rankings */}
      <p className="text-xs text-neutral-600 uppercase tracking-widest font-semibold">
        Reaction Times
      </p>

      {results.map((r, i) => {
        const isYou = r.player.toLowerCase() === currentAddress?.toLowerCase()
        return (
          <div
            key={r.player}
            className={`flex items-center gap-3 bg-neutral-900 rounded-xl px-4 py-3 ${
              isYou ? 'ring-1 ring-monad' : ''
            }`}
          >
            <span className="text-xl w-8">{MEDALS[i] ?? `#${i + 1}`}</span>
            <span className={`flex-1 font-mono text-sm ${isYou ? 'text-monad font-bold' : 'text-neutral-300'}`}>
              {shortAddr(r.player)}
              {isYou ? ' (you)' : ''}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${i === 0 ? 'text-go' : 'text-neutral-500'}`}>
              {Number(r.reactionMs)}ms
            </span>
          </div>
        )
      })}
    </div>
  )
}
