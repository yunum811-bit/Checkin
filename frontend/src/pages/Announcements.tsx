import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, X, Pin, Edit2, Trash2, AlertTriangle, Info, Bell, Paperclip, FileText, Download } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  pinned: number;
  attachment: string;
  attachment_name: string;
  created_by: number;
  author_name: string;
  created_at: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [pinned, setPinned] = useState(false);
  const [attachmentData, setAttachmentData] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'md';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setPinned(false);
    setAttachmentData('');
    setAttachmentName('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentData(event.target?.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentData('');
    setAttachmentName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { title, content, priority, pinned };
      if (attachmentData) {
        payload.attachment = attachmentData;
        payload.attachment_name = attachmentName;
      }

      if (editingId) {
        await api.put(`/announcements/${editingId}`, payload);
        setToast({ message: 'อัปเดตประกาศสำเร็จ', type: 'success' });
      } else {
        await api.post('/announcements', payload);
        setToast({ message: 'สร้างประกาศสำเร็จ', type: 'success' });
      }
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setTitle(a.title);
    setContent(a.content);
    setPriority(a.priority);
    setPinned(!!a.pinned);
    setAttachmentData('');
    setAttachmentName(a.attachment_name || '');
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ต้องการลบประกาศนี้?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setToast({ message: 'ลบประกาศสำเร็จ', type: 'success' });
      fetchAnnouncements();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'urgent': return { bg: '#FEE2E2', border: '#FECACA', icon: <AlertTriangle size={16} color="#DC2626" />, label: 'ด่วน' };
      case 'important': return { bg: '#FEF3C7', border: '#FDE68A', icon: <Bell size={16} color="#D97706" />, label: 'สำคัญ' };
      default: return { bg: '#F0FDF4', border: '#BBF7D0', icon: <Info size={16} color="#16A34A" />, label: 'ทั่วไป' };
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    return '📎';
  };

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <h1><Megaphone size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />ประกาศข่าวสาร</h1>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {/* Create Button */}
        {canCreate && (
          <button
            className="btn btn-primary"
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            style={{ marginBottom: '16px' }}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'ยกเลิก' : 'สร้างประกาศใหม่'}
          </button>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card" style={{ border: '2px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              {editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}
            </h3>

            <div className="input-group">
              <label>หัวข้อ</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อประกาศ" required />
            </div>

            <div className="input-group">
              <label>เนื้อหา</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="รายละเอียดประกาศ..." rows={4} required style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>ความสำคัญ</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="normal">ทั่วไป</option>
                  <option value="important">สำคัญ</option>
                  <option value="urgent">ด่วน</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  <Pin size={14} /> ปักหมุด
                </label>
              </div>
            </div>

            {/* Attachment */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                แนบไฟล์
              </label>
              {attachmentName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                  <FileText size={18} color="var(--primary)" />
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '500' }}>{attachmentName}</span>
                  <button type="button" onClick={removeAttachment} style={{ background: 'none', color: 'var(--danger)', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', border: '2px dashed var(--gray-300)',
                    borderRadius: '10px', background: 'var(--gray-50)', color: 'var(--gray-500)',
                    fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', cursor: 'pointer'
                  }}
                >
                  <Paperclip size={16} />
                  เลือกไฟล์แนบ (PDF, รูปภาพ, Word, Excel ไม่เกิน 10MB)
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>

            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : (editingId ? 'อัปเดต' : 'เผยแพร่ประกาศ')}
            </button>
          </form>
        )}

        {/* Announcements List */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>กำลังโหลด...</div>
        ) : announcements.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📢</div>
            <div style={{ color: 'var(--gray-400)', fontWeight: '500' }}>ยังไม่มีประกาศ</div>
          </div>
        ) : (
          announcements.map((a) => {
            const pStyle = getPriorityStyle(a.priority);
            return (
              <div key={a.id} className="card" style={{ 
                padding: '16px', borderLeft: `4px solid ${pStyle.border}`,
                background: a.pinned ? pStyle.bg : 'white'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {a.pinned ? <Pin size={14} color="var(--primary)" /> : null}
                    {pStyle.icon}
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--gray-800)' }}>
                      {a.title}
                    </span>
                  </div>
                  {(user?.role === 'admin' || a.created_by === user?.id) && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleEdit(a)} style={{ background: 'none', padding: '4px', color: 'var(--primary)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(a.id)} style={{ background: 'none', padding: '4px', color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                  {a.content}
                </div>

                {/* Attachment */}
                {a.attachment && (
                  <div style={{ marginBottom: '10px' }}>
                    {/* Image preview */}
                    {['jpg','jpeg','png','gif'].includes(a.attachment_name?.split('.').pop()?.toLowerCase() || '') ? (
                      <div>
                        <img
                          src={`/api/announcements/attachment/${a.attachment}`}
                          alt={a.attachment_name}
                          style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', marginBottom: '8px', background: 'var(--gray-100)' }}
                        />
                        <a
                          href={`/api/announcements/attachment/${a.attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}
                        >
                          <Download size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          ดาวน์โหลด {a.attachment_name}
                        </a>
                      </div>
                    ) : (
                      <a
                        href={`/api/announcements/attachment/${a.attachment}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 14px', background: 'var(--gray-50)',
                          borderRadius: '8px', border: '1px solid var(--gray-200)',
                          fontSize: '0.8rem', color: 'var(--primary)',
                          fontWeight: '600', textDecoration: 'none'
                        }}
                      >
                        <span>{getFileIcon(a.attachment_name)}</span>
                        <span style={{ flex: 1 }}>{a.attachment_name}</span>
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                  <span>โดย {a.author_name}</span>
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
