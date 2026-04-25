# Scaffold React Native Monad App (Privy + Pimlico Gas Sponsorship)

Scaffold or assist with a React Native application on Monad Testnet using the official template:
**https://github.com/monad-developers/react-native-privy-pimlico-gas-sponsorship-template**

## Template Overview

**Stack:**
- React Native 0.79.3 + Expo ~53
- TypeScript ~5.8.3
- Privy (`@privy-io/expo`) — embedded EVM wallet, email/SMS/social login
- Pimlico — ERC-4337 bundler + gas sponsorship (paymaster)
- Permissionless.js — Kernel smart accounts (v0.3.1, Entrypoint v0.7)
- Wagmi + Viem — blockchain interaction
- Expo Router — file-based routing
- Monad Testnet (chain ID: 10143, RPC: https://testnet-rpc.monad.xyz)

## Key Architecture

```
Auth (Privy embedded wallet)
  └─> Signer for Kernel Smart Account
        └─> Pimlico Bundler + Paymaster
              └─> Sends sponsored UserOps to Monad Testnet
```

**Critical files:**
- `app/_layout.tsx` — PrivyProvider, env validation
- `app/index.tsx` — SmartWalletProvider wrapper
- `hooks/useSmartWallet.tsx` — smart account init & context

## Required Environment Variables

```env
EXPO_PUBLIC_PRIVY_APP_ID=          # Privy Dashboard → API Keys
EXPO_PUBLIC_PRIVY_CLIENT_ID=       # Privy Dashboard → Clients (needs bundle IDs)
EXPO_PUBLIC_PIMLICO_BUNDLER_URL=   # https://api.pimlico.io/v2/monad-testnet/rpc?apikey=YOUR_KEY
```

## When this skill is invoked

Do the following based on what the user asks:

### If user asks to "scaffold" or "setup" the project:
1. Clone the template: `git clone https://github.com/monad-developers/react-native-privy-pimlico-gas-sponsorship-template <target-dir>`
2. Run `npm install` in the cloned directory
3. Copy `.env.example` to `.env`
4. Show the user exactly what values to fill in for the 3 env vars and where to get them:
   - Privy App ID & Client ID → https://dashboard.privy.io
   - Pimlico Bundler URL → https://dashboard.pimlico.io (select Monad Testnet)
5. Remind them to register their app bundle identifiers in Privy Dashboard:
   - iOS: `bundleIdentifier` from `app.json`
   - Android: `package` from `app.json`
6. Run with `npm run ios` or `npm run android`

### If user asks to "implement gas sponsorship" or "add smart wallet":
Reference `hooks/useSmartWallet.tsx`. The pattern is:
1. Get embedded wallet from Privy: `useEmbeddedEthereumWallet()`
2. Create Kernel smart account with that wallet as signer
3. Create Pimlico client with `paymaster` config
4. Use `smartAccountClient.sendTransaction({...})` — gas is sponsored automatically

### If user asks about the demo branch:
The `demo` branch has a full working example with:
- Email OTP authentication flow
- Authenticated/unauthenticated screen separation
- NFT minting transaction example (sponsored)

Check it out with: `git checkout demo`

### If user hits common issues:
| Problem | Fix |
|---------|-----|
| `jose` module resolution error | Already handled in `metro.config.js` — ensure not overriding it |
| Privy client ID invalid | Check bundle IDs in `app.json` match exactly what's registered in Privy Dashboard |
| Gas sponsorship failing | Verify Pimlico bundler URL points to Monad Testnet, check Pimlico dashboard for policy rules |
| Polyfill errors (Buffer/TextEncoder) | Ensure `entrypoint.js` is the app entry point in `package.json` `main` field |
| Embedded wallet undefined | User must complete login first; check `useEmbeddedEthereumWallet()` wallet state |

## Integration with Reflex Game (Monad Blitz)

If integrating this into the Reflex multiplayer reaction-time game:
- Use `smartAccountClient.sendTransaction()` for `submitTap()` calls — gas sponsored so players don't need MON for gas
- Use `useEmbeddedEthereumWallet()` address as the player's identity
- The Kernel smart account address (not EOA) is what gets registered as the player on-chain
- Listen to contract events via `watchContractEvent` with `pollingInterval: 200` (viem)
- Monad testnet chain config: chain ID 10143, RPC `https://testnet-rpc.monad.xyz`
