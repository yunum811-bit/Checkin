import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Clock, Calendar, User, ClipboardCheck, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isApprover = user?.role === 'manager' || user?.role === 'md' || user?.role === 'admin';

  const navItems = [
    { path: '/', icon: Home, label: 'หน้าหลัก' },
    { path: '/announcements', icon: Megaphone, label: 'ประกาศ' },
    { path: '/leave', icon: Calendar, label: 'ลางาน' },
    ...(isApprover ? [{ path: '/approvals', icon: ClipboardCheck, label: 'อนุมัติ' }] : []),
    { path: '/profile', icon: User, label: 'โปรไฟล์' },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="เมนูหลัก">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={isActive ? 'active' : ''}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontWeight: isActive ? '700' : '500' }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
