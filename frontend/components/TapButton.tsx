'use client'

interface Props {
  onTap: () => void
  disabled: boolean
  alreadyTapped: boolean
}

export function TapButton({ onTap, disabled, alreadyTapped }: Props) {
  if (alreadyTapped) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-go text-5xl font-black tracking-widest">TAPPED!</p>
        <p className="text-neutral-500 text-lg">Waiting for others…</p>
      </div>
    )
  }

  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className={`
        w-full max-w-sm aspect-square rounded-full flex items-center justify-center
        text-7xl font-black tracking-widest transition-all duration-150 select-none
        ${disabled
          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
          : 'bg-go text-black shadow-[0_0_60px_rgba(0,200,83,0.5)] active:scale-95 hover:shadow-[0_0_80px_rgba(0,200,83,0.7)] animate-pulse cursor-pointer'
        }
      `}
    >
      TAP!
    </button>
  )
}
