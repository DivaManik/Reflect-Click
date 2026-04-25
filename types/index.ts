export enum MatchState {
  Open = 0,
  Locked = 1,
  Active = 2,
  Finished = 3,
}

export interface MatchData {
  host: `0x${string}`;
  state: MatchState;
  playerCount: number;
  tappedCount: number;
  stakePerPlayer: bigint;
  startedAt: bigint;
  goTimestampMs: bigint;
  topPlayers: readonly [`0x${string}`, `0x${string}`, `0x${string}`];
  topReactionMs: readonly [bigint, bigint, bigint];
}

export interface TapResult {
  player: `0x${string}`;
  reactionMs: bigint;
}

export interface FinishedData {
  topPlayers: readonly [`0x${string}`, `0x${string}`, `0x${string}`];
  topReactionMs: readonly [bigint, bigint, bigint];
  prizes: readonly [bigint, bigint, bigint];
  winnersCount: number;
  fee: bigint;
}
