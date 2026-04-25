'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, parseEventLogs } from 'viem'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { wagmiConfig } from '@/lib/wagmiConfig'
import { REFLEX_ABI, REFLEX_CONTRACT_ADDRESS } from '@/constants/abi'

export default function CreatePage() {
  const router = useRouter()
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [stake, setStake] = useState('0.01')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { writeContractAsync } = useWriteContract()

  const totalPot = (parseFloat(stake) * maxPlayers).toFixed(4)

  async function handleCreate() {
    setError('')
    let parsedStake: bigint
    try {
      parsedStake = parseEther(stake)
    } catch {
      setError('Invalid stake amount')
      return
    }

    setLoading(true)
    try {
      const txHash = await writeContractAsync({
        address: REFLEX_CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'createMatch',
        args: [maxPlayers],
        value: parsedStake,
      })

      // Decode MatchCreated event to get the new matchId
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash })
      const logs = parseEventLogs({
        abi: REFLEX_ABI,
        eventName: 'MatchCreated',
        logs: receipt.logs,
      })

      if (logs[0]?.args.matchId != null) {
        router.push(`/match/${logs[0].args.matchId}`)
      }
    } catch (err) {
      setError((err as Error).shortMessage ?? (err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-neutral-600 hover:text-neutral-400 text-sm mb-6 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-black text-white">Create Match</h1>
        </div>

        {/* Max Players */}
        <div className="space-y-3">
          <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
            Max Players (2–20)
          </label>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMaxPlayers((p) => Math.max(2, p - 1))}
              className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 text-white text-2xl font-light hover:border-neutral-600 transition-colors"
            >
              −
            </button>
            <span className="text-5xl font-black text-white w-16 text-center">{maxPlayers}</span>
            <button
              onClick={() => setMaxPlayers((p) => Math.min(20, p + 1))}
              className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 text-white text-2xl font-light hover:border-neutral-600 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Stake */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
            Stake per Player (MON)
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-neutral-900 text-white text-xl rounded-xl px-4 py-4 outline-none border border-neutral-800 focus:border-monad transition-colors"
          />
          <p className="text-neutral-600 text-sm">
            Total pot when full: <span className="text-neutral-400 font-semibold">{totalPot} MON</span>
          </p>
        </div>

        {/* Info */}
        <div className="bg-neutral-900 border border-monad/30 rounded-xl p-4">
          <p className="text-neutral-400 text-sm leading-relaxed">
            You are the host. After creating, share the match link with players. Lock the lobby and
            start the countdown when ready.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/30 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-monad hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-5 rounded-2xl text-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating…
            </span>
          ) : (
            'Create & Enter Lobby'
          )}
        </button>
      </div>
    </div>
  )
}
