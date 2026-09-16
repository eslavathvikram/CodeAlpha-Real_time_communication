import React, { useEffect, useRef } from 'react';
import { MicOff, Hand } from 'lucide-react';

export default function VideoTile({
  stream,
  name,
  avatarColor = '#7c6cf6',
  isLocal = false,
  muted = false,
  cameraOff = false,
  handRaised = false,
  reaction = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      {!cameraOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={isLocal ? 'mirrored-video' : ''}
          style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
        />
      ) : (
        <div className="avatar-fallback" style={{ background: avatarColor }}>
          {name?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {handRaised && (
        <div className="hand-badge">
          <Hand size={15} />
        </div>
      )}

      {reaction && <div className="reaction-float">{reaction}</div>}

      <div className="tile-icons">
        {muted && (
          <div className="tile-icon-badge">
            <MicOff size={13} />
          </div>
        )}
      </div>

      <div className="tile-label">{name}{isLocal ? ' (You)' : ''}</div>
    </div>
  );
}
