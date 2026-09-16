# Connectly — Real-Time Video Conferencing & Collaboration App

A full-stack **video conferencing + collaboration tool** built for Task 4, with multi-user
video calling, screen sharing, file sharing, a live collaborative whiteboard, encrypted
chat, and secure authentication.

## ✨ Features

| Requirement | How it's implemented |
|---|---|
| Multi-user video calling | Native **WebRTC** in a mesh topology, signaled over **Socket.io** |
| Screen sharing | `getDisplayMedia` + live track replacement on every peer connection |
| File sharing | REST upload (Multer) + real-time "file shared" notification via Socket.io |
| Whiteboard | `<canvas>`-based drawing, strokes broadcast in real time over Socket.io |
| Data encryption | Chat messages encrypted at rest with **AES-256-GCM**; passwords hashed with **bcrypt**; JWT-based sessions over HTTPS-ready Express + Helmet |
| User authentication | Register/login with JWT, protected REST routes, authenticated Socket.io handshake |

Bonus touches for a more attractive, user-friendly experience: a polished dark
glassmorphism UI, prejoin camera/mic preview screen, live participant list with
mic/camera/hand-raise indicators, emoji reactions, hand-raise, shareable meeting IDs
with one-click copy, and a responsive video grid that adapts to participant count.

## 🧱 Tech Stack

- **Frontend:** React 18 (Vite), React Router, native WebRTC, Socket.io-client, Axios, lucide-react icons
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, bcryptjs, Multer, Helmet
- **Security:** AES-256-GCM encryption at rest, hashed passwords, JWT auth (REST + sockets), rate limiting on auth routes, file-type/size restrictions on uploads

## 📁 Project Structure

```
rtc-app/
├── backend/
│   ├── controllers/       # auth, room, file controllers
│   ├── middleware/        # JWT auth guard, error handler
│   ├── models/            # User, Room, Message (encrypted), SharedFile
│   ├── routes/            # /api/auth, /api/rooms, /api/files
│   ├── socket/            # Socket.io signaling, chat, whiteboard, presence
│   ├── utils/encryption.js
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/    # VideoTile, Whiteboard, ChatPanel, FilesPanel, ParticipantsPanel
    │   ├── pages/          # Login, Register, Dashboard, Meeting
    │   ├── context/        # AuthContext
    │   ├── utils/          # api client, socket client, WebRTC PeerManager
    │   └── styles/
    └── vite.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env if needed — set MONGO_URI to your database, and generate your own
# secrets for production:
#   JWT_SECRET   -> any long random string
#   ENCRYPTION_KEY -> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

The API + Socket.io server starts on `http://localhost:5000`.

### 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api`, `/uploads`, and
`/socket.io` to the backend, so no extra configuration is needed.

### 3. Try it out

1. Register two (or more) accounts — easiest is two browser windows/profiles, or one
   normal + one incognito window.
2. From the dashboard, create a meeting and copy its ID.
3. Join the same meeting ID from the second window.
4. Test video/audio, screen sharing, the whiteboard, chat, and file sharing between
   the two windows.

## 🔒 Security Notes

- Passwords are hashed with bcrypt (12 salt rounds) — never stored in plain text.
- Chat messages are encrypted with AES-256-GCM before being saved to MongoDB, and
  transparently decrypted only when returned to an authenticated, room-authorized client.
- JWTs authenticate both REST requests and the Socket.io handshake.
- File uploads are size-capped (25MB) and block a denylist of executable extensions.
- Auth routes are rate-limited to slow down brute-force attempts.
- For a production deployment, put the app behind HTTPS/WSS (e.g. via a reverse proxy
  like Nginx or a platform such as Render/Railway/Fly.io) so traffic itself is
  encrypted in transit, not just the video (WebRTC media is encrypted by design via
  DTLS-SRTP) and chat content at rest.

## 📝 Notes & Possible Extensions

- Video calls use a **mesh** topology (every participant connects directly to every
  other participant), which is simple and works great for small meetings (2–6 people).
  For larger rooms, a Selective Forwarding Unit (SFU) like mediasoup or LiveKit would
  scale better.
- The whiteboard currently syncs live strokes; persisting/replaying a snapshot for
  latecomers is a natural next step (the `Room.whiteboardData` field is already
  reserved for this).
- STUN-only ICE servers are configured (Google's public STUN servers) — for reliable
  connectivity across restrictive NATs/firewalls in production, add a TURN server.
