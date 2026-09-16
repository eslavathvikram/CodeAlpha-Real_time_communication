import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MonitorOff,
  PenTool,
  MessageSquare,
  Users,
  FolderOpen,
  Hand,
  Smile,
  PhoneOff,
  ShieldCheck,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, getSocket } from '../utils/socket.js';
import { PeerManager } from '../utils/webrtc.js';
import api from '../utils/api.js';
import VideoTile from '../components/VideoTile.jsx';
import Whiteboard from '../components/Whiteboard.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import ParticipantsPanel from '../components/ParticipantsPanel.jsx';
import FilesPanel from '../components/FilesPanel.jsx';
import '../styles/meeting.css';

const REACTIONS = ['👍', '🎉', '❤️', '😂', '👏', '😮'];

function useDuration() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Meeting() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('prejoin'); // 'prejoin' | 'in-call'
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [copied, setCopied] = useState(false);

  const [remotePeers, setRemotePeers] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [files, setFiles] = useState([]);

  const peerManagerRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const socketRef = useRef(null);
  const duration = useDuration();

  // Fetch room metadata
  useEffect(() => {
    api
      .get(`/rooms/${roomId}`)
      .then(({ data }) => setRoom(data.room))
      .catch(() => setError('This meeting could not be found.'));
  }, [roomId]);

  // Prejoin camera/mic preview
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
        cameraTrackRef.current = s.getVideoTracks()[0];
      })
      .catch(() => setError('Camera/microphone access is required to join this meeting.'));
    return () => {
      if (phase === 'prejoin' && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
    socketRef.current?.emit('media-state-changed', { micOn: !micOn });
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
    socketRef.current?.emit('media-state-changed', { cameraOn: !cameraOn });
  };

  const handleJoin = () => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);
    socketRef.current = socket;

    peerManagerRef.current = new PeerManager(socket, localStream, {
      onRemoteStream: (socketId, stream) => {
        setRemotePeers((prev) => ({
          ...prev,
          [socketId]: { ...prev[socketId], stream },
        }));
      },
      onPeerClosed: (socketId) => {
        setRemotePeers((prev) => {
          const next = { ...prev };
          delete next[socketId];
          return next;
        });
      },
    });

    socket.emit('join-room', { roomId });
    setPhase('in-call');
  };

  // Wire up socket listeners once in a call
  useEffect(() => {
    if (phase !== 'in-call') return;
    const socket = socketRef.current;
    const pm = peerManagerRef.current;

    const onExistingPeers = (peers) => {
      setRemotePeers((prev) => {
        const next = { ...prev };
        peers.forEach((p) => {
          next[p.socketId] = { ...next[p.socketId], name: p.name, avatarColor: p.avatarColor, userId: p.userId };
        });
        return next;
      });
    };

    const onPeerJoined = (peer) => {
      setRemotePeers((prev) => ({
        ...prev,
        [peer.socketId]: { ...prev[peer.socketId], name: peer.name, avatarColor: peer.avatarColor, userId: peer.userId },
      }));
      pm.callPeer(peer.socketId);
    };

    const onPeerLeft = ({ socketId }) => {
      pm.closePeer(socketId);
      setRemotePeers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const onOffer = async ({ from, offer }) => { await pm.handleOffer(from, offer); };
    const onAnswer = async ({ from, answer }) => { await pm.handleAnswer(from, answer); };
    const onIce = async ({ from, candidate }) => { await pm.handleIceCandidate(from, candidate); };

    const onPresence = (list) => {
      setRemotePeers((prev) => {
        const next = { ...prev };
        list.forEach((p) => {
          if (p.socketId === socket.id) return;
          next[p.socketId] = { ...next[p.socketId], name: p.name, avatarColor: p.avatarColor, userId: p.userId };
        });
        return next;
      });
    };

    const onChat = (msg) => {
      setMessages((prev) => [...prev, msg]);
      setUnreadCount((c) => c + 1);
    };

    const onMediaState = ({ socketId, micOn: m, cameraOn: c }) => {
      setRemotePeers((prev) => ({
        ...prev,
        [socketId]: {
          ...prev[socketId],
          ...(m !== undefined && { micOn: m }),
          ...(c !== undefined && { cameraOn: c }),
        },
      }));
    };

    const onHandRaise = ({ socketId, raised }) => {
      setRemotePeers((prev) => ({ ...prev, [socketId]: { ...prev[socketId], handRaised: raised } }));
    };

    const onReaction = ({ socketId, emoji }) => {
      setRemotePeers((prev) => ({ ...prev, [socketId]: { ...prev[socketId], reaction: emoji } }));
      setTimeout(() => {
        setRemotePeers((prev) =>
          prev[socketId] ? { ...prev, [socketId]: { ...prev[socketId], reaction: null } } : prev
        );
      }, 1500);
    };

    const onFileShared = (file) => setFiles((prev) => [file, ...prev]);

    const onScreenStart = ({ socketId, name }) => {
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: `${name} started sharing their screen`, createdAt: new Date() },
      ]);
    };

    socket.on('existing-peers', onExistingPeers);
    socket.on('peer-joined', onPeerJoined);
    socket.on('peer-left', onPeerLeft);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice-candidate', onIce);
    socket.on('presence-update', onPresence);
    socket.on('chat-message', onChat);
    socket.on('media-state-changed', onMediaState);
    socket.on('raise-hand', onHandRaise);
    socket.on('reaction', onReaction);
    socket.on('file-shared', onFileShared);
    socket.on('screen-share-started', onScreenStart);

    return () => {
      socket.off('existing-peers', onExistingPeers);
      socket.off('peer-joined', onPeerJoined);
      socket.off('peer-left', onPeerLeft);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice-candidate', onIce);
      socket.off('presence-update', onPresence);
      socket.off('chat-message', onChat);
      socket.off('media-state-changed', onMediaState);
      socket.off('raise-hand', onHandRaise);
      socket.off('reaction', onReaction);
      socket.off('file-shared', onFileShared);
      socket.off('screen-share-started', onScreenStart);
    };
  }, [phase]);

  // Load chat & files history once in a call
  useEffect(() => {
    if (phase !== 'in-call') return;
    api.get(`/rooms/${roomId}/messages`).then(({ data }) => setMessages(data.messages)).catch(() => {});
    api.get(`/rooms/${roomId}/files`).then(({ data }) => setFiles(data.files)).catch(() => {});
  }, [phase, roomId]);

  // Reset unread when chat is open
  useEffect(() => {
    if (activePanel === 'chat') setUnreadCount(0);
  }, [activePanel]);

  const sendMessage = (content) => {
    socketRef.current?.emit('chat-message', { content });
  };

  const toggleScreenShare = async () => {
    const pm = peerManagerRef.current;
    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        pm.replaceVideoTrack(screenTrack);
        setLocalStream((prev) => new MediaStream([screenTrack, ...prev.getAudioTracks()]));
        screenTrack.onended = () => stopScreenShare();
        setScreenSharing(true);
        socketRef.current?.emit('screen-share-started');
      } catch {
        // user cancelled
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    const pm = peerManagerRef.current;
    if (cameraTrackRef.current) {
      pm.replaceVideoTrack(cameraTrackRef.current);
      setLocalStream((prev) => new MediaStream([cameraTrackRef.current, ...prev.getAudioTracks()]));
    }
    setScreenSharing(false);
    socketRef.current?.emit('screen-share-stopped');
  };

  const toggleHand = () => {
    setHandRaised((v) => {
      socketRef.current?.emit('raise-hand', { raised: !v });
      return !v;
    });
  };

  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction', { emoji });
    setShowEmoji(false);
  };

  const leaveMeeting = () => {
    socketRef.current?.emit('leave-room');
    peerManagerRef.current?.closeAll();
    localStream?.getTracks().forEach((t) => t.stop());
    navigate('/');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const peerList = Object.entries(remotePeers).map(([socketId, p]) => ({ socketId, ...p }));
  const tileCount = peerList.length + 1;
  const gridClass =
    tileCount <= 1 ? 'grid-1'
    : tileCount === 2 ? 'grid-2'
    : tileCount <= 4 ? 'grid-3'
    : tileCount <= 6 ? 'grid-5'
    : 'grid-many';

  // ── Error screen ──
  if (error) {
    return (
      <div className="error-screen">
        <div className="card error-card">
          <span className="error-icon">🔌</span>
          <h2>Can't join meeting</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} id="back-to-dash">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-join screen ──
  if (phase === 'prejoin') {
    return (
      <div className="prejoin-wrap">
        <div className="card prejoin-card">
          <div className="prejoin-preview">
            {cameraOn && localStream ? (
              <video
                autoPlay
                muted
                playsInline
                ref={(el) => { if (el && localStream) el.srcObject = localStream; }}
              />
            ) : (
              <div
                className="avatar-fallback"
                style={{ background: user.avatarColor, width: 88, height: 88, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 30, fontWeight: 800, border: '3px solid rgba(255,255,255,0.2)' }}
              >
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div className="prejoin-controls">
              <button
                className={`ctrl-btn ${micOn ? '' : 'off'}`}
                onClick={toggleMic}
                data-tooltip={micOn ? 'Mute mic' : 'Unmute mic'}
                id="prejoin-mic"
              >
                {micOn ? <Mic size={19} /> : <MicOff size={19} />}
              </button>
              <button
                className={`ctrl-btn ${cameraOn ? '' : 'off'}`}
                onClick={toggleCamera}
                data-tooltip={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                id="prejoin-camera"
              >
                {cameraOn ? <Video size={19} /> : <VideoOff size={19} />}
              </button>
            </div>
          </div>

          <div className="prejoin-info">
            <div className="room-title">{room?.name || 'Meeting'}</div>
            <p className="join-desc">
              You're about to join as{' '}
              <strong style={{ color: 'var(--text-0)' }}>{user.name}</strong>.
              Your call is end-to-end relayed peer-to-peer and chat history is encrypted at rest.
            </p>
            <div className="badge join-badge">
              <ShieldCheck size={13} /> Secure meeting · ID: {roomId}
              <button
                onClick={copyRoomId}
                style={{ background: 'none', border: 'none', color: 'var(--accent-1)', cursor: 'pointer', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}
                aria-label="Copy room ID"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 20px', fontSize: 15, marginTop: 8 }}
              onClick={handleJoin}
              disabled={!localStream}
              id="join-call-btn"
            >
              {localStream ? (
                <><Video size={17} /> Join meeting</>
              ) : (
                <><span className="spinner" /> Requesting camera…</>
              )}
            </button>

            {/* Device status */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <div style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: micOn ? 'rgba(46, 211, 163, 0.08)' : 'rgba(255, 77, 109, 0.08)',
                border: `1px solid ${micOn ? 'rgba(46, 211, 163, 0.2)' : 'rgba(255, 77, 109, 0.2)'}`,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: micOn ? 'var(--success)' : 'var(--danger)',
              }}>
                {micOn ? <Mic size={14} /> : <MicOff size={14} />}
                {micOn ? 'Mic on' : 'Mic off'}
              </div>
              <div style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: cameraOn ? 'rgba(46, 211, 163, 0.08)' : 'rgba(255, 77, 109, 0.08)',
                border: `1px solid ${cameraOn ? 'rgba(46, 211, 163, 0.2)' : 'rgba(255, 77, 109, 0.2)'}`,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: cameraOn ? 'var(--success)' : 'var(--danger)',
              }}>
                {cameraOn ? <Video size={14} /> : <VideoOff size={14} />}
                {cameraOn ? 'Camera on' : 'Camera off'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── In-call ──
  return (
    <div className="meeting-shell">
      <header className="meeting-header">
        {/* Brand */}
        <div className="brand-mark">
          <div className="mark"><Video size={16} /></div>
          Connectly
        </div>

        {/* Room info */}
        <div className="title-block">
          <h1>{room?.name || 'Meeting'}</h1>
          <span className="room-id">
            ID: {roomId}
            <button
              onClick={copyRoomId}
              style={{ background: 'none', border: 'none', color: 'var(--accent-1)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              aria-label="Copy room ID"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </span>
        </div>

        {/* Actions */}
        <div className="head-actions">
          <span className="duration-badge">{duration}</span>
          <div className="badge">
            <ShieldCheck size={12} /> Secure
          </div>
          <div className="badge">
            <Users size={12} /> {tileCount}
          </div>
        </div>
      </header>

      <div className="meeting-main">
        <div className="stage-area">
          {whiteboardOpen ? (
            <Whiteboard socket={socketRef.current} />
          ) : (
            <div className={`video-grid ${gridClass}`}>
              <VideoTile
                stream={localStream}
                name={user.name}
                avatarColor={user.avatarColor}
                isLocal
                muted={!micOn}
                cameraOff={!cameraOn}
                handRaised={handRaised}
              />
              {peerList.map((p) => (
                <VideoTile
                  key={p.socketId}
                  stream={p.stream}
                  name={p.name || 'Participant'}
                  avatarColor={p.avatarColor}
                  muted={p.micOn === false}
                  cameraOff={p.cameraOn === false}
                  handRaised={p.handRaised}
                  reaction={p.reaction}
                />
              ))}
            </div>
          )}
        </div>

        {activePanel && (
          <div className="side-panel">
            <div className="side-tabs">
              {[
                { key: 'chat', icon: <MessageSquare size={14} />, label: 'Chat' },
                { key: 'participants', icon: <Users size={14} />, label: 'People' },
                { key: 'files', icon: <FolderOpen size={14} />, label: 'Files' },
              ].map(tab => (
                <div
                  key={tab.key}
                  className={`side-tab ${activePanel === tab.key ? 'active' : ''}`}
                  onClick={() => setActivePanel(tab.key)}
                  id={`tab-${tab.key}`}
                >
                  {tab.icon} {tab.label}
                </div>
              ))}
              <div
                style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}
                onClick={() => setActivePanel(null)}
                title="Close panel"
              >
                <X size={14} />
              </div>
            </div>
            <div className="side-content">
              {activePanel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} />}
              {activePanel === 'participants' && (
                <ParticipantsPanel
                  hostId={room?.host?._id}
                  participants={[
                    {
                      socketId: 'local',
                      isLocal: true,
                      name: user.name,
                      avatarColor: user.avatarColor,
                      userId: user.id,
                      micOn,
                      cameraOn,
                      handRaised,
                    },
                    ...peerList.map((p) => ({ ...p, micOn: p.micOn !== false, cameraOn: p.cameraOn !== false })),
                  ]}
                />
              )}
              {activePanel === 'files' && (
                <FilesPanel
                  roomId={roomId}
                  files={files}
                  onUploaded={(file) => {
                    setFiles((prev) => [file, ...prev]);
                    socketRef.current?.emit('file-shared', file);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="control-bar">
        <button
          className={`ctrl-btn ${micOn ? '' : 'off'}`}
          onClick={toggleMic}
          data-tooltip={micOn ? 'Mute' : 'Unmute'}
          id="ctrl-mic"
        >
          {micOn ? <Mic size={19} /> : <MicOff size={19} />}
        </button>
        <button
          className={`ctrl-btn ${cameraOn ? '' : 'off'}`}
          onClick={toggleCamera}
          data-tooltip={cameraOn ? 'Stop video' : 'Start video'}
          id="ctrl-camera"
        >
          {cameraOn ? <Video size={19} /> : <VideoOff size={19} />}
        </button>

        <div className="ctrl-separator" />

        <button
          className={`ctrl-btn ${screenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
          data-tooltip={screenSharing ? 'Stop sharing' : 'Share screen'}
          id="ctrl-screen"
        >
          {screenSharing ? <MonitorOff size={19} /> : <ScreenShare size={19} />}
        </button>
        <button
          className={`ctrl-btn ${whiteboardOpen ? 'active' : ''}`}
          onClick={() => setWhiteboardOpen((v) => !v)}
          data-tooltip="Whiteboard"
          id="ctrl-whiteboard"
        >
          <PenTool size={19} />
        </button>
        <button
          className={`ctrl-btn ${handRaised ? 'active' : ''}`}
          onClick={toggleHand}
          data-tooltip={handRaised ? 'Lower hand' : 'Raise hand'}
          id="ctrl-hand"
        >
          <Hand size={19} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="ctrl-btn"
            onClick={() => setShowEmoji((v) => !v)}
            data-tooltip="React"
            id="ctrl-emoji"
          >
            <Smile size={19} />
          </button>
          {showEmoji && (
            <div className="emoji-picker">
              {REACTIONS.map((e) => (
                <button key={e} onClick={() => sendReaction(e)} aria-label={e}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ctrl-separator" />

        <button
          className={`ctrl-btn ${activePanel === 'chat' ? 'active' : ''}`}
          onClick={() => setActivePanel((v) => (v === 'chat' ? null : 'chat'))}
          data-tooltip="Chat"
          id="ctrl-chat"
        >
          <MessageSquare size={19} />
          {unreadCount > 0 && activePanel !== 'chat' && (
            <span className="count-badge">{unreadCount}</span>
          )}
        </button>
        <button
          className={`ctrl-btn ${activePanel === 'participants' ? 'active' : ''}`}
          onClick={() => setActivePanel((v) => (v === 'participants' ? null : 'participants'))}
          data-tooltip="Participants"
          id="ctrl-participants"
        >
          <Users size={19} />
          <span className="count-badge">{tileCount}</span>
        </button>
        <button
          className={`ctrl-btn ${activePanel === 'files' ? 'active' : ''}`}
          onClick={() => setActivePanel((v) => (v === 'files' ? null : 'files'))}
          data-tooltip="Files"
          id="ctrl-files"
        >
          <FolderOpen size={19} />
        </button>

        <div className="ctrl-separator" />

        <button className="ctrl-btn leave" onClick={leaveMeeting} id="ctrl-leave">
          <PhoneOff size={18} /> Leave
        </button>
      </div>
    </div>
  );
}
