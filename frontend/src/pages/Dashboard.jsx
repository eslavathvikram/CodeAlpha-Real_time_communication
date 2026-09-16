import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  LogIn,
  LogOut,
  Copy,
  Check,
  Users,
  Clock,
  Sparkles,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import '../styles/dashboard.css';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    api
      .get('/rooms/mine')
      .then(({ data }) => setRooms(data.rooms))
      .catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const { data } = await api.post('/rooms', { name: meetingName || undefined });
      setCreatedRoom(data.room);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create meeting. Please try again.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    const id = joinId.trim();
    if (!id) return;
    try {
      await api.get(`/rooms/${id}`);
      navigate(`/room/${id}`);
    } catch {
      setJoinError('No meeting found with that ID. Please check and try again.');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/room/${createdRoom.roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="dash-shell">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="brand">
          <div className="mark">
            <Video size={18} />
          </div>
          Connectly
        </div>
        <div className="user-chip">
          <div
            className="avatar"
            style={{ background: user.avatarColor }}
            title={user.name}
          >
            {user.name?.[0]?.toUpperCase()}
          </div>
          <span className="user-name">{user.name}</span>
          <button className="btn btn-ghost" onClick={logout} id="logout-btn">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="dash-body">
        {/* Hero */}
        <div className="dash-hero">
          <div className="hero-pills">
            <span className="pill">Secure</span>
            <span className="pill">Instant</span>
            <span className="pill">Collaborative</span>
          </div>
          <h1>
            {getGreeting()},{' '}
            <span className="gradient-text">{user.name.split(' ')[0]}</span> 👋
          </h1>
          <p>Run your next meeting, share your screen, and keep everyone aligned — all in one place.</p>

          {/* Stats */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-val">{rooms.length}</div>
              <div className="stat-label">Meetings</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">🔒</div>
              <div className="stat-label">Encrypted</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">∞</div>
              <div className="stat-label">No limits</div>
            </div>
          </div>
        </div>

        {/* Action cards */}
        <div className="action-grid">
          {/* Create meeting */}
          <div className="card action-card">
            <div className="icon-wrap">
              <Plus size={24} />
            </div>
            <h3>Start a new meeting</h3>
            <p>Get a shareable meeting link with encrypted video, chat, and a collaborative whiteboard.</p>
            <form onSubmit={handleCreate} id="create-meeting-form">
              <input
                className="input"
                placeholder="Meeting name (optional)"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                style={{ marginBottom: 12 }}
                id="meeting-name-input"
              />
              <button className="btn btn-primary" disabled={creating} style={{ width: '100%' }} id="create-meeting-btn">
                {creating ? <span className="spinner" /> : <Video size={16} />}
                {creating ? 'Creating…' : 'Create meeting'}
              </button>
            </form>

            {createError && (
              <div className="auth-error" style={{ marginTop: 12, marginBottom: 0 }}>
                ⚠ {createError}
              </div>
            )}

            {createdRoom && (
              <div className="copy-banner">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, color: 'var(--text-0)' }}>
                    ✨ Meeting ready!
                  </div>
                  <div>
                    ID: <code>{createdRoom.roomId}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={copyLink}
                    style={{ padding: '7px 14px', fontSize: 13 }}
                    id="copy-link-btn"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '7px 14px', fontSize: 13 }}
                    onClick={() => navigate(`/room/${createdRoom.roomId}`)}
                    id="join-now-btn"
                  >
                    Join now →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Join meeting */}
          <div className="card action-card">
            <div className="icon-wrap" style={{ background: 'linear-gradient(135deg, #38d9f5, #7c6cf6)' }}>
              <LogIn size={24} />
            </div>
            <h3>Join a meeting</h3>
            <p>Enter the meeting ID shared by your host to hop right into the call instantly.</p>
            <form onSubmit={handleJoin} className="join-row" id="join-meeting-form">
              <input
                className="input"
                placeholder="Meeting ID (e.g. 4f9a21c3)"
                value={joinId}
                onChange={(e) => { setJoinId(e.target.value); setJoinError(''); }}
                id="join-id-input"
                style={joinError ? { borderColor: 'rgba(255, 77, 109, 0.5)' } : {}}
              />
              <button className="btn btn-primary" id="join-btn">Join</button>
            </form>
            {joinError && (
              <div className="auth-error" style={{ marginTop: 12, marginBottom: 0 }}>
                {joinError}
              </div>
            )}

            {/* Tips */}
            <div style={{
              marginTop: 20, padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12, border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={13} /> Meeting tips
                </div>
                <div>• Your host will share the meeting ID</div>
                <div>• Camera &amp; mic can be toggled before joining</div>
                <div>• All calls are end-to-end relayed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent meetings */}
        <div className="recent-section">
          <h2>
            <Clock size={16} style={{ color: 'var(--accent-1)' }} /> Recent meetings
          </h2>
          {rooms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎥</span>
              No meetings yet — create your first one above to get started.
            </div>
          ) : (
            <div className="room-list">
              {rooms.map((room, i) => (
                <div
                  key={room._id}
                  className="card room-item"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="info">
                    <div className="dot">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="room-name">{room.name}</div>
                      <div className="meta">
                        <Clock size={11} />
                        {timeAgo(room.updatedAt)} · ID: {room.roomId}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigate(`/room/${room.roomId}`)}
                    id={`rejoin-${room.roomId}`}
                  >
                    Rejoin →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
