import { createConfig, http } from 'wagmi'
import { privy } from '@privy-io/wagmi'
import { monadTestnet } from '@/constants/chain'

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [privy()],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
  pollingInterval: 200,
})
