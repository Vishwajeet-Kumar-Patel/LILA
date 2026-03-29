# 🎮 Real-time Multiplayer Tic-Tac-Toe

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game built with **Nakama** (Backend) and **React** (Frontend).

## ✨ Features

- **Server-Authoritative Logic**: Game state and rules are enforced on the server.
- **Real-time Gameplay**: Low-latency communication using WebSockets (Nakama JS SDK).
- **Matchmaking**: Quick matchmaking (Find Match) and private room creation.
- **Turn Timer**: 30-second turn timer for fast-paced gameplay.
- **Modern UI**: Sleek dark-mode interface with glassmorphism effects.
- **Scalable Architecture**: Dockerized backend for easy deployment.

---

## 🏗️ Project Structure

```text
project-root-LILA
│
├── backend
│   ├── src
│   │   ├── main.ts            # Entry point, RPC registrations
│   │   ├── match_handler.ts    # Nakama match life-cycle 
│   │   └── game_logic.ts       # Win conditions, board state
│   ├── data
│   │   └── local.yml           # Nakama server configuration
│   ├── docker-compose.yml       # Infrastructure (Nakama + DB)
│   ├── Dockerfile              # Production build for Nakama
│   └── package.json            # Backend dependencies
│
├── frontend
│   ├── src
│   │   ├── components          # UI Components (Lobby, GameBoard)
│   │   ├── services            # Nakama Client singleton
│   │   ├── App.tsx             # Main routing
│   │   └── index.css           # Premium styling
│   └── package.json            # Frontend dependencies
│
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18+)

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies and build the TypeScript code:
   ```bash
   npm install
   npm run build
   ```
3. Start the Nakama server:
   ```bash
   docker-compose up -d
   ```
   *Nakama Console will be available at [http://localhost:7351](http://localhost:7351) (Username: admin, Password: password)*

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎮 How to Play
1. **Quick Match**: Pair with any available players.
2. **Create Room**: Generates a Match ID shared with a friend.
3. **Join Room**: Enter a Match ID to join a specific game.
4. **Gameplay**: Your symbol (X or O) is assigned on join. Click a cell to make a move when it's your turn.

---

## 🚢 Deployment

### Backend (Nakama)
1. **Docker**: The included `Dockerfile` builds a production image with the TS runtime compiled to JS.
2. **Cloud**: Deploy the Docker container to **AWS ECS**, **DigitalOcean App Platform**, or **Google Cloud Run**.
3. **Database**: Use a managed **CockroachDB Dedicated** or **PostgreSQL** instance for production data.

### Frontend
1. **Vercel / Netlify**: Connect your repository and set the build command to `npm run build` and output directory to `dist`.
2. **Environment Variables**: Update `nakamaClient.ts` to point to your production server URL.

---

## 🛠️ Tech Stack
- **Backend**: Nakama Server (TypeScript Runtime)
- **Database**: CockroachDB (SQL)
- **Frontend**: React, Vite, TypeScript
- **Styling**: Vanilla CSS (Custom Glassmorphism)
- **Network**: WebSockets
