'use client'

interface Props {
  players: `0x${string}`[]
  maxPlayers: number
  currentAddress?: `0x${string}`
  host: `0x${string}`
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PlayerList({ players, maxPlayers, currentAddress, host }: Props) {
  return (
    <div className="w-full bg-neutral-900 rounded-2xl p-4 space-y-2">
      <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
        Players — {players.length}/{maxPlayers}
      </p>

      {players.map((addr, i) => (
        <div key={addr} className="flex items-center gap-3 py-1">
          <span className="text-neutral-600 text-sm w-7">#{i + 1}</span>
          <span
            className={`font-mono text-sm flex-1 ${
              addr.toLowerCase() === currentAddress?.toLowerCase()
                ? 'text-monad font-bold'
                : 'text-neutral-300'
            }`}
          >
            {shortAddr(addr)}
            {addr.toLowerCase() === currentAddress?.toLowerCase() ? ' (you)' : ''}
            {addr.toLowerCase() === host.toLowerCase() ? ' 👑' : ''}
          </span>
        </div>
      ))}

      {/* Empty slots */}
      {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
        <div key={`empty-${i}`} className="flex items-center gap-3 py-1">
          <span className="text-neutral-700 text-sm w-7">#{players.length + i + 1}</span>
          <span className="text-neutral-700 text-sm italic">waiting…</span>
        </div>
      ))}
    </div>
  )
}
