export enum Mark {
    EMPTY = 0,
    X = 1,
    O = 2
}

export enum GameStatus {
    WAITING = 0,
    PLAYING = 1,
    FINISHED = 2
}

export interface Player {
    presence: any; // Using any for nakama presence in pure logic
    mark: Mark;
}

export interface GameState {
    board: Mark[];
    players: (Player | null)[];
    turn: Mark;
    winner: Mark | null;
    status: GameStatus;
    timer: number;
}

export const WIN_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWinner(board: Mark[]): Mark | null {
    for (const combo of WIN_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] !== Mark.EMPTY && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

export function isDraw(board: Mark[]): boolean {
    return board.every(cell => cell !== Mark.EMPTY);
}

export function resetGame(state: GameState) {
    state.board = new Array(9).fill(Mark.EMPTY);
    state.turn = Mark.X;
    state.winner = null;
    state.status = GameStatus.PLAYING;
    state.timer = 30; // 30 seconds turn timer
}
