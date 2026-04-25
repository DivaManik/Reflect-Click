'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'

export default function HomePage() {
  const router = useRouter()
  const { ready, authenticated, login, logout } = usePrivy()
  const { address } = useAccount()
  const [matchId, setMatchId] = useState('')

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-monad border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6">
        <h1 className="text-8xl font-black tracking-[0.2em] text-white">REFLEX</h1>
        <p className="text-neutral-500 text-lg">Fastest tap wins the pot</p>
        <p className="text-neutral-600 text-sm text-center max-w-xs">
          Multi-player reaction-time wagering on Monad. Stake MON, tap fastest, win the pot.
        </p>
        <button
          onClick={login}
          className="mt-4 bg-monad hover:bg-purple-700 text-white font-bold py-4 px-12 rounded-2xl text-lg transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 py-12">
      <h1 className="text-8xl font-black tracking-[0.2em] text-white">REFLEX</h1>
      <p className="text-neutral-500 text-lg mb-2">Fastest tap wins the pot</p>

      {/* Wallet info */}
      {address && (
        <div className="w-full max-w-md bg-neutral-900 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-neutral-600 uppercase tracking-widest">Wallet</p>
          <p className="font-mono text-sm text-neutral-300 break-all">{address}</p>
          <p className="text-xs text-neutral-700 mt-1">
            Ensure this address has MON to cover stakes. Gas is free via Monad.
          </p>
        </div>
      )}

      {/* Create match */}
      <button
        onClick={() => router.push('/create')}
        className="w-full max-w-md bg-monad hover:bg-purple-700 text-white font-bold py-5 rounded-2xl text-lg transition-colors"
      >
        Create Match
      </button>

      {/* Join match */}
      <div className="flex gap-3 w-full max-w-md">
        <input
          type="number"
          min={1}
          placeholder="Match ID"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="flex-1 bg-neutral-900 text-white rounded-xl px-4 py-4 text-lg outline-none border border-neutral-800 focus:border-monad transition-colors"
        />
        <button
          disabled={!matchId}
          onClick={() => router.push(`/match/${matchId}`)}
          className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-bold py-4 px-6 rounded-xl transition-colors"
        >
          Join
        </button>
      </div>

      <button
        onClick={logout}
        className="text-neutral-700 hover:text-neutral-500 text-sm transition-colors mt-4"
      >
        Logout
      </button>
    </div>
  )
}
