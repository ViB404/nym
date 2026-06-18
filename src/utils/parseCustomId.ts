type NymAction =
  | "join"
  | "leave"
  | "start"
  | "stop"
  | "message"
  | "vote"
  | "vote_info";

export function parseCustomId(customId: string):
  | {
      namespace: "nym";
      action: NymAction;
      gameId: string;
    }
  | undefined {
  const [namespace, action, gameId] = customId.split(":");

  if (namespace !== "nym") {
    return;
  }

  if (!gameId) {
    return;
  }

  return {
    namespace,
    action: action as NymAction,
    gameId,
  };
}

export function parseVoteCustomId(customId: string):
  | {
      namespace: "nym";
      action: "vote";
      gameId: string;
      roundId: string;
    }
  | undefined {
  const [namespace, action, gameId, roundId] = customId.split(":");

  if (namespace !== "nym") {
    return;
  }

  if (!gameId) {
    return;
  }

  if (action !== "vote") {
    return;
  }

  if (!roundId) {
    return;
  }

  return {
    namespace,
    action: "vote",
    gameId,
    roundId,
  };
}

export function parseGuessCustomId(customId: string):
  | {
      namespace: "nym";
      action: "guess";
      gameId: string;
      roundId: string;
      aliasName: string;
    }
  | undefined {
  const [namespace, action, gameId, roundId, aliasName] = customId.split(":");

  if (namespace !== "nym") {
    return;
  }

  if (action !== "guess") {
    return;
  }

  if (!gameId || !roundId || !aliasName) {
    return;
  }

  return {
    namespace,
    action: "guess",
    gameId,
    roundId,
    aliasName,
  };
}

export function parseMessageCustomId(customId: string):
  | {
      namespace: "nym";
      action: "message";
      gameId: string;
      roundId: string;
    }
  | undefined {
  const [namespace, action, gameId, roundId] = customId.split(":");

  if (namespace !== "nym") {
    return;
  }

  if (action !== "message") {
    return;
  }

  if (!gameId || !roundId) {
    return;
  }

  return {
    namespace,
    action: "message",
    gameId,
    roundId,
  };
}
