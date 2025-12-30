
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Student, Absence, DeliveryLog, Supervision, ControlRequest } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  PackageCheck, Clock, Users, LayoutGrid, Scan, 
  CheckCircle2, Check, ChevronLeft, Loader2, Save, 
  Trophy, Zap, History, UserCircle, UserX, AlertCircle,
  X, Lock, Unlock, Camera, ShieldCheck, UserCheck,
  ClipboardCheck, MapPin, Search, GraduationCap, ArrowRight
} from 'lucide-react';
import { db } from '../../supabase';

interface Props {
  user: User;
  students: Student[];
  absences: Absence[];
  deliveryLogs: DeliveryLog[];
  setDeliveryLogs: (log: DeliveryLog) => Promise<void>;
  supervisions: Supervision[];
  users: User[];
  onAlert: any;
  controlRequests: ControlRequest[];
  setControlRequests: any;
  systemConfig: any;
}

const ControlReceiptView: React.FC<Props> = ({ user, students, absences, deliveryLogs, setDeliveryLogs, supervisions, users, onAlert, controlRequests, setControlRequests, systemConfig }) => {
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const todayDate = systemConfig?.active_exam_date || new Date().toISOString().split('T')[0];

  const cleanId = (id: string | number | undefined): string => {
    if (id === undefined || id === null) return '';
    return String(id).trim();
  };

  const getUniqueKey = (committee: string | number, grade: string): string => {
    return `${cleanId(committee)}_${grade.trim()}`;
  };

  // اللجان التي أغلقها المراقب ميدانياً اليوم وتنتظر الاستلام الفعلي
  const proctorSubmittedCommittees = useMemo(() => {
    return new Set(
      deliveryLogs
        .filter(l => l.type === 'RECEIVE' && l.time.startsWith(todayDate) && (l.status === 'PENDING' || l.proctor_name))
        .map(l => cleanId(l.committee_number))
    );
  }, [deliveryLogs, todayDate]);

  const receivedKeys = useMemo(() => {
    return new Set(deliveryLogs.filter(l => l.type === 'RECEIVE' && l.status === 'CONFIRMED' && l.time.startsWith(todayDate)).map(l => getUniqueKey(l.committee_number, l.grade)));
  }, [deliveryLogs, todayDate]);

  const myGrades = useMemo(() => {
    const all = Array.from(new Set(students.map(s => s.grade))).filter(Boolean);
    if (user.role === 'ADMIN') return all;
    return all.filter(g => user.assigned_grades?.includes(g));
  }, [students, user]);

  const myTotalScope = useMemo(() => {
    const map: Record<string, { grade: string, count: number, committee: string, key: string }> = {};
    students.filter(s => myGrades.includes(s.grade)).forEach(s => {
      const key = getUniqueKey(s.committee_number, s.grade);
      if (!map[key]) {
        map[key] = { grade: s.grade, count: 0, committee: cleanId(s.committee_number), key };
      }
      map[key].count++;
    });
    return map;
  }, [students, myGrades]);

  const stats = useMemo(() => {
    const allKeys = Object.keys(myTotalScope);
    const remaining = allKeys.filter(k => !receivedKeys.has(k));
    
    return {
      remainingCount: remaining.length,
      remainingKeys: remaining.sort((a, b) => parseInt(myTotalScope[a].committee) - parseInt(myTotalScope[b].committee))
    };
  }, [myTotalScope, receivedKeys]);

  const currentQueue = useMemo(() => {
    if (!activeCommitteeId) return [];
    return Object.keys(myTotalScope)
      .filter(k => myTotalScope[k].committee === cleanId(activeCommitteeId) && !receivedKeys.has(k))
      .map(k => ({ ...myTotalScope[k] }))
      .sort((a, b) => a.grade.localeCompare(b.grade));
  }, [activeCommitteeId, myTotalScope, receivedKeys]);

  // دالة المعالجة الذكية (تقبل رقم لجنة أو رقم هوية مراقب)
  const handleStartProcess = (val: string) => {
    const input = cleanId(val);
    if (!input) return;

    let targetCommitteeNum = input;
    
    // 1. التحقق أولاً: هل المدخل هو رقم هوية مراقب مسجل؟
    const proctorUser = users.find(u => cleanId(u.national_id) === input);
    
    if (proctorUser) {
      // إذا كانت هوية مراقب، نبحث عن تكليفه النشط اليوم
      const sv = supervisions.find(s => s.teacher_id === proctorUser.id && s.date.startsWith(todayDate));
      if (sv) {
        targetCommitteeNum = cleanId(sv.committee_number);
        onAlert(`تم التعرف على المراقب: ${proctorUser.full_name} - لجنة ${targetCommitteeNum}`);
      } else {
        onAlert(`تنبيه: المراقب ${proctorUser.full_name} ليس لديه تكليف مسجل اليوم.`);
        return;
      }
    }

    // 2. التحقق من أن اللجنة (سواء أدخلت مباشرة أو عبر هوية المراقب) قد تم إنهاؤها ميدانياً
    if (!proctorSubmittedCommittees.has(targetCommitteeNum)) {
      onAlert(`عذراً: اللجنة ${targetCommitteeNum} لم يتم إنهاؤها ميدانياً من قبل المراقب بعد.`);
      return;
    }

    // 3. التحقق من التبعية والصلاحيات
    const waiting = Object.keys(myTotalScope).filter(k => myTotalScope[k].committee === targetCommitteeNum && !receivedKeys.has(k));
    if (waiting.length === 0) {
      onAlert(`اللجنة ${targetCommitteeNum} مستلمة بالكامل أو خارج نطاق صلاحياتك الحالية.`);
      return;
    }

    setActiveCommitteeId(targetCommitteeNum);
    setCurrentQueueIndex(0);
    setSearchInput('');
    stopScanner();
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try { 
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop(); 
        }
      } catch (e) { console.warn(e); } finally {
        qrScannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const confirmReceipt = async () => {
    const item = currentQueue[currentQueueIndex];
    if (!item) return;

    const sv = supervisions.find(s => cleanId(s.committee_number) === item.committee && s.date.startsWith(todayDate));
    const proctorObj = users.find(u => u.id === sv?.teacher_id);
    
    const newLog: DeliveryLog = { 
      id: crypto.randomUUID(), 
      teacher_name: user.full_name, 
      proctor_name: proctorObj?.full_name || 'استلام مباشر', 
      committee_number: item.committee, 
      grade: item.grade, 
      type: 'RECEIVE', 
      time: new Date().toISOString(), 
      period: 1, 
      status: 'CONFIRMED' 
    };

    setIsSaving(true);
    try {
      await setDeliveryLogs(newLog);
      setIsSuccessState(true);
      setTimeout(() => {
        setIsSuccessState(false);
        if (currentQueue.length <= 1) {
          setActiveCommitteeId(null);
        } else {
          setCurrentQueueIndex(0);
        }
      }, 1000);
    } catch (error: any) {
      onAlert(`فشل التوثيق: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32 px-4 md:px-0 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b pb-8">
        <div className="space-y-2">
          <div className="bg-blue-600 text-white px-4 py-1 rounded-lg text-[10px] font-black w-fit shadow-lg uppercase tracking-widest">مركز التوثيق والاستلام المركزي</div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">مطابقة واستلام المظاريف</h2>
          <p className="text-slate-400 font-bold italic flex items-center gap-2 tracking-tight mt-2">التاريخ النشط حالياً: {todayDate}</p>
        </div>
      </div>

      <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden group border-b-[10px] border-blue-600">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-blue-600/20"></div>
         <div className="relative z-10 space-y-10 text-center">
            <div className="space-y-2">
               <h3 className="text-3xl font-black text-white">تحقق من الهوية الميدانية</h3>
               <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Scan Committee QR or Proctor ID</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-stretch max-w-4xl mx-auto">
               <button 
                 onClick={() => {
                   setIsScanning(true);
                   setTimeout(async () => {
                     try {
                       const scanner = new Html5Qrcode("receipt-qr-v15");
                       qrScannerRef.current = scanner;
                       await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { 
                         handleStartProcess(text); 
                       }, () => {});
                     } catch (err) { setIsScanning(false); }
                   }, 300);
                 }} 
                 className="flex-[2] bg-blue-600 text-white p-12 rounded-[3rem] font-black text-3xl flex flex-col items-center justify-center gap-6 shadow-2xl hover:bg-blue-700 transition-all active:scale-95 group/btn"
               >
                  <div className="flex items-center gap-4">
                     <Camera size={64} className="group-hover/btn:rotate-12 transition-transform" />
                     <LayoutGrid size={40} className="text-white/40" />
                  </div>
                  <span>بدء المسح الذكي للكود</span>
                  <p className="text-[10px] opacity-60 font-bold tracking-widest leading-none">يدعم كود اللجنة وكود المراقب</p>
               </button>

               <div className="flex-1 bg-white/5 border-2 border-white/10 rounded-[3rem] p-6 flex flex-col items-center justify-center gap-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">أو أدخل رقم اللجنة / الهوية</p>
                  <div className="flex gap-2 w-full px-2">
                     <input 
                       type="text" 
                       value={searchInput} 
                       onChange={e => setSearchInput(e.target.value)} 
                       placeholder="00" 
                       className="bg-transparent border-0 flex-1 px-4 font-black text-4xl text-center text-white outline-none placeholder:text-white/10" 
                     />
                     <button onClick={() => handleStartProcess(searchInput)} className="bg-white text-slate-950 p-6 rounded-[2rem] shadow-xl hover:bg-blue-400 transition-all active:scale-90"><ArrowRight size={28}/></button>
                  </div>
               </div>
            </div>
         </div>

         {isScanning && (
            <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
              <div id="receipt-qr-v15" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
              <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95">إلغاء وإغلاق</button>
            </div>
         )}
      </div>

      {activeCommitteeId && currentQueue.length > 0 && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-fade-in no-print overflow-y-auto">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => !isSaving && setActiveCommitteeId(null)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden border-b-[15px] border-slate-900 my-auto animate-slide-up">
               
               {isSaving || isSuccessState ? (
                  <div className="p-24 text-center space-y-10 animate-fade-in flex flex-col items-center">
                    {isSaving ? <Loader2 size={120} className="text-blue-600 animate-spin" /> : <ShieldCheck size={120} className="text-emerald-500 animate-bounce" />}
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{isSaving ? 'جاري الأرشفة والتوثيق...' : 'تم التوثيق المركزي بنجاح'}</h3>
                  </div>
               ) : (
                  <div>
                    <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full"></div>
                       <div className="flex items-center gap-6 relative z-10">
                          <div className="w-20 h-20 bg-blue-600 text-white rounded-[1.8rem] flex flex-col items-center justify-center font-black shadow-2xl">
                             <span className="text-[10px] opacity-50 uppercase leading-none mb-1">لجنة</span>
                             <span className="text-4xl leading-none">{activeCommitteeId}</span>
                          </div>
                          <div>
                             <h3 className="text-3xl font-black tracking-tight">محضر مطابقة واستلام</h3>
                             <p className="text-blue-400 text-sm font-bold mt-1 uppercase tracking-widest">Final Matching Protocol</p>
                          </div>
                       </div>
                       <button onClick={() => setActiveCommitteeId(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"><X size={32}/></button>
                    </div>

                    <div className="p-10 space-y-10">
                       <div className="flex flex-col md:flex-row items-center gap-8 justify-between border-b border-slate-100 pb-8">
                          <div className="text-center md:text-right flex-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">الصف المستهدف للمطابقة</p>
                             <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight break-words">{currentQueue[currentQueueIndex].grade}</h4>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center min-w-[150px] shadow-inner">
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">إجمالي الطلاب</p>
                             <span className="text-5xl font-black text-slate-950 tabular-nums">{currentQueue[currentQueueIndex].count}</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-4">
                          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center shadow-sm">
                             <p className="text-[10px] font-black text-emerald-800 uppercase mb-1 leading-none">الحضور</p>
                             <p className="text-3xl font-black text-emerald-700 tabular-nums">
                               {currentQueue[currentQueueIndex].count - absences.filter(a => a.committee_number === activeCommitteeId && a.type === 'ABSENT' && a.date.startsWith(todayDate) && students.find(s => s.national_id === a.student_id)?.grade === currentQueue[currentQueueIndex].grade).length}
                             </p>
                          </div>
                          <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] text-center shadow-sm">
                             <p className="text-[10px] font-black text-red-800 uppercase mb-1 leading-none">الغياب</p>
                             <p className="text-3xl font-black text-red-700 tabular-nums">
                               {absences.filter(a => a.committee_number === activeCommitteeId && a.type === 'ABSENT' && a.date.startsWith(todayDate) && students.find(s => s.national_id === a.student_id)?.grade === currentQueue[currentQueueIndex].grade).length}
                             </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] text-center shadow-sm">
                             <p className="text-[10px] font-black text-amber-800 uppercase mb-1 leading-none">التأخر</p>
                             <p className="text-3xl font-black text-amber-700 tabular-nums">
                               {absences.filter(a => a.committee_number === activeCommitteeId && a.type === 'LATE' && a.date.startsWith(todayDate) && students.find(s => s.national_id === a.student_id)?.grade === currentQueue[currentQueueIndex].grade).length}
                             </p>
                          </div>
                       </div>

                       <div className="bg-blue-50/50 p-8 rounded-[3rem] border border-blue-100 flex items-center gap-6 group transition-all hover:bg-blue-100">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-blue-100"><UserCheck size={36} className="text-blue-600" /></div>
                          <div className="flex-1 text-right">
                             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">المراقب الميداني الموثق</p>
                             <h5 className="text-2xl font-black text-slate-800 leading-tight">
                                {users.find(u => u.id === supervisions.find(s => cleanId(s.committee_number) === activeCommitteeId && s.date.startsWith(todayDate))?.teacher_id)?.full_name || '---'}
                             </h5>
                          </div>
                       </div>

                       <button 
                         onClick={confirmReceipt} 
                         disabled={isSaving}
                         className="w-full py-8 bg-slate-950 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 shadow-emerald-500/20"
                       >
                          <Save size={36}/> مطابقة وتوثيق الاستلام النهائي
                       </button>
                    </div>
                  </div>
               )}
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {stats.remainingKeys.length === 0 ? (
           <div className="col-span-full py-24 bg-emerald-50 rounded-[4rem] border-2 border-dashed border-emerald-200 text-center flex flex-col items-center gap-6">
              <Trophy size={80} className="text-emerald-500 animate-bounce" />
              <h3 className="text-3xl font-black text-emerald-800">اكتمل استلام جميع مظاريف اليوم بنجاح</h3>
           </div>
         ) : (
           stats.remainingKeys.map(key => {
             const info = myTotalScope[key];
             const isReady = proctorSubmittedCommittees.has(info.committee);
             const sv = supervisions.find(s => cleanId(s.committee_number) === info.committee && s.date.startsWith(todayDate));
             const proctor = users.find(u => u.id === sv?.teacher_id);
             
             return (
               <div key={key} className={`bg-white p-8 rounded-[3.5rem] border-2 shadow-xl transition-all relative overflow-hidden group ${isReady ? 'border-emerald-400 bg-emerald-50/20 scale-[1.02]' : 'border-slate-50 opacity-80'}`}>
                  {isReady && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-6 py-2 rounded-bl-[1.5rem] font-black text-[9px] uppercase tracking-widest flex items-center gap-2 animate-pulse">
                      <ClipboardCheck size={14}/> جاهزة للمطابقة
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                     <div className="flex flex-col">
                        <span className={`text-6xl font-black leading-none tracking-tighter ${isReady ? 'text-slate-900' : 'text-slate-300'}`}>{info.committee}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">لجنة ميدانية</span>
                     </div>
                     <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${isReady ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                        {info.grade}
                     </div>
                  </div>

                  <div className="space-y-4 mb-8">
                     <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-slate-100 shadow-sm transition-all group-hover:bg-white">
                        <UserCircle size={20} className={isReady ? 'text-blue-500' : 'text-slate-300'} />
                        <div className="min-w-0 flex-1">
                           <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">المراقب المسؤول</p>
                           <p className="text-sm font-black text-slate-700 truncate">{proctor?.full_name || 'بانتظار المباشرة...'}</p>
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={() => handleStartProcess(info.committee)}
                    className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl ${isReady ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'}`}
                  >
                     {isReady ? <>بدء المطابقة الفورية <ArrowRight size={24} className="rotate-180" /></> : <><Lock size={20} /> قيد الرصد الميداني</>}
                  </button>
               </div>
             );
           })
         )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ControlReceiptView;
