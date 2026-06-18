import { EventEmitter } from "node:events";
import { MAX_ROUNDS } from "../config";

export enum GamePhase {
  LOBBY = "LOBBY",
  DISCUSSION = "DISCUSSION",
  VOTING = "VOTING",
  REVEAL = "REVEAL",
  ENDED = "ENDED",
}

export interface PhaseDurations {
  discussion: number;
  voting: number;
  reveal: number;
}

export interface PhaseHistory {
  phase: GamePhase;
  startedAt: number;
  endedAt: number;
}

export interface PhaseChangePayload {
  previousPhase: GamePhase;
  currentPhase: GamePhase;
  round: number;
}

export class GameTimer extends EventEmitter {
  private timeout: Timer | null = null;
  private ticker: Timer | null = null;

  private startedAt = 0;
  private endsAt = 0;

  private paused = false;
  private running = false;

  private remainingTime = 0;

  private history: PhaseHistory[] = [];

  public round = 1;
  public phase: GamePhase = GamePhase.LOBBY;

  constructor(
    private readonly durations: PhaseDurations,
    private readonly maxRounds = MAX_ROUNDS,
  ) {
    super();

    this.log("Timer initialized", {
      durations,
      maxRounds,
    });
  }

  // ---------------------------------------------------------------------------
  // Logger
  // ---------------------------------------------------------------------------

