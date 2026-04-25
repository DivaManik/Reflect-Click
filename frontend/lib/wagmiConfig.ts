import { createConfig, http } from '@privy-io/wagmi';
import { monadTestnet } from '@/constants/chain';

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz'
    ),
  },
});
