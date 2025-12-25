
import React, { useState, useMemo } from 'react';
import { Absence, Student } from '../../types';
import { Printer, FileText, Calendar, ListChecks, History, Clock, Loader2 } from 'lucide-react';
import OfficialHeader from '../../components/OfficialHeader';

interface Props {
  absences: Absence[];
  students: Student[];
}

const AdminOfficialForms: React.FC<Props> = ({ absences, students }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<Absence[]>([]);
  const [printTitle, setPrintTitle] = useState('');

  const dailyAbsences = useMemo(() => {
    return absences.filter(a => a.date.startsWith(selectedDate));
  }, [absences, selectedDate]);

  const allAbsences = useMemo(() => absences.filter(a => a.type === 'ABSENT').sort((a,b) => b.date.localeCompare(a.date)), [absences]);
  const allDelays = useMemo(() => absences.filter(a => a.type === 'LATE').sort((a,b) => b.date.localeCompare(a.date)), [absences]);

  const triggerPrint = (queue: Absence[], title: string = '') => {
    setPrintQueue(queue);
    setPrintTitle(title);
    setIsPrinting(true);
    // الانتظار قليلاً لضمان رندر العناصر قبل طلب الطباعة
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 1000);
  };

  const AbsenceForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="print-page bg-white p-12 text-slate-900 border-[3px] border-slate-900 m-0 relative">
        <OfficialHeader />
        <div className="text-center mb-8">
          <p className="text-[10px] font-black text-blue-600 mb-1">نموذج رقم: 36 (رسمي)</p>
          <h2 className="text-3xl font-black mb-2 border-b-2 border-slate-900 inline-block px-10">محضر غياب طالب عن الاختبار</h2>
        </div>

        <div className="w-full border-2 border-slate-900 mb-8 text-[13px] leading-loose">
           <div className="grid grid-cols-2 border-b-2 border-slate-900">
              <div className="p-3 border-l-2 border-slate-900 flex justify-between"><span className="font-bold">اسم الطالب:</span><span className="font-black text-lg">{absence.student_name}</span></div>
              <div className="p-3 flex justify-between"><span className="font-bold">رقم الجلوس:</span><span className="font-black text-lg">{student?.seating_number || '............'}</span></div>
           </div>
           <div className="grid grid-cols-2 border-b-2 border-slate-900">
              <div className="p-3 border-l-2 border-slate-900 flex justify-between"><span className="font-bold">اليوم:</span><span className="font-black">........................</span></div>
              <div className="p-3 flex justify-between"><span className="font-bold">التاريخ:</span><span className="font-black tabular-nums">{new Date(absence.date).toLocaleDateString('ar-SA')}</span></div>
           </div>
           <div className="grid grid-cols-3">
              <div className="p-3 border-l-2 border-slate-900 flex justify-between"><span className="font-bold">اللجنة:</span><span className="font-black text-xl">{absence.committee_number}</span></div>
              <div className="p-3 border-l-2 border-slate-900 flex justify-between"><span className="font-bold">الصف:</span><span className="font-black">{student?.grade || '.........'}</span></div>
              <div className="p-3 flex justify-between"><span className="font-bold">الفصل:</span><span className="font-black">{student?.section || '.........'}</span></div>
           </div>
        </div>

        <div className="mb-10">
          <div className="bg-slate-100 p-3 border-2 border-slate-900 text-center font-black text-sm uppercase tracking-widest">مصادقة لجنة الإشراف والملاحظة</div>
          <table className="w-full border-x-2 border-b-2 border-slate-900 text-[12px] text-center border-collapse">
            <thead className="bg-slate-50 font-bold">
              <tr>
                <th className="border border-slate-900 p-2 w-10">م</th>
                <th className="border border-slate-900 p-2">الاسم</th>
                <th className="border border-slate-900 p-2 w-40">الصفة</th>
                <th className="border border-slate-900 p-2 w-40">التوقيع</th>
              </tr>
            </thead>
            <tbody>
              {['رئيس الكنترول', 'عضو الكنترول', 'ملاحظ اللجنة'].map((role, i) => (
                <tr key={i} className="h-14">
                  <td className="border border-slate-900 p-2 font-bold">{i+1}</td>
                  <td className="border border-slate-900 p-2">........................................</td>
                  <td className="border border-slate-900 p-2 font-black">{role}</td>
                  <td className="border border-slate-900 p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-start mt-16 px-10">
           <div className="text-center">
              <p className="text-xl font-black mb-16 underline underline-offset-8">مدير المدرسة / رئيس اللجنة</p>
              <p className="text-lg font-bold italic text-slate-400">الختم الرسمي</p>
           </div>
        </div>
      </div>
    );
  };

  const DelayForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="print-page bg-white p-12 text-slate-900 border-[3px] border-slate-900 m-0">
        <OfficialHeader />
        <div className="text-center mb-8">
          <p className="text-[10px] font-black text-blue-600 mb-1">نموذج رقم: 31 (رسمي)</p>
          <h2 className="text-2xl font-black mb-2 border-b-2 border-slate-900 inline-block px-8">تعهد تأخر طالب عن الاختبار</h2>
        </div>
        <div className="p-8 border-2 border-slate-900 bg-slate-50 italic leading-relaxed text-lg mb-10">
           <p className="mb-6">أتعهد أنا الطالب / <span className="font-black not-italic text-2xl px-2">{absence.student_name}</span></p>
           <p className="mb-6">المقيد في الصف: <span className="font-bold">{student?.grade}</span> - فصل: <span className="font-bold">{student?.section}</span></p>
           <p>بالالتزام بالحضور المبكر وعدم تكرار التأخر، وفي حالة التكرار يتم تطبيق الأنظمة واللوائح المنظمة لذلك.</p>
           <div className="flex justify-end mt-8">
              <p className="font-black border-t border-slate-900 pt-2 min-w-[200px] text-center">توقيع الطالب</p>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-10 mt-20">
           <div className="text-center space-y-10">
              <p className="font-black text-lg underline">ملاحظ اللجنة</p>
              <p className="font-bold">...........................</p>
           </div>
           <div className="text-center space-y-10">
              <p className="font-black text-lg underline">مدير المدرسة</p>
              <p className="font-bold">...........................</p>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24 no-print">
      {isPrinting && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
           <Loader2 size={64} className="animate-spin text-blue-400 mb-6" />
           <h3 className="text-3xl font-black">جاري تحضير النماذج للطباعة...</h3>
           <p className="text-slate-400 font-bold mt-2 italic">ستظهر نافذة الطباعة تلقائياً فور جاهزية الملف</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-blue-600 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">مركز استخراج النماذج الرسمية</h2>
          <p className="text-slate-400 font-bold mt-1 italic">استخراج نماذج 36 و 31 المعتمدة من الوزارة</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="date" className="pr-10 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm shadow-sm outline-none focus:border-blue-600" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <button 
            disabled={dailyAbsences.length === 0} 
            onClick={() => triggerPrint(dailyAbsences, `محاضر يوم ${selectedDate}`)} 
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Printer size={20} /> طباعة جميع محاضر اليوم ({dailyAbsences.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {[
           { title: 'سجل الغياب التراكمي', list: allAbsences, type: 'ABSENT', color: 'border-red-600', icon: History, btnColor: 'hover:bg-red-600' },
           { title: 'سجل التأخر التراكمي', list: allDelays, type: 'LATE', color: 'border-amber-600', icon: Clock, btnColor: 'hover:bg-amber-600' }
         ].map((box, i) => (
           <div key={i} className={`bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[12px] ${box.color}`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex items-center justify-between">
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black flex items-center gap-4"><box.icon className="text-slate-400" /> {box.title}</h3>
                    <p className="text-xs text-slate-400 font-bold italic">كشف معتمد بكافة الحالات المسجلة بالنظام</p>
                 </div>
                 <div className="text-center bg-white/5 p-4 rounded-3xl border border-white/10 min-w-[100px]">
                    <p className="text-4xl font-black tabular-nums">{box.list.length}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">حالة</p>
                 </div>
              </div>
              <button onClick={() => triggerPrint(box.list, box.title)} className={`mt-10 w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-lg ${box.btnColor} hover:text-white transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95`}>
                 <Printer size={24}/> طباعة السجل الشامل
              </button>
           </div>
         ))}
      </div>

      <div className="space-y-6">
         <div className="flex items-center gap-4 border-b pb-5 mt-10">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><ListChecks size={24} /></div>
            <h3 className="text-2xl font-black text-slate-800">قائمة المحاضر الفردية المتاحة</h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dailyAbsences.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                 <p className="text-2xl font-black text-slate-300 italic">لا توجد بلاغات مسجلة لهذا التاريخ في النظام</p>
              </div>
            ) : (
              dailyAbsences.map(a => (
                <div key={a.id} className="bg-white p-8 rounded-[3.5rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between group hover:border-blue-600 hover:-translate-y-1 transition-all">
                   <div className="space-y-5">
                      <div className="flex justify-between items-start">
                         <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${a.type === 'ABSENT' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {a.type === 'ABSENT' ? 'نموذج 36 (غياب)' : 'نموذج 31 (تأخر)'}
                         </span>
                         <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-[10px] font-black">لجنة {a.committee_number}</div>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 leading-tight break-words">{a.student_name}</h4>
                      <p className="text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 italic">ID: {a.student_id}</p>
                   </div>
                   <button onClick={() => triggerPrint([a], `محضر ${a.student_name}`)} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95">
                      <Printer size={18}/> معاينة وطباعة المحضر
                   </button>
                </div>
              ))
            )}
         </div>
      </div>

      {/* منطقة الطباعة المخفية (Print Portal) */}
      <div className="hidden print:block print:absolute print:inset-0 print:z-[9999] print:bg-white w-full">
         <style>{`
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { background: white !important; margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .print-page { 
                page-break-after: always;
                min-height: 297mm;
                padding: 20mm;
                box-sizing: border-box;
                position: relative;
                visibility: visible !important;
                display: block !important;
              }
              .print-table { width: 100%; border-collapse: collapse; }
              .print-table th, .print-table td { border: 1.5pt solid #000; padding: 6pt; }
            }
         `}</style>
         
         {printQueue.map((item, idx) => (
           <div key={item.id} className="print-page">
              {item.type === 'ABSENT' ? <AbsenceForm absence={item} /> : <DelayForm absence={item} />}
           </div>
         ))}
      </div>
    </div>
  );
};

export default AdminOfficialForms;
