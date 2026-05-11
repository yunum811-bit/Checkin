import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Fingerprint, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setCompanyLogo(res.data.logo || '');
      setCompanyName(res.data.company_name || '');
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column', 
      justifyContent: 'center', padding: '24px',
      background: 'linear-gradient(160deg, #F0FDF4 0%, #FEFCE8 40%, #F7FEE7 70%, #ECFDF5 100%)'
    }}>
      {/* Logo & Title */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        {companyLogo ? (
          <img 
            src={`/api/settings/logo/${companyLogo}`} 
            alt="Company Logo" 
            style={{ maxWidth: '160px', maxHeight: '80px', objectFit: 'contain', margin: '0 auto 20px', display: 'block' }}
          />
        ) : (
          <div style={{ 
            width: '72px', height: '72px', borderRadius: '22px', 
            background: 'linear-gradient(135deg, #16A34A 0%, #65A30D 50%, #CA8A04 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 20px',
            boxShadow: '0 12px 32px rgba(22, 163, 74, 0.3)',
            transform: 'rotate(-3deg)'
          }}>
            <Fingerprint size={34} color="white" strokeWidth={1.5} />
          </div>
        )}
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>
          {companyName || 'Check-in System'}
        </h1>
        <p style={{ color: 'var(--gray-500)', marginTop: '6px', fontSize: '0.9rem', fontWeight: '400' }}>
          ระบบเช็คอิน-เช็คเอาท์ และลางาน
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} style={{ 
        maxWidth: '380px', margin: '0 auto', width: '100%',
        background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 24px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(226, 232, 240, 0.6)'
      }}>
        {error && (
          <div style={{ 
            background: 'var(--danger-light)', color: '#991B1B', padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem',
            fontWeight: '500', border: '1px solid rgba(239, 68, 68, 0.15)'
          }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <label htmlFor="email">อีเมล</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">รหัสผ่าน</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : (
            <>เข้าสู่ระบบ <ArrowRight size={18} /></>
          )}
        </button>

        <div style={{ 
          marginTop: '24px', padding: '14px 16px', background: 'var(--gray-50)', 
          borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--gray-500)',
          border: '1px solid var(--gray-200)'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '6px', color: 'var(--gray-600)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            บัญชีทดสอบ
          </p>
          <p><strong>Admin:</strong> admin@company.com / admin123</p>
          <p><strong>MD:</strong> prasit@company.com / md123</p>
          <p><strong>Manager:</strong> wichai@company.com / manager123</p>
          <p><strong>Employee:</strong> somchai@company.com / password123</p>
        </div>
      </form>
    </div>
  );
}
