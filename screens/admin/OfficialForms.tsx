
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Absence, Student, Supervision, User } from '../../types';
import { Printer, Calendar, AlertTriangle, FileCheck, Info, Loader2, ListChecks, History } from 'lucide-react';
import OfficialHeader from '../../components/OfficialHeader';

interface Props {
  absences: Absence[];
  students: Student[];
  supervisions: Supervision[];
  users: User[];
}

const AdminOfficialForms: React.FC<Props> = ({ absences, students, supervisions, users }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<Absence[]>([]);
  const [printType, setPrintType] = useState<'INDIVIDUAL' | 'CUMULATIVE'>('INDIVIDUAL');
  const [cumulativeType, setCumulativeType] = useState<'ABSENT' | 'LATE'>('ABSENT');

  const dailyAbsences = useMemo(() => {
    return absences.filter(a => a.date.startsWith(selectedDate));
  }, [absences, selectedDate]);

  const allAbsences = useMemo(() => absences.filter(a => a.type === 'ABSENT').sort((a,b) => b.date.localeCompare(a.date)), [absences]);
  const allDelays = useMemo(() => absences.filter(a => a.type === 'LATE').sort((a,b) => b.date.localeCompare(a.date)), [absences]);

  // منطق تجميع البيانات للكشف التراكمي
  const cumulativeData = useMemo(() => {
    const targetAbsences = cumulativeType === 'ABSENT' ? allAbsences : allDelays;
    const map: Record<string, { student: Student, count: number, committees: Set<string> }> = {};
    
    targetAbsences.forEach(a => {
      if (!map[a.student_id]) {
        const s = students.find(st => st.national_id === a.student_id);
        if (s) {
          map[a.student_id] = { student: s, count: 0, committees: new Set() };
        }
      }
      if (map[a.student_id]) {
        map[a.student_id].count++;
        map[a.student_id].committees.add(a.committee_number);
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allAbsences, allDelays, cumulativeType, students]);

  const triggerPrint = (queue: Absence[], type: 'INDIVIDUAL' | 'CUMULATIVE' = 'INDIVIDUAL') => {
    if (type === 'INDIVIDUAL' && queue.length === 0) return;
    setPrintType(type);
    setPrintQueue(queue);
    setIsPrinting(true);
    
    setTimeout(() => {
      window.print();
    }, 800);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintQueue([]);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const getProctorName = (committeeNum: string, date: string) => {
    const sv = supervisions.find(s => s.committee_number === committeeNum && s.date.startsWith(date.split('T')[0]));
    const user = users.find(u => u.id === sv?.teacher_id);
    return user?.full_name || '........................';
  };

  // --- مكونات النماذج ---

  const AbsenceForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    const proctorName = getProctorName(absence.committee_number, absence.date);

    return (
      <div className="official-page-container">
        <div className="official-a4-page relative flex flex-col border-4 border-slate-900 p-8">
          <OfficialHeader />
          
          <div className="text-center mb-8 mt-4">
            <p className="text-[10px] font-black text-slate-500 mb-1 tracking-widest uppercase">النموذج الموحد رقم: 36</p>
            <h2 className="text-4xl font-black mb-4 border-b-8 border-double border-slate-900 inline-block px-12 pb-2">محضر إثبات غياب طالب</h2>
          </div>

          <div className="w-full border-[2pt] border-slate-900 mb-8 text-[15px]">
             <div className="grid grid-cols-2 border-b-[2pt] border-slate-900">
                <div className="p-4 border-l-[2pt] border-slate-900 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">اسم الطالب:</span>
                   <span className="font-black text-xl leading-none">{absence.student_name}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                   <span className="font-bold">رقم الجلوس:</span>
                   <span className="font-black text-2xl font-mono tabular-nums">{student?.seating_number || '............'}</span>
                </div>
             </div>
             <div className="grid grid-cols-2 border-b-[2pt] border-slate-900">
                <div className="p-4 border-l-[2pt] border-slate-900 flex justify-between items-center">
                   <span className="font-bold">اليوم:</span>
                   <span className="font-black">........................</span>
                </div>
                <div className="p-4 flex justify-between items-center bg-slate-50/50">
                   <span className="font-bold">التاريخ:</span>
                   <span className="font-black tabular-nums font-mono text-xl">{new Date(absence.date).toLocaleDateString('ar-SA')}</span>
                </div>
             </div>
             <div className="grid grid-cols-3">
                <div className="p-4 border-l-[2pt] border-slate-900 flex justify-between items-center bg-slate-100">
                   <span className="font-bold">اللجنة:</span>
                   <span className="font-black text-3xl font-mono tabular-nums">{absence.committee_number}</span>
                </div>
                <div className="p-4 border-l-[2pt] border-slate-900 flex justify-between items-center">
                   <span className="font-bold">الصف:</span>
                   <span className="font-black text-lg">{student?.grade || '.........'}</span>
                </div>
                <div className="p-4 flex justify-between items-center bg-slate-100">
                   <span className="font-bold">الفصل:</span>
                   <span className="font-black text-lg">{student?.section || '.........'}</span>
                </div>
             </div>
          </div>

          <div className="mb-10">
            <div className="bg-slate-900 text-white p-3 border-[2pt] border-slate-900 text-center font-black text-sm uppercase tracking-widest mb-[2px]">بيان المصادقة والمطابقة (لجنة الكنترول)</div>
            <table className="w-full border-[2pt] border-slate-900 text-[13px] text-center border-collapse">
              <thead className="bg-slate-200 font-bold">
                <tr>
                  <th className="border border-slate-900 p-3 w-12">م</th>
                  <th className="border border-slate-900 p-3 text-right">الاسم الرباعي للمصادق</th>
                  <th className="border border-slate-900 p-3 w-48">الصفة</th>
                  <th className="border border-slate-900 p-3 w-48">التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'رئيس لجنة الكنترول' },
                  { role: 'عضو لجنة الكنترول' },
                  { role: 'مراقب اللجنة المعني', name: proctorName }
                ].map((row, i) => (
                  <tr key={i} className="h-16">
                    <td className="border border-slate-900 p-3 font-bold">{i+1}</td>
                    <td className="border border-slate-900 p-3 text-right font-black">{row.name || '................................................'}</td>
                    <td className="border border-slate-900 p-3 font-black bg-slate-50/50">{row.role}</td>
                    <td className="border border-slate-900 p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-20 px-10 pb-10">
             <div className="text-center space-y-24">
                <p className="text-xl font-black underline underline-offset-[12px] decoration-2">يعتمد / مدير المدرسة</p>
                <div className="space-y-2">
                  <p className="font-bold">..............................................</p>
                  <p className="text-slate-400 italic text-[11px]">الختم الرسمي للمؤسسة التعليمية</p>
                </div>
             </div>
             <div className="text-center space-y-24">
                <p className="text-xl font-black underline underline-offset-[12px] decoration-2">الموجه الطلابي</p>
                <p className="font-bold">..............................................</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const DelayForm = ({ absence }: { absence: Absence }) => {
    const student = students.find(s => s.national_id === absence.student_id);
    const proctorName = getProctorName(absence.committee_number, absence.date);

    return (
      <div className="official-page-container">
        <div className="official-a4-page relative flex flex-col border-4 border-slate-900 p-8">
          <OfficialHeader />
          <div className="text-center mb-12 mt-8">
            <p className="text-[10px] font-black text-slate-500 mb-1 tracking-widest uppercase">النموذج الموحد رقم: 31</p>
            <h2 className="text-4xl font-black mb-4 border-b-8 border-double border-slate-900 inline-block px-12 pb-2">تعهد تأخر طالب عن اختبار</h2>
          </div>
          
          <div className="p-12 border-[2pt] border-slate-900 bg-slate-50 leading-[3.5] text-xl mb-12 rounded-xl text-justify shadow-inner">
             <p className="mb-8">
               أقر أنا الطالب / <span className="font-black text-3xl px-6 border-b-2 border-slate-400 inline-block min-w-[350px] text-center">{absence.student_name}</span>
             </p>
             <p className="mb-8">
               المقيد في الصف: <span className="font-black underline px-3 text-2xl">{student?.grade || '........'}</span> 
               فصل: <span className="font-black underline px-3 text-2xl">{student?.section || '........'}</span>
             </p>
             <p>
               بأنني قد تأخرت عن موعد بدء اختبار اليوم <span className="font-black tabular-nums border-b-2 border-dashed border-slate-400 text-2xl px-2"> {new Date(absence.date).toLocaleDateString('ar-SA')} </span>، 
               وأتعهد بالالتزام بالحضور المبكر في الأيام القادمة، وفي حالة تكرار ذلك أتحمل كافة الإجراءات النظامية المتبعة بحق المتأخرين.
             </p>
             
             <div className="flex justify-end mt-20 ml-10">
                <div className="text-center min-w-[300px] space-y-6">
                  <p className="font-black text-2xl">توقيع الطالب المقر بما فيه</p>
                  <p className="text-slate-300 tracking-tighter text-2xl">................................................</p>
                </div>
             </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-20 px-10 pb-12">
             <div className="text-center space-y-20">
                <p className="font-black text-2xl underline underline-offset-8">مراقب اللجنة</p>
                <p className="font-black text-xl">{proctorName}</p>
                <p className="font-bold">........................................</p>
             </div>
             <div className="text-center space-y-20">
                <p className="font-black text-2xl underline underline-offset-8">مدير المدرسة</p>
                <p className="text-slate-300 text-sm mt-12">(الختم الرسمي)</p>
                <p className="font-bold">........................................</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const CumulativeReport = () => {
    return (
      <div className="official-page-container">
        <div className="official-a4-page relative flex flex-col border-4 border-slate-900 p-8">
          <OfficialHeader />
          <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-black mb-4 border-b-8 border-double border-slate-900 inline-block px-12 pb-2">
              سجل الحالات التراكمي لعام {new Date().getFullYear()}
            </h2>
            <p className="text-lg font-black bg-slate-900 text-white inline-block px-8 py-1 rounded-full">
              كشف {cumulativeType === 'ABSENT' ? 'الغياب التراكمي الشامل' : 'التأخر التراكمي الشامل'}
            </p>
          </div>

          <table className="w-full border-[2pt] border-slate-900 text-[14px] text-center border-collapse mt-6">
            <thead className="bg-slate-100 font-black">
              <tr className="h-14">
                <th className="border border-slate-900 p-3 w-12">م</th>
                <th className="border border-slate-900 p-3 text-right">الاسم الكامل للطالب</th>
                <th className="border border-slate-900 p-3 w-32">الصف</th>
                <th className="border border-slate-900 p-3 w-24">الفصل</th>
                <th className="border border-slate-900 p-3 w-28">مرات {cumulativeType === 'ABSENT' ? 'الغياب' : 'التأخر'}</th>
                <th className="border border-slate-900 p-3 w-32">اللجان المرتبطة</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeData.map((item, i) => (
                <tr key={item.student.id} className="h-14 hover:bg-slate-50">
                  <td className="border border-slate-900 p-3 font-bold tabular-nums">{i+1}</td>
                  <td className="border border-slate-900 p-3 text-right font-black">{item.student.name}</td>
                  <td className="border border-slate-900 p-3 font-bold">{item.student.grade}</td>
                  <td className="border border-slate-900 p-3 font-bold">{item.student.section}</td>
                  <td className="border border-slate-900 p-3 font-black text-xl text-blue-700 bg-blue-50/30 tabular-nums">
                    {item.count}
                  </td>
                  <td className="border border-slate-900 p-3 font-mono text-xs tabular-nums">
                    {Array.from(item.committees).join(' - ')}
                  </td>
                </tr>
              ))}
              {cumulativeData.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-20 text-slate-400 italic">لا توجد بيانات مسجلة في هذا السجل حالياً</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-auto grid grid-cols-2 gap-20 px-10 pb-10">
             <div className="text-center space-y-20">
                <p className="text-xl font-black underline">مدير المدرسة</p>
                <p className="font-bold">..............................................</p>
             </div>
             <div className="text-center space-y-20">
                <p className="text-xl font-black underline">الموجه الطلابي</p>
                <p className="font-bold">..............................................</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24 relative">
      
      {/* Print Portal */}
      {isPrinting && createPortal(
         <div id="print-portal-container">
            <style>{`
               @media print {
                  @page { size: A4 portrait; margin: 0; }
                  body { background: white; margin: 0; padding: 0; }
                  #root, .app-root, header, .no-print { display: none !important; } 
                  
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
                     page-break-after: always;
                     padding: 5mm;
                     box-sizing: border-box;
                     display: flex;
                     justify-content: center;
                     background: white;
                  }

                  .official-a4-page {
                     width: 100%;
                     height: 100%;
                     background: white;
                     color: black;
                  }
                  
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
               }
            `}</style>
            
            {printType === 'INDIVIDUAL' ? (
              printQueue.map((item, idx) => (
                <div key={`${item.id}-${idx}`}>
                   {item.type === 'ABSENT' ? <AbsenceForm absence={item} /> : <DelayForm absence={item} />}
                </div>
              ))
            ) : (
              <CumulativeReport />
            )}
         </div>,
         document.body
      )}

      {isPrinting && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
           <Loader2 size={100} className="animate-spin text-blue-500 mb-6" />
           <h3 className="text-4xl font-black tracking-tighter">جاري تحضير المحاضر الرسمية...</h3>
           <p className="text-slate-400 font-bold mt-4">سيتم فتح نافذة الطباعة تلقائياً</p>
        </div>
      )}

      {/* Main UI */}
      <div className="no-print space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-8 border-blue-600 pb-10">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">مركز استخراج النماذج</h2>
            <p className="text-slate-400 font-bold mt-2 text-lg italic flex items-center gap-2">
               <FileCheck className="text-blue-600" size={20}/> استخراج نماذج 36 و 31 وكشوف التراكمي المعتمدة
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-[2.5rem] shadow-xl border">
            <div className="relative">
              <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="date" className="pr-14 pl-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg shadow-inner outline-none focus:border-blue-600 transition-all" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <button 
              disabled={dailyAbsences.length === 0} 
              onClick={() => triggerPrint(dailyAbsences, 'INDIVIDUAL')} 
              className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-4 active:scale-95"
            >
              <Printer size={28} /> طباعة محاضر اليوم ({dailyAbsences.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[15px] border-red-600">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                    <h3 className="text-3xl font-black flex items-center gap-4 text-red-500 underline underline-offset-8 decoration-4 decoration-red-600/30">سجل الغياب التراكمي</h3>
                    <p className="text-sm text-slate-400 font-bold max-w-xs italic leading-relaxed">استخراج كشف (الاسم، الصف، الفصل، تكرار الغياب) لكافة الطلاب.</p>
                </div>
                <div className="text-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 min-w-[140px] shadow-inner">
                    <p className="text-6xl font-black tabular-nums tracking-tighter">{allAbsences.length}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2">حالة غياب</p>
                </div>
              </div>
              <button onClick={() => { setCumulativeType('ABSENT'); triggerPrint([], 'CUMULATIVE'); }} className="mt-12 w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95">
                <ListChecks size={28}/> استخراج الكشف التراكمي
              </button>
          </div>

          <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[15px] border-amber-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                    <h3 className="text-3xl font-black flex items-center gap-4 text-amber-500 underline underline-offset-8 decoration-4 decoration-amber-600/30">سجل التأخر التراكمي</h3>
                    <p className="text-sm text-slate-400 font-bold max-w-xs italic leading-relaxed">استخراج كشف (الاسم، الصف، الفصل، تكرار التأخر) لكافة الطلاب.</p>
                </div>
                <div className="text-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 min-w-[140px] shadow-inner">
                    <p className="text-6xl font-black tabular-nums tracking-tighter">{allDelays.length}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2">حالة تأخر</p>
                </div>
              </div>
              <button onClick={() => { setCumulativeType('LATE'); triggerPrint([], 'CUMULATIVE'); }} className="mt-12 w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95">
                <History size={28}/> استخراج الكشف التراكمي
              </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-5 border-b pb-6 mt-16">
              <div className="p-4 bg-blue-600 text-white rounded-[1.8rem] shadow-xl"><ListChecks size={28} /></div>
              <h3 className="text-3xl font-black text-slate-900 uppercase">المحاضر الفردية المتاحة (اليوم)</h3>
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
                          <div className="bg-slate-900 text-white px-5 py-1.5 rounded-xl text-xs font-black tabular-nums">لجنة {a.committee_number}</div>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 leading-tight h-14 overflow-hidden break-words">{a.student_name}</h4>
                        <div className="flex items-center gap-3 text-slate-400 font-bold bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                          <Info size={16} className="text-blue-500" />
                          <span className="tabular-nums">ID: {a.student_id}</span>
                        </div>
                    </div>
                    <button onClick={() => triggerPrint([a], 'INDIVIDUAL')} className="mt-10 w-full py-5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-2xl font-black text-sm transition-all flex justify-center items-center gap-4 shadow-lg active:scale-95">
                        <Printer size={20}/> استعراض وطباعة المحضر
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
