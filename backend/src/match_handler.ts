/// <reference types="nakama-runtime" />

import { Mark, GameStatus, GameState, checkWinner, isDraw } from "./game_logic";

export enum OpCode {
  MOVE = 1,
  UPDATE = 2,
  REJECT_MOVE = 3,
  GAME_OVER = 4
}

export const matchInit: nkruntime.MatchInitFunction<GameState> = function (
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

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, presence, metadata
) {

  const playerCount = state.players.filter(p => p !== null).length;

  if (playerCount >= 2) {
    return {
      state: state,
      accept: false,
      rejectMessage: "Match full"
    };
  }

  return {
    state: state,
    accept: true
  };
};

export const matchJoin: nkruntime.MatchJoinFunction<GameState> = function (
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

    logger.info(
      "Match started between %v and %v",
      state.players[0].presence.userId,
      state.players[1].presence.userId
    );

    dispatcher.broadcastMessage(
      OpCode.UPDATE,
      JSON.stringify({
        board: state.board,
        turn: state.turn,
        status: state.status,
        winner: state.winner,
        timer: state.timer
      })
    );
  }

  return { state: state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<GameState> = function (
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

  if (
    state.status === GameStatus.PLAYING &&
    (state.players[0] === null || state.players[1] === null)
  ) {

    state.status = GameStatus.FINISHED;

    state.winner = state.players[0] ? Mark.X : Mark.O;

    dispatcher.broadcastMessage(
      OpCode.GAME_OVER,
      JSON.stringify({
        winner: state.winner,
        status: state.status,
        reason: "Opponent left"
      })
    );
  }

  if (state.players[0] === null && state.players[1] === null) {
    return null;
  }

  return { state: state };
};

export const matchLoop: nkruntime.MatchLoopFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, messages
) {

  messages.forEach((msg) => {

    if (state.status !== GameStatus.PLAYING) {
      return;
    }

    const sender = msg.sender;

    const player =
      state.players.find(p => p?.presence.userId === sender.userId) || null;

    if (!player) {
      return;
    }

    const playerMark = player.mark;

    if (msg.opCode === OpCode.MOVE) {

      if (state.turn !== playerMark) {

        dispatcher.broadcastMessage(
          OpCode.REJECT_MOVE,
          JSON.stringify({ error: "Not your turn" }),
          [sender]
        );

        return;
      }

      let payload;

      try {
        payload = JSON.parse(nk.binaryToString(msg.data));
      } catch {
        return;
      }

      const position = payload.position;

      if (position < 0 || position > 8) {
        return;
      }

      if (state.board[position] !== Mark.EMPTY) {

        dispatcher.broadcastMessage(
          OpCode.REJECT_MOVE,
          JSON.stringify({ error: "Cell occupied" }),
          [sender]
        );

        return;
      }

      state.board[position] = playerMark;
      state.timer = 30;

      const winner = checkWinner(state.board);

      if (winner) {

        state.winner = winner;
        state.status = GameStatus.FINISHED;

        dispatcher.broadcastMessage(
          OpCode.GAME_OVER,
          JSON.stringify({
            board: state.board,
            winner: winner,
            status: state.status
          })
        );

        return;
      }

      if (isDraw(state.board)) {

        state.status = GameStatus.FINISHED;

        dispatcher.broadcastMessage(
          OpCode.GAME_OVER,
          JSON.stringify({
            board: state.board,
            winner: null,
            draw: true,
            status: state.status
          })
        );

        return;
      }

      state.turn = state.turn === Mark.X ? Mark.O : Mark.X;

      dispatcher.broadcastMessage(
        OpCode.UPDATE,
        JSON.stringify({
          board: state.board,
          turn: state.turn,
          status: state.status,
          timer: state.timer
        })
      );
    }

  });

  if (state.status === GameStatus.PLAYING) {

    state.timer--;

    if (state.timer <= 0) {

      state.status = GameStatus.FINISHED;
      state.winner = state.turn === Mark.X ? Mark.O : Mark.X;

      dispatcher.broadcastMessage(
        OpCode.GAME_OVER,
        JSON.stringify({
          board: state.board,
          winner: state.winner,
          reason: "Time expired",
          status: state.status
        })
      );

    } else if (tick % 5 === 0) {

      dispatcher.broadcastMessage(
        OpCode.UPDATE,
        JSON.stringify({
          timer: state.timer
        })
      );

    }

  }

  return { state: state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, graceSeconds
) {

  return { state: state };
};

export const matchSignal: nkruntime.MatchSignalFunction<GameState> = function (
  ctx, logger, nk, dispatcher, tick, state, data
) {

  return {
    state: state,
    result: data
  };
};