import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reflex — Monad',
  description: 'Fastest tap wins the pot. Multi-player reaction-time wagering on Monad.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f0f] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
