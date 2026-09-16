import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Download, Loader2 } from 'lucide-react';
import api from '../utils/api.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPanel({ roomId, files, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    const file = fileList[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/files/${roomId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.file);
    } catch (err) {
      // silently ignore — could surface a toast in a fuller build
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadFile = (file) => {
    window.open(`/api/files/download/${file._id}`, '_blank');
  };

  return (
    <>
      <div
        className="file-drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="spin-icon" style={{ marginBottom: 6 }} />
            <div>Uploading…</div>
          </>
        ) : (
          <>
            <UploadCloud size={22} style={{ marginBottom: 6 }} />
            <div>Click or drag a file here to share (max 25MB)</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <div className="file-list">
        {files.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
            No files shared yet.
          </div>
        )}
        {files.map((f) => (
          <div className="file-row" key={f._id}>
            <div className="file-icon">
              <FileText size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.originalName}
              </div>
              <div className="meta-line">
                {formatSize(f.size)} · {f.uploaderName}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => downloadFile(f)}>
              <Download size={15} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
