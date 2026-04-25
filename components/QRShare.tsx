'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2 } from 'lucide-react';
import { useState } from 'react';

interface QRShareProps {
  matchId: string;
}

export function QRShare({ matchId }: QRShareProps) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/match/${matchId}`
      : `/match/${matchId}`;

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: 'Join Reflex match', url });
    } else {
      await copyLink();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.06] bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        Invite players
      </p>

      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG
          value={url}
          size={160}
          bgColor="#ffffff"
          fgColor="#0b0b12"
          level="M"
        />
      </div>

      <div className="flex w-full gap-2">
        <button
          onClick={copyLink}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-raised py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary active:scale-95"
        >
          {copied ? (
            <>
              <Check size={14} className="text-tap" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy link
            </>
          )}
        </button>

        <button
          onClick={shareLink}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-raised py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary active:scale-95"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
}
