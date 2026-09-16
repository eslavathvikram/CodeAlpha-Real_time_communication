import React from 'react';
import { Mic, MicOff, Video, VideoOff, Hand, Crown } from 'lucide-react';

export default function ParticipantsPanel({ participants, hostId }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {participants.map((p) => (
        <div className="participant-row" key={p.socketId || p.userId}>
          <div className="who">
            <div
              className="avatar"
              style={{ width: 30, height: 30, fontSize: 12, background: p.avatarColor || '#7c6cf6' }}
            >
              {p.name?.[0]?.toUpperCase()}
            </div>
            <span>
              {p.name} {p.isLocal ? '(You)' : ''}
            </span>
            {p.userId === hostId && <Crown size={13} color="#ffb84d" />}
            {p.handRaised && <Hand size={14} color="#ffb84d" />}
          </div>
          <div style={{ display: 'flex', gap: 8, color: 'var(--text-2)' }}>
            {p.micOn ? <Mic size={15} /> : <MicOff size={15} color="var(--danger)" />}
            {p.cameraOn ? <Video size={15} /> : <VideoOff size={15} color="var(--danger)" />}
          </div>
        </div>
      ))}
    </div>
  );
}
