import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Toast from '../components/Toast';
import CameraCapture from '../components/CameraCapture';
import { MapPin, LogIn, LogOut, TrendingUp, Zap, Camera } from 'lucide-react';

interface AttendanceRecord {
  id?: number;
  check_in_time?: string;
  check_out_time?: string;
  check_in_photo?: string;
  check_out_photo?: string;
  status?: string;
  checked_in?: boolean;
}

interface Summary {
  total_days: number;
  late_days: number;
  leave_days: number;
  on_time_days: number;
}

export default function Home() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState<'checkin' | 'checkout' | null>(null);

  useEffect(() => {
    fetchTodayStatus();
    fetchSummary();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const res = await api.get('/attendance/today');
      setTodayRecord(res.data);
    } catch (err) {
      console.error('Error fetching today status:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/attendance/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleCheckin = () => {
    setShowCamera('checkin');
  };

  const handleCheckout = () => {
    setShowCamera('checkout');
  };

  const handlePhotoCaptured = async (photoBase64: string) => {
    setShowCamera(null);
    setLoading(true);

    try {
      let location = '';
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = `${pos.coords.latitude},${pos.coords.longitude}`;
        } catch { /* Location not available */ }
      }

      if (showCamera === 'checkin') {
        const res = await api.post('/attendance/checkin', { location, photo: photoBase64 });
        setTodayRecord(res.data.record);
        setToast({ message: 'เช็คอินสำเร็จ! 🎉', type: 'success' });
      } else {
        const res = await api.post('/attendance/checkout', { location, photo: photoBase64 });
        setTodayRecord(res.data.record);
        setToast({ message: 'เช็คเอาท์สำเร็จ! 👋', type: 'success' });
      }
      fetchSummary();
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCancel = () => {
    setShowCamera(null);
  };

  const hasCheckedIn = todayRecord?.check_in_time;
  const hasCheckedOut = todayRecord?.check_out_time;

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า ☀️';
    if (hour < 17) return 'สวัสดีตอนบ่าย 🌤️';
    return 'สวัสดีตอนเย็น 🌙';
  };

  const getPhotoUrl = (filename?: string) => {
    if (!filename) return null;
    return `/api/attendance/photo/${filename}`;
  };

  return (
    <div className="page page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Camera Overlay */}
      {showCamera && (
        <CameraCapture onCapture={handlePhotoCaptured} onCancel={handleCameraCancel} />
      )}

      {/* Header */}
      <div className="header" style={{ paddingBottom: '28px' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: '400' }}>{greeting()}</p>
        <h1 style={{ fontSize: '1.4rem', marginTop: '2px' }}>{user?.name}</h1>
        <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>
          {user?.department} • {user?.employee_id}
        </p>
      </div>

      <div className="container" style={{ marginTop: '-12px' }}>
        {/* Clock Card */}
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ 
            position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
            borderRadius: '50%', background: 'var(--primary-light)', opacity: 0.5
          }} />
          <div style={{ 
            fontSize: '3rem', fontWeight: '800', 
            background: 'linear-gradient(135deg, #16A34A 0%, #65A30D 50%, #CA8A04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em', lineHeight: 1, position: 'relative'
          }}>
            {currentTime.toLocaleTimeString('th-TH', { hour12: false })}
          </div>
          <div style={{ color: 'var(--gray-500)', marginTop: '8px', fontSize: '0.85rem', fontWeight: '500', position: 'relative' }}>
            {currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Status Card */}
        <div className="card" style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--gray-800)' }}>สถานะวันนี้</h3>
            {hasCheckedIn && (
              <span className={`badge ${todayRecord?.status === 'late' ? 'badge-warning' : 'badge-success'}`}>
                {todayRecord?.status === 'late' ? 'มาสาย' : 'ตรงเวลา'}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
            <div style={{ 
              padding: '16px', background: 'var(--gray-50)', borderRadius: 'var(--radius)', 
              textAlign: 'center', border: '1px solid var(--gray-200)'
            }}>
              <LogIn size={20} color="var(--success)" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เช็คอิน</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: hasCheckedIn ? 'var(--success)' : 'var(--gray-300)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {hasCheckedIn ? todayRecord.check_in_time : '--:--'}
              </div>
              {/* Check-in photo thumbnail */}
              {todayRecord?.check_in_photo && (
                <div style={{ marginTop: '8px' }}>
                  <img 
                    src={getPhotoUrl(todayRecord.check_in_photo)!} 
                    alt="Check-in" 
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '2px solid var(--success)' }}
                  />
                </div>
              )}
            </div>
            <div style={{ 
              padding: '16px', background: 'var(--gray-50)', borderRadius: 'var(--radius)', 
              textAlign: 'center', border: '1px solid var(--gray-200)'
            }}>
              <LogOut size={20} color="var(--danger)" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เช็คเอาท์</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: hasCheckedOut ? 'var(--danger)' : 'var(--gray-300)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {hasCheckedOut ? todayRecord.check_out_time : '--:--'}
              </div>
              {/* Check-out photo thumbnail */}
              {todayRecord?.check_out_photo && (
                <div style={{ marginTop: '8px' }}>
                  <img 
                    src={getPhotoUrl(todayRecord.check_out_photo)!} 
                    alt="Check-out" 
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '2px solid var(--danger)' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!hasCheckedIn && (
            <button className="btn btn-success" onClick={handleCheckin} disabled={loading} style={{ fontSize: '1rem' }}>
              <Camera size={20} />
              {loading ? 'กำลังเช็คอิน...' : 'ถ่ายรูป & เช็คอิน'}
            </button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <button className="btn btn-danger" onClick={handleCheckout} disabled={loading} style={{ fontSize: '1rem' }}>
              <Camera size={20} />
              {loading ? 'กำลังเช็คเอาท์...' : 'ถ่ายรูป & เช็คเอาท์'}
            </button>
          )}
          {hasCheckedIn && hasCheckedOut && (
            <div style={{ 
              textAlign: 'center', padding: '14px', 
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', 
              borderRadius: 'var(--radius)', color: '#065F46', fontWeight: '700', fontSize: '0.9rem'
            }}>
              ✅ เสร็จสิ้นการทำงานวันนี้
            </div>
          )}
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="card" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '10px', 
                background: 'var(--primary-light)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <TrendingUp size={18} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>สรุปเดือนนี้</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--success-light)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#065F46', letterSpacing: '-0.03em' }}>{summary.on_time_days}</div>
                <div style={{ fontSize: '0.65rem', color: '#065F46', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase' }}>ตรงเวลา</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--warning-light)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#92400E', letterSpacing: '-0.03em' }}>{summary.late_days}</div>
                <div style={{ fontSize: '0.65rem', color: '#92400E', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase' }}>มาสาย</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--info-light)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E40AF', letterSpacing: '-0.03em' }}>{summary.leave_days}</div>
                <div style={{ fontSize: '0.65rem', color: '#1E40AF', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase' }}>ลางาน</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
