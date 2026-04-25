'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract } from 'wagmi';
import { parseEventLogs, parseEther } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { REFLEX_ABI } from '@/constants/abi';
import { Header } from '@/components/Header';
import { ArrowLeft, Users, Coins, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { wagmiConfig } from '@/lib/wagmiConfig';
import clsx from 'clsx';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const STAKE_OPTIONS = [
  { label: '0.001', display: '0.001 MON' },
  { label: '0.01', display: '0.01 MON' },
  { label: '0.1', display: '0.1 MON' },
];

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function CreatePage() {
  const { authenticated, login } = usePrivy();
  const router = useRouter();
  const { writeContractAsync } = useWriteContract();

  const [stakeOption, setStakeOption] = useState('0.01');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalPot = Number(stakeOption) * maxPlayers;
  const totalPotDisplay =
    totalPot % 1 === 0 ? totalPot.toFixed(0) : totalPot.toFixed(3);

  async function handleCreate() {
    if (!authenticated) {
      login();
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REFLEX_ABI,
        functionName: 'createMatch',
        args: [maxPlayers],
        value: parseEther(stakeOption),
      });

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

      const logs = parseEventLogs({
        abi: REFLEX_ABI,
        eventName: 'MatchCreated',
        logs: receipt.logs,
      });

      const matchId = logs[0]?.args?.matchId;
      if (matchId !== undefined) {
        router.push(`/match/${matchId}`);
      } else {
        throw new Error('Could not parse match ID from transaction');
      }
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      setErrorMsg(e.shortMessage ?? e.message ?? 'Transaction failed');
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <Header />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <h1 className="text-2xl font-black text-text-primary">New Match</h1>

        {/* Stake */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            <Coins size={13} />
            Stake per player
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STAKE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setStakeOption(opt.label)}
                className={clsx(
                  'rounded-xl border py-3.5 text-sm font-bold transition-all active:scale-95',
                  stakeOption === opt.label
                    ? 'border-primary bg-primary/20 text-primary shadow-sm shadow-primary/20'
                    : 'border-white/[0.08] bg-surface text-text-secondary hover:border-white/[0.16] hover:text-text-primary'
                )}
              >
                {opt.display}
              </button>
            ))}
          </div>
        </div>

        {/* Max players */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            <Users size={13} />
            Max players
          </label>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-surface px-4 py-3">
            <button
              onClick={() => setMaxPlayers((v) => Math.max(2, v - 1))}
              disabled={maxPlayers <= 2}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-text-secondary transition-colors hover:border-white/[0.16] hover:text-text-primary disabled:opacity-30"
            >
              <Minus size={16} />
            </button>

            <div className="text-center">
              <span className="text-4xl font-black text-text-primary">{maxPlayers}</span>
              <p className="text-xs text-text-muted">players max</p>
            </div>

            <button
              onClick={() => setMaxPlayers((v) => Math.min(20, v + 1))}
              disabled={maxPlayers >= 20}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-text-secondary transition-colors hover:border-white/[0.16] hover:text-text-primary disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Prize preview */}
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary/60">
            Match preview
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-text-secondary">Winner takes</p>
              <p className="text-4xl font-black text-text-primary">
                {totalPotDisplay}
                <span className="ml-1.5 text-xl font-bold text-text-secondary">MON</span>
              </p>
            </div>
            <div className="text-right text-sm text-text-muted">
              <p>{maxPlayers} players</p>
              <p>{stakeOption} each</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </p>
        )}

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dim disabled:opacity-60 active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <Spinner />
              Creating match…
            </>
          ) : (
            'Create Match'
          )}
        </button>

        <p className="text-center text-xs text-text-muted">
          You stake {stakeOption} MON now · Winner-takes-all · Instant payout on Monad
        </p>
      </main>
    </div>
  );
}
