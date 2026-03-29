'use strict';

var Mark;
(function (Mark) {
    Mark[Mark["EMPTY"] = 0] = "EMPTY";
    Mark[Mark["X"] = 1] = "X";
    Mark[Mark["O"] = 2] = "O";
})(Mark || (Mark = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["WAITING"] = 0] = "WAITING";
    GameStatus[GameStatus["PLAYING"] = 1] = "PLAYING";
    GameStatus[GameStatus["FINISHED"] = 2] = "FINISHED";
})(GameStatus || (GameStatus = {}));
const WIN_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6] // Diagonals
];
function checkWinner(board) {
    for (const combo of WIN_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] !== Mark.EMPTY && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
function isDraw(board) {
    return board.every(cell => cell !== Mark.EMPTY);
}

var OpCode;
(function (OpCode) {
    OpCode[OpCode["MOVE"] = 1] = "MOVE";
    OpCode[OpCode["UPDATE"] = 2] = "UPDATE";
    OpCode[OpCode["REJECT_MOVE"] = 3] = "REJECT_MOVE";
    OpCode[OpCode["GAME_OVER"] = 4] = "GAME_OVER";
})(OpCode || (OpCode = {}));
const matchInit = function (ctx, logger, nk, params) {
    const state = {
        board: new Array(9).fill(Mark.EMPTY),
        players: [null, null],
        turn: Mark.X,
        winner: null,
        status: GameStatus.WAITING,
        timer: 30
    };
    return {
        state,
        tickRate: 1,
        label: ""
    };
};
const matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    // Only 2 players allowed
    const playerCount = state.players.filter(p => p !== null).length;
    if (playerCount >= 2) {
        return {
            state,
            accept: false,
            rejectMessage: "Match full"
        };
    }
    return {
        state,
        accept: true
    };
};
const matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach((presence) => {
        // Find first empty slot
        if (state.players[0] === null) {
            state.players[0] = { presence, mark: Mark.X };
        }
        else if (state.players[1] === null) {
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
const matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach((presence) => {
        if (state.players[0]?.presence.userId === presence.userId) {
            state.players[0] = null;
        }
        else if (state.players[1]?.presence.userId === presence.userId) {
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
const matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    // Process messages
    messages.forEach((msg) => {
        if (state.status !== GameStatus.PLAYING)
            return;
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
            }
            else if (isDraw(state.board)) {
                state.status = GameStatus.FINISHED;
                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
                    board: state.board,
                    winner: null,
                    status: state.status,
                    draw: true
                }));
            }
            else {
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
        }
        else if (tick % 5 === 0) { // Broadcast timer occasionally
            dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
                timer: state.timer
            }));
        }
    }
    return { state };
};
const matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state };
};
const matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return { state, result: data };
};

function InitModule(ctx, logger, nk, initializer) {
    logger.info("Tic-Tac-Toe module loaded successfully");
    initializer.registerMatch("tic-tac-toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    initializer.registerRpc("create_match", function (ctx, logger, nk, payload) {
        const matchId = nk.matchCreate("tic-tac-toe", {});
        return JSON.stringify({
            matchId: matchId
        });
    });
    initializer.registerRpc("find_match", function (ctx, logger, nk, payload) {
        const matches = nk.matchList(10, true, "tic-tac-toe", 0, 1);
        if (matches.length > 0) {
            return JSON.stringify({
                matchId: matches[0].matchId
            });
        }
        const matchId = nk.matchCreate("tic-tac-toe", {});
        return JSON.stringify({
            matchId: matchId
        });
    });
}
// expose to Nakama runtime
// @ts-ignore
globalThis.InitModule = InitModule;
