import React, { useState, useEffect } from 'react';
import api from '../api';
import Toast from '../components/Toast';
import ExportButtons from '../components/ExportButtons';
import LogoManager from '../components/LogoManager';
import { exportAllLeaves, exportAllAttendance } from '../utils/exportData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CheckCircle, XCircle, ArrowLeft, Plus, Edit2, Clock, ClipboardList, ChevronLeft, ChevronRight, LogIn, LogOut, Settings } from 'lucide-react';

interface UserData {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  position: string;
  manager_id: number | null;
  manager_name: string | null;
}

interface ManagerOption {
  id: number;
  employee_id: string;
  name: string;
  department: string;
  role: string;
  position: string;
}

interface LeaveWithApprovals {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  current_level: number;
  max_level: number;
  approvals: Array<{
    id: number;
    level: number;
    status: string;
    approver_name: string;
    approver_role: string;
    comment: string;
    acted_at: string;
  }>;
}

interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
  note: string;
  name: string;
  employee_id: string;
  department: string;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'users' | 'settings'>('attendance');
  const [allLeaves, setAllLeaves] = useState<LeaveWithApprovals[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [companySettings, setCompanySettings] = useState<{ company_name: string; logo: string }>({ company_name: '', logo: '' });

  // Attendance date picker
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // New user form
  const [newUser, setNewUser] = useState({
    employee_id: '', name: '', email: '', password: '', department: '', role: 'employee', position: '', manager_id: ''
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchManagers();
    fetchAllLeaves();
    fetchAllAttendance();
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchAllAttendance();
  }, [attendanceDate]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setCompanySettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await api.get('/attendance/all', { params: { date: attendanceDate } });
      setAllAttendance(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await api.get('/leaves/all');
      setAllLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/users/managers');
      setManagers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        ...newUser,
        manager_id: newUser.manager_id ? parseInt(newUser.manager_id) : null
      });
      setToast({ message: 'เพิ่มพนักงานสำเร็จ', type: 'success' });
      setShowAddUser(false);
      setNewUser({ employee_id: '', name: '', email: '', password: '', department: '', role: 'employee', position: '', manager_id: '' });
      fetchUsers();
      fetchManagers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        department: editingUser.department,
        role: editingUser.role,
        position: editingUser.position,
        manager_id: editingUser.manager_id
      });
      setToast({ message: 'อัปเดตสำเร็จ', type: 'success' });
      setEditingUser(null);
      fetchUsers();
      fetchManagers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('ต้องการลบผู้ใช้นี้?')) return;
    try {
      await api.delete(`/users/${id}`);
      setToast({ message: 'ลบผู้ใช้สำเร็จ', type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(attendanceDate);
    d.setDate(d.getDate() + days);
    setAttendanceDate(d.toISOString().split('T')[0]);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'md': return 'MD';
      case 'manager': return 'หัวหน้า/ผู้จัดการ';
      case 'employee': return 'พนักงาน';
      default: return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'md': return 'badge-info';
      case 'manager': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  const leaveTypeNames: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน', maternity: 'ลาคลอด', other: 'อื่นๆ'
  };

  const getLeaveStatusText = (status: string) => {
    if (status.startsWith('pending')) return 'รออนุมัติ';
    if (status === 'approved') return 'อนุมัติแล้ว';
    if (status === 'rejected') return 'ปฏิเสธ';
    return status;
  };

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'none', color: 'white' }}>
            <ArrowLeft size={24} />
          </button>
          <h1>จัดการระบบ (Admin)</h1>
        </div>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
          >
            <ClipboardList size={14} />
            เข้างาน
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
          >
            <Calendar size={14} />
            คำขอลา
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
          >
            <Users size={14} />
            พนักงาน
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
          >
            <Settings size={14} />
            ตั้งค่า
          </button>
        </div>

        {/* ===== Attendance Tab ===== */}
        {activeTab === 'attendance' && (
          <>
            {/* Date Selector */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <button onClick={() => changeDate(-1)} style={{ background: 'var(--gray-100)', borderRadius: '8px', padding: '8px' }}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <input 
                  type="date" 
                  value={attendanceDate} 
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{ 
                    border: 'none', background: 'none', fontSize: '0.9rem', 
                    fontWeight: '700', color: 'var(--gray-800)', textAlign: 'center',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                  {new Date(attendanceDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button onClick={() => changeDate(1)} style={{ background: 'var(--gray-100)', borderRadius: '8px', padding: '8px' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Export + Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: '600' }}>
                พนักงานเข้างาน: {allAttendance.length} คน
              </span>
              <ExportButtons 
                onExport={(format) => {
                  if (allAttendance.length === 0) {
                    setToast({ message: 'ไม่มีข้อมูลให้ export', type: 'error' });
                    return;
                  }
                  exportAllAttendance(allAttendance, format, attendanceDate);
                  setToast({ message: `Export ${format.toUpperCase()} สำเร็จ`, type: 'success' });
                }} 
                disabled={allAttendance.length === 0} 
              />
            </div>

            {/* Attendance Records */}
            {allAttendance.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
                <div style={{ color: 'var(--gray-400)', fontWeight: '500' }}>ไม่มีข้อมูลเข้างานในวันนี้</div>
              </div>
            ) : (
              allAttendance.map((record) => (
                <div key={record.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{record.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginLeft: '8px' }}>{record.employee_id}</span>
                    </div>
                    <span className={`badge ${record.status === 'late' ? 'badge-warning' : 'badge-success'}`}>
                      {record.status === 'late' ? 'มาสาย' : 'ตรงเวลา'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '8px' }}>
                    {record.department}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LogIn size={14} color="var(--success)" />
                      <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>{record.check_in_time || '--:--'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LogOut size={14} color="var(--danger)" />
                      <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>{record.check_out_time || '--:--'}</span>
                    </div>
                  </div>
                  {record.note && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '6px' }}>
                      📝 {record.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ===== Leaves Tab ===== */}
        {activeTab === 'leaves' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <ExportButtons 
                onExport={(format) => {
                  if (allLeaves.length === 0) {
                    setToast({ message: 'ไม่มีข้อมูลให้ export', type: 'error' });
                    return;
                  }
                  exportAllLeaves(allLeaves, format);
                  setToast({ message: `Export ${format.toUpperCase()} สำเร็จ`, type: 'success' });
                }} 
                disabled={allLeaves.length === 0} 
              />
            </div>
            {allLeaves.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
                ไม่มีคำขอลา
              </div>
            ) : (
              allLeaves.map((leave) => (
                <div key={leave.id} className="card" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{leave.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '8px' }}>{leave.employee_id}</span>
                    </div>
                    <span className={`badge ${leave.status === 'approved' ? 'badge-success' : leave.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {getLeaveStatusText(leave.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    {leaveTypeNames[leave.leave_type]} • {new Date(leave.start_date).toLocaleDateString('th-TH')} - {new Date(leave.end_date).toLocaleDateString('th-TH')}
                  </div>
                  {leave.approvals && leave.approvals.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {leave.approvals.map((a) => (
                        <div key={a.id} style={{ 
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem',
                          background: a.status === 'approved' ? '#D1FAE5' : a.status === 'rejected' ? '#FEE2E2' : a.status === 'pending' ? '#FEF3C7' : 'var(--gray-100)'
                        }}>
                          {a.status === 'approved' ? <CheckCircle size={10} color="#10B981" /> : 
                           a.status === 'rejected' ? <XCircle size={10} color="#EF4444" /> : 
                           <Clock size={10} color="#F59E0B" />}
                          {a.approver_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ===== Users Tab ===== */}
        {activeTab === 'users' && (
          <>
            <button className="btn btn-primary" onClick={() => { setShowAddUser(!showAddUser); setEditingUser(null); }} style={{ marginBottom: '16px' }}>
              <Plus size={20} />
              {showAddUser ? 'ยกเลิก' : 'เพิ่มพนักงาน'}
            </button>

            {showAddUser && (
              <form onSubmit={handleAddUser} className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>เพิ่มพนักงานใหม่</h3>
                <div className="input-group">
                  <label>รหัสพนักงาน</label>
                  <input value={newUser.employee_id} onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })} required placeholder="EMP006" />
                </div>
                <div className="input-group">
                  <label>ชื่อ-นามสกุล</label>
                  <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>อีเมล</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>รหัสผ่าน</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
                </div>
                <div className="input-group">
                  <label>ตำแหน่ง</label>
                  <input value={newUser.position} onChange={(e) => setNewUser({ ...newUser, position: e.target.value })} placeholder="เช่น วิศวกร, เจ้าหน้าที่" />
                </div>
                <div className="input-group">
                  <label>แผนก</label>
                  <input value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>บทบาท</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="employee">พนักงาน</option>
                    <option value="manager">หัวหน้า/ผู้จัดการ</option>
                    <option value="md">MD (Managing Director)</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>หัวหน้าโดยตรง</label>
                  <select value={newUser.manager_id} onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value })}>
                    <option value="">-- ไม่มี --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.position || m.role})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-success">บันทึก</button>
              </form>
            )}

            {editingUser && (
              <form onSubmit={handleUpdateUser} className="card" style={{ border: '2px solid var(--primary)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>แก้ไข: {editingUser.name}</h3>
                <div className="input-group">
                  <label>ชื่อ-นามสกุล</label>
                  <input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>ตำแหน่ง</label>
                  <input value={editingUser.position || ''} onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>แผนก</label>
                  <input value={editingUser.department} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>บทบาท</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                    <option value="employee">พนักงาน</option>
                    <option value="manager">หัวหน้า/ผู้จัดการ</option>
                    <option value="md">MD (Managing Director)</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>หัวหน้าโดยตรง</label>
                  <select 
                    value={editingUser.manager_id || ''} 
                    onChange={(e) => setEditingUser({ ...editingUser, manager_id: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">-- ไม่มี --</option>
                    {managers.filter(m => m.id !== editingUser.id).map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.position || m.role})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-success" style={{ flex: 1 }}>บันทึก</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingUser(null)}>ยกเลิก</button>
                </div>
              </form>
            )}

            {users.map((u) => (
              <div key={u.id} className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600' }}>{u.name}</span>
                      <span className={`badge ${getRoleBadge(u.role)}`} style={{ fontSize: '0.65rem' }}>
                        {getRoleName(u.role)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {u.employee_id} • {u.position || u.department}
                    </div>
                    {u.manager_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>
                        👤 หัวหน้า: {u.manager_name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => { setEditingUser(u); setShowAddUser(false); }}
                      style={{ background: 'none', color: 'var(--primary)', padding: '6px' }}
                      aria-label={`แก้ไข ${u.name}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        style={{ background: 'none', color: 'var(--danger)', padding: '6px' }}
                        aria-label={`ลบ ${u.name}`}
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== Settings Tab ===== */}
        {activeTab === 'settings' && (
          <LogoManager
            currentLogo={companySettings.logo}
            companyName={companySettings.company_name}
            onUpdate={fetchSettings}
            onToast={(message, type) => setToast({ message, type })}
          />
        )}
      </div>
    </div>
  );
}
