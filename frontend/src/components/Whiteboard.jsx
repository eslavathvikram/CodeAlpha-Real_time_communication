import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Eraser, Trash2, Pencil } from 'lucide-react';

const COLORS = ['#1e1b2e', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
const SIZES = [3, 6, 10];

export default function Whiteboard({ socket }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'

  const getContext = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
    }
    return ctxRef.current;
  }, []);

  // Resize canvas to fill its container while preserving drawing (best-effort)
  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = canvas?.parentElement;
    if (!canvas || !holder) return;

    function resize() {
      const { width, height } = holder.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      const ctx = getContext();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [getContext]);

  const drawSegment = useCallback(
    (from, to, strokeColor, strokeSize) => {
      const ctx = getContext();
      if (!ctx || !from || !to) return;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.beginPath();
      ctx.moveTo(from.x * canvasRef.current.width, from.y * canvasRef.current.height);
      ctx.lineTo(to.x * canvasRef.current.width, to.y * canvasRef.current.height);
      ctx.stroke();
    },
    [getContext]
  );

  // Listen for remote strokes / clears
  useEffect(() => {
    if (!socket) return;
    const handleDraw = (stroke) => {
      drawSegment(stroke.from, stroke.to, stroke.color, stroke.size);
    };
    const handleClear = () => {
      const ctx = getContext();
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);
    return () => {
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
    };
  }, [socket, drawSegment, getContext]);

  const getRelativePoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  const handleStart = (e) => {
    drawing.current = true;
    lastPoint.current = getRelativePoint(e);
  };

  const handleMove = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const point = getRelativePoint(e);
    const strokeColor = tool === 'eraser' ? '#ffffff' : color;
    const strokeSize = tool === 'eraser' ? size * 4 : size;
    drawSegment(lastPoint.current, point, strokeColor, strokeSize);
    socket?.emit('whiteboard-draw', {
      from: lastPoint.current,
      to: point,
      color: strokeColor,
      size: strokeSize,
    });
    lastPoint.current = point;
  };

  const handleEnd = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clearBoard = () => {
    const ctx = getContext();
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket?.emit('whiteboard-clear');
  };

  return (
    <div className="whiteboard-wrap">
      <div className="whiteboard-toolbar">
        {COLORS.map((c) => (
          <div
            key={c}
            className={`wb-color ${tool === 'pen' && color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => {
              setColor(c);
              setTool('pen');
            }}
          />
        ))}
        <div className="wb-divider" />
        {SIZES.map((s) => (
          <button
            key={s}
            className="btn btn-ghost"
            style={{ padding: '6px 10px', opacity: size === s ? 1 : 0.6 }}
            onClick={() => setSize(s)}
          >
            {s}px
          </button>
        ))}
        <div className="wb-divider" />
        <button
          className="btn btn-ghost"
          style={{ padding: '6px 10px', opacity: tool === 'pen' ? 1 : 0.6 }}
          onClick={() => setTool('pen')}
        >
          <Pencil size={14} /> Pen
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: '6px 10px', opacity: tool === 'eraser' ? 1 : 0.6 }}
          onClick={() => setTool('eraser')}
        >
          <Eraser size={14} /> Eraser
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={clearBoard}>
          <Trash2 size={14} /> Clear board
        </button>
      </div>
      <div className="whiteboard-canvas-holder">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    </div>
  );
}
