import React from 'react';

export const Watermark: React.FC<{ text?: string }> = ({ text = 'CONFIDENTIAL' }) => (
  <div style={{
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
    background: '#fff',
    border: '1px dashed #cbd5e1'
  }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(15,23,42,0.06) 0, rgba(15,23,42,0.06) 10px, transparent 10px, transparent 40px)`,
      }}
      aria-hidden
    />
    <div style={{ position: 'relative', padding: 16, color: '#0f172a' }}>{text}</div>
  </div>
);

export const AuditPanel: React.FC<{ entries: Array<{ id: string; actor: string; action: string; time: string }> }> = ({
  entries,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {entries.map((entry) => (
      <div key={entry.id} style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ fontWeight: 600 }}>{entry.actor}</div>
        <div style={{ fontSize: 13 }}>{entry.action}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{entry.time}</div>
      </div>
    ))}
  </div>
);