  private log(message: string, data?: unknown) {
    console.log(
      `[GameTimer] [${new Date().toISOString()}] [Round ${
        this.round
      }] [${this.phase}] ${message}`,
      data ?? "",
    );
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  public start() {
    this.log("start() called");

    if (this.running) {
      this.log("Timer already running");
      return;
    }

    this.running = true;

    this.startedAt = Date.now();

    this.log("Game started");

    this.startTicker();
    this.changePhase(GamePhase.DISCUSSION);

    this.emit("started");
  }

  public stop() {
    if (!this.running) return;
    this.log("stop() called");
    console.trace("stop() called");

    this.clearTimers();

    this.running = false;
    this.paused = false;

    const previous = this.phase;

    this.phase = GamePhase.ENDED;

    this.history.push({
      phase: previous,
      startedAt: this.startedAt,
      endedAt: Date.now(),
    });

    this.log("Game ended");

    this.emit("ended");
  }

  public restart() {
    this.log("restart() called");

    this.stop();

    this.round = 1;
    this.history = [];

    this.start();
  }

  // ---------------------------------------------------------------------------
  // Phase Control
  // ---------------------------------------------------------------------------

  public skip() {
    this.log("skip() called");

    this.nextPhase();
  }

  public jumpTo(phase: GamePhase) {
    this.log(`jumpTo(${phase}) called`);

    this.changePhase(phase);
  }

  public extend(ms: number) {
    this.log(`extend(${ms}) called`);

    if (!this.running) {
      this.log("Cannot extend. Timer not running");
      return;
    }

    this.endsAt += ms;

    this.resetMainTimer();

    this.log(`Extended phase by ${ms}ms`);

    this.emit("extended", ms);
  }

  public reduce(ms: number) {
    this.log(`reduce(${ms}) called`);

    if (!this.running) {
      this.log("Cannot reduce. Timer not running");
      return;
    }

    this.endsAt -= ms;

    this.resetMainTimer();

    this.log(`Reduced phase by ${ms}ms`);

    this.emit("reduced", ms);
  }

  // ---------------------------------------------------------------------------
  // Pause System
  // ---------------------------------------------------------------------------

  public pause() {
    this.log("pause() called");

    if (this.paused || !this.running) {
      this.log("Pause ignored");
      return;
    }

    this.paused = true;

    this.remainingTime = this.getRemaining();

    this.log(`Paused with ${this.remainingTime}ms remaining`);

    this.clearMainTimer();

    this.emit("paused");
  }

  public resume() {
    this.log("resume() called");

    if (!this.paused) {
      this.log("Resume ignored");
      return;
    }

    this.paused = false;

    this.startedAt = Date.now();
    this.endsAt = this.startedAt + this.remainingTime;

    this.schedule(this.remainingTime);

    this.log(`Resumed with ${this.remainingTime}ms remaining`);

    this.emit("resumed");
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  public getRemaining() {
    return Math.max(0, this.endsAt - Date.now());
  }

  public getRemainingSeconds() {
    return Math.ceil(this.getRemaining() / 1000);
  }

  public getProgress() {
    const total = this.getPhaseDuration(this.phase);

    if (!total) {
      return 0;
    }

    const elapsed = total - this.getRemaining();

    return Math.min(100, Math.floor((elapsed / total) * 100));
  }

  public getHistory() {
    return [...this.history];
  }

  public getState() {
    const state = {
      round: this.round,
      phase: this.phase,
      running: this.running,
      paused: this.paused,
      remaining: this.getRemaining(),
      elapsed: this.getElapsed(),
      progress: this.getProgress(),
      startedAt: this.startedAt,
      endsAt: this.endsAt,
    };

    this.log("getState()", state);

    return state;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private nextPhase() {
    this.log("nextPhase() called");

    switch (this.phase) {
      case GamePhase.DISCUSSION:
        this.log("DISCUSSION -> VOTING");
        this.changePhase(GamePhase.VOTING);
        break;

      case GamePhase.VOTING:
        this.log("VOTING -> REVEAL");
        this.changePhase(GamePhase.REVEAL);
        break;

      case GamePhase.REVEAL:
        if (this.round >= this.maxRounds) {
          this.log(`Reached max rounds (${this.maxRounds})`);

          this.stop();

          return;
        }

        this.round++;

        this.changePhase(GamePhase.DISCUSSION);

        break;

      default:
        this.log("No phase transition available");
        break;
    }
  }

  private changePhase(newPhase: GamePhase) {
    const previous = this.phase;

    this.log(`Changing phase from ${previous} to ${newPhase}`);

    if (previous !== GamePhase.LOBBY) {
      const historyEntry: PhaseHistory = {
        phase: previous,
        startedAt: this.startedAt,
        endedAt: Date.now(),
      };

      this.history.push(historyEntry);

      this.log("History recorded", historyEntry);
    }

    this.phase = newPhase;

    const duration = this.getPhaseDuration(newPhase);

    this.startedAt = Date.now();
    this.endsAt = this.startedAt + duration;

    this.log(`Phase duration: ${duration}ms`);

    this.resetMainTimer();

    const payload: PhaseChangePayload = {
      previousPhase: previous,
      currentPhase: newPhase,
      round: this.round,
    };

    this.log("Emitting phaseChange", payload);

    this.emit("phaseChange", payload);
  }

  private getPhaseDuration(phase: GamePhase): number {
    switch (phase) {
      case GamePhase.DISCUSSION:
        return this.durations.discussion;

      case GamePhase.VOTING:
        return this.durations.voting;

      case GamePhase.REVEAL:
        return this.durations.reveal;

      default:
        return 0;
    }
  }

  private schedule(ms: number) {
    this.log(`Scheduling timer for ${ms}ms`);

    this.timeout = setTimeout(() => {
      this.log("Timer completed");

      this.nextPhase();
    }, ms);
  }

  private resetMainTimer() {
    this.log("resetMainTimer() called");

    this.clearMainTimer();

    const remaining = this.getRemaining();

    this.log(`Remaining time: ${remaining}ms`);

    this.schedule(remaining);
  }

  private clearMainTimer() {
    if (!this.timeout) {
      return;
    }

    this.log("Clearing phase timeout");

    clearTimeout(this.timeout);

    this.timeout = null;
  }

  private startTicker() {
    this.log("Starting ticker");

    this.ticker = setInterval(() => {
      if (!this.running || this.paused) {
        return;
      }

      const payload = {
        phase: this.phase,
        round: this.round,
        remaining: this.getRemaining(),
        remainingSeconds: this.getRemainingSeconds(),
        progress: this.getProgress(),
      };

      this.log(
        `Tick | ${payload.remainingSeconds}s remaining | ${payload.progress}%`,
      );

      this.emit("tick", payload);
    }, 1000);
  }

  private clearTimers() {
    this.log("clearTimers() called");

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;

      this.log("Phase timer cleared");
    }

    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;

      this.log("Ticker cleared");
    }
  }

  public getElapsed() {
    return Date.now() - this.startedAt;
  }

  public getElapsedSeconds() {
    return Math.floor(this.getElapsed() / 1000);
  }

  public isRunning() {
    return this.running;
  }

  public isPaused() {
    return this.paused;
  }

  public getCurrentPhaseDuration() {
    return this.getPhaseDuration(this.phase);
  }

  public getStartedAt() {
    return this.startedAt;
  }

  public getEndsAt() {
    return this.endsAt;
  }

  public forceEnd() {
    this.log("forceEnd() called");

    this.stop();
  }

  public serialize() {
    return {
      round: this.round,
      phase: this.phase,
      running: this.running,
      paused: this.paused,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      remaining: this.getRemaining(),
      elapsed: this.getElapsed(),
      progress: this.getProgress(),
      history: [...this.history],
    };
  }
}
