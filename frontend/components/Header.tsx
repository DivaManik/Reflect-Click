'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Zap, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Zap size={16} className="text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight text-text-primary">Reflex</span>
        </Link>

        {isConnected && address ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
            >
              <User size={14} />
              {shortAddr(address)}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-[140px] rounded-xl border border-white/[0.08] bg-raised p-1 shadow-xl">
                <button
                  onClick={() => { disconnect(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dim active:scale-95 disabled:opacity-60"
          >
            {isPending ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
