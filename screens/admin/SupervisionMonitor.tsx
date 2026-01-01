
import React, { useState, useMemo } from 'react';
import { Supervision, User, Student, Absence, DeliveryLog } from '../../types';
import OfficialHeader from '../../components/OfficialHeader';
import { Printer, Calendar, BookOpen, PenTool, CheckCircle2, Users, UserCheck, Clock, UserX } from 'lucide-react';

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
    // فلترة اللجان حسب تاريخ التقرير المختار (ديناميكي)
    const committeeNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    
    return committeeNums.flatMap(num => {
      const committeeStudents = students.filter(s => s.committee_number === num);
      const gradesInCommittee = Array.from(new Set(committeeStudents.map(s => s.grade)));
      // البحث عن المراقب في هذا اليوم المختار
      const sv = supervisions.find(s => s.committee_number === num);
      const proctor = users.find(u => u.id === sv?.teacher_id);

      return gradesInCommittee.map(grade => {
        const gradeStudents = committeeStudents.filter(s => s.grade === grade);
        // فلترة الغياب والتأخر حسب اليوم المختار
        const gradeAbsences = absences.filter(a => a.date.startsWith(reportInfo.date) && a.committee_number === num && a.type === 'ABSENT' && gradeStudents.some(s => s.national_id === a.student_id));
        const gradeLates = absences.filter(a => a.date.startsWith(reportInfo.date) && a.committee_number === num && a.type === 'LATE' && gradeStudents.some(s => s.national_id === a.student_id));
        
        // البحث عن سجل الاستلام النهائي (المستلم)
        const delivery = deliveryLogs.find(l => 
          l.time.startsWith(reportInfo.date) && 
          l.committee_number === num && 
          l.status === 'CONFIRMED' && 
          (l.grade === grade || l.grade.includes(grade))
        );
        
        return {
          committee_number: num,
          proctor_name: proctor?.full_name || '................',
          grade,
          total: gradeStudents.length,
          present: gradeStudents.length - gradeAbsences.length,
          absent: gradeAbsences.length,
          late: gradeLates.length,
          receiver: delivery?.teacher_name || '................', // اسم عضو الكنترول المستلم
          isDone: !!delivery
        };
      });
    });
  }, [supervisions, users, students, absences, deliveryLogs, reportInfo.date]);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-32">
      {/* Configuration Area */}
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[10px] border-blue-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 space-y-8">
           <div className="flex items-center gap-6">
              <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><Printer size={32} /></div>
              <h3 className="text-3xl font-black">إعداد مسير المراقبة والاستلام الميداني</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-3">تاريخ التقرير</label>
                 <div className="relative">
                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="date" className="w-full pr-14 p-5 bg-white/10 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500 transition-all" value={reportInfo.date} onChange={e => setReportInfo({...reportInfo, date: e.target.value})} />
                 </div>
              </div>
              <div className="space-y-3">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-3">المادة الدراسية</label>
                 <div className="relative">
                    <BookOpen className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="اكتب اسم المادة..." className="w-full pr-14 p-5 bg-white/10 border border-white/10 rounded-2xl font-black outline-none focus:border-blue-500 transition-all" value={reportInfo.subject} onChange={e => setReportInfo({...reportInfo, subject: e.target.value})} />
                 </div>
              </div>
           </div>
           <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-5 active:scale-95">
             <Printer size={32} /> استخراج المسير المعتمد (A4)
           </button>
        </div>
      </div>

      {/* Interactive Preview */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden no-print">
         <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
            <h4 className="text-xl font-black text-slate-800">بيانات المسير التفصيلية - معاينة ذكية</h4>
            <div className="flex gap-6 text-[10px] font-black uppercase">
               <span className="flex items-center gap-2 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> حاضر</span>
               <span className="flex items-center gap-2 text-red-600"><div className="w-2 h-2 rounded-full bg-red-500"></div> غائب</span>
               <span className="flex items-center gap-2 text-amber-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> متأخر</span>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[1200px]">
               <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                   <th className="p-6">م</th>
                   <th className="p-6">اللجنة</th>
                   <th className="p-6">المراقب</th>
                   <th className="p-6">الصف</th>
                   <th className="p-6 text-center">إحصاء (ح/غ/ت)</th>
                   <th className="p-6 text-center">اسم المستلم (الكنترول)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {detailedStats.map((stat, idx) => (
                    <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${stat.isDone ? 'bg-emerald-50/10' : ''}`}>
                       <td className="p-6 text-slate-300 text-xs">{idx + 1}</td>
                       <td className="p-6 font-black text-slate-900 text-lg">لجنة {stat.committee_number}</td>
                       <td className="p-6 text-sm">{stat.proctor_name}</td>
                       <td className="p-6"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] border border-blue-100">{stat.grade}</span></td>
                       <td className="p-6 text-center tabular-nums space-x-2 space-x-reverse">
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{stat.present}</span>
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md">{stat.absent}</span>
                          <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{stat.late}</span>
                       </td>
                       <td className="p-6 text-center">
                          {stat.isDone ? (
                            <span className="text-emerald-600 text-xs flex items-center justify-center gap-2 font-black">
                               <CheckCircle2 size={14}/> {stat.receiver}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs italic">بانتظار الاستلام النهائي</span>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* PROFESSIONAL PRINT VIEW */}
      <div className="print-only w-full">
        <table className="w-full text-right border-collapse">
          {/* THEAD REPEATS ON EVERY PAGE - CRITICAL */}
          <thead className="table-header-group">
            <tr>
              <th colSpan={10} className="border-none p-0 font-normal">
                <div className="print-header-wrapper mb-6">
                  <OfficialHeader />
                  <div className="text-center mt-4">
                    <h2 className="text-[12pt] font-black border-b-[2pt] border-slate-900 pb-2 inline-block px-16 uppercase tracking-tighter">مسير المراقبة ورصد حضور واستلام المظاريف</h2>
                    <div className="flex justify-center gap-14 text-[9pt] font-bold mt-4 text-slate-800">
                      <span>اليوم/التاريخ: {new Intl.DateTimeFormat('ar-SA', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(new Date(reportInfo.date))}</span>
                      <span>المادة الدراسية: <span className="font-black border-b border-slate-400 px-6">{reportInfo.subject || '................'}</span></span>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
            {/* Table Header Row */}
            <tr className="bg-slate-100 font-black text-[8.5pt]">
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-8 text-center">م</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-12 text-center">اللجنة</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 text-right px-4">اسم المعلم (المراقب)</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-18 text-center">الصف</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-10 text-center">حاضر</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-10 text-center">غائب</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-10 text-center">متأخر</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 text-right px-4">اسم المستلم (الكنترول)</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-24 text-center">توقيع المستلم</th>
              <th className="border-[1.2pt] border-slate-900 p-2.5 w-24 text-center">توقيع المراقب</th>
            </tr>
          </thead>
          
          {/* TABLE BODY */}
          <tbody className="table-row-group">
            {detailedStats.map((stat, i) => (
              <tr key={i} className="text-[9pt] page-break-inside-avoid h-[35pt]">
                <td className="border-[1pt] border-slate-900 p-2 font-bold text-center tabular-nums">{i + 1}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black text-[10pt] text-center">{stat.committee_number}</td>
                <td className="border-[1pt] border-slate-900 p-2 text-right font-black px-3 leading-tight text-[8.5pt]">{stat.proctor_name}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-bold text-center text-[8pt]">{stat.grade}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black text-center tabular-nums bg-emerald-50/20">{stat.present}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black text-center tabular-nums bg-red-50/20 text-red-700">{stat.absent}</td>
                <td className="border-[1pt] border-slate-900 p-2 font-black text-center tabular-nums bg-amber-50/20">{stat.late}</td>
                <td className="border-[1pt] border-slate-900 p-2 text-right font-black px-3 text-[8pt]">{stat.isDone ? stat.receiver : ''}</td>
                <td className="border-[1pt] border-slate-900 p-2"></td>
                <td className="border-[1pt] border-slate-900 p-2"></td>
              </tr>
            ))}
          </tbody>

          {/* TABLE FOOTER FOR SIGNATURES */}
          <tfoot className="table-footer-group">
            <tr>
              <td colSpan={10} className="border-none pt-12">
                <div className="grid grid-cols-3 text-[10pt] font-black text-center gap-10">
                   <div className="space-y-12">
                      <p className="underline underline-offset-[6pt]">رئيس الكنترول</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                   <div className="space-y-12">
                      <p className="underline underline-offset-[6pt]">مدير المدرسة</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                   <div className="space-y-12">
                      <p className="underline underline-offset-[6pt]">المشرف التربوي الزائر</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                </div>
                <div className="text-left mt-10 text-[7pt] text-slate-400 italic">
                   تم استخراج التقرير آلياً عبر نظام كنترول الاختبارات المطور | {new Date().toLocaleString('ar-SA')}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 5mm 10mm 5mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 100%; }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tfoot { display: table-footer-group !important; }
          table { width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default AdminSupervisionMonitor;
