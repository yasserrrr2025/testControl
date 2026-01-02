
import React, { useState, useMemo } from 'react';
import { Supervision, User, Student, DeliveryLog, SystemConfig, CommitteeReport } from '../../types';
import OfficialHeader from '../../components/OfficialHeader';
import { Printer, Calendar, BookOpen, FileSpreadsheet, Search, History, FileText, AlertCircle, Lightbulb, MessageSquare } from 'lucide-react';

interface Props {
  supervisions?: Supervision[];
  users?: User[];
  students?: Student[];
  deliveryLogs?: DeliveryLog[];
  systemConfig: SystemConfig;
  committeeReports?: CommitteeReport[];
}

const AdminDailyReports: React.FC<Props> = ({ 
  supervisions = [], 
  users = [], 
  students = [], 
  deliveryLogs = [], 
  systemConfig, 
  committeeReports = [] 
}) => {
  const [reportDate, setReportDate] = useState(systemConfig.active_exam_date || new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'LOGS' | 'DETAILED_REPORTS'>('LOGS');

  const reportData = useMemo(() => {
    const committees = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a, b) => Number(a) - Number(b)) as string[];

    return committees.map(num => {
      const sv = supervisions.find(s => s.committee_number === num && s.date && s.date.startsWith(reportDate));
      const proctor = users.find(u => u.id === sv?.teacher_id);
      
      const closeLog = deliveryLogs.find(l => 
        l.committee_number === num && 
        l.time && l.time.startsWith(reportDate) && 
        l.type === 'RECEIVE' && 
        l.status === 'PENDING'
      );

      const receiptLog = deliveryLogs.find(l => 
        l.committee_number === num && 
        l.time && l.time.startsWith(reportDate) && 
        l.status === 'CONFIRMED'
      );

      const detailedReport = committeeReports.find(r => r.committee_number === num && r.date === reportDate);

      const formatTime = (isoStr?: string) => {
        if (!isoStr) return '---';
        try {
          return new Date(isoStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch(e) { return '---'; }
      };

      return {
        committee: num,
        proctorName: proctor?.full_name || '................',
        joinTime: formatTime(sv?.date),
        closeTime: formatTime(closeLog?.time),
        receiverName: receiptLog?.teacher_name || '................',
        receiptTime: formatTime(receiptLog?.time),
        detailed: detailedReport
      };
    }).filter(row => row.committee.includes(searchTerm) || row.proctorName.includes(searchTerm));
  }, [students, supervisions, users, deliveryLogs, reportDate, searchTerm, committeeReports]);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-32">
      <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[10px] border-blue-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 space-y-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-6">
                 <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><FileSpreadsheet size={32} /></div>
                 <h3 className="text-3xl font-black">تقارير الأداء اليومي</h3>
              </div>
              <div className="bg-white/10 p-1 rounded-2xl flex gap-1 border border-white/5">
                 <button onClick={() => setViewMode('LOGS')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'LOGS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>السجل الزمني</button>
                 <button onClick={() => setViewMode('DETAILED_REPORTS')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'DETAILED_REPORTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>الملاحظات</button>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="date" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500" value={reportDate} onChange={e => setReportDate(e.target.value)} />
              <input type="text" placeholder="اسم المادة..." className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500" value={subject} onChange={e => setSubject(e.target.value)} />
              <input type="text" placeholder="بحث..." className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
           <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-5">
             <Printer size={32} /> طباعة التقرير (A4)
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden no-print">
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[800px]">
               <thead className="bg-slate-100 border-b text-[10px] font-black text-slate-500 uppercase">
                 <tr>
                   <th className="p-6">اللجنة</th>
                   <th className="p-6">المراقب</th>
                   <th className="p-6 text-center">دخول</th>
                   <th className="p-6 text-center">إغلاق</th>
                   <th className="p-6 text-center">وقت الاستلام</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40">
                       <td className="p-6 font-black text-slate-900">لجنة {row.committee}</td>
                       <td className="p-6">{row.proctorName}</td>
                       <td className="p-6 text-center tabular-nums text-blue-600">{row.joinTime}</td>
                       <td className="p-6 text-center tabular-nums text-amber-600">{row.closeTime}</td>
                       <td className="p-6 text-center tabular-nums text-emerald-600">{row.receiptTime}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default AdminDailyReports;
