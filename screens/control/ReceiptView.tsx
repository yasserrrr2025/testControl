
import React, { useState, useMemo, useRef } from 'react';
import { User, Student, Absence, DeliveryLog, Supervision, ControlRequest } from '../../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  PackageCheck, Clock, Users, LayoutGrid, Scan, ArrowRightLeft, 
  CheckCircle2, Check, ChevronLeft, Loader2, Save, 
  Trophy, Zap, History, UserCircle, UserX, AlertCircle, RefreshCw,
  Search, Info, X, Lock, Unlock
} from 'lucide-react';

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
}

const ControlReceiptView: React.FC<Props> = ({ user, students, absences, deliveryLogs, setDeliveryLogs, supervisions, users, onAlert, controlRequests, setControlRequests }) => {
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [showFinalCelebration, setShowFinalCelebration] = useState(false);
  const [optimisticLogs, setOptimisticLogs] = useState<DeliveryLog[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const cleanId = (id: string | number | undefined): string => {
    if (id === undefined || id === null) return '';
    const str = String(id).trim();
    const num = parseInt(str, 10);
    return isNaN(num) ? str : String(num);
  };

  const cleanGrade = (g: string | undefined): string => {
    if (!g) return '';
    return g.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ');
  };

  const getUniqueKey = (committee: string | number, grade: string): string => {
    return `${cleanId(committee)}_${cleanGrade(grade)}`;
  };

  // اللجان التي قام المراقب بإغلاقها وبانتظار الكنترول (PENDING)
  const pendingCommittees = useMemo(() => {
    return new Set(deliveryLogs.filter(l => l.status === 'PENDING').map(l => cleanId(l.committee_number)));
  }, [deliveryLogs]);

  const allLogs = useMemo(() => {
    const serverIds = new Set(deliveryLogs.map(l => l.id));
    const uniqueOptimistic = optimisticLogs.filter(ol => !serverIds.has(ol.id));
    return [...uniqueOptimistic, ...deliveryLogs].sort((a, b) => b.time.localeCompare(a.time));
  }, [deliveryLogs, optimisticLogs]);

  const receivedKeys = useMemo(() => {
    return new Set(allLogs.filter(l => l.type === 'RECEIVE' && l.status === 'CONFIRMED').map(l => getUniqueKey(l.committee_number, l.grade)));
  }, [allLogs]);

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
    const received = allKeys.filter(k => receivedKeys.has(k));
    const remaining = allKeys.filter(k => !receivedKeys.has(k));

    let totalWaitingStud = 0;
    remaining.forEach(k => totalWaitingStud += myTotalScope[k].count);

    let totalReceivedStud = 0;
    received.forEach(k => totalReceivedStud += myTotalScope[k].count);
    
    return {
      receivedCount: received.length,
      remainingCount: remaining.length,
      totalWaitingStud,
      totalReceivedStud,
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

  const handleStartProcess = (val: string, specificKey?: string) => {
    const input = cleanId(val);
    if (!input) return;

    let targetCommitteeNum = input;
    
    // إذا كان المدخل هو رقم هوية معلم، نجد رقم لجنته
    const teacher = users.find(u => cleanId(u.national_id) === input);
    if (teacher) {
      const sv = supervisions.find(s => s.teacher_id === teacher.id);
      if (sv) targetCommitteeNum = cleanId(sv.committee_number);
      else { onAlert("هذا المعلم ليس لديه لجنة مسندة حالياً"); return; }
    }

    // القيد الأمني: التحقق هل أغلق المراقب اللجنة؟
    if (!pendingCommittees.has(targetCommitteeNum)) {
      onAlert({ 
        message: `تنبيه: المراقب لم يغلق اللجنة رقم ${targetCommitteeNum} بعد. يرجى إبلاغه بإنهاء الرصد الرقمي من جهازه أولاً.`,
        type: 'error' 
      });
      setIsScanning(false);
      scannerRef.current?.clear();
      return;
    }

    const waiting = Object.keys(myTotalScope).filter(k => myTotalScope[k].committee === targetCommitteeNum && !receivedKeys.has(k));
    
    if (waiting.length === 0) {
      onAlert(`اللجنة ${targetCommitteeNum} مستلمة بالكامل أو غير تابعة لصلاحياتك`);
      return;
    }

    setActiveCommitteeId(targetCommitteeNum);
    if (specificKey) {
      const idx = waiting.sort().indexOf(specificKey);
      setCurrentQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setCurrentQueueIndex(0);
    }
    setSearchInput('');
    setIsScanning(false);
    scannerRef.current?.clear();
  };

  const confirmReceipt = async () => {
    const item = currentQueue[currentQueueIndex];
    if (!item) return;

    const sv = supervisions.find(s => cleanId(s.committee_number) === item.committee);
    const proctor = users.find(u => u.id === sv?.teacher_id);
    
    // نجد السجل الذي حالته PENDING لنقوم بتحديثه (أو نضيف سجل CONFIRMED مقابلاً له)
    const existingPendingLog = deliveryLogs.find(l => cleanId(l.committee_number) === item.committee && l.status === 'PENDING' && l.grade.includes(item.grade));

    const newLog: DeliveryLog = { 
      id: existingPendingLog?.id || crypto.randomUUID(), 
      teacher_name: user.full_name, 
      proctor_name: proctor?.full_name || 'غير معروف', 
      committee_number: item.committee, 
      grade: item.grade, 
      type: 'RECEIVE', 
      time: new Date().toISOString(), 
      period: 1, 
      status: 'CONFIRMED' 
    };

    setOptimisticLogs(prev => [newLog, ...prev]);
    setIsSaving(true);

    try {
      await setDeliveryLogs(newLog);
      setIsSuccessState(true);
      
      setTimeout(() => {
        setIsSuccessState(false);
        if (currentQueue.length <= 1) {
          setShowFinalCelebration(true);
          setTimeout(() => {
            setShowFinalCelebration(false);
            setActiveCommitteeId(null);
          }, 2000);
        } else {
          setCurrentQueueIndex(0);
        }
      }, 1200);
    } catch (error: any) {
      setOptimisticLogs(prev => prev.filter(l => l.id !== newLog.id));
      onAlert(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (activeCommitteeId && currentQueue.length > 0) {
    const info = currentQueue[currentQueueIndex];
    const committeeStudents = students.filter(s => getUniqueKey(s.committee_number, s.grade) === info.key);
    const committeeAbsences = absences.filter(a => cleanId(a.committee_number) === info.committee && committeeStudents.some(s => s.national_id === a.student_id));
    const abs = committeeAbsences.filter(a => a.type === 'ABSENT').length;
    const late = committeeAbsences.filter(a => a.type === 'LATE').length;
    const proctor = users.find(u => u.id === supervisions.find(s => cleanId(s.committee_number) === info.committee)?.teacher_id);

    return (
      <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-fade-in no-print overflow-hidden">
        <div className="bg-white border-b p-6 flex justify-between items-center shadow-sm">
          <button onClick={() => setActiveCommitteeId(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200">
            <X size={24} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">توثيق استلام نهائي</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">لجنة رقم {info.committee}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black border border-emerald-200 shadow-inner">
             <Unlock size={20} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className={`bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl border-2 relative overflow-hidden transition-all ${isSuccessState ? 'border-emerald-500 bg-emerald-50/10' : 'border-blue-100'}`}>
            {(isSaving || isSuccessState || showFinalCelebration) && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                <div className="bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl mb-6">
                  {isSaving ? <Loader2 size={48} className="text-blue-500 animate-spin" /> : <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />}
                </div>
                <h3 className="text-3xl font-black text-slate-900">{isSaving ? 'جاري الحفظ...' : 'تم التوثيق والأرشفة'}</h3>
              </div>
            )}

            <div className="flex flex-col items-center text-center">
              <div className="text-[70px] md:text-[90px] font-black text-slate-900 leading-none mb-2 tracking-tighter drop-shadow-sm">{info.committee}</div>
              <h4 className="text-2xl md:text-3xl font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-full border border-blue-100 mb-8 w-full md:w-auto break-words">{info.grade}</h4>
              
              <div className="bg-slate-50 p-6 rounded-[2.5rem] w-full border border-slate-100 mb-8 group">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">المراقب المسلم (المعلم)</p>
                <h5 className="text-lg md:text-xl font-black text-slate-800 leading-tight whitespace-normal break-words">{proctor?.full_name || 'غير معروف'}</h5>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4 w-full mb-10">
                <div className="bg-white border rounded-[1.8rem] p-4 text-center shadow-sm">
                  <p className="text-[9px] text-slate-400 font-black mb-1 uppercase">إجمالي الطلاب</p>
                  <p className="text-3xl font-black text-slate-900 leading-none">{info.count}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-[1.8rem] p-4 text-center shadow-sm">
                  <p className="text-[9px] text-emerald-600 font-black mb-1 uppercase">الحضور</p>
                  <p className="text-3xl font-black text-emerald-700 leading-none">{info.count - abs}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-[1.8rem] p-4 text-center shadow-sm">
                  <p className="text-[9px] text-red-600 font-black mb-1 uppercase">الغياب</p>
                  <p className="text-3xl font-black text-red-700 leading-none">{abs}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-[1.8rem] p-4 text-center shadow-sm">
                  <p className="text-[9px] text-amber-600 font-black mb-1 uppercase">التأخير</p>
                  <p className="text-3xl font-black text-amber-700 leading-none">{late}</p>
                </div>
              </div>

              <button disabled={isSaving || isSuccessState} onClick={confirmReceipt} className="w-full py-7 bg-slate-950 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 hover:bg-emerald-600 transition-all">
                <Save size={32}/> تأكيد التوثيق النهائي
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-[2.5rem] border border-amber-100 text-amber-700">
            <div className="p-3 bg-amber-500 text-white rounded-xl shrink-0"><AlertCircle size={24} /></div>
            <p className="text-[11px] font-bold leading-relaxed">تنبيه المطابقة: تم استلام إغلاق رقمي من المراقب لهذه اللجنة. يرجى مطابقة الأعداد الورقية مع الحضور المرصود أعلاه قبل الحفظ.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24 px-1 md:px-0">
      <div className="flex flex-col gap-6 border-b pb-8">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">استلام المظاريف والوثائق</h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-blue-600 text-white p-5 rounded-[2.2rem] shadow-xl shadow-blue-200 flex flex-col justify-between h-32 md:h-36">
            <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">طلاب تم استلامهم</span>
            <span className="text-4xl font-black leading-none tabular-nums">{stats.totalReceivedStud}</span>
          </div>
          <div className="bg-amber-500 text-white p-5 rounded-[2.2rem] shadow-xl shadow-amber-200 flex flex-col justify-between h-32 md:h-36">
            <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">طلاب قيد الانتظار</span>
            <span className="text-4xl font-black leading-none tabular-nums">{stats.totalWaitingStud}</span>
          </div>
          <div className="bg-slate-900 text-white p-5 rounded-[2.2rem] shadow-xl flex flex-col justify-between h-32 md:h-36">
            <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">لجان مكتملة</span>
            <span className="text-4xl font-black leading-none tabular-nums">{stats.receivedCount}</span>
          </div>
          <div className="bg-white border-2 border-slate-100 p-5 rounded-[2.2rem] shadow-sm flex flex-col justify-between h-32 md:h-36">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">لجان جارية</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{stats.remainingCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-600/20 blur-3xl rounded-full -ml-24 -mt-24"></div>
        <div className="relative z-10 space-y-8">
          <h3 className="text-3xl font-black text-white text-center">بوابة الاستلام والمطابقة</h3>
          <div className="flex flex-col gap-6">
            <button onClick={() => {
              setIsScanning(true);
              setTimeout(() => {
                scannerRef.current = new Html5QrcodeScanner("receipt-scanner", { fps: 15, qrbox: 250 }, false);
                scannerRef.current.render((text) => handleStartProcess(text), () => {});
              }, 100);
            }} className="w-full p-8 bg-blue-600 rounded-[2.5rem] font-black text-xl text-white flex items-center justify-center gap-4 shadow-xl active:scale-95 hover:bg-blue-500">
              <Scan size={32}/> مسح الهوية الرقمية للمراقب
            </button>
            <div className="bg-white/5 p-4 rounded-[2.5rem] border border-white/10 flex items-stretch gap-0 overflow-hidden relative">
              <input 
                type="text" 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)} 
                placeholder="أدخل رقم اللجنة لمطابقتها..." 
                className="w-full bg-white/10 border-0 p-6 text-center text-4xl font-black text-white outline-none focus:bg-white/20 placeholder:text-white/10" 
              />
              <button 
                onClick={() => handleStartProcess(searchInput)} 
                className="bg-white text-slate-950 px-8 font-black shadow-xl flex items-center justify-center hover:bg-blue-50 active:scale-95 transition-all shrink-0"
              >
                <Zap size={36}/>
              </button>
            </div>
          </div>
        </div>
        
        {isScanning && (
          <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8">
            <div id="receipt-scanner" className="w-full max-w-sm rounded-[3rem] overflow-hidden bg-white border-8 border-white/10"></div>
            <button onClick={() => { setIsScanning(false); scannerRef.current?.clear(); }} className="mt-10 bg-white text-slate-950 px-16 py-5 rounded-[2rem] font-black text-2xl shadow-2xl">إلغاء المسح</button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h4 className="text-2xl font-black text-slate-800 px-4 flex justify-between items-center">
          <span>فرز حالة اللجان المنتظرة</span>
          <div className="flex gap-2">
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-100 flex items-center gap-2"><Unlock size={10}/> جاهزة</div>
            <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black border border-slate-200 flex items-center gap-2"><Lock size={10}/> قيد المراقبة</div>
          </div>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.remainingKeys.length === 0 ? (
            <div className="col-span-full py-20 bg-emerald-50 rounded-[4rem] border-2 border-dashed border-emerald-100 text-center flex flex-col items-center gap-4">
              <CheckCircle2 size={56} className="text-emerald-500" />
              <p className="text-emerald-800 font-black text-2xl">تم استلام كافة اللجان المسندة بنجاح!</p>
            </div>
          ) : stats.remainingKeys.map(key => {
            const info = myTotalScope[key];
            const isClosedByProctor = pendingCommittees.has(info.committee);
            const sv = supervisions.find(s => cleanId(s.committee_number) === info.committee);
            const proctor = users.find(u => u.id === sv?.teacher_id);
            const committeeKey = info.key;
            const cStudents = students.filter(s => getUniqueKey(s.committee_number, s.grade) === committeeKey);
            const cAbsences = absences.filter(a => cleanId(a.committee_number) === info.committee && cStudents.some(s => s.national_id === a.student_id));
            const abs = cAbsences.filter(a => a.type === 'ABSENT').length;
            const late = cAbsences.filter(a => a.type === 'LATE').length;

            return (
              <div key={key} className={`bg-white p-8 rounded-[3.5rem] border-2 shadow-xl transition-all group relative overflow-hidden ${isClosedByProctor ? 'border-emerald-200 shadow-emerald-50 scale-[1.02] z-10' : 'border-slate-50 opacity-80'}`}>
                {isClosedByProctor && (
                  <div className="absolute top-0 left-0 bg-emerald-500 text-white px-6 py-1.5 rounded-br-[1.5rem] font-black text-[10px] flex items-center gap-2 animate-pulse">
                    <Unlock size={12}/> بانتظار المطابقة الآن
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-6 pt-4">
                  <div className="flex flex-col">
                    <span className={`text-[60px] font-black leading-none tracking-tighter transition-colors ${isClosedByProctor ? 'text-emerald-600' : 'text-slate-400'}`}>{info.committee}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">اللجنة</span>
                  </div>
                  <div className={`px-5 py-2 rounded-2xl text-xs font-black shadow-lg ${isClosedByProctor ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {info.grade}
                  </div>
                </div>

                <div className="space-y-5 mb-8">
                  <div className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${proctor ? (isClosedByProctor ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-700') : 'bg-slate-50 border-slate-100 border-dashed opacity-50 text-slate-400'}`}>
                    <UserCircle size={28} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                       <p className="text-[9px] font-black uppercase mb-1">المراقب المسؤول</p>
                       <h5 className="font-black text-sm whitespace-normal break-words leading-tight">
                         {proctor?.full_name || 'بانتظار التحاق المراقب...'}
                       </h5>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">طلاب</p>
                      <p className="text-2xl font-black text-slate-800 leading-none tabular-nums">{info.count}</p>
                    </div>
                    <div className={`p-4 rounded-3xl text-center border ${abs > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                      <p className="text-[9px] font-black uppercase mb-1">غياب</p>
                      <p className="text-2xl font-black leading-none tabular-nums">{abs}</p>
                    </div>
                    <div className={`p-4 rounded-3xl text-center border ${late > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                      <p className="text-[9px] font-black uppercase mb-1">تأخر</p>
                      <p className="text-2xl font-black leading-none tabular-nums">{late}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartProcess(info.committee, info.key)} 
                  className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl ${isClosedByProctor ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  {isClosedByProctor ? (
                    <>استلام وتوثيق <ChevronLeft size={22} /></>
                  ) : (
                    <><Lock size={20} /> بانتظار إغلاق المراقب</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ControlReceiptView;
