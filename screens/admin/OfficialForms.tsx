
import React, { useState, useMemo } from 'react';
import { Absence, Student } from '../../types';
// Added missing Info icon import
import { Printer, FileText, Calendar, ListChecks, History, Clock, Loader2, AlertTriangle, FileCheck, Info } from 'lucide-react';
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
    if (queue.length === 0) return;
    setPrintQueue(queue);
    setPrintTitle(title);
    setIsPrinting(true);
    
    // مهلة زمنية كافية للمتصفح لرسم العناصر قبل فتح نافذة الطباعة
    setTimeout(() => {
      window.print();
      // لا نغلق الحالة فوراً بل ننتظر قليلاً لضمان اكتمال العملية
      setTimeout(() => setIsPrinting(false), 500);
    }, 1200);
  };

  const AbsenceForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="print-content-item bg-white p-[15mm] text-slate-900 border-[2pt] border-slate-900 relative min-h-[280mm] flex flex-col">
        <OfficialHeader />
        
        <div className="text-center mb-10">
          <p className="text-[10px] font-black text-slate-500 mb-1">النموذج الموحد رقم: 36</p>
          <h2 className="text-3xl font-black mb-2 border-b-4 border-double border-slate-900 inline-block px-12">محضر إثبات غياب طالب</h2>
        </div>

        <div className="w-full border-[1.5pt] border-slate-900 mb-10 text-[14px]">
           <div className="grid grid-cols-2 border-b-[1.5pt] border-slate-900">
              <div className="p-4 border-l-[1.5pt] border-slate-900 flex justify-between items-center bg-slate-50/50">
                 <span className="font-bold">اسم الطالب:</span>
                 <span className="font-black text-xl">{absence.student_name}</span>
              </div>
              <div className="p-4 flex justify-between items-center">
                 <span className="font-bold">رقم الجلوس:</span>
                 <span className="font-black text-xl">{student?.seating_number || '............'}</span>
              </div>
           </div>
           <div className="grid grid-cols-2 border-b-[1.5pt] border-slate-900">
              <div className="p-4 border-l-[1.5pt] border-slate-900 flex justify-between items-center">
                 <span className="font-bold">اليوم:</span>
                 <span className="font-black">........................</span>
              </div>
              <div className="p-4 flex justify-between items-center bg-slate-50/50">
                 <span className="font-bold">التاريخ:</span>
                 <span className="font-black tabular-nums">{new Date(absence.date).toLocaleDateString('ar-SA')}</span>
              </div>
           </div>
           <div className="grid grid-cols-3">
              <div className="p-4 border-l-[1.5pt] border-slate-900 flex justify-between items-center bg-slate-50/50">
                 <span className="font-bold">اللجنة:</span>
                 <span className="font-black text-2xl">{absence.committee_number}</span>
              </div>
              <div className="p-4 border-l-[1.5pt] border-slate-900 flex justify-between items-center">
                 <span className="font-bold">الصف:</span>
                 <span className="font-black">{student?.grade || '.........'}</span>
              </div>
              <div className="p-4 flex justify-between items-center bg-slate-50/50">
                 <span className="font-bold">الفصل:</span>
                 <span className="font-black">{student?.section || '.........'}</span>
              </div>
           </div>
        </div>

        <div className="mb-12">
          <div className="bg-slate-200 p-3 border-[1.5pt] border-slate-900 text-center font-black text-sm uppercase tracking-widest">مصادقة ومطابقة اللجنة</div>
          <table className="w-full border-x-[1.5pt] border-b-[1.5pt] border-slate-900 text-[12px] text-center border-collapse">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-slate-900 p-3 w-12">م</th>
                <th className="border border-slate-900 p-3 text-right">الاسم الرباعي</th>
                <th className="border border-slate-900 p-3 w-48">الصفة</th>
                <th className="border border-slate-900 p-3 w-48">التوقيع</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: '................................................', role: 'رئيس لجنة الكنترول' },
                { name: '................................................', role: 'عضو لجنة الكنترول' },
                { name: '................................................', role: 'مراقب اللجنة المعني' }
              ].map((row, i) => (
                <tr key={i} className="h-16">
                  <td className="border border-slate-900 p-3 font-bold">{i+1}</td>
                  <td className="border border-slate-900 p-3 text-right">{row.name}</td>
                  <td className="border border-slate-900 p-3 font-black bg-slate-50/30">{row.role}</td>
                  <td className="border border-slate-900 p-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-20 px-10 pb-10">
           <div className="text-center space-y-20">
              <p className="text-lg font-black underline underline-offset-8">يعتمد / مدير المدرسة</p>
              <div className="space-y-2">
                <p className="font-bold">..............................................</p>
                <p className="text-slate-400 italic text-xs">الختم الرسمي للمدرسة</p>
              </div>
           </div>
           <div className="text-center space-y-20">
              <p className="text-lg font-black underline underline-offset-8">الموجه الطلابي</p>
              <p className="font-bold">..............................................</p>
           </div>
        </div>
      </div>
    );
  };

  const DelayForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="print-content-item bg-white p-[15mm] text-slate-900 border-[2pt] border-slate-900 min-h-[280mm]">
        <OfficialHeader />
        <div className="text-center mb-10">
          <p className="text-[10px] font-black text-slate-500 mb-1">النموذج الموحد رقم: 31</p>
          <h2 className="text-3xl font-black mb-2 border-b-4 border-double border-slate-900 inline-block px-12">تعهد تأخر طالب عن اختبار</h2>
        </div>
        
        <div className="p-10 border-[1.5pt] border-slate-900 bg-slate-50 leading-[2.5] text-xl mb-12 rounded-2xl shadow-inner">
           <p className="mb-8">أقر أنا الطالب / <span className="font-black text-3xl px-3 border-b-2 border-slate-400">{absence.student_name}</span></p>
           <p className="mb-8">المقيد في الصف: <span className="font-black underline px-2">{student?.grade || '........'}</span> فصل: <span className="font-black underline px-2">{student?.section || '........'}</span></p>
           <p>بأنني قد تأخرت عن موعد بدء اختبار اليوم <span className="font-black tabular-nums">({new Date(absence.date).toLocaleDateString('ar-SA')})</span>، وأتعهد بالالتزام بالحضور المبكر في الأيام القادمة، وفي حالة تكرار ذلك أتحمل كافة الإجراءات النظامية المتبعة.</p>
           
           <div className="flex justify-end mt-12">
              <div className="text-center min-w-[250px] space-y-4">
                <p className="font-black text-lg">توقيع الطالب المقر بما فيه</p>
                <p className="text-slate-300">................................................</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-20 mt-20 px-10">
           <div className="text-center space-y-16">
              <p className="font-black text-xl underline">مراقب اللجنة</p>
              <p className="font-bold">........................................</p>
           </div>
           <div className="text-center space-y-16">
              <p className="font-black text-xl underline">مدير المدرسة</p>
              <p className="font-bold">........................................</p>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24 no-print relative">
      {/* Loader for Print */}
      {isPrinting && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/95 backdrop-blur-lg flex flex-col items-center justify-center text-white">
           <div className="relative mb-8">
              <Loader2 size={100} className="animate-spin text-blue-500 opacity-20" />
              <FileCheck size={48} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
           </div>
           <h3 className="text-4xl font-black tracking-tight">جاري تحضير المحاضر للطباعة</h3>
           <p className="text-slate-400 font-bold mt-4 text-xl">سيتم فتح المعاينة تلقائياً خلال ثوانٍ...</p>
        </div>
      )}

      {/* Header UI */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-8 border-blue-600 pb-10">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">مركز استخراج النماذج</h2>
          <p className="text-slate-400 font-bold mt-2 text-lg italic flex items-center gap-2">
             <FileText className="text-blue-600" size={20}/> استخراج نماذج 36 و 31 المعتمدة وزارياً
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-[2.5rem] shadow-xl border">
          <div className="relative">
            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="date" className="pr-14 pl-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg shadow-inner outline-none focus:border-blue-600 transition-all" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <button 
            disabled={dailyAbsences.length === 0} 
            onClick={() => triggerPrint(dailyAbsences, `محاضر يوم ${selectedDate}`)} 
            className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-4 active:scale-95"
          >
            <Printer size={28} /> طباعة جميع محاضر اليوم ({dailyAbsences.length})
          </button>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[15px] border-red-600">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex items-center justify-between">
               <div className="space-y-4">
                  <h3 className="text-3xl font-black flex items-center gap-4 text-red-500 underline underline-offset-8 decoration-4 decoration-red-600/30">سجل الغياب التراكمي</h3>
                  <p className="text-sm text-slate-400 font-bold italic leading-relaxed max-w-xs">طباعة كشف معتمد بكافة الطلاب الذين تغيبوا عن الاختبارات منذ بداية الفترة.</p>
               </div>
               <div className="text-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 min-w-[140px] shadow-inner">
                  <p className="text-6xl font-black tabular-nums tracking-tighter">{allAbsences.length}</p>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2">حالة غياب</p>
               </div>
            </div>
            <button onClick={() => triggerPrint(allAbsences, "سجل الغياب التراكمي الشامل")} className="mt-12 w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95">
               <Printer size={28}/> استخراج الكشف الشامل
            </button>
         </div>

         <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[15px] border-amber-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex items-center justify-between">
               <div className="space-y-4">
                  <h3 className="text-3xl font-black flex items-center gap-4 text-amber-500 underline underline-offset-8 decoration-4 decoration-amber-600/30">سجل التأخر التراكمي</h3>
                  <p className="text-sm text-slate-400 font-bold italic leading-relaxed max-w-xs">طباعة كشف معتمد بالتعهدات التي تم رصدها للطلاب المتأخرين.</p>
               </div>
               <div className="text-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 min-w-[140px] shadow-inner">
                  <p className="text-6xl font-black tabular-nums tracking-tighter">{allDelays.length}</p>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2">حالة تأخر</p>
               </div>
            </div>
            <button onClick={() => triggerPrint(allDelays, "سجل التأخر التراكمي الشامل")} className="mt-12 w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95">
               <Printer size={28}/> استخراج الكشف الشامل
            </button>
         </div>
      </div>

      {/* Individual Forms List */}
      <div className="space-y-8">
         <div className="flex items-center gap-5 border-b pb-6 mt-16">
            <div className="p-4 bg-blue-600 text-white rounded-[1.8rem] shadow-xl"><ListChecks size={28} /></div>
            <h3 className="text-3xl font-black text-slate-900">المحاضر الفردية المتاحة (اليوم)</h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dailyAbsences.length === 0 ? (
              <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-6">
                 <AlertTriangle size={64} className="text-slate-200" />
                 <p className="text-2xl font-black text-slate-300 italic">لم يتم رصد أي حالات (غياب/تأخر) لهذا التاريخ بعد.</p>
              </div>
            ) : (
              dailyAbsences.map(a => (
                <div key={a.id} className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between group hover:border-blue-600 hover:-translate-y-2 transition-all duration-300">
                   <div className="space-y-6">
                      <div className="flex justify-between items-start">
                         <span className={`px-5 py-2 rounded-2xl font-black text-[10px] uppercase shadow-sm tracking-widest ${a.type === 'ABSENT' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {a.type === 'ABSENT' ? 'نموذج 36 - غياب' : 'نموذج 31 - تأخر'}
                         </span>
                         <div className="bg-slate-900 text-white px-5 py-1.5 rounded-xl text-xs font-black">لجنة {a.committee_number}</div>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 leading-tight break-words h-14 overflow-hidden">{a.student_name}</h4>
                      <div className="flex items-center gap-3 text-slate-400 font-bold bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                         <Info size={16} className="text-blue-500" />
                         <span>ID: {a.student_id}</span>
                      </div>
                   </div>
                   <button onClick={() => triggerPrint([a], `محضر الطالب ${a.student_name}`)} className="mt-10 w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                      <Printer size={20}/> معاينة وطباعة المحضر
                   </button>
                </div>
              ))
            )}
         </div>
      </div>

      {/* بوابة الطباعة (Print Portal) - حل جذري للمساحة الفارغة */}
      <div id="official-print-portal" className="hidden-print-zone">
         <style>{`
            /* مخفي تماماً في وضع العرض العادي */
            .hidden-print-zone {
               position: fixed;
               top: -10000px;
               left: -10000px;
               visibility: hidden;
               pointer-events: none;
            }

            @media print {
              /* إخفاء كل شيء في الصفحة عدا بوابة الطباعة */
              body * {
                visibility: hidden !important;
              }
              
              #official-print-portal, #official-print-portal * {
                visibility: visible !important;
              }

              #official-print-portal {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                z-index: 99999 !important;
                display: block !important;
              }

              @page {
                size: A4 portrait;
                margin: 0;
              }

              .print-content-item {
                page-break-after: always !important;
                display: block !important;
                width: 210mm !important;
                min-height: 297mm !important;
                background: white !important;
                box-sizing: border-box !important;
              }

              /* تأكيد ظهور الألوان والحدود */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
         `}</style>
         
         <div className="print-wrapper">
            {printQueue.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="print-content-item">
                 {item.type === 'ABSENT' ? <AbsenceForm absence={item} /> : <DelayForm absence={item} />}
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AdminOfficialForms;
