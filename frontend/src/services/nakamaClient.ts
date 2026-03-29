import { Client, Session, Socket } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

class NakamaService {
    client: Client;
    session: Session | null = null;
    socket: Socket | null = null;
    matchId: string | null = null;

    constructor() {
        // Supports environment variables for production deployment.
        // Set VITE_NAKAMA_HOST, VITE_NAKAMA_PORT, VITE_NAKAMA_USE_SSL in .env or Vercel dashboard.
        const host = import.meta.env.VITE_NAKAMA_HOST ?? "127.0.0.1";
        const port = import.meta.env.VITE_NAKAMA_PORT ?? "7350";
        const useSSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";
        this.client = new Client("defaultkey", host, port, useSSL);
    }

    async authenticate() {
        // Simple device-based authentication
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem("deviceId", deviceId);
        }

        const session = await this.client.authenticateDevice(deviceId!, true);
        this.session = session;
        console.log("Authenticated as:", session.user_id);
    }

    async connectSocket() {
        if (!this.session) return;
        this.socket = this.client.createSocket(this.client.useSSL, false);
        this.session = await this.client.sessionRefresh(this.session);
        await this.socket.connect(this.session, true);
        console.log("Socket connected");
    }

    async createMatch() {
        if (!this.socket) return;
        const rpcRes = await this.client.rpc(this.session!, "create_match", {});
        const payload = rpcRes.payload as any;
        const matchId = payload.matchId;
        this.matchId = matchId;
        await this.socket.joinMatch(matchId);
        return matchId;
    }

    async joinMatch(matchId: string) {
        if (!this.socket) return;
        this.matchId = matchId;
        await this.socket.joinMatch(matchId);
    }

    async findMatch() {
        if (!this.socket) return;
        const rpcRes = await this.client.rpc(this.session!, "find_match", {});
        const payload = rpcRes.payload as any;
        const matchId = payload.matchId;
        this.matchId = matchId;
        await this.socket.joinMatch(matchId);
        return matchId;
    }

    async makeMove(position: number) {
        if (!this.socket || !this.matchId) return;
        const opCode = 1; // Ops.MOVE
        const data = { position };
        await this.socket.sendMatchState(this.matchId, opCode, JSON.stringify(data));
    }
}

export const nakamaService = new NakamaService();
export default nakamaService;
