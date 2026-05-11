import React, { useState, useRef } from 'react';
import api from '../api';
import { Upload, Trash2, Building2 } from 'lucide-react';

interface LogoManagerProps {
  currentLogo: string;
  companyName: string;
  onUpdate: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function LogoManager({ currentLogo, companyName, onUpdate, onToast }: LogoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editName, setEditName] = useState(companyName);
  const [showNameEdit, setShowNameEdit] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      onToast('กรุณาเลือกไฟล์รูปภาพ', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onToast('ไฟล์ต้องมีขนาดไม่เกิน 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await api.post('/settings/logo', { logo: base64 });
        onToast('อัปโหลดโลโก้สำเร็จ', 'success');
        onUpdate();
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('ต้องการลบโลโก้?')) return;
    try {
      await api.delete('/settings/logo');
      onToast('ลบโลโก้สำเร็จ', 'success');
      onUpdate();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleSaveName = async () => {
    try {
      await api.put('/settings', { company_name: editName });
      onToast('บันทึกชื่อบริษัทสำเร็จ', 'success');
      setShowNameEdit(false);
      onUpdate();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const logoUrl = currentLogo ? `/api/settings/logo/${currentLogo}` : null;

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Building2 size={20} color="var(--primary)" />
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>โลโก้บริษัท</h3>
      </div>

      {/* Logo Preview */}
      <div style={{ 
        textAlign: 'center', padding: '24px', 
        background: 'var(--gray-50)', borderRadius: 'var(--radius)',
        border: '2px dashed var(--gray-200)', marginBottom: '16px'
      }}>
        {logoUrl ? (
          <div>
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              style={{ 
                maxWidth: '180px', maxHeight: '120px', objectFit: 'contain',
                borderRadius: '8px'
              }} 
            />
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              โลโก้ปัจจุบัน
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '8px', opacity: 0.3 }}>🏢</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>ยังไม่มีโลโก้</div>
          </div>
        )}
      </div>

      {/* Upload / Delete Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="btn btn-primary"
          disabled={uploading}
          style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
        >
          <Upload size={16} />
          {uploading ? 'กำลังอัปโหลด...' : (currentLogo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้')}
        </button>
        {currentLogo && (
          <button 
            onClick={handleDeleteLogo} 
            className="btn btn-danger"
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: '16px' }}>
        รองรับ: JPG, PNG, SVG • ขนาดไม่เกิน 5MB • แนะนำ 200x80px
      </div>

      {/* Company Name */}
      <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-600)' }}>ชื่อบริษัท</label>
          {!showNameEdit && (
            <button 
              onClick={() => { setEditName(companyName); setShowNameEdit(true); }}
              style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', fontWeight: '600' }}
            >
              แก้ไข
            </button>
          )}
        </div>
        {showNameEdit ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="ชื่อบริษัท"
              style={{ 
                flex: 1, padding: '10px 14px', border: '2px solid var(--primary)', 
                borderRadius: '8px', fontSize: '0.9rem' 
              }}
            />
            <button onClick={handleSaveName} className="btn btn-success" style={{ width: 'auto', padding: '10px 16px' }}>
              บันทึก
            </button>
            <button onClick={() => setShowNameEdit(false)} className="btn btn-outline" style={{ width: 'auto', padding: '10px 16px' }}>
              ยกเลิก
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--gray-800)' }}>
            {companyName || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>ยังไม่ได้ตั้งชื่อ</span>}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}
