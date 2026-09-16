import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Lock, ShieldCheck, ScreenShare, PenTool, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-shell card">
        {/* ── Left spotlight ── */}
        <div className="auth-spotlight">
          <div className="auth-logo">
            <div className="mark">
              <Video size={21} />
            </div>
            <div className="name">Connectly</div>
          </div>
          <h1>Meet with<br />clarity.</h1>
          <p className="sub">
            Bring your team together in one secure space for everyday work,
            quick standups, and live collaboration.
          </p>
          <div className="spotlight-features">
            <div className="spotlight-item">
              <ShieldCheck size={18} />
              <span>End-to-end encrypted conversations</span>
            </div>
            <div className="spotlight-item">
              <ScreenShare size={18} />
              <span>Instant screen sharing</span>
            </div>
            <div className="spotlight-item">
              <PenTool size={18} />
              <span>Live collaborative whiteboard</span>
            </div>
          </div>
        </div>

        {/* ── Right form ── */}
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to continue to your meetings.</p>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field-group">
              <label className="label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary auth-submit" disabled={loading} id="login-submit">
              {loading ? <span className="spinner" /> : <Lock size={16} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-switch">
            New to Connectly?{' '}
            <Link to="/register" id="go-register">Create a free account</Link>
          </div>

          <div className="auth-features">
            <div className="feat"><ShieldCheck size={14} /> Encrypted</div>
            <div className="feat"><ScreenShare size={14} /> Screen share</div>
            <div className="feat"><PenTool size={14} /> Whiteboard</div>
          </div>
        </div>
      </div>
    </div>
  );
}
