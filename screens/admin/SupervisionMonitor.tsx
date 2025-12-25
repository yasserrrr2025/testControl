
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
        <div className="relative z-10 space-y-6">
           <h3 className="text-3xl font-black flex items-center gap-4"><Printer className="text-blue-400" /> مسير المراقبة والاستلام الرسمي</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">تاريخ التقرير</label>
                 <input type="date" className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-bold outline-none" value={reportInfo.date} onChange={e => setReportInfo({...reportInfo, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">المادة الدراسية</label>
                 <input type="text" placeholder="أدخل اسم المادة..." className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-bold outline-none" value={reportInfo.subject} onChange={e => setReportInfo({...reportInfo, subject: e.target.value})} />
              </div>
           </div>
           <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-4 active:scale-95">
             <Printer size={28} /> استخراج المسير للطباعة
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border overflow-hidden no-print">
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[1000px]">
               <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400">
                 <tr>
                   <th className="p-6">اللجنة</th>
                   <th className="p-6">المراقب</th>
                   <th className="p-6">الصف</th>
                   <th className="p-6 text-center">الطلاب</th>
                   <th className="p-6 text-center text-red-600">الغياب</th>
                   <th className="p-6 text-center">مستلم الكنترول</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {detailedStats.map((stat, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50/50 ${stat.isDone ? 'bg-emerald-50/20' : ''}`}>
                       <td className="p-6 font-black">لجنة {stat.committee_number}</td>
                       <td className="p-6 text-sm font-black">{stat.proctor_name}</td>
                       <td className="p-6 text-xs text-blue-600 font-black">{stat.grade}</td>
                       <td className="p-6 text-center tabular-nums">{stat.total}</td>
                       <td className="p-6 text-center tabular-nums text-red-600 font-black">{stat.absent}</td>
                       <td className="p-6 text-center font-black">{stat.receiver}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* منطقة الطباعة الرسمية - مجهزة لتكرار الترويسة والعناوين */}
      <div className="print-only w-full">
        <table className="w-full text-right border-collapse">
          {/* thead ensures repetition of the cliché and titles on every page */}
          <thead className="table-header-group">
            <tr>
              <th colSpan={10} className="border-none p-0 text-right">
                <div className="print-cliche-wrapper">
                  <OfficialHeader />
                  <div className="text-center mb-4">
                    <h2 className="text-[10pt] font-black border-b-2 border-slate-900 pb-1 inline-block px-12 uppercase tracking-tighter">مسير المراقبة واستلام المظاريف النهائي</h2>
                    <div className="flex justify-center gap-10 text-[8pt] font-bold mt-2">
                      <span>التاريخ: {reportInfo.date}</span>
                      <span>المادة الدراسية: {reportInfo.subject || '................'}</span>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
            <tr className="bg-slate-50 font-black text-[8pt]">
              <th className="border-[1pt] border-slate-900 p-2 w-8 text-center">م</th>
              <th className="border-[1pt] border-slate-900 p-2 w-10 text-center">اللجنة</th>
              <th className="border-[1pt] border-slate-900 p-2 text-right px-3">المراقب (المعلم)</th>
              <th className="border-[1pt] border-slate-900 p-2 w-28 text-center">توقيع المراقب</th>
              <th className="border-[1pt] border-slate-900 p-2 w-14 text-center">الصف</th>
              <th className="border-[1pt] border-slate-900 p-2 w-8 text-center">طلاب</th>
              <th className="border-[1pt] border-slate-900 p-2 w-8 text-center">حاضر</th>
              <th className="border-[1pt] border-slate-900 p-2 w-8 text-center">غائب</th>
              <th className="border-[1pt] border-slate-900 p-2 text-right px-3">المستلم (الكنترول)</th>
              <th className="border-[1pt] border-slate-900 p-2 w-28 text-center">توقيع المستلم</th>
            </tr>
          </thead>
          <tbody>
            {detailedStats.map((stat, i) => (
              <tr key={i} className="text-[8pt] page-break-inside-avoid">
                <td className="border-[1pt] border-slate-900 p-2 font-bold text-center tabular-nums">{i+1}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black text-[9pt] text-center tabular-nums">{stat.committee_number}</td>
                <td className="border-[1pt] border-slate-900 p-2 text-right font-black px-3 leading-tight break-words">{stat.proctor_name}</td>
                <td className="border-[1pt] border-slate-900 p-2 h-10"></td>
                <td className="border-[1pt] border-slate-900 p-2 font-bold text-center">{stat.grade}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-bold text-center tabular-nums">{stat.total}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black bg-slate-50 text-center tabular-nums">{stat.present}</td>
                <td className="border-[1pt] border-slate-900 p-2 text-red-700 font-bold text-center tabular-nums">{stat.absent}</td>
                <td className="border-[1pt] border-slate-900 p-2 text-right font-black px-3 leading-tight break-words">{stat.isDone ? stat.receiver : ''}</td>
                <td className="border-[1pt] border-slate-900 p-2 h-10"></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="table-footer-group">
            <tr>
              <td colSpan={10} className="border-none pt-8 px-10">
                <div className="grid grid-cols-2 text-[10pt] font-black">
                   <div className="text-center space-y-8">
                      <p className="underline underline-offset-4">رئيس لجنة الكنترول</p>
                      <p>.........................</p>
                   </div>
                   <div className="text-center space-y-8">
                      <p className="underline underline-offset-4">مدير المدرسة</p>
                      <p>.........................</p>
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
            margin: 0; /* Removing page margins to control it via CSS */
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            width: 100%;
          }
          /* Lift the cliché higher */
          .print-cliche-wrapper {
            margin-top: 0mm !important; 
            padding-top: 5mm !important;
          }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          tr { page-break-inside: avoid; }
          /* Ensure text alignment in thead is correct for RTL */
          thead th { text-align: right; }
        }
      `}</style>
    </div>
  );
};

export default AdminSupervisionMonitor;
