import React, { useState } from 'react';

interface LobbyProps {
    onCreateMatch: () => void;
    onFindMatch: () => void;
    onJoinMatchId: (id: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onCreateMatch, onFindMatch, onJoinMatchId }) => {
    const [joinId, setJoinId] = useState('');

    return (
        <div className="glass-container">
            <h1>LILA TOK</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center', opacity: 0.7, fontSize: '0.9rem', marginBottom: '10px' }}>
                    Welcome to the Next-Gen Multiplayer Battleground.
                </div>

                <button className="btn btn-primary" onClick={onFindMatch}>
                    ⚡ Quick Matchmaking
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>OR</span>
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Enter Match ID..."
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            color: 'white',
                            fontFamily: 'Outfit',
                            outline: 'none',
                            fontSize: '1rem'
                        }}
                    />
                    <button className="btn btn-outline" onClick={() => onJoinMatchId(joinId)}>
                        🔗 Join by ID
                    </button>
                    <button className="btn btn-outline" onClick={onCreateMatch}>
                        🛠️ Create Private Match
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', opacity: 0.4, fontSize: '0.75rem' }}>
                Powered by Nakama Real-time Engine
            </div>
        </div>
    );
};

export default Lobby;
