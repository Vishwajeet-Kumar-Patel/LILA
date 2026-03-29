import { Mark, GameStatus, GameState, checkWinner, isDraw } from "./game_logic";

export enum OpCode {
    MOVE = 1,
    UPDATE = 2,
    REJECT_MOVE = 3,
    GAME_OVER = 4
}

export const matchInit: nkruntime.MatchInitFunction<GameState> = function(ctx, logger, nk, params) {
    const state: GameState = {
        board: new Array(9).fill(Mark.EMPTY),
        players: [null, null], // [PlayerX, PlayerO]
        turn: Mark.X,
        winner: null,
        status: GameStatus.WAITING,
        timer: 30
    };

    return {
        state,
        tickRate: 1, // 1 tick per second for timer
        label: ""
    }
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    // Only 2 players allowed
    const playerCount = state.players.filter(p => p !== null).length;
    if (playerCount >= 2) {
        return {
            state,
            accept: false,
            rejectMessage: "Match full"
        }
    }

    return {
        state,
        accept: true
    }
};

export const matchJoin: nkruntime.MatchJoinFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach((presence) => {
        // Find first empty slot
        if (state.players[0] === null) {
            state.players[0] = { presence, mark: Mark.X };
        } else if (state.players[1] === null) {
            state.players[1] = { presence, mark: Mark.O };
        }
    });

    // Check if we can start
    if (state.players[0] !== null && state.players[1] !== null) {
        state.status = GameStatus.PLAYING;
        state.timer = 30; // Reset timer when game starts
        logger.info("Match started: %v and %v", state.players[0].presence.userId, state.players[1].presence.userId);

        // Broadcast current state
        dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
            board: state.board,
            turn: state.turn,
            status: state.status,
            winner: state.winner,
            timer: state.timer,
            playerMarkers: {
                [state.players[0].presence.userId]: Mark.X,
                [state.players[1].presence.userId]: Mark.O
            }
        }));
    }

    return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach((presence) => {
        if (state.players[0]?.presence.userId === presence.userId) {
            state.players[0] = null;
        } else if (state.players[1]?.presence.userId === presence.userId) {
            state.players[1] = null;
        }
    });

    // If one player leaves, end the match
    if (state.status === GameStatus.PLAYING && (state.players[0] === null || state.players[1] === null)) {
        state.status = GameStatus.FINISHED;
        state.winner = state.players[0] ? Mark.X : Mark.O; // The remaining player wins
        
        dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
            winner: state.winner,
            status: state.status,
            reason: "Opponent left"
        }));
    }

    // If both left, terminate
    if (state.players[0] === null && state.players[1] === null) {
        return null;
    }

    return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, messages) {
    // Process messages
    messages.forEach((msg) => {
        if (state.status !== GameStatus.PLAYING) return;

        const sender = msg.sender;
        const playerMark = (state.players[0]?.presence.userId === sender.userId) ? Mark.X : Mark.O;

        if (msg.opCode === OpCode.MOVE) {
            // Is it their turn?
            if (state.turn !== playerMark) {
                dispatcher.broadcastMessage(OpCode.REJECT_MOVE, JSON.stringify({ error: "Not your turn" }), [sender]);
                return;
            }

            const payload = JSON.parse(nk.binaryToString(msg.data));
            const position = payload.position;

            // Is cell empty?
            if (state.board[position] !== Mark.EMPTY) {
                dispatcher.broadcastMessage(OpCode.REJECT_MOVE, JSON.stringify({ error: "Cell already occupied" }), [sender]);
                return;
            }

            // Apply move
            state.board[position] = playerMark;
            state.timer = 30; // Reset timer on successful move

            // Check win/draw
            const winner = checkWinner(state.board);
            if (winner) {
                state.winner = winner;
                state.status = GameStatus.FINISHED;
                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
                    board: state.board,
                    winner: state.winner,
                    status: state.status
                }));
            } else if (isDraw(state.board)) {
                state.status = GameStatus.FINISHED;
                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
                    board: state.board,
                    winner: null,
                    status: state.status,
                    draw: true
                }));
            } else {
                // Switch turn
                state.turn = (state.turn === Mark.X) ? Mark.O : Mark.X;
                dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
                    board: state.board,
                    turn: state.turn,
                    status: state.status,
                    timer: state.timer
                }));
            }
        }
    });

    // Handle timer
    if (state.status === GameStatus.PLAYING) {
        state.timer--;
        if (state.timer <= 0) {
            // Player lost by time
            state.status = GameStatus.FINISHED;
            state.winner = (state.turn === Mark.X) ? Mark.O : Mark.X;
            dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
                board: state.board,
                winner: state.winner,
                status: state.status,
                reason: "Time expired"
            }));
        } else if (tick % 5 === 0) { // Broadcast timer occasionally
             dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
                timer: state.timer
            }));
        }
    }

    return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state };
};

export const matchSignal: nkruntime.MatchSignalFunction<GameState> = function(ctx, logger, nk, dispatcher, tick, state, data) {
    return { state, result: data };
};
