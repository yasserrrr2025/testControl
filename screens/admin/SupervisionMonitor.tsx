
import React, { useState, useMemo } from 'react';
import { Supervision, User, Student, Absence, DeliveryLog } from '../../types';
import OfficialHeader from '../../components/OfficialHeader';
import { Printer, Calendar, BookOpen, CheckCircle2, Clock } from 'lucide-react';

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
        const gradeAbsences = absences.filter(a => a.date.startsWith(reportInfo.date) && a.committee_number === num && a.type === 'ABSENT' && gradeStudents.some(s => s.national_id === a.student_id));
        const gradeLates = absences.filter(a => a.date.startsWith(reportInfo.date) && a.committee_number === num && a.type === 'LATE' && gradeStudents.some(s => s.national_id === a.student_id));
        
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
          receiver: delivery?.teacher_name || '................',
          isDone: !!delivery
        };
      });
    });
  }, [supervisions, users, students, absences, deliveryLogs, reportInfo.date]);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-32">
      {/* واجهة التحكم بالإعدادات قبل الطباعة */}
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

      {/* المعاينة التفاعلية في المتصفح */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden no-print">
         <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
            <h4 className="text-xl font-black text-slate-800">بيانات المسير التفصيلية - معاينة ذكية</h4>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[1200px]">
               <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                   <th className="p-6 w-12">م</th>
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

      {/* الهيكل الخاص بالطباعة - مصمم للتكرار التلقائي */}
      <div className="print-only-container print-only">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 5mm 5mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-only { display: block !important; width: 100%; }
            
            /* السحر هنا: تكرار الهيدر في كل صفحة */
            .official-table { width: 100%; border-collapse: collapse; }
            .official-table thead { display: table-header-group; }
            .official-table tfoot { display: table-footer-group; }
            
            .row-item { page-break-inside: avoid; }
            .official-border { border: 1.2pt solid black !important; }
            
            /* تصغير الهيدر لتقليل الفراغ */
            .official-cliche { transform: scale(0.95); transform-origin: top center; margin-bottom: 2mm !important; }
          }
        `}</style>

        <table className="official-table">
          <thead>
            <tr>
              <th className="p-0 border-none">
                <div className="official-cliche w-full">
                  <OfficialHeader />
                  <div className="text-center">
                    <h2 className="text-[14pt] font-black border-b-[2pt] border-slate-900 pb-1 inline-block px-12 uppercase leading-none">مسير المراقبة ورصد حضور واستلام المظاريف</h2>
                    <div className="flex justify-center gap-12 text-[10pt] font-black mt-3 text-slate-900">
                      <span>اليوم/التاريخ: {new Intl.DateTimeFormat('ar-SA', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(new Date(reportInfo.date))}</span>
                      <span>المادة: <span className="border-b border-slate-900 px-6">{reportInfo.subject || '................'}</span></span>
                    </div>
                  </div>
                </div>
                
                {/* عناوين الأعمدة تكرر مع الهيدر */}
                <div className="w-full mt-4">
                   <table className="w-full border-collapse">
                      <tr className="bg-slate-50 font-black text-[9pt]">
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[30pt] text-center">م</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[45pt] text-center">اللجنة</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 text-right px-4">اسم المعلم (المراقب)</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[80pt] text-center">الصف</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[40pt] text-center">حاضر</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[40pt] text-center">غائب</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[40pt] text-center">متأخر</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 text-right px-4">المستلم (الكنترول)</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[70pt] text-center">توقيع المستلم</th>
                        <th className="border-[1.5pt] border-slate-950 p-2 w-[70pt] text-center">توقيع المراقب</th>
                      </tr>
                   </table>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            <tr>
              <td className="p-0 border-none">
                <table className="w-full border-collapse">
                  {detailedStats.map((stat, i) => (
                    <tr key={i} className="text-[9.5pt] row-item h-[34pt]">
                      <td className="border-[1pt] border-slate-950 p-2 w-[30pt] text-center tabular-nums font-bold">{i + 1}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[45pt] font-black text-[11pt] text-center tabular-nums">{stat.committee_number}</td>
                      <td className="border-[1pt] border-slate-950 p-2 text-right font-black px-3 leading-tight w-auto">{stat.proctor_name}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[80pt] text-center font-bold text-[8.5pt]">{stat.grade}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[40pt] font-black text-center tabular-nums">{stat.present}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[40pt] font-black text-center tabular-nums text-red-700">{stat.absent}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[40pt] font-black text-center tabular-nums">{stat.late}</td>
                      <td className="border-[1pt] border-slate-950 p-2 text-right px-3 text-[8.5pt] font-bold">{stat.isDone ? stat.receiver : ''}</td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[70pt]"></td>
                      <td className="border-[1pt] border-slate-950 p-2 w-[70pt]"></td>
                    </tr>
                  ))}
                </table>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td className="pt-8 border-none">
                <div className="grid grid-cols-2 text-[11pt] font-black text-center gap-20 px-20">
                   <div className="space-y-12">
                      <p className="underline underline-offset-[6pt]">رئيس الكنترول</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                   <div className="space-y-12">
                      <p className="underline underline-offset-[6pt]">مدير المدرسة</p>
                      <p className="text-slate-400">....................................</p>
                   </div>
                </div>
                <div className="text-left mt-8 text-[7pt] text-slate-300 italic px-4">
                   نظام كنترول الاختبارات المطور | استخراج: {new Date().toLocaleString('ar-SA')}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AdminSupervisionMonitor;
