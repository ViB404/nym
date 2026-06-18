export class GameError extends Error {
  constructor(message: string) {
    super(message);

    this.name = new.target.name;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Game                                       */
/* -------------------------------------------------------------------------- */

export class ActiveGameExistsError extends GameError {
  constructor() {
    super("This channel already has an active game.");
  }
}

export class GameCreationFailedError extends GameError {
  constructor() {
    super("Failed to create the game.");
  }
}

export class GameNotFoundError extends GameError {
  constructor() {
    super("Game not found.");
  }
}

export class GameEndedError extends GameError {
  constructor() {
    super("This game has already ended.");
  }
}

export class GameAlreadyStartedError extends GameError {
  constructor() {
    super("The game has already started.");
  }
}

export class InvalidGameStateError extends GameError {
  constructor() {
    super("The game is in an invalid state.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Lobby                                      */
/* -------------------------------------------------------------------------- */

export class LobbyClosedError extends GameError {
  constructor() {
    super("The lobby is closed.");
  }
}

export class LobbyNotFoundError extends GameError {
  constructor() {
    super("Lobby not found.");
  }
}

export class PlayerLimitReachedError extends GameError {
  constructor() {
    super("The lobby is full.");
  }
}

export class NotEnoughPlayersError extends GameError {
  constructor() {
    super("At least 3 players are required to start the game.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Players                                    */
/* -------------------------------------------------------------------------- */

export class AlreadyJoinedError extends GameError {
  constructor() {
    super("You have already joined this game.");
  }
}

export class PlayerNotFoundError extends GameError {
  constructor() {
    super("You are not part of this game.");
  }
}

export class FailedToJoinGameError extends GameError {
  constructor() {
    super("Failed to join the game.");
  }
}

export class FailedToLeaveGameError extends GameError {
  constructor() {
    super("Failed to leave the game.");
  }
}

export class PlayerKickedError extends GameError {
  constructor() {
    super("The player has been removed from the game.");
  }
}

export class PlayerAFKError extends GameError {
  constructor() {
    super("The player is marked as AFK.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Host                                       */
/* -------------------------------------------------------------------------- */

export class NotHostError extends GameError {
  constructor() {
    super("Only the host can perform this action.");
  }
}

export class CannotLeaveAsLastHostError extends GameError {
  constructor() {
    super("The host cannot leave without transferring ownership.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Rounds                                     */
/* -------------------------------------------------------------------------- */

export class RoundNotFoundError extends GameError {
  constructor() {
    super("Round not found.");
  }
}

export class RoundAlreadyFinishedError extends GameError {
  constructor() {
    super("This round has already ended.");
  }
}

export class RoundNotStartedError extends GameError {
  constructor() {
    super("This round has not started yet.");
  }
}

/* -------------------------------------------------------------------------- */
/*                               Discussion                                    */
/* -------------------------------------------------------------------------- */

export class DiscussionClosedError extends GameError {
  constructor() {
    super("The discussion phase is closed.");
  }
}

export class DiscussionNotStartedError extends GameError {
  constructor() {
    super("The discussion phase has not started yet.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Alias                                      */
/* -------------------------------------------------------------------------- */

export class AliasNotFoundError extends GameError {
  constructor() {
    super("Alias not found.");
  }
}

export class AliasAlreadyAssignedError extends GameError {
  constructor() {
    super("Alias has already been assigned.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Messages                                    */
/* -------------------------------------------------------------------------- */

export class MessageLimitReachedError extends GameError {
  constructor() {
    super("You have reached the message limit.");
  }
}

export class EmptyMessageError extends GameError {
  constructor() {
    super("Message cannot be empty.");
  }
}

export class MessageTooLongError extends GameError {
  constructor() {
    super("Message is too long.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Voting                                     */
/* -------------------------------------------------------------------------- */

export class VotingClosedError extends GameError {
  constructor() {
    super("Voting is closed.");
  }
}

export class VotingNotStartedError extends GameError {
  constructor() {
    super("Voting has not started yet.");
  }
}

export class AlreadyVotedError extends GameError {
  constructor() {
    super("You have already voted this round.");
  }
}

export class CannotVoteSelfError extends GameError {
  constructor() {
    super("You cannot vote for yourself.");
  }
}

export class InvalidVoteError extends GameError {
  constructor() {
    super("Invalid vote.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Database                                   */
/* -------------------------------------------------------------------------- */

export class DatabaseError extends GameError {
  constructor() {
    super("A database error occurred.");
  }
}

export class DatabaseConstraintError extends GameError {
  constructor() {
    super("A database constraint was violated.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Timer                                     */
/* -------------------------------------------------------------------------- */

export class TimerNotFoundError extends GameError {
  constructor() {
    super("Timer not found.");
  }
}

export class TimerAlreadyRunningError extends GameError {
  constructor() {
    super("Timer is already running.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Generic                                    */
/* -------------------------------------------------------------------------- */

export class UnauthorizedError extends GameError {
  constructor() {
    super("You are not authorized to perform this action.");
  }
}

export class UnexpectedGameError extends GameError {
  constructor() {
    super("An unexpected game error occurred.");
  }
}
