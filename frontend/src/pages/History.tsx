import React, { useState, useEffect } from 'react';
import api from '../api';
import { Clock, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import ExportButtons from '../components/ExportButtons';
import { exportAttendance } from '../utils/exportData';
import Toast from '../components/Toast';

interface AttendanceRecord {
  id: number;
  date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
  note: string;
}

export default function History() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [currentMonth, currentYear]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/history', {
        params: { month: String(currentMonth), year: String(currentYear) }
      });
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (records.length === 0) {
      setToast({ message: 'ไม่มีข้อมูลให้ export', type: 'error' });
      return;
    }
    const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    exportAttendance(records, format, monthYear);
    setToast({ message: `Export ${format.toUpperCase()} สำเร็จ`, type: 'success' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="badge badge-success">ตรงเวลา</span>;
      case 'late': return <span className="badge badge-warning">มาสาย</span>;
      case 'absent': return <span className="badge badge-danger">ขาด</span>;
      default: return <span className="badge badge-info">{status}</span>;
    }
  };

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="header">
        <h1><Clock size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />ประวัติการเข้างาน</h1>
      </div>

      <div className="container" style={{ marginTop: '20px' }}>
        {/* Month Selector + Export */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ background: 'var(--gray-100)', borderRadius: '8px', padding: '8px' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
            {monthNames[currentMonth - 1]} {currentYear + 543}
          </span>
          <button onClick={nextMonth} style={{ background: 'var(--gray-100)', borderRadius: '8px', padding: '8px' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Export Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <ExportButtons onExport={handleExport} disabled={records.length === 0} />
        </div>

        {/* Records */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
            กำลังโหลด...
          </div>
        ) : records.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
            ไม่มีข้อมูลในเดือนนี้
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                  {new Date(record.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                {getStatusBadge(record.status)}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LogIn size={14} color="var(--success)" />
                  {record.check_in_time || '--:--'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LogOut size={14} color="var(--danger)" />
                  {record.check_out_time || '--:--'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
