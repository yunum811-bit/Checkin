import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

/**
 * Export data as CSV file
 */
export function exportCSV(data: Record<string, any>[], headers: Record<string, string>, options: ExportOptions) {
  if (data.length === 0) return;

  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  // BOM for Thai character support in Excel
  const BOM = '\uFEFF';
  
  const csvRows = [
    headerValues.join(','),
    ...data.map(row => 
      headerKeys.map(key => {
        const value = row[key] ?? '';
        // Escape commas and quotes
        const str = String(value).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    )
  ];

  const csvContent = BOM + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${options.filename}.csv`);
}

/**
 * Export data as XLSX file
 */
export function exportXLSX(data: Record<string, any>[], headers: Record<string, string>, options: ExportOptions) {
  if (data.length === 0) return;

  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  // Transform data to use Thai headers
  const exportData = data.map(row => {
    const newRow: Record<string, any> = {};
    headerKeys.forEach((key, idx) => {
      newRow[headerValues[idx]] = row[key] ?? '';
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Auto-width columns
  const colWidths = headerValues.map((header, idx) => {
    const key = headerKeys[idx];
    const maxDataLen = Math.max(
      header.length * 2, // Thai chars are wider
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxDataLen + 2, 10), 30) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${options.filename}.xlsx`);
}

/**
 * Export attendance data
 */
export function exportAttendance(records: any[], format: 'csv' | 'xlsx', monthYear: string) {
  const headers: Record<string, string> = {
    date: 'วันที่',
    check_in_time: 'เวลาเข้า',
    check_out_time: 'เวลาออก',
    status: 'สถานะ',
    note: 'หมายเหตุ'
  };

  const formattedData = records.map(r => ({
    ...r,
    date: new Date(r.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    status: r.status === 'present' ? 'ตรงเวลา' : r.status === 'late' ? 'มาสาย' : r.status,
    check_in_time: r.check_in_time || '-',
    check_out_time: r.check_out_time || '-',
    note: r.note || '-'
  }));

  const filename = `attendance_${monthYear}`;
  if (format === 'csv') {
    exportCSV(formattedData, headers, { filename });
  } else {
    exportXLSX(formattedData, headers, { filename, sheetName: 'ประวัติเข้างาน' });
  }
}

/**
 * Export attendance data for all employees (admin)
 */
export function exportAllAttendance(records: any[], format: 'csv' | 'xlsx', dateStr: string) {
  const headers: Record<string, string> = {
    employee_id: 'รหัสพนักงาน',
    name: 'ชื่อ-นามสกุล',
    department: 'แผนก',
    date: 'วันที่',
    check_in_time: 'เวลาเข้า',
    check_out_time: 'เวลาออก',
    status: 'สถานะ',
    note: 'หมายเหตุ'
  };

  const formattedData = records.map(r => ({
    ...r,
    date: new Date(r.date).toLocaleDateString('th-TH'),
    status: r.status === 'present' ? 'ตรงเวลา' : r.status === 'late' ? 'มาสาย' : r.status,
    check_in_time: r.check_in_time || '-',
    check_out_time: r.check_out_time || '-',
    note: r.note || '-'
  }));

  const filename = `all_attendance_${dateStr}`;
  if (format === 'csv') {
    exportCSV(formattedData, headers, { filename });
  } else {
    exportXLSX(formattedData, headers, { filename, sheetName: 'รายงานเข้างาน' });
  }
}

/**
 * Export leave data
 */
export function exportLeaves(records: any[], format: 'csv' | 'xlsx') {
  const leaveTypeNames: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน', maternity: 'ลาคลอด', other: 'อื่นๆ'
  };

  const statusNames: Record<string, string> = {
    approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', pending: 'รออนุมัติ'
  };

  const headers: Record<string, string> = {
    leave_type: 'ประเภทการลา',
    start_date: 'วันที่เริ่ม',
    end_date: 'วันที่สิ้นสุด',
    days: 'จำนวนวัน',
    reason: 'เหตุผล',
    status: 'สถานะ'
  };

  const formattedData = records.map(r => {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      leave_type: leaveTypeNames[r.leave_type] || r.leave_type,
      start_date: start.toLocaleDateString('th-TH'),
      end_date: end.toLocaleDateString('th-TH'),
      days,
      reason: r.reason || '-',
      status: r.status?.startsWith('pending') ? 'รออนุมัติ' : (statusNames[r.status] || r.status)
    };
  });

  const filename = `leaves_${new Date().toISOString().split('T')[0]}`;
  if (format === 'csv') {
    exportCSV(formattedData, headers, { filename });
  } else {
    exportXLSX(formattedData, headers, { filename, sheetName: 'ประวัติการลา' });
  }
}

/**
 * Export all leaves (admin view)
 */
export function exportAllLeaves(records: any[], format: 'csv' | 'xlsx') {
  const leaveTypeNames: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน', maternity: 'ลาคลอด', other: 'อื่นๆ'
  };

  const headers: Record<string, string> = {
    employee_id: 'รหัสพนักงาน',
    name: 'ชื่อ-นามสกุล',
    department: 'แผนก',
    leave_type: 'ประเภทการลา',
    start_date: 'วันที่เริ่ม',
    end_date: 'วันที่สิ้นสุด',
    days: 'จำนวนวัน',
    reason: 'เหตุผล',
    status: 'สถานะ',
    approval_status: 'สถานะการอนุมัติ'
  };

  const formattedData = records.map(r => {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const approvalStatus = r.approvals?.map((a: any) => 
      `${a.approver_name}(${a.status === 'approved' ? 'อนุมัติ' : a.status === 'rejected' ? 'ปฏิเสธ' : 'รอ'})`
    ).join(' → ') || '-';

    return {
      employee_id: r.employee_id || '',
      name: r.name || '',
      department: r.department || '',
      leave_type: leaveTypeNames[r.leave_type] || r.leave_type,
      start_date: start.toLocaleDateString('th-TH'),
      end_date: end.toLocaleDateString('th-TH'),
      days,
      reason: r.reason || '-',
      status: r.status?.startsWith('pending') ? 'รออนุมัติ' : (r.status === 'approved' ? 'อนุมัติ' : r.status === 'rejected' ? 'ไม่อนุมัติ' : r.status),
      approval_status: approvalStatus
    };
  });

  const filename = `all_leaves_${new Date().toISOString().split('T')[0]}`;
  if (format === 'csv') {
    exportCSV(formattedData, headers, { filename });
  } else {
    exportXLSX(formattedData, headers, { filename, sheetName: 'รายงานการลา' });
  }
}
