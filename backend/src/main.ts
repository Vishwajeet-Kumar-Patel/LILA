// Combined Nakama Backend Logic for Tic-Tac-Toe

enum Mark {
    EMPTY = 0,
    X = 1,
    O = 2
}

enum GameStatus {
    WAITING = 0,
    PLAYING = 1,
    FINISHED = 2
}

interface Player {
    presence: any;
    mark: Mark;
}

interface GameState {
    board: Mark[];
    players: (Player | null)[];
    turn: Mark;
    winner: Mark | null;
    status: GameStatus;
    timer: number;
}

const WIN_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkWinner(board: Mark[]): Mark | null {
    for (const combo of WIN_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] !== Mark.EMPTY && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function isDraw(board: Mark[]): boolean {
    return board.every(cell => cell !== Mark.EMPTY);
}

enum OpCode {
  MOVE = 1,
  UPDATE = 2,
  REJECT_MOVE = 3,
  GAME_OVER = 4
}

const matchInit: nkruntime.MatchInitFunction<GameState> = function (
  ctx, logger, nk, params
) {
  const state: GameState = {
    board: new Array(9).fill(Mark.EMPTY),
    players: [null, null],
    turn: Mark.X,
    winner: null,
    status: GameStatus.WAITING,
    timer: 30
  };

  return {
    state: state,
    tickRate: 1,
    label: ""
  };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, presence, metadata
) {
  const playerCount = state.players.filter(p => p !== null).length;
  if (playerCount >= 2) {
    return { state, accept: false, rejectMessage: "Match full" };
  }
  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, presences
) {
  presences.forEach((presence) => {
    if (state.players[0] === null) {
      state.players[0] = { presence: presence, mark: Mark.X };
    } else if (state.players[1] === null) {
      state.players[1] = { presence: presence, mark: Mark.O };
    }
  });

  if (state.players[0] && state.players[1]) {
    state.status = GameStatus.PLAYING;
    state.timer = 30;
    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
        board: state.board,
        turn: state.turn,
        status: state.status,
        winner: state.winner,
        timer: state.timer
    }));
  }
  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, presences
) {
  presences.forEach((presence) => {
    if (state.players[0]?.presence.userId === presence.userId) {
      state.players[0] = null;
    }
    if (state.players[1]?.presence.userId === presence.userId) {
      state.players[1] = null;
    }
  });

  if (state.status === GameStatus.PLAYING && (state.players[0] === null || state.players[1] === null)) {
      state.status = GameStatus.FINISHED;
      state.winner = state.players[0] ? Mark.X : Mark.O;
      dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
          winner: state.winner,
          status: state.status,
          reason: "Opponent left"
      }));
  }

  if (state.players[0] === null && state.players[1] === null) {
    return null;
  }
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, messages
) {
  messages.forEach((msg) => {
    if (state.status !== GameStatus.PLAYING) return;
    const sender = msg.sender;
    const player = state.players.find(p => p?.presence.userId === sender.userId) || null;
    if (!player) return;
    const playerMark = player.mark;

    if (msg.opCode === OpCode.MOVE) {
      if (state.turn !== playerMark) {
        dispatcher.broadcastMessage(OpCode.REJECT_MOVE, JSON.stringify({ error: "Not your turn" }), [sender]);
        return;
      }
      let payload;
      try { payload = JSON.parse(nk.binaryToString(msg.data)); } catch { return; }
      const position = payload.position;
      if (position < 0 || position > 8 || state.board[position] !== Mark.EMPTY) return;
      
      state.board[position] = playerMark;
      state.timer = 30;
      const winner = checkWinner(state.board);
      if (winner) {
        state.winner = winner;
        state.status = GameStatus.FINISHED;
        dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({ board: state.board, winner: winner, status: state.status }));
        return;
      }
      if (isDraw(state.board)) {
        state.status = GameStatus.FINISHED;
        dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({ board: state.board, winner: null, draw: true, status: state.status }));
        return;
      }
      state.turn = state.turn === Mark.X ? Mark.O : Mark.X;
      dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({ board: state.board, turn: state.turn, status: state.status, timer: state.timer }));
    }
  });

  if (state.status === GameStatus.PLAYING) {
    state.timer--;
    if (state.timer <= 0) {
      state.status = GameStatus.FINISHED;
      state.winner = state.turn === Mark.X ? Mark.O : Mark.X;
      dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({ board: state.board, winner: state.winner, reason: "Time expired", status: state.status }));
    } else if (tick % 5 === 0) {
      dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({ timer: state.timer }));
    }
  }
  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) { return { state }; };
const matchSignal: nkruntime.MatchSignalFunction<GameState> = function (ctx, logger, nk, dispatcher, tick, state, data) { return { state, result: data }; };

function createMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    const matchId = nk.matchCreate("tic-tac-toe", {});
    return JSON.stringify({ matchId });
}

function findMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    const matches = nk.matchList(10, true, "tic-tac-toe", 0, 1);
    if (matches.length > 0) return JSON.stringify({ matchId: matches[0].matchId });
    const matchId = nk.matchCreate("tic-tac-toe", {});
    return JSON.stringify({ matchId });
}

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info("Tic-Tac-Toe module LOADED successfully (FULL SCRIPT)");
    initializer.registerRpc("create_match", createMatch);
    initializer.registerRpc("find_match", findMatch);
    initializer.registerMatch("tic-tac-toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
}