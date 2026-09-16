import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, UserPlus, ShieldCheck, ScreenShare, PenTool, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

export default function Register() {
  const { register, loading, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await register(name, email, password);
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
          <h1>Start something<br />great.</h1>
          <p className="sub">
            Create your workspace and start secure team calls in under a minute.
            No credit card required.
          </p>
          <div className="spotlight-features">
            <div className="spotlight-item">
              <ShieldCheck size={18} />
              <span>Protected by default — always</span>
            </div>
            <div className="spotlight-item">
              <ScreenShare size={18} />
              <span>Meetings without friction</span>
            </div>
            <div className="spotlight-item">
              <PenTool size={18} />
              <span>Brainstorm in real time</span>
            </div>
          </div>
        </div>

        {/* ── Right form ── */}
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="sub">It only takes a moment — then start meeting instantly.</p>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="label" htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                className="input"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="field-group">
              <label className="label" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
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
              <label className="label" htmlFor="reg-password">
                Password
                <span style={{ color: 'var(--text-2)', fontWeight: 400, marginLeft: 6 }}>
                  (min. 6 characters)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
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
            <button className="btn btn-primary auth-submit" disabled={loading} id="register-submit">
              {loading ? <span className="spinner" /> : <UserPlus size={16} />}
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" id="go-login">Sign in</Link>
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
