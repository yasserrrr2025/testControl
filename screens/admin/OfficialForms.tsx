import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Absence, Student } from '../../types';
import { Printer, Calendar, AlertTriangle, FileCheck, Info, Loader2 } from 'lucide-react';
import OfficialHeader from '../../components/OfficialHeader';

interface Props {
  absences: Absence[];
  students: Student[];
}

const AdminOfficialForms: React.FC<Props> = ({ absences, students }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<Absence[]>([]);
  // لا نحتاج للعنوان في الطباعة الورقية، لكن يمكن استخدامه للوج/التحليل
  // const [printTitle, setPrintTitle] = useState('');

  const dailyAbsences = useMemo(() => {
    return absences.filter(a => a.date.startsWith(selectedDate));
  }, [absences, selectedDate]);

  const allAbsences = useMemo(() => absences.filter(a => a.type === 'ABSENT').sort((a,b) => b.date.localeCompare(a.date)), [absences]);
  const allDelays = useMemo(() => absences.filter(a => a.type === 'LATE').sort((a,b) => b.date.localeCompare(a.date)), [absences]);

  const triggerPrint = (queue: Absence[], title: string = '') => {
    if (queue.length === 0) return;
    
    setPrintQueue(queue);
    // setPrintTitle(title);
    setIsPrinting(true);
    
    // إعطاء وقت لـ React لعمل Render للمحتوى داخل الـ Portal
    setTimeout(() => {
      window.print();
      // إغلاق وضع الطباعة بعد إغلاق نافذة النظام
      // نزيد الوقت قليلاً لضمان عدم اختفاء المحتوى قبل ضغط زر طباعة
    }, 500);
  };

  // مراقبة أحداث الطباعة لإغلاق الوضع عند الإلغاء
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintQueue([]);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // --- مكونات النماذج ---

  const AbsenceForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="official-page-container">
        <div className="official-a4-page relative flex flex-col">
          <OfficialHeader />
          
          <div className="text-center mb-8 mt-4">
            <p className="text-[10px] font-black text-slate-500 mb-1">النموذج الموحد رقم: 36</p>
            <h2 className="text-3xl font-black mb-2 border-b-4 border-double border-slate-900 inline-block px-12 pb-1">محضر إثبات غياب طالب</h2>
          </div>

          <div className="w-full border-[1.5pt] border-slate-900 mb-8 text-[14px]">
             <div className="grid grid-cols-2 border-b-[1.5pt] border-slate-900">
                <div className="p-3 border-l-[1.5pt] border-slate-900 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">اسم الطالب:</span>
                   <span className="font-black text-lg">{absence.student_name}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                   <span className="font-bold">رقم الجلوس:</span>
                   <span className="font-black text-lg font-mono">{student?.seating_number || '............'}</span>
                </div>
             </div>
             <div className="grid grid-cols-2 border-b-[1.5pt] border-slate-900">
                <div className="p-3 border-l-[1.5pt] border-slate-900 flex justify-between items-center">
                   <span className="font-bold">اليوم:</span>
                   <span className="font-black">........................</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">التاريخ:</span>
                   <span className="font-black tabular-nums font-mono">{new Date(absence.date).toLocaleDateString('ar-SA')}</span>
                </div>
             </div>
             <div className="grid grid-cols-3">
                <div className="p-3 border-l-[1.5pt] border-slate-900 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">اللجنة:</span>
                   <span className="font-black text-xl font-mono">{absence.committee_number}</span>
                </div>
                <div className="p-3 border-l-[1.5pt] border-slate-900 flex justify-between items-center">
                   <span className="font-bold">الصف:</span>
                   <span className="font-black text-xs">{student?.grade || '.........'}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">الفصل:</span>
                   <span className="font-black">{student?.section || '.........'}</span>
                </div>
             </div>
          </div>

          <div className="mb-8">
            <div className="bg-slate-200 p-2 border-[1.5pt] border-slate-900 text-center font-black text-sm uppercase tracking-widest mb-[1px]">مصادقة ومطابقة اللجنة</div>
            <table className="w-full border-[1.5pt] border-slate-900 text-[12px] text-center border-collapse">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-900 p-2 w-10">م</th>
                  <th className="border border-slate-900 p-2 text-right">الاسم الرباعي</th>
                  <th className="border border-slate-900 p-2 w-40">الصفة</th>
                  <th className="border border-slate-900 p-2 w-40">التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'رئيس لجنة الكنترول' },
                  { role: 'عضو لجنة الكنترول' },
                  { role: 'مراقب اللجنة المعني' }
                ].map((row, i) => (
                  <tr key={i} className="h-14">
                    <td className="border border-slate-900 p-2 font-bold">{i+1}</td>
                    <td className="border border-slate-900 p-2 text-right">................................................</td>
                    <td className="border border-slate-900 p-2 font-black bg-slate-50/30">{row.role}</td>
                    <td className="border border-slate-900 p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-16 px-8 pb-4">
             <div className="text-center space-y-16">
                <p className="text-lg font-black underline underline-offset-8">يعتمد / مدير المدرسة</p>
                <div className="space-y-2">
                  <p className="font-bold">..............................................</p>
                  <p className="text-slate-400 italic text-[10px]">الختم الرسمي للمدرسة</p>
                </div>
             </div>
             <div className="text-center space-y-16">
                <p className="text-lg font-black underline underline-offset-8">الموجه الطلابي</p>
                <p className="font-bold">..............................................</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const DelayForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    return (
      <div className="official-page-container">
        <div className="official-a4-page relative flex flex-col">
          <OfficialHeader />
          <div className="text-center mb-10 mt-6">
            <p className="text-[10px] font-black text-slate-500 mb-1">النموذج الموحد رقم: 31</p>
            <h2 className="text-3xl font-black mb-2 border-b-4 border-double border-slate-900 inline-block px-12 pb-1">تعهد تأخر طالب عن اختبار</h2>
          </div>
          
          <div className="p-8 border-[1.5pt] border-slate-900 bg-slate-50 leading-[3] text-lg mb-12 rounded-lg text-justify" dir="rtl">
             <p className="mb-6">
               أقر أنا الطالب / <span className="font-black text-2xl px-4 border-b-2 border-slate-400 inline-block min-w-[300px] text-center">{absence.student_name}</span>
             </p>
             <p className="mb-6">
               المقيد في الصف: <span className="font-black underline px-2">{student?.grade || '........'}</span> 
               فصل: <span className="font-black underline px-2">{student?.section || '........'}</span>
             </p>
             <p>
               بأنني قد تأخرت عن موعد بدء اختبار اليوم <span className="font-black tabular-nums border-b border-dashed border-slate-400"> {new Date(absence.date).toLocaleDateString('ar-SA')} </span>، 
               وأتعهد بالالتزام بالحضور المبكر في الأيام القادمة، وفي حالة تكرار ذلك أتحمل كافة الإجراءات النظامية المتبعة.
             </p>
             
             <div className="flex justify-end mt-16 ml-8">
                <div className="text-center min-w-[250px] space-y-4">
                  <p className="font-black text-lg">توقيع الطالب المقر بما فيه</p>
                  <p className="text-slate-300 tracking-tighter">................................................</p>
                </div>
             </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-20 px-10 pb-10">
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
      </div>
    );
  };

  // --- Portal Logic for Printing ---
  const PrintContent = () => {
    // هذا الجزء هو ما سيظهر في الطباعة فقط
    return (
      <div id="print-root-content">
         <style>{`
            @media print {
               @page { size: A4 portrait; margin: 0; }
               body { background: white; margin: 0; padding: 0; }
               /* إخفاء التطبيق الأصلي */
               #root, .app-root { display: none !important; } 
               
               /* إظهار محتوى الطباعة */
               #print-portal-container { 
                  display: block !important; 
                  position: absolute; 
                  top: 0; 
                  left: 0; 
                  width: 100%; 
                  z-index: 9999;
                  background: white;
               }

               .official-page-container {
                  width: 210mm;
                  height: 297mm;
                  page-break-after: always; /* صفحة جديدة بعد كل نموذج */
                  padding: 10mm; /* هامش للورقة */
                  box-sizing: border-box;
                  display: flex;
                  justify-content: center;
               }

               .official-a4-page {
                  width: 100%;
                  height: 100%;
                  border: 2px solid #0f172a; /* حدود الصفحة */
                  padding: 10mm;
                  box-sizing: border-box;
                  background: white;
                  color: black;
               }
               
               /* ضمان الألوان */
               * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
         `}</style>
         
         {printQueue.map((item, idx) => (
            <div key={`${item.id}-${idx}`}>
               {item.type === 'ABSENT' ? <AbsenceForm absence={item} /> : <DelayForm absence={item} />}
            </div>
         ))}
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24 relative">
      
      {/* Print Portal: Render outside the main app structure */}
      {isPrinting && createPortal(
         <div id="print-portal-container">
            <PrintContent />
         </div>,
         document.body
      )}

      {/* Loading Overlay (Visible in App only) */}
      {isPrinting && (
        <div className="fixed inset-0 z-[50] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
           <Loader2 size={60} className="animate-spin text-blue-500 mb-4" />
           <h3 className="text-2xl font-bold">جاري إعداد الطباعة...</h3>
        </div>
      )}

      {/* Main UI */}
      <div className="no-print space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-8 border-blue-600 pb-10">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">مركز استخراج النماذج</h2>
            <p className="text-slate-400 font-bold mt-2 text-lg italic flex items-center gap-2">
               <FileCheck className="text-blue-600" size={20}/> استخراج نماذج 36 و 31 المعتمدة وزارياً
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
              <Printer size={28} /> طباعة محاضر اليوم ({dailyAbsences.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden group border-b-[10px] border-red-600">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                    <h3 className="text-2xl font-black flex items-center gap-3 text-red-500">سجل الغياب التراكمي</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-xs">طباعة كشف معتمد بكافة الطلاب المتغيبين.</p>
                </div>
                <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10 min-w-[100px]">
                    <p className="text-4xl font-black tabular-nums">{allAbsences.length}</p>
                </div>
              </div>
              <button onClick={() => triggerPrint(allAbsences, "سجل الغياب التراكمي")} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
                <Printer size={20}/> استخراج الكشف
              </button>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden group border-b-[10px] border-amber-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                    <h3 className="text-2xl font-black flex items-center gap-3 text-amber-500">سجل التأخر التراكمي</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-xs">طباعة كشف معتمد بتعهدات التأخر.</p>
                </div>
                <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10 min-w-[100px]">
                    <p className="text-4xl font-black tabular-nums">{allDelays.length}</p>
                </div>
              </div>
              <button onClick={() => triggerPrint(allDelays, "سجل التأخر التراكمي")} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
                <Printer size={20}/> استخراج الكشف
              </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-5 border-b pb-6 mt-12">
              <h3 className="text-2xl font-black text-slate-900">المحاضر الفردية (اليوم)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dailyAbsences.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-4">
                  <AlertTriangle size={48} className="text-slate-200" />
                  <p className="text-xl font-bold text-slate-300">لا توجد حالات مسجلة لهذا اليوم.</p>
                </div>
              ) : (
                dailyAbsences.map(a => (
                  <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-lg hover:border-blue-500 transition-all flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <span className={`px-3 py-1 rounded-lg font-bold text-[10px] ${a.type === 'ABSENT' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {a.type === 'ABSENT' ? 'غياب (36)' : 'تأخر (31)'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">لجنة {a.committee_number}</span>
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-900 mb-1">{a.student_name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Info size={12}/> {a.student_id}
                        </div>
                    </div>
                    <button onClick={() => triggerPrint([a], a.student_name)} className="mt-auto w-full py-3 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2">
                        <Printer size={16}/> طباعة
                    </button>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOfficialForms;