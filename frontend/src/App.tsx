import React, { useState, useEffect } from "react";
import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";
import { nakamaService } from "./services/nakamaClient";

const App: React.FC = () => {
    const [matchId, setMatchId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initNakama = async () => {
            try {
                await nakamaService.authenticate();
                await nakamaService.connectSocket();
            } catch (err) {
                console.error("Failed to connect to Nakama:", err);
                setError("Could not connect to game server. Is Nakama running?");
            } finally {
                setIsConnecting(false);
            }
        };

        initNakama();

        return () => {
            if (nakamaService.socket) nakamaService.socket.disconnect(true);
        };
    }, []);

    const handleCreateMatch = async () => {
        try {
            const id = await nakamaService.createMatch();
            if (id) setMatchId(id);
        } catch (err) {
            console.error("Failed to create match:", err);
        }
    };

    const handleFindMatch = async () => {
        try {
            const id = await nakamaService.findMatch();
            if (id) setMatchId(id);
        } catch (err) {
            console.error("Failed to find match:", err);
        }
    };

    const handleJoinMatchId = async (id: string) => {
        try {
            await nakamaService.joinMatch(id);
            setMatchId(id);
        } catch (err) {
            console.error("Failed to join match:", err);
        }
    };

    if (isConnecting) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", minHeight: "100vh", justifyContent: "center" }}>
                <div style={{ width: "48px", height: "48px", border: "3px solid #818cf8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#94a3b8", letterSpacing: "0.1em" }}>CONNECTING TO SERVER...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", minHeight: "100vh", justifyContent: "center", color: "#f43f5e" }}>
                <div style={{ fontSize: "2rem" }}>⚠️</div>
                <div style={{ fontWeight: 600 }}>{error}</div>
                <button
                    className="btn btn-outline"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", minHeight: "100vh", padding: "16px" }}>
            {!matchId ? (
                <Lobby
                    onCreateMatch={handleCreateMatch}
                    onFindMatch={handleFindMatch}
                    onJoinMatchId={handleJoinMatchId}
                />
            ) : (
                <GameBoard matchId={matchId} onReset={() => setMatchId(null)} />
            )}
        </div>
    );
};

export default App;
