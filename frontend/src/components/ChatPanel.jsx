import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            No messages yet.<br />Say hello to everyone!
          </div>
        )}
        {messages.map((m, i) =>
          m.type === 'system' ? (
            <div className="chat-msg system" key={i}>
              <div className="bubble">{m.content}</div>
            </div>
          ) : (
            <div className="chat-msg" key={m._id || i}>
              <div className="sender">{m.senderName}</div>
              <div className="bubble">{m.content}</div>
              <div className="time">{formatTime(m.createdAt)}</div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          id="chat-input"
          autoComplete="off"
        />
        <button
          className="btn btn-primary btn-icon"
          type="submit"
          aria-label="Send message"
          id="chat-send"
          disabled={!text.trim()}
          style={{ flexShrink: 0 }}
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
