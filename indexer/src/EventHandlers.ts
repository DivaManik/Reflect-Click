import { Reflex } from "generated";

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function matchEntityId(matchId: bigint) {
  return matchId.toString();
}

function tapEntityId(matchId: bigint, player: string) {
  return `${matchId.toString()}-${normalizeAddress(player)}`;
}

async function getOrCreatePlayer(context: any, address: string) {
  const playerId = normalizeAddress(address);
  return context.Player.getOrCreate({
    id: playerId,
    totalMatches: 0,
    totalWins: 0,
    totalTaps: 0,
    totalEarnedWei: 0n,
  });
}

function updateBestReaction(current: { bestReactionMs?: bigint | null }, reactionMs: bigint) {
  if (current.bestReactionMs === undefined || current.bestReactionMs === null) {
    return reactionMs;
  }

  return reactionMs < current.bestReactionMs ? reactionMs : current.bestReactionMs;
}

async function loadMatch(context: any, matchId: bigint) {
  return context.Match.get(matchEntityId(matchId));
}

Reflex.MatchCreated.handler(async ({ event, context }) => {
  const matchId = matchEntityId(event.params.matchId);
  const hostId = normalizeAddress(event.params.host);

  const host = await getOrCreatePlayer(context, hostId);
  context.Player.set({
    ...host,
    totalMatches: host.totalMatches + 1,
  });

  context.Match.set({
    id: matchId,
    matchId: event.params.matchId,
    host_id: hostId,
    stakePerPlayer: event.params.stakePerPlayer,
    playerCount: 1,
    tappedCount: 0,
    state: "Open",
    prizePool: event.params.stakePerPlayer,
    goTimestampMs: null,
    startedAt: null,
    winner1_id: null,
    winner1ReactionMs: null,
    winner1Prize: null,
    winner2_id: null,
    winner2ReactionMs: null,
    winner2Prize: null,
    winner3_id: null,
    winner3ReactionMs: null,
    winner3Prize: null,
    winnersCount: null,
    platformFee: null,
    finishedAt: null,
    forceSettledAt: null,
    createdAt: BigInt(event.block.timestamp),
  });
});

Reflex.MatchJoined.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  const playerId = normalizeAddress(event.params.player);
  const player = await getOrCreatePlayer(context, playerId);
  const playerCount = Number(event.params.currentCount);

  context.Player.set({
    ...player,
    totalMatches: player.totalMatches + 1,
  });

  context.Match.set({
    ...match,
    playerCount,
    prizePool: match.stakePerPlayer * BigInt(playerCount),
  });
});

Reflex.MatchLocked.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  const totalPlayers = Number(event.params.totalPlayers);

  context.Match.set({
    ...match,
    state: "Locked",
    playerCount: totalPlayers,
    prizePool: match.stakePerPlayer * BigInt(totalPlayers),
  });
});

Reflex.MatchStarted.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  context.Match.set({
    ...match,
    state: "Active",
    startedAt: event.params.startedAt,
    goTimestampMs: event.params.goTimestampMs,
  });
});

Reflex.TapSubmitted.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  const matchId = matchEntityId(event.params.matchId);
  const playerId = normalizeAddress(event.params.player);
  const tapId = tapEntityId(event.params.matchId, event.params.player);

  const player = await getOrCreatePlayer(context, playerId);
  const tap = await context.Tap.get(tapId);

  context.Player.set({
    ...player,
    totalTaps: player.totalTaps + 1,
    bestReactionMs: updateBestReaction(player, event.params.reactionMs),
  });

  context.Tap.set({
    ...(tap ?? {
      id: tapId,
      match_id: matchId,
      player_id: playerId,
      reactionMs: event.params.reactionMs,
      timestamp: BigInt(event.block.timestamp),
      rank: null,
      prize: null,
    }),
    id: tapId,
    match_id: matchId,
    player_id: playerId,
    reactionMs: event.params.reactionMs,
    timestamp: tap?.timestamp ?? BigInt(event.block.timestamp),
  });

  context.Match.set({
    ...match,
    tappedCount: match.tappedCount + 1,
  });
});

Reflex.MatchFinished.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  const matchId = matchEntityId(event.params.matchId);
  const winners = event.params.topPlayers.map((player: string, index: number) => ({
    playerId: normalizeAddress(player),
    reactionMs: event.params.topReactionMs[index],
    prize: event.params.prizes[index],
  }));

  for (let index = 0; index < winners.length; index++) {
    const winner = winners[index];
    if (winner.playerId === "0x0000000000000000000000000000000000000000") {
      continue;
    }

    const player = await getOrCreatePlayer(context, winner.playerId);
    const tapId = tapEntityId(event.params.matchId, winner.playerId);
    const tap = await context.Tap.get(tapId);

    context.Player.set({
      ...player,
      totalWins: index === 0 ? player.totalWins + 1 : player.totalWins,
      totalEarnedWei: player.totalEarnedWei + winner.prize,
      bestReactionMs:
        player.bestReactionMs === undefined || player.bestReactionMs === null
          ? winner.reactionMs
          : player.bestReactionMs < winner.reactionMs
            ? player.bestReactionMs
            : winner.reactionMs,
    });

    context.Tap.set({
      ...(tap ?? {
        id: tapId,
        match_id: matchId,
        player_id: winner.playerId,
        reactionMs: winner.reactionMs,
        timestamp: BigInt(event.block.timestamp),
      }),
      id: tapId,
      match_id: matchId,
      player_id: winner.playerId,
      reactionMs: winner.reactionMs,
      timestamp: tap?.timestamp ?? BigInt(event.block.timestamp),
      rank: index + 1,
      prize: winner.prize,
    });
  }

  context.Match.set({
    ...match,
    state: "Finished",
    winner1_id: winners[0].playerId === "0x0000000000000000000000000000000000000000" ? null : winners[0].playerId,
    winner1ReactionMs:
      winners[0].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[0].reactionMs,
    winner1Prize:
      winners[0].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[0].prize,
    winner2_id: winners[1].playerId === "0x0000000000000000000000000000000000000000" ? null : winners[1].playerId,
    winner2ReactionMs:
      winners[1].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[1].reactionMs,
    winner2Prize:
      winners[1].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[1].prize,
    winner3_id: winners[2].playerId === "0x0000000000000000000000000000000000000000" ? null : winners[2].playerId,
    winner3ReactionMs:
      winners[2].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[2].reactionMs,
    winner3Prize:
      winners[2].playerId === "0x0000000000000000000000000000000000000000"
        ? null
        : winners[2].prize,
    winnersCount: event.params.winnersCount,
    platformFee: event.params.platformFee,
    prizePool: match.stakePerPlayer * BigInt(match.playerCount),
    finishedAt: BigInt(event.block.timestamp),
  });
});

Reflex.MatchForceSettled.handler(async ({ event, context }) => {
  const match = await loadMatch(context, event.params.matchId);
  if (!match) {
    return;
  }

  context.Match.set({
    ...match,
    state: "ForceSettled",
    forceSettledAt: BigInt(event.block.timestamp),
  });
});