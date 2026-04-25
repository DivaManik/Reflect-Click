export enum MatchState {
  Open = 0,
  Locked = 1,
  Active = 2,
  Finished = 3,
}

export interface MatchData {
  host: `0x${string}`;
  stakePerPlayer: bigint;
  maxPlayers: number;
  goTimestampMs: bigint;
  settleDeadlineMs: bigint;
  winner: `0x${string}`;
  winnerReactionMs: bigint;
  tappedCount: number;
  state: MatchState;
}

export interface MatchFull extends MatchData {
  matchId: bigint;
  players: `0x${string}`[];
}

export interface TapResult {
  player: `0x${string}`;
  reactionMs: bigint;
}
