import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  onExport: (format: 'csv' | 'xlsx') => void;
  disabled?: boolean;
}

export default function ExportButtons({ onExport, disabled }: ExportButtonsProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem',
          background: 'var(--primary-light)', color: 'var(--primary)',
          fontWeight: '600', border: '1px solid var(--primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
      >
        <Download size={16} />
        Export
      </button>

      {showOptions && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'white', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          overflow: 'hidden', zIndex: 100, minWidth: '160px',
          border: '1px solid var(--gray-200)'
        }}>
          <button
            onClick={() => { onExport('csv'); setShowOptions(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '12px 16px', background: 'none', fontSize: '0.85rem',
              borderBottom: '1px solid var(--gray-100)', textAlign: 'left'
            }}
          >
            <FileText size={18} color="#10B981" />
            <div>
              <div style={{ fontWeight: '600' }}>CSV</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>สำหรับ Excel, Google Sheets</div>
            </div>
          </button>
          <button
            onClick={() => { onExport('xlsx'); setShowOptions(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '12px 16px', background: 'none', fontSize: '0.85rem',
              textAlign: 'left'
            }}
          >
            <FileSpreadsheet size={18} color="#4F46E5" />
            <div>
              <div style={{ fontWeight: '600' }}>Excel (.xlsx)</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>ไฟล์ Excel พร้อมจัดรูปแบบ</div>
            </div>
          </button>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showOptions && (
        <div
          onClick={() => setShowOptions(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        />
      )}
    </div>
  );
}
