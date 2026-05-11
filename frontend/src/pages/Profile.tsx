import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Toast from '../components/Toast';
import { User, LogOut, Lock, Shield, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'รหัสผ่านใหม่ไม่ตรงกัน', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setToast({ message: 'เปลี่ยนรหัสผ่านสำเร็จ', type: 'success' });
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'md': return 'Managing Director';
      case 'manager': return 'หัวหน้า/ผู้จัดการ';
      default: return 'พนักงาน';
    }
  };

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <h1><User size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />โปรไฟล์</h1>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {/* Profile Card */}
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #16A34A 0%, #65A30D 50%, #CA8A04 100%)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: 'var(--shadow-primary)'
          }}>
            <span style={{ fontSize: '2rem' }}>👤</span>
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>{user?.name}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '4px' }}>{user?.email}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
            <span className="badge badge-info">{user?.department}</span>
            <span className="badge badge-success">{user?.employee_id}</span>
          </div>
        </div>

        {/* Info Card */}
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: '500' }}>รหัสพนักงาน</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user?.employee_id}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--gray-100)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: '500' }}>แผนก</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user?.department}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--gray-100)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: '500' }}>บทบาท</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{getRoleName(user?.role)}</span>
            </div>
          </div>
        </div>

        {/* Admin Link */}
        {user?.role === 'admin' && (
          <button className="btn btn-outline" onClick={() => navigate('/admin')} style={{ marginBottom: '12px' }}>
            <Shield size={18} />
            จัดการระบบ (Admin)
          </button>
        )}

        {/* Change Password */}
        <button
          className="btn btn-outline"
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          style={{ marginBottom: '12px' }}
        >
          <Lock size={18} />
          เปลี่ยนรหัสผ่าน
        </button>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="card">
            <div className="input-group">
              <label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="newPassword">รหัสผ่านใหม่</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </form>
        )}

        {/* Logout */}
        <button className="btn btn-danger" onClick={handleLogout} style={{ marginTop: '4px' }}>
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
