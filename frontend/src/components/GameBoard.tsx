import React, { useEffect, useState } from 'react';
import nakamaService from '../services/nakamaClient';

interface GameBoardProps {
    matchId: string;
    onReset: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ matchId, onReset }) => {
    const [board, setBoard] = useState(Array(9).fill(0));
    const [turn, setTurn] = useState(1);
    const [status, setStatus] = useState(0); // 0: WAITING, 1: PLAYING, 2: FINISHED
    const [winner, setWinner] = useState<number | null>(null);
    const [mySymbol, setMySymbol] = useState<number | null>(null);
    const [timer, setTimer] = useState(30);

    // Define OpCodes (must match backend)
    const OP_MOVE = 1;
    const OP_UPDATE = 2;
    const OP_REJECT_MOVE = 3;
    const OP_GAME_OVER = 4;

    useEffect(() => {
        if (!nakamaService.socket) return;

        nakamaService.socket.onmatchdata = (matchData) => {
            const data = JSON.parse(new TextDecoder().decode(matchData.data));
            console.log(`[MATCH ${matchId}] OP ${matchData.op_code} Data:`, data);

            if (matchData.op_code === OP_REJECT_MOVE) {
                console.warn("SERVER REJECTED MOVE:", data.error);
                return;
            }

            if (data.board) setBoard(data.board);
            if (data.turn) setTurn(data.turn);
            if (data.status !== undefined) setStatus(data.status);
            if (data.winner !== undefined) setWinner(data.winner);
            if (data.timer !== undefined) setTimer(data.timer);
            
            // Assign my symbol
            if (data.playerMarkers && nakamaService.session?.user_id) {
                const myMark = data.playerMarkers[nakamaService.session.user_id];
                if (myMark) {
                    setMySymbol(myMark);
                    console.log("MY SYMBOL SET TO:", myMark === 1 ? 'X' : 'O');
                }
            }
        };
    }, [matchId]);

    const handleCellClick = async (index: number) => {
        if (status !== 1 || board[index] !== 0 || turn !== mySymbol) {
             // Not playing, cell occupied, or not my turn
             return;
        }

        const moveData = { position: index };
        await nakamaService.socket?.sendMatchState(matchId, 1, JSON.stringify(moveData));
    };

    const [copied, setCopied] = useState(false);
    
    const handleCopyId = () => {
        navigator.clipboard.writeText(matchId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getSymbol = (val: number) => {
        if (val === 1) return 'X';
        if (val === 2) return 'O';
        return '';
    };

    return (
        <div className="glass-container">
            <div className="status-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${status === 1 ? 'badge-playing' : 'badge-waiting'}`}>
                        {status === 0 ? '🕒 WAITING' : status === 1 ? '🎮 PLAYING' : '🏁 FINISHED'}
                    </span>
                    <div 
                        className="match-id-container" 
                        onClick={handleCopyId}
                        style={{ position: 'relative' }}
                        title={matchId}
                    >
                        {copied && <span className="copied-toast">📋 COPIED!</span>}
                        <span className="match-id-text">
                            ID: {matchId.substring(0, 8)}...
                        </span>
                        <svg className="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                        </svg>
                    </div>
                </div>
                <div style={{ color: timer < 10 ? '#f43f5e' : 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⌛ <span style={{ fontFamily: 'Orbitron', minWidth: '35px' }}>{timer}s</span>
                </div>
            </div>

            <div className="grid">
                {board.map((cell, i) => (
                    <div 
                        key={i} 
                        className={`cell ${getSymbol(cell)}`}
                        onClick={() => handleCellClick(i)}
                    >
                        {getSymbol(cell)}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {status === 1 && (
                    <p style={{ fontWeight: 600, color: turn === mySymbol ? '#818cf8' : 'white', opacity: 0.8 }}>
                        {turn === mySymbol ? "✨ IT'S YOUR TURN!" : "⏳ Opponent's Turn..."}
                    </p>
                )}
                {status === 2 && (
                    <div style={{ animation: 'bounce 1s infinite' }}>
                        <h2 style={{ color: winner === mySymbol ? '#4ade80' : '#f43f5e', fontSize: '1.5rem', marginBottom: '10px' }}>
                            {winner === mySymbol ? "🏆 VICTORY!" : winner === null ? "🤝 IT'S A DRAW!" : "💔 DEFEAT!"}
                        </h2>
                        <button className="btn btn-primary" onClick={onReset}>
                            Play Again
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '25px', padding: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    YOU ARE PLAYING AS <strong style={{ color: mySymbol === 1 ? '#818cf8' : '#f472b6' }}>{getSymbol(mySymbol || 0)}</strong>
                </span>
            </div>
        </div>
    );
};

export default GameBoard;
