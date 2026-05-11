import React, { useState, useEffect } from 'react';
import api from '../api';
import Toast from '../components/Toast';
import ExportButtons from '../components/ExportButtons';
import { exportLeaves } from '../utils/exportData';
import { Calendar, Plus, X, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Approval {
  id: number;
  level: number;
  status: string;
  approver_name: string;
  approver_role: string;
  approver_position: string;
  comment: string;
  acted_at: string;
}

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  current_level: number;
  max_level: number;
  created_at: string;
  approvals: Approval[];
}

interface LeaveBalance {
  id: string;
  name: string;
  max_days: number;
  used_days: number;
  remaining_days: number;
}

interface ApprovalChain {
  level: number;
  approver_name: string;
  role: string;
}

export default function Leave() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [chain, setChain] = useState<ApprovalChain[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<Array<{id: string; name: string}>>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedLeave, setExpandedLeave] = useState<number | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaves();
    fetchBalance();
    fetchChain();
    fetchLeaveTypes();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves/my');
      setLeaves(res.data);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get('/leaves/balance');
      setBalance(res.data);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fetchChain = async () => {
    try {
      const res = await api.get('/leaves/my-chain');
      setChain(res.data);
    } catch (err) {
      console.error('Error fetching chain:', err);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get('/leaves/types');
      setLeaveTypes(res.data);
      if (res.data.length > 0 && !leaveType) {
        setLeaveType(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leaves', {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason
      });
      setToast({ message: 'ส่งคำขอลาสำเร็จ', type: 'success' });
      setShowForm(false);
      setLeaveType('sick');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaves();
      fetchBalance();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await api.delete(`/leaves/${id}`);
      setToast({ message: 'ยกเลิกคำขอลาสำเร็จ', type: 'success' });
      fetchLeaves();
      fetchBalance();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.startsWith('pending')) return <span className="badge badge-warning">รออนุมัติ</span>;
    switch (status) {
      case 'approved': return <span className="badge badge-success">อนุมัติแล้ว</span>;
      case 'rejected': return <span className="badge badge-danger">ไม่อนุมัติ</span>;
      default: return <span className="badge badge-info">{status}</span>;
    }
  };

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} color="#10B981" />;
      case 'rejected': return <XCircle size={16} color="#EF4444" />;
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'waiting': return <Clock size={16} color="#9CA3AF" />;
      case 'skipped': return <X size={16} color="#9CA3AF" />;
      default: return <Clock size={16} color="#9CA3AF" />;
    }
  };

  const getApprovalStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'rejected': return 'ปฏิเสธ';
      case 'pending': return 'รอดำเนินการ';
      case 'waiting': return 'รอลำดับก่อนหน้า';
      case 'skipped': return 'ข้าม';
      default: return status;
    }
  };

  const leaveTypeNames: Record<string, string> = Object.fromEntries(
    leaveTypes.map(t => [t.id, t.name])
  );

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <h1><Calendar size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />ลางาน</h1>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {/* Leave Balance */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>สิทธิ์การลาคงเหลือ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {balance.map((item) => (
              <div key={item.id} style={{ padding: '10px', background: 'var(--gray-50)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.name}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>
                  {item.remaining_days}/{item.max_days}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Chain Info */}
        {chain.length > 0 && (
          <div className="card" style={{ padding: '14px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: 'var(--gray-600)' }}>
              🔗 ลำดับการอนุมัติของคุณ
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {chain.map((step, idx) => (
                <React.Fragment key={step.level}>
                  <div style={{ 
                    padding: '6px 10px', background: 'var(--primary-light)', 
                    borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500' 
                  }}>
                    {step.level}. {step.approver_name} ({step.role === 'manager' ? 'หัวหน้า' : 'Admin'})
                  </div>
                  {idx < chain.length - 1 && <span style={{ color: 'var(--gray-400)' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* New Leave Button */}
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: '16px' }}>
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'ยกเลิก' : 'ขอลางาน'}
        </button>

        {/* Leave Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>แบบฟอร์มขอลา</h3>
            
            <div className="input-group">
              <label htmlFor="leaveType">ประเภทการลา</label>
              <select id="leaveType" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="startDate">วันที่เริ่มลา</label>
              <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>

            <div className="input-group">
              <label htmlFor="endDate">วันที่สิ้นสุด</label>
              <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>

            <div className="input-group">
              <label htmlFor="reason">เหตุผล</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผลการลา..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'กำลังส่ง...' : 'ส่งคำขอลา'}
            </button>
          </form>
        )}

        {/* Leave History */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>ประวัติการลา</h3>
          <ExportButtons 
            onExport={(format) => {
              if (leaves.length === 0) {
                setToast({ message: 'ไม่มีข้อมูลให้ export', type: 'error' });
                return;
              }
              exportLeaves(leaves, format);
              setToast({ message: `Export ${format.toUpperCase()} สำเร็จ`, type: 'success' });
            }} 
            disabled={leaves.length === 0} 
          />
        </div>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>กำลังโหลด...</div>
        ) : leaves.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>ยังไม่มีประวัติการลา</div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                  {leaveTypeNames[leave.leave_type] || leave.leave_type}
                </span>
                {getStatusBadge(leave.status)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '4px' }}>
                📅 {new Date(leave.start_date).toLocaleDateString('th-TH')} - {new Date(leave.end_date).toLocaleDateString('th-TH')}
              </div>
              {leave.reason && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  💬 {leave.reason}
                </div>
              )}

              {/* Approval Progress */}
              {leave.approvals && leave.approvals.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedLeave(expandedLeave === leave.id ? null : leave.id)}
                    style={{ 
                      background: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.8rem', color: 'var(--primary)', padding: '4px 0', fontWeight: '500'
                    }}
                  >
                    {expandedLeave === leave.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    ดูลำดับการอนุมัติ ({leave.approvals.filter(a => a.status === 'approved').length}/{leave.approvals.length})
                  </button>

                  {expandedLeave === leave.id && (
                    <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '3px solid var(--gray-200)' }}>
                      {leave.approvals.map((approval) => (
                        <div key={approval.id} style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px', 
                          padding: '8px 0', borderBottom: '1px solid var(--gray-100)'
                        }}>
                          {getApprovalIcon(approval.status)}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                              ลำดับ {approval.level}: {approval.approver_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                              {approval.approver_position || approval.approver_role} • {getApprovalStatusText(approval.status)}
                            </div>
                            {approval.comment && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                                💬 {approval.comment}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cancel button */}
              {leave.status.startsWith('pending') && (
                <button
                  onClick={() => handleCancel(leave.id)}
                  style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--danger)', background: 'none', padding: '4px 0' }}
                >
                  ยกเลิกคำขอ
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
