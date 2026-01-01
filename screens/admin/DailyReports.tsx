
import React, { useState, useMemo } from 'react';
import { Supervision, User, Student, DeliveryLog, SystemConfig } from '../../types';
import OfficialHeader from '../../components/OfficialHeader';
// Fix: Added History to the lucide-react import to avoid conflict with browser's global History object
import { Printer, Calendar, BookOpen, FileSpreadsheet, Search, History } from 'lucide-react';

interface Props {
  supervisions: Supervision[];
  users: User[];
  students: Student[];
  deliveryLogs: DeliveryLog[];
  systemConfig: SystemConfig;
}

const AdminDailyReports: React.FC<Props> = ({ supervisions, users, students, deliveryLogs, systemConfig }) => {
  const [reportDate, setReportDate] = useState(systemConfig.active_exam_date || new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const reportData = useMemo(() => {
    // جلب أرقام اللجان الفريدة
    const committees = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b) => Number(a) - Number(b));

    return committees.map(num => {
      // 1. بيانات التكليف (وقت الدخول)
      const sv = supervisions.find(s => s.committee_number === num && s.date.startsWith(reportDate));
      const proctor = users.find(u => u.id === sv?.teacher_id);
      
      // 2. بيانات إغلاق المراقب (تاريخ إغلاق اللجنة)
      // نأخذ أول سجل إغلاق (RECEIVE + PENDING) للجنة في هذا اليوم
      const closeLog = deliveryLogs.find(l => 
        l.committee_number === num && 
        l.time.startsWith(reportDate) && 
        l.type === 'RECEIVE' && 
        l.status === 'PENDING'
      );

      // 3. بيانات استلام الكنترول (اسم المستلم + وقت الاستلام)
      const receiptLog = deliveryLogs.find(l => 
        l.committee_number === num && 
        l.time.startsWith(reportDate) && 
        l.status === 'CONFIRMED'
      );

      const formatTime = (isoStr?: string) => {
        if (!isoStr) return '---';
        return new Date(isoStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      };

      return {
        committee: num,
        proctorName: proctor?.full_name || '................',
        joinTime: formatTime(sv?.date),
        closeTime: formatTime(closeLog?.time),
        receiverName: receiptLog?.teacher_name || '................',
        receiptTime: formatTime(receiptLog?.time)
      };
    }).filter(row => row.committee.includes(searchTerm) || row.proctorName.includes(searchTerm));
  }, [students, supervisions, users, deliveryLogs, reportDate, searchTerm]);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-32">
      {/* واجهة الإعدادات */}
      <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[10px] border-blue-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 space-y-8">
           <div className="flex items-center gap-6">
              <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><FileSpreadsheet size={32} /></div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">مسير تقارير الأداء اليومي</h3>
                <p className="text-slate-400 text-sm font-bold italic mt-1">سجل التتبع الزمني المتكامل للجان الاختبارات</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-3">تاريخ التقرير</label>
                 <div className="relative">
                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" className="w-full pr-12 p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500 transition-all" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-3">المادة الدراسية</label>
                 <div className="relative">
                    <BookOpen className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="اسم المادة..." className="w-full pr-12 p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-600" value={subject} onChange={e => setSubject(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-3">بحث سريع</label>
                 <div className="relative">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="اللجنة أو المراقب..." className="w-full pr-12 p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>
              </div>
           </div>

           <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-5 active:scale-95">
             <Printer size={32} /> استخراج مسير التدقيق الزمني (A4)
           </button>
        </div>
      </div>

      {/* المعاينة في المتصفح */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden no-print">
         <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
            <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <History className="text-blue-600" /> سجل الضبط والتحقق الميداني
            </h4>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[1000px]">
               <thead className="bg-slate-100 border-b text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 <tr>
                   <th className="p-6">اللجنة</th>
                   <th className="p-6">المراقب</th>
                   <th className="p-6 text-center">دخول اللجنة</th>
                   <th className="p-6 text-center">إغلاق اللجنة</th>
                   <th className="p-6 text-center">المستلم</th>
                   <th className="p-6 text-center">وقت الاستلام</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                       <td className="p-6 font-black text-slate-900">لجنة {row.committee}</td>
                       <td className="p-6 text-sm">{row.proctorName}</td>
                       <td className="p-6 text-center tabular-nums text-blue-600">{row.joinTime}</td>
                       <td className="p-6 text-center tabular-nums text-amber-600">{row.closeTime}</td>
                       <td className="p-6 text-center text-xs">{row.receiverName}</td>
                       <td className="p-6 text-center tabular-nums text-emerald-600">{row.receiptTime}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* نسخة الطباعة */}
      <div className="print-only">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 3mm 3mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .print-table thead { display: table-header-group; }
            .cell-border { border: 1pt solid black !important; padding: 4pt 2pt; font-size: 7.5pt; text-align: center; word-wrap: break-word; }
            .font-heavy { font-weight: 900; }
          }
        `}</style>

        <table className="print-table">
          <thead>
            <tr>
              <th colSpan={6} className="p-0 font-normal border-none text-right">
                <div className="w-full">
                  <OfficialHeader />
                  <div className="text-center mt-3 mb-4">
                    <h2 className="text-[12pt] font-black border-b-[2pt] border-black pb-1 inline-block px-12 leading-none uppercase">مسير رصد وضبط الأداء الزمني واللوجستي للجان</h2>
                    <div className="flex justify-center gap-12 text-[9pt] font-black mt-3 text-black">
                      <span>اليوم: {new Intl.DateTimeFormat('ar-SA', {weekday:'long'}).format(new Date(reportDate))}</span>
                      <span>التاريخ: {new Date(reportDate).toLocaleDateString('ar-SA')}</span>
                      <span>المادة: <span className="border-b border-black px-8">{subject || '................'}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="w-full flex">
                  <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <tr className="bg-slate-50 font-black text-[7.5pt]">
                      <th className="cell-border" style={{ width: '15mm' }}>اللجنة</th>
                      <th className="cell-border" style={{ width: '45mm' }}>اسم المراقب</th>
                      <th className="cell-border" style={{ width: '25mm' }}>دخول اللجنة</th>
                      <th className="cell-border" style={{ width: '25mm' }}>إغلاق اللجنة</th>
                      <th className="cell-border" style={{ width: '40mm' }}>مستلم الكنترول</th>
                      <th className="cell-border" style={{ width: '25mm' }}>وقت الاستلام</th>
                    </tr>
                  </table>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            <tr>
              <td colSpan={6} className="p-0 border-none">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  {reportData.map((row, i) => (
                    <tr key={i} className="h-[28pt]">
                      <td className="cell-border font-black tabular-nums" style={{ width: '15mm' }}>{row.committee}</td>
                      <td className="cell-border font-bold text-right px-2" style={{ width: '45mm' }}>{row.proctorName}</td>
                      <td className="cell-border tabular-nums" style={{ width: '25mm' }}>{row.joinTime}</td>
                      <td className="cell-border tabular-nums" style={{ width: '25mm' }}>{row.closeTime}</td>
                      <td className="cell-border font-bold text-right px-2" style={{ width: '40mm' }}>{row.receiverName}</td>
                      <td className="cell-border tabular-nums" style={{ width: '25mm' }}>{row.receiptTime}</td>
                    </tr>
                  ))}
                </table>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={6} className="pt-10 border-none">
                <div className="grid grid-cols-2 text-[10pt] font-black text-center gap-24 px-20">
                   <div className="space-y-10">
                      <p className="underline underline-offset-[4pt]">رئيس الكنترول</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                   <div className="space-y-10">
                      <p className="underline underline-offset-[4pt]">مدير المدرسة</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                </div>
                <div className="text-left mt-8 text-[6pt] text-slate-300 italic px-4 border-t pt-1">
                   نظام كنترول الاختبارات المطور | استخراج التقرير الزمني | {new Date().toLocaleString('ar-SA')}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AdminDailyReports;
