
import React, { useState, useMemo } from 'react';
import { Supervision, User, Student, Absence, DeliveryLog } from '../../types';
import OfficialHeader from '../../components/OfficialHeader';
import { Printer, CheckCircle2, UserCheck, PackageCheck, BookOpen, Users2, UserMinus, Clock, UserCheck2, PenTool } from 'lucide-react';

interface Props {
  supervisions: Supervision[];
  users: User[];
  students: Student[];
  absences: Absence[];
  deliveryLogs: DeliveryLog[];
}

const AdminSupervisionMonitor: React.FC<Props> = ({ supervisions, users, students, absences, deliveryLogs }) => {
  const [reportInfo, setReportInfo] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    subject: '' 
  });

  const detailedStats = useMemo(() => {
    const committeeNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    
    return committeeNums.flatMap(num => {
      const committeeStudents = students.filter(s => s.committee_number === num);
      const gradesInCommittee = Array.from(new Set(committeeStudents.map(s => s.grade)));
      const sv = supervisions.find(s => s.committee_number === num);
      const proctor = users.find(u => u.id === sv?.teacher_id);

      return gradesInCommittee.map(grade => {
        const gradeStudents = committeeStudents.filter(s => s.grade === grade);
        const gradeAbsences = absences.filter(a => a.committee_number === num && a.type === 'ABSENT' && gradeStudents.some(s => s.national_id === a.student_id));
        const gradeLates = absences.filter(a => a.committee_number === num && a.type === 'LATE' && gradeStudents.some(s => s.national_id === a.student_id));
        
        const delivery = deliveryLogs.find(l => l.committee_number === num && l.status === 'CONFIRMED' && (l.grade === grade || l.grade.includes(grade)));
        
        return {
          committee_number: num,
          proctor_name: proctor?.full_name || 'غير محدد',
          grade,
          total: gradeStudents.length,
          present: gradeStudents.length - gradeAbsences.length,
          absent: gradeAbsences.length,
          late: gradeLates.length,
          receiver: delivery?.teacher_name || 'بانتظار الاستلام',
          time: delivery?.time ? new Date(delivery.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}) : '---',
          isDone: !!delivery
        };
      });
    });
  }, [supervisions, users, students, absences, deliveryLogs]);

  return (
    <div className="space-y-8 animate-fade-in text-right pb-20">
      <div className="bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[8px] border-blue-600">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -ml-32 -mt-32"></div>
        <div className="relative z-10 space-y-6">
           <h3 className="text-3xl font-black flex items-center gap-4"><Printer className="text-blue-400" /> مسير المراقبة والاستلام الرسمي</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">تاريخ التقرير</label>
                 <input type="date" className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-bold outline-none focus:border-blue-400" value={reportInfo.date} onChange={e => setReportInfo({...reportInfo, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">المادة الدراسية</label>
                 <input type="text" placeholder="أدخل اسم المادة..." className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-bold outline-none focus:border-blue-400" value={reportInfo.subject} onChange={e => setReportInfo({...reportInfo, subject: e.target.value})} />
              </div>
           </div>
           <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-4">
             <Printer size={28} /> استخراج المسير الرسمي للطباعة
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border overflow-hidden no-print">
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[1200px]">
               <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                   <th className="p-6">اللجنة</th>
                   <th className="p-6">المراقب</th>
                   <th className="p-6">الصف</th>
                   <th className="p-6 text-center">الطلاب</th>
                   <th className="p-6 text-center">الحاضرون</th>
                   <th className="p-6 text-center">الغياب</th>
                   <th className="p-6 text-center">مستلم الكنترول</th>
                   <th className="p-6 text-center">الحالة</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {detailedStats.map((stat, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50/50 ${stat.isDone ? 'bg-emerald-50/20' : ''}`}>
                       <td className="p-6 font-black">لجنة {stat.committee_number}</td>
                       <td className="p-6 text-sm font-black max-w-[150px] leading-tight">{stat.proctor_name}</td>
                       <td className="p-6 text-xs text-blue-600 font-black">{stat.grade}</td>
                       <td className="p-6 text-center font-black">{stat.total}</td>
                       <td className="p-6 text-center font-black text-emerald-600 bg-emerald-50/20">{stat.present}</td>
                       <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs ${stat.absent > 0 ? 'bg-red-100 text-red-700' : 'text-slate-300'}`}>{stat.absent}</span>
                       </td>
                       <td className="p-6 text-center">
                          <span className="text-[11px] font-black">{stat.receiver}</span>
                       </td>
                       <td className="p-6 text-center">
                          {stat.isDone ? <CheckCircle2 size={18} className="text-emerald-500 mx-auto" /> : <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto"></div>}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* تصميم الطباعة الرسمي (A4) - تكرار الترويسة وبدون الكليشة الضخمة */}
      <div className="print-only w-full">
        <table className="w-full text-center border-collapse">
          <thead className="table-header-group">
            <tr>
              <th colSpan={10} className="border-none p-0">
                <OfficialHeader />
                <div className="text-center mb-4">
                  <h2 className="text-xl font-black border-b-2 border-slate-900 pb-1 inline-block px-12 uppercase tracking-tighter">مسير المراقبة واستلام المظاريف النهائي</h2>
                  <div className="flex justify-center gap-10 text-[10px] font-bold mt-2">
                    <span>تاريخ: {reportInfo.date}</span>
                    <span>المادة الدراسية: {reportInfo.subject || '..........................'}</span>
                  </div>
                </div>
              </th>
            </tr>
            <tr className="bg-slate-100 font-black text-[9px]">
              <th className="border-[1.5px] border-slate-900 p-2 w-8">م</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-10">اللجنة</th>
              <th className="border-[1.5px] border-slate-900 p-2 text-right">المراقب (المعلم)</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-28">توقيع المراقب</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-14">الصف</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-8">طلاب</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-8">حاضر</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-8">غائب</th>
              <th className="border-[1.5px] border-slate-900 p-2 text-right">المستلم (الكنترول)</th>
              <th className="border-[1.5px] border-slate-900 p-2 w-28">توقيع المستلم</th>
            </tr>
          </thead>
          <tbody>
            {detailedStats.map((stat, i) => (
              <tr key={i} className="text-[9px] page-break-inside-avoid">
                <td className="border-[1.5px] border-slate-900 p-2 font-bold">{i+1}</td>
                <td className="border-[1.5px] border-slate-900 p-2 font-black text-[11px]">{stat.committee_number}</td>
                <td className="border-[1.5px] border-slate-900 p-2 text-right font-black leading-tight max-w-[120px] break-words">{stat.proctor_name}</td>
                <td className="border-[1.5px] border-slate-900 p-2 h-10"></td>
                <td className="border-[1.5px] border-slate-900 p-2 font-bold">{stat.grade}</td>
                <td className="border-[1.5px] border-slate-900 p-2 font-bold">{stat.total}</td>
                <td className="border-[1.5px] border-slate-900 p-2 font-black bg-slate-50">{stat.present}</td>
                <td className="border-[1.5px] border-slate-900 p-2 text-red-700 font-bold">{stat.absent}</td>
                <td className="border-[1.5px] border-slate-900 p-2 text-right font-black leading-tight max-w-[120px] break-words">{stat.isDone ? stat.receiver : ''}</td>
                <td className="border-[1.5px] border-slate-900 p-2 h-10"></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="table-footer-group">
            <tr>
              <td colSpan={10} className="border-none pt-10 px-10">
                <div className="grid grid-cols-2 text-[11px] font-black">
                   <div className="text-center space-y-8">
                      <p>رئيس لجنة الكنترول والضبط</p>
                      <p>.......................................</p>
                   </div>
                   <div className="text-center space-y-8">
                      <p>مدير المدرسة / رئيس اللجنة</p>
                      <p>.......................................</p>
                   </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0.5cm; 
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default AdminSupervisionMonitor;
