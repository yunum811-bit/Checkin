import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface LeaveQuota {
  id: number;
  leave_type: string;
  leave_name: string;
  max_days: number;
  enabled: number;
}

interface LeaveQuotaManagerProps {
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function LeaveQuotaManager({ onToast }: LeaveQuotaManagerProps) {
  const [quotas, setQuotas] = useState<LeaveQuota[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDays, setEditDays] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('');
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState(5);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    try {
      const res = await api.get('/settings/leave-quotas');
      setQuotas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (quota: LeaveQuota) => {
    try {
      await api.put(`/settings/leave-quotas/${quota.id}`, { enabled: !quota.enabled });
      onToast(`${quota.enabled ? 'ปิด' : 'เปิด'}ใช้งาน "${quota.leave_name}" แล้ว`, 'success');
      fetchQuotas();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEdit = (quota: LeaveQuota) => {
    setEditingId(quota.id);
    setEditName(quota.leave_name);
    setEditDays(quota.max_days);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await api.put(`/settings/leave-quotas/${editingId}`, { leave_name: editName, max_days: editDays });
      onToast('อัปเดตสำเร็จ', 'success');
      setEditingId(null);
      fetchQuotas();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleAdd = async () => {
    if (!newType || !newName) {
      onToast('กรุณากรอกข้อมูลให้ครบ', 'error');
      return;
    }
    try {
      await api.post('/settings/leave-quotas', { leave_type: newType, leave_name: newName, max_days: newDays });
      onToast('เพิ่มประเภทการลาสำเร็จ', 'success');
      setShowAdd(false);
      setNewType('');
      setNewName('');
      setNewDays(5);
      fetchQuotas();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ต้องการลบ "${name}"?`)) return;
    try {
      await api.delete(`/settings/leave-quotas/${id}`);
      onToast('ลบสำเร็จ', 'success');
      fetchQuotas();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>กำหนดสิทธิ์การลา</h3>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={14} /> เพิ่ม
        </button>
      </div>

      {/* Add new leave type */}
      {showAdd && (
        <div style={{ padding: '14px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--gray-200)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '10px' }}>เพิ่มประเภทการลาใหม่</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="รหัส (เช่น ordination)"
              style={{ padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.85rem' }}
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อ (เช่น ลาบวช)"
              style={{ padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={newDays}
                onChange={(e) => setNewDays(parseInt(e.target.value) || 0)}
                min={0}
                style={{ width: '80px', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>วัน/ปี</span>
              <div style={{ flex: 1 }} />
              <button onClick={handleAdd} style={{ background: 'var(--primary)', color: 'white', borderRadius: '8px', padding: '8px 14px', fontSize: '0.8rem', fontWeight: '600' }}>
                บันทึก
              </button>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--gray-200)', color: 'var(--gray-600)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.8rem', fontWeight: '600' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {quotas.map((q) => (
          <div key={q.id} style={{ 
            padding: '12px 14px', borderRadius: '10px', 
            background: q.enabled ? 'white' : 'var(--gray-50)',
            border: `1px solid ${q.enabled ? 'var(--gray-200)' : 'var(--gray-100)'}`,
            opacity: q.enabled ? 1 : 0.6
          }}>
            {editingId === q.id ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ flex: 1, minWidth: '100px', padding: '8px 10px', border: '1px solid var(--primary)', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <input
                  type="number"
                  value={editDays}
                  onChange={(e) => setEditDays(parseInt(e.target.value) || 0)}
                  min={0}
                  style={{ width: '60px', padding: '8px 10px', border: '1px solid var(--primary)', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>วัน</span>
                <button onClick={handleSaveEdit} style={{ background: 'none', color: 'var(--success)', padding: '4px' }}><Check size={18} /></button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', color: 'var(--gray-400)', padding: '4px' }}><X size={18} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Toggle */}
                <button onClick={() => handleToggle(q)} style={{ background: 'none', padding: '2px', color: q.enabled ? 'var(--success)' : 'var(--gray-300)' }}>
                  {q.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{q.leave_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{q.leave_type} • {q.max_days} วัน/ปี</div>
                </div>
                {/* Actions */}
                <button onClick={() => handleEdit(q)} style={{ background: 'none', color: 'var(--primary)', padding: '4px' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(q.id, q.leave_name)} style={{ background: 'none', color: 'var(--danger)', padding: '4px' }}><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
