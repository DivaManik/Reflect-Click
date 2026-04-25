# Reflex Envio Indexer

Indexer ini melacak lifecycle match Reflex di Monad testnet.

## Setup

1. Masuk ke folder `indexer`.
2. Jalankan `npm install` untuk memasang dependency lokal (termasuk Envio CLI).
3. Jalankan `npm run codegen` untuk menghasilkan tipe `generated`.
4. Pastikan Docker terpasang dan daemon aktif.
5. Jalankan `npm run dev` untuk sync lokal.

## Konfigurasi

Alamat kontrak default memakai deploy testnet yang ada di repo. Kalau kamu redeploy kontrak, set environment variable berikut sebelum menjalankan indexer:

```bash
export REFLEX_ADDRESS=0xYourReflexAddress
```

Kalau perlu, ubah juga `start_block` di `config.yaml` agar sync dimulai dari block deploy kontrak yang baru.

## Entity yang di-index

- `Match`: status room, taruhan, countdown, pemenang, dan settlement.
- `Tap`: histori tap per pemain per match.
- `Player`: statistik agregat pemain, termasuk total match, total tap, win, dan personal best reaction time.