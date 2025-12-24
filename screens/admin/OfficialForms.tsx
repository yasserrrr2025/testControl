
import React, { useState, useMemo, useEffect } from 'react';
import { Absence, Student } from '../../types';
import { Printer, FileText, Calendar, ListChecks, History, Clock } from 'lucide-react';
import OfficialHeader from '../../components/OfficialHeader';

interface Props {
  absences: Absence[];
  students: Student[];
}

const AdminOfficialForms: React.FC<Props> = ({ absences, students }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedForm, setSelectedForm] = useState<{ type: 'ABSENCE' | 'DELAY' | 'ABSENCE_REGISTER_ALL' | 'DELAY_REGISTER_ALL' | 'PRINT_ALL_DAILY_FORMS', absenceId?: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const dailyAbsences = useMemo(() => {
    return absences.filter(a => a.date.startsWith(selectedDate));
  }, [absences, selectedDate]);

  const allAbsences = useMemo(() => absences.filter(a => a.type === 'ABSENT').sort((a,b) => b.date.localeCompare(a.date)), [absences]);
  const allDelays = useMemo(() => absences.filter(a => a.type === 'LATE').sort((a,b) => b.date.localeCompare(a.date)), [absences]);

  // نموذج غياب طالب (نموذج رقم 36)
  const renderAbsenceForm = (absence: Absence) => {
    const student = students.find(s => s.national_id === absence.student_id);
    const date = new Date(absence.date).toLocaleDateString('ar-SA');

    return (
      <div key={absence.id} className="bg-white p-8 font-['Tajawal'] text-slate-900 m-0 print-form-container page-break-after-always block">
        <OfficialHeader />
        
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold text-blue-600 mb-1">نموذج رقم: 36</p>
          <h2 className="text-2xl font-black mb-2">محضر غياب طالب عن الاختبار</h2>
        </div>

        <div className="w-full border-[1.5px] border-slate-900 mb-6 text-sm">
           <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-2 border-l border-slate-900 flex justify-between">
                <span className="font-bold">اسم الطالب:</span>
                <span className="font-black">{absence.student_name}</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="font-bold">رقم الجلوس:</span>
                <span className="font-black">{student?.seating_number || '............'}</span>
              </div>
           </div>
           <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-2 border-l border-slate-900 flex justify-between">
                <span className="font-bold">اليوم:</span>
                <span className="font-black">........................</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="font-bold">التاريخ:</span>
                <span className="font-black">{date}</span>
              </div>
           </div>
           <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-2 border-l border-slate-900 flex justify-between">
                <span className="font-bold">الفترة:</span>
                <span className="font-black">........................</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="font-bold">رقم اللجنة:</span>
                <span className="font-black">{absence.committee_number}</span>
              </div>
           </div>
           <div className="grid grid-cols-3">
              <div className="p-2 border-l border-slate-900 flex justify-between">
                <span className="font-bold">المادة:</span>
                <span className="font-black">................</span>
              </div>
              <div className="p-2 border-l border-slate-900 flex justify-between">
                <span className="font-bold">الصف:</span>
                <span className="font-black">{student?.grade || '.........'}</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="font-bold">الفصل:</span>
                <span className="font-black">{student?.section || '.........'}</span>
              </div>
           </div>
        </div>

        <div className="mb-6">
          <div className="bg-slate-100 p-2 border-[1.5px] border-slate-900 text-center font-black text-sm">
            مصادقة لجنة الإشراف والملاحظة
          </div>
          <table className="w-full border-x border-b border-slate-900 text-[11px] text-center border-collapse">
            <thead className="bg-slate-50 font-bold">
              <tr>
                <th className="border border-slate-900 p-1 w-8">م</th>
                <th className="border border-slate-900 p-1">الاسم</th>
                <th className="border border-slate-900 p-1 w-32">الصفة</th>
                <th className="border border-slate-900 p-1 w-32">التوقيع</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 p-2">1</td>
                <td className="border border-slate-900 p-2">........................................</td>
                <td className="border border-slate-900 p-2 font-bold">رئيس الكنترول</td>
                <td className="border border-slate-900 p-2"></td>
              </tr>
              <tr>
                <td className="border border-slate-900 p-2">2</td>
                <td className="border border-slate-900 p-2">........................................</td>
                <td className="border border-slate-900 p-2 font-bold">عضو</td>
                <td className="border border-slate-900 p-2"></td>
              </tr>
              <tr>
                <td className="border border-slate-900 p-2">3</td>
                <td className="border border-slate-900 p-2">........................................</td>
                <td className="border border-slate-900 p-2 font-bold">ملاحظ اللجنة</td>
                <td className="border border-slate-900 p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-start mt-12 px-10">
           <div className="text-center">
              <p className="text-xl font-black mb-12">مدير المدرسة:</p>
              <p className="text-lg font-bold">التوقيع: ..........................</p>
           </div>
        </div>

        <div className="mt-20 pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
           <p>• يوضع محضر الغياب حسب رقم جلوس الطالب في تسلسل أوراق الإجابة.</p>
           <p>• يسجل في بيان الغائبين.</p>
        </div>
      </div>
    );
  };

  // نموذج تعهد تأخر (نموذج رقم 31)
  const renderDelayForm = (absence: Absence) => {
    const student = students.find(s => s.national_id === absence.student_id);
    const date = new Date(absence.date).toLocaleDateString('ar-SA');

    return (
      <div key={absence.id} className="bg-white p-8 font-['Tajawal'] text-slate-900 m-0 print-form-container page-break-after-always block">
        <OfficialHeader />
        
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold text-blue-600 mb-1">نموذج رقم: 31</p>
          <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">تعهد طالب تأخر عن الاختبار بما لا يتجاوز خمس عشرة دقيقة</h2>
        </div>

        <div className="w-full border-[1.5px] border-slate-900 mb-6 text-sm">
           <div className="p-2 border-b border-slate-900 flex justify-between">
              <span className="font-bold">اسم الطالب:</span>
              <span className="font-black text-lg">{absence.student_name}</span>
           </div>
           <div className="grid grid-cols-3 border-b border-slate-900 bg-slate-50">
              <div className="p-2 border-l border-slate-900 text-center font-bold">الصف</div>
              <div className="p-2 border-l border-slate-900 text-center font-bold">الفصل</div>
              <div className="p-2 text-center font-bold">اللجنة</div>
           </div>
           <div className="grid grid-cols-3 border-b border-slate-900">
              <div className="p-2 border-l border-slate-900 text-center font-black">{student?.grade || '....'}</div>
              <div className="p-2 border-l border-slate-900 text-center font-black">{student?.section || '....'}</div>
              <div className="p-2 text-center font-black">{absence.committee_number}</div>
           </div>
           <div className="grid grid-cols-2 border-b border-slate-900 bg-slate-50">
              <div className="p-2 border-l border-slate-900 text-center font-bold">اليوم</div>
              <div className="p-2 text-center font-bold">التاريخ</div>
           </div>
           <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-2 border-l border-slate-900 text-center font-black">..................</div>
              <div className="p-2 text-center font-black">{date}</div>
           </div>
           <div className="grid grid-cols-2 bg-slate-50">
              <div className="p-2 border-l border-slate-900 text-center font-bold">المادة</div>
              <div className="p-2 text-center font-bold">الفترة</div>
           </div>
           <div className="grid grid-cols-2">
              <div className="p-2 border-l border-slate-900 text-center font-black">..................</div>
              <div className="p-2 text-center font-black">..................</div>
           </div>
        </div>

        <div className="grid grid-cols-3 border-[1.5px] border-slate-900 text-center text-[11px] mb-6">
           <div className="border-l border-slate-900">
              <div className="p-1 bg-slate-100 border-b border-slate-900 font-bold">وقت بدء الاختبار</div>
              <div className="p-3 font-black">.................</div>
           </div>
           <div className="border-l border-slate-900">
              <div className="p-1 bg-slate-100 border-b border-slate-900 font-bold">وقت حضور الطالب</div>
              <div className="p-3 font-black">.................</div>
           </div>
           <div>
              <div className="p-1 bg-slate-100 border-b border-slate-900 font-bold">مقدار التأخر</div>
              <div className="p-3 font-black">.................</div>
           </div>
        </div>

        <div className="p-4 border-[1.5px] border-slate-900 bg-slate-50 mb-6 italic leading-relaxed text-[12px]">
           <p className="mb-2">أتعهد أنا الطالب / ............................................................................ بالالتزام بالحضور المبكر أيام الاختبارات وعدم تكرار التأخر، وأشعرت أنه في حال التكرار يتم حسم درجة من درجات المواظبة عن كل تأخر وعلى ذلك أوقع.</p>
           <p className="text-left font-black mt-4">توقيع الطالب: .......................................</p>
        </div>

        <div className="grid grid-cols-2 border-[1.5px] border-slate-900 text-[11px] h-32">
           <div className="border-l border-slate-900 flex flex-col">
              <div className="bg-slate-100 p-1 border-b border-slate-900 text-center font-black">لجنة الإشراف والملاحظة</div>
              <div className="p-4 flex-1 space-y-4">
                 <p className="flex justify-between"><span>الاسم: ..............................</span><span>التوقيع: .................</span></p>
              </div>
           </div>
           <div className="flex flex-col">
              <div className="bg-slate-100 p-1 border-b border-slate-900 text-center font-black">لجنة التحكم والضبط</div>
              <div className="p-4 flex-1 space-y-4">
                 <p className="flex justify-between"><span>الاسم: ..............................</span><span>التوقيع: .................</span></p>
              </div>
           </div>
        </div>

        <div className="text-center mt-12">
           <p className="font-black text-lg">مدير المدرسة</p>
           <p className="mt-8">.....................................................</p>
        </div>

        <div className="mt-12 text-[10px] text-slate-500 font-bold">
           <p>• يسجل في بيان المتأخرين.</p>
           <p>• في حالة التكرار يطبق على الطالب لائحة السلوك والمواظبة.</p>
        </div>
      </div>
    );
  };

  const renderComprehensiveRegister = (list: Absence[], title: string) => {
    return (
      <div className="bg-white p-4 font-['Tajawal'] text-slate-900 border-[1.5px] border-slate-900 m-0 print-form-container block">
        <OfficialHeader />
        <h2 className="text-center text-[12px] font-black mb-6 underline">سجل {title} الشامل لكافة اللجان</h2>
        <table className="w-full text-center border-[1.5px] border-slate-900 border-collapse text-[9px]">
          <thead className="bg-slate-100 font-black table-header-group">
            <tr>
              <th className="border border-slate-900 p-1.5">م</th>
              <th className="border border-slate-900 p-1.5">التاريخ</th>
              <th className="border border-slate-900 p-1.5 text-right px-2">اسم الطالب</th>
              <th className="border border-slate-900 p-1.5">الصف</th>
              <th className="border border-slate-900 p-1.5">اللجنة</th>
              <th className="border border-slate-900 p-1.5">توقيع المستلم</th>
              <th className="border border-slate-900 p-1.5">ملاحظات الإدارة</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a, i) => {
              const s = students.find(std => std.national_id === a.student_id);
              return (
                <tr key={a.id} className="page-break-inside-avoid">
                  <td className="border border-slate-900 p-1.5">{i+1}</td>
                  <td className="border border-slate-900 p-1.5">{new Date(a.date).toLocaleDateString('ar-SA')}</td>
                  <td className="border border-slate-900 p-1.5 text-right px-2 font-black text-[11px]">{a.student_name}</td>
                  <td className="border border-slate-900 p-1.5">{s?.grade || '---'}</td>
                  <td className="border border-slate-900 p-1.5 font-black">{a.committee_number}</td>
                  <td className="border border-slate-900 p-1.5 h-8"></td>
                  <td className="border border-slate-900 p-1.5"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handlePrint = (type: any, id?: string) => {
    // 1. تحديد النموذج المطلوب وإظهار حاوية الطباعة
    setSelectedForm({ type, absenceId: id });
    setIsPrinting(true);
    
    // 2. استخدام setTimeout لضمان اكتمال الرندر (Rendering)
    setTimeout(() => {
      window.print();
      // 3. إعادة الحالة لوضعها الطبيعي بعد انتهاء الطباعة
      setIsPrinting(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in text-right pb-20 no-print">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-blue-600 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">مركز استخراج النماذج الرسمية</h2>
          <p className="text-slate-400 font-bold mt-1 italic">طباعة محاضر 36 و 31 المعتمدة</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="date" className="pr-10 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs shadow-sm outline-none focus:border-blue-600" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <button 
            disabled={dailyAbsences.length === 0} 
            onClick={() => handlePrint('PRINT_ALL_DAILY_FORMS')} 
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl flex items-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Printer size={18} /> طباعة جميع محاضر اليوم المعتمدة ({dailyAbsences.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-b-8 border-red-600">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex items-center justify-between">
               <div className="space-y-2">
                  <h3 className="text-xl font-black flex items-center gap-3"><History className="text-red-400" /> السجل الشامل للغياب</h3>
                  <p className="text-[10px] text-slate-400 font-bold italic">كشف تراكمي لكافة الغيابات المرصودة</p>
               </div>
               <div className="text-center">
                  <p className="text-3xl font-black text-red-500">{allAbsences.length}</p>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">حالة</p>
               </div>
            </div>
            <button onClick={() => handlePrint('ABSENCE_REGISTER_ALL')} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
               <Printer size={18}/> طباعة السجل العام للغياب
            </button>
         </div>

         <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-b-8 border-amber-600">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex items-center justify-between">
               <div className="space-y-2">
                  <h3 className="text-xl font-black flex items-center gap-3"><Clock className="text-amber-400" /> السجل الشامل للتأخر</h3>
                  <p className="text-[10px] text-slate-400 font-bold italic">كشف تراكمي لكافة حالات التأخير</p>
               </div>
               <div className="text-center">
                  <p className="text-3xl font-black text-amber-500">{allDelays.length}</p>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">حالة</p>
               </div>
            </div>
            <button onClick={() => handlePrint('DELAY_REGISTER_ALL')} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
               <Printer size={18}/> طباعة السجل العام للتأخير
            </button>
         </div>
      </div>

      <div className="flex items-center gap-4 border-b pb-4 mt-12">
         <ListChecks size={24} className="text-blue-600" />
         <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">قائمة المحاضر الفردية ليوم {selectedDate}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dailyAbsences.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
             <p className="text-xl font-black text-slate-300 italic">لا توجد بلاغات مسجلة لهذا التاريخ</p>
          </div>
        ) : (
          dailyAbsences.map(a => {
            const s = students.find(std => std.national_id === a.student_id);
            return (
              <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between group hover:border-blue-500 transition-all">
                 <div className="space-y-4">
                    <div className="flex justify-between items-start">
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${a.type === 'ABSENT' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {a.type === 'ABSENT' ? 'نموذج 36' : 'نموذج 31'}
                       </span>
                       <span className="text-[10px] font-bold text-slate-300">لجنة {a.committee_number}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 leading-tight">{a.student_name}</h4>
                    <p className="text-[10px] font-bold text-slate-400">{s?.grade} - {s?.section}</p>
                 </div>
                 <button onClick={() => handlePrint(a.type === 'ABSENT' ? 'ABSENCE' : 'DELAY', a.id)} className="mt-8 w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3">
                    <Printer size={16}/> طباعة المحضر الفردي
                 </button>
              </div>
            );
          })
        )}
      </div>

      {/* منطقة الطباعة المخفية (تظهر فقط عند تفعيل isPrinting) */}
      {isPrinting && (
        <div className="fixed inset-0 z-[9999] bg-white print:static print:block">
           {selectedForm?.type === 'ABSENCE_REGISTER_ALL' && renderComprehensiveRegister(allAbsences, 'الغياب')}
           {selectedForm?.type === 'DELAY_REGISTER_ALL' && renderComprehensiveRegister(allDelays, 'التأخير')}
           
           {selectedForm?.type === 'PRINT_ALL_DAILY_FORMS' && dailyAbsences.map(a => 
              a.type === 'ABSENT' ? renderAbsenceForm(a) : renderDelayForm(a)
           )}

           {selectedForm?.type === 'ABSENCE' && dailyAbsences.find(a => a.id === selectedForm.absenceId) && renderAbsenceForm(dailyAbsences.find(a => a.id === selectedForm.absenceId)!)}
           {selectedForm?.type === 'DELAY' && dailyAbsences.find(a => a.id === selectedForm.absenceId) && renderDelayForm(dailyAbsences.find(a => a.id === selectedForm.absenceId)!)}
        </div>
      )}

      <style>{`
        @media print {
          @page { margin: 0.8cm; size: A4 portrait; }
          body { visibility: hidden; }
          .fixed.inset-0.z-\[9999\] { 
            visibility: visible !important; 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default AdminOfficialForms;
