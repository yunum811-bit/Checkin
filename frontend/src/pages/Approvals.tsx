import React, { useState, useEffect } from 'react';
import api from '../api';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ApprovalStep {
  id: number;
  level: number;
  status: string;
  approver_name: string;
  approver_role: string;
  approver_position: string;
  comment: string;
  acted_at: string;
}

interface PendingApproval {
  id: number;
  leave_id: number;
  level: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  current_level: number;
  max_level: number;
  name: string;
  employee_id: string;
  department: string;
  requester_position: string;
  all_approvals: ApprovalStep[];
}

export default function Approvals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [commentMap, setCommentMap] = useState<Record<number, string>>({});
  const [showCommentFor, setShowCommentFor] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'manager' && user?.role !== 'md' && user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const res = await api.get('/leaves/pending-approvals');
      setPendingApprovals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: number, status: 'approved' | 'rejected') => {
    try {
      const comment = commentMap[leaveId] || '';
      await api.put(`/leaves/${leaveId}/approve`, { status, comment });
      setToast({ 
        message: status === 'approved' ? 'อนุมัติสำเร็จ ✅' : 'ปฏิเสธสำเร็จ', 
        type: 'success' 
      });
      setCommentMap(prev => { const n = {...prev}; delete n[leaveId]; return n; });
      setShowCommentFor(null);
      fetchPendingApprovals();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} color="#10B981" />;
      case 'rejected': return <XCircle size={14} color="#EF4444" />;
      case 'pending': return <Clock size={14} color="#F59E0B" />;
      case 'waiting': return <Clock size={14} color="#D1D5DB" />;
      default: return <Clock size={14} color="#D1D5DB" />;
    }
  };

  const leaveTypeNames: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน', maternity: 'ลาคลอด', other: 'อื่นๆ'
  };

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', color: 'white' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1>อนุมัติการลา</h1>
            <p>รอดำเนินการ {pendingApprovals.length} รายการ</p>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>กำลังโหลด...</div>
        ) : pendingApprovals.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <div style={{ color: 'var(--gray-500)', fontWeight: '500' }}>ไม่มีคำขอที่รอการอนุมัติ</div>
          </div>
        ) : (
          pendingApprovals.map((item) => (
            <div key={item.id} className="card">
              {/* Requester Info */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  {item.employee_id} • {item.department} • {item.requester_position}
                </div>
              </div>

              {/* Leave Details */}
              <div style={{ 
                padding: '12px', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '12px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {leaveTypeNames[item.leave_type] || item.leave_type}
                  </span>
                  <span className="badge badge-warning">ลำดับ {item.level}/{item.max_level}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  📅 {new Date(item.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(item.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {item.reason && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                    💬 {item.reason}
                  </div>
                )}
              </div>

              {/* Approval Chain Progress */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px' }}>
                  ลำดับการอนุมัติ:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {item.all_approvals.map((step) => (
                    <div key={step.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem',
                      background: step.status === 'pending' ? '#FEF3C7' : 
                                  step.status === 'approved' ? '#D1FAE5' : 'var(--gray-100)',
                      border: step.status === 'pending' ? '1px solid #F59E0B' : '1px solid transparent'
                    }}>
                      {getApprovalIcon(step.status)}
                      <span>{step.approver_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment Input */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => setShowCommentFor(showCommentFor === item.leave_id ? null : item.leave_id)}
                  style={{ 
                    background: 'none', fontSize: '0.8rem', color: 'var(--gray-500)',
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0'
                  }}
                >
                  <MessageSquare size={14} />
                  เพิ่มความเห็น
                </button>
                {showCommentFor === item.leave_id && (
                  <textarea
                    value={commentMap[item.leave_id] || ''}
                    onChange={(e) => setCommentMap(prev => ({ ...prev, [item.leave_id]: e.target.value }))}
                    placeholder="ความเห็นเพิ่มเติม (ไม่บังคับ)..."
                    rows={2}
                    style={{ 
                      width: '100%', padding: '8px 12px', border: '2px solid var(--gray-200)',
                      borderRadius: '8px', fontSize: '0.85rem', marginTop: '6px', resize: 'none'
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-success"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => handleApprove(item.leave_id, 'approved')}
                >
                  <CheckCircle size={18} /> อนุมัติ
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => handleApprove(item.leave_id, 'rejected')}
                >
                  <XCircle size={18} /> ปฏิเสธ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
