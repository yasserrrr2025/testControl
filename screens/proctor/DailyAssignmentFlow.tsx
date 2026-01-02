
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest, CommitteeReport } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Loader2, ShieldCheck, Camera, Shield, Zap, 
  PackageCheck, PackageSearch, RefreshCcw, 
  ChevronLeft, CheckCircle2, Minus, Plus, GraduationCap, History, Clock
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG } from '../../constants';

interface Props {
  user: User;
  users?: User[];
  supervisions?: Supervision[];
  setSupervisions: () => Promise<void>;
  students?: Student[];
  absences?: Absence[];
  setAbsences: () => Promise<void>;
  onAlert: (msg: string, type: string) => void;
  sendRequest: (txt: string, com: string) => Promise<void>;
  deliveryLogs?: DeliveryLog[];
  setDeliveryLogs: (log: Partial<DeliveryLog>) => Promise<void>;
  controlRequests?: ControlRequest[];
  systemConfig: any;
  committeeReports?: CommitteeReport[];
  onReportUpsert?: (report: Partial<CommitteeReport>) => Promise<void>;
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ 
  user, 
  supervisions = [], 
  setSupervisions, 
  students = [], 
  absences = [], 
  setAbsences, 
  onAlert, 
  sendRequest, 
  deliveryLogs = [], 
  setDeliveryLogs, 
  systemConfig,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [currentGradeIdx, setCurrentGradeIdx] = useState(0);
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const activeDate = useMemo(() => systemConfig?.active_exam_date || new Date().toISOString().split('T')[0], [systemConfig]);

  // 1. تحديد رقم اللجنة بناءً على سجلات التسليم اليوم (لضمان القفل حتى لو تغير التكليف)
  const committeeFromLogs = useMemo(() => {
    const myLog = deliveryLogs.find(l => 
      (l.proctor_name === user.full_name || l.teacher_name === user.full_name) && 
      l.time.startsWith(activeDate)
    );
    return myLog?.committee_number || null;
  }, [deliveryLogs, user.full_name, activeDate]);

  // 2. التكليف المباشر حالياً
  const activeAssignment = useMemo(() => 
    supervisions.find((s: any) => s.teacher_id === user.id && s.date && s.date.startsWith(activeDate)), 
  [supervisions, user.id, activeDate]);

  const activeCommittee = committeeFromLogs || activeAssignment?.committee_number || null;

  // 3. التحقق مما إذا كانت اللجنة مغلقة تماماً
  const isCommitteeFinished = useMemo(() => {
    if (committeeFromLogs) return true;
    if (!activeCommittee) return false;
    
    const committeeGrades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    if (committeeGrades.length === 0) return false;

    const gradesReported = deliveryLogs.filter(l => 
      l.committee_number === activeCommittee && 
      l.time.startsWith(activeDate)
    ).map(l => l.grade);

    return committeeGrades.every(g => gradesReported.includes(g));
  }, [committeeFromLogs, deliveryLogs, activeCommittee, activeDate, students]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const myStudents = useMemo(() => students.filter(s => s.committee_number === activeCommittee), [students, activeCommittee]);
  const myGrades = useMemo(() => Array.from(new Set(myStudents.map(s => s.grade))).sort(), [myStudents]);
  const myAbsences = useMemo(() => absences.filter(a => a.committee_number === activeCommittee && a.date.startsWith(activeDate)), [absences, activeCommittee, activeDate]);
  
  const stats = useMemo(() => {
    const total = myStudents.length;
    const abs = myAbsences.filter(a => a.type === 'ABSENT').length;
    return { total, present: total - abs, absent: abs };
  }, [myStudents, myAbsences]);

  const joinCommittee = async (committeeNum: string) => {
    const cleanedNum = committeeNum.trim();
    if (!cleanedNum || isJoining) return;
    setIsJoining(true);
    try {
      await db.supervision.deleteByTeacherId(user.id);
      await db.supervision.insert({ 
        id: crypto.randomUUID(), 
        teacher_id: user.id, 
        committee_number: cleanedNum, 
        date: new Date().toISOString(), 
        period: 1, 
        subject: 'اختبار' 
      });
      await setSupervisions();
      onAlert(`تمت المباشرة في اللجنة ${cleanedNum}`, 'success');
    } catch (err: any) { onAlert(err.message, 'error'); } finally { setIsJoining(false); }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try { if (qrScannerRef.current.isScanning) await qrScannerRef.current.stop(); } catch (e) {} finally {
        qrScannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    if (isCommitteeFinished) return;
    const existing = absences.find(a => a.student_id === student.national_id && a.date.startsWith(activeDate));
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
      } else {
        await db.absences.upsert({ 
          id: existing?.id || crypto.randomUUID(), 
          student_id: student.national_id, 
          student_name: student.name, 
          committee_number: activeCommittee!, 
          period: 1, 
          type, 
          proctor_id: user.id, 
          date: new Date().toISOString() 
        });
      }
      await setAbsences();
    } catch (err: any) { onAlert(err.message || String(err), 'error'); }
  };

  const finalizeClosing = async () => {
    setIsVerifying(true);
    try {
      for (const grade of myGrades) {
        await setDeliveryLogs({ 
          id: crypto.randomUUID(), 
          teacher_name: 'بانتظار الكنترول', 
          proctor_name: user.full_name, 
          committee_number: activeCommittee!, 
          grade, 
          type: 'RECEIVE', 
          time: new Date().toISOString(), 
          period: 1, 
          status: 'PENDING' 
        });
      }
      await sendRequest(`المراقب ${user.full_name} أنهى رصد اللجنة وجاهز للتسليم.`, activeCommittee!);
      setIsClosingWizardOpen(false);
      onAlert('تم إنهاء اللجنة بنجاح، بانتظار مطابقة الكنترول.', 'success');
    } catch (err: any) { onAlert(err.message, 'error'); } finally { setIsVerifying(false); }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-pulse text-slate-400">
        <Loader2 size={64} className="animate-spin text-blue-600" />
        <p className="font-black text-xl italic text-slate-500">جاري تأمين الجلسة...</p>
      </div>
    );
  }

  // واجهة النجاح والقفل
  if (isCommitteeFinished) {
    const myLogs = deliveryLogs.filter(l => l.committee_number === activeCommittee && l.time.startsWith(activeDate));
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in pb-48">
          <div className="bg-[#020617] rounded-[4rem] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl border-b-[15px] border-emerald-500">
             <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[150px] rounded-full"></div>
             <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="w-40 h-40 bg-emerald-500 rounded-[3.5rem] flex items-center justify-center shadow-2xl border-8 border-white/10">
                    <ShieldCheck size={100} className="text-white" />
                </div>
                <div className="space-y-4">
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-2">وثيقة إنجاز اللجنة رقم</span>
                    <div className="bg-emerald-600 text-white px-10 py-4 rounded-[2rem] font-black text-6xl shadow-2xl border-4 border-emerald-400/30">
                       {activeCommittee}
                    </div>
                    <h2 className="text-4xl font-black text-white mt-6">تم التوثيق الرقمي بنجاح</h2>
                    <p className="text-slate-400 font-bold text-xl italic max-w-md mx-auto leading-relaxed">أستاذ {user.full_name}، تم إغلاق اللجنة وإرسال البيانات للكنترول. شكراً لإخلاصك.</p>
                </div>
             </div>
          </div>

          <div className="mt-12 space-y-6">
             <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <History className="text-blue-600" size={28}/> سجل مطابقة المظاريف
                </h3>
             </div>
             <div className="grid grid-cols-1 gap-3">
                {myLogs.map((log) => (
                  <div key={log.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-emerald-100 flex justify-between items-center transition-all hover:bg-emerald-50/20">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center"><PackageCheck size={24}/></div>
                        <div>
                           <h4 className="text-xl font-black text-slate-900">{log.grade}</h4>
                           <p className={`text-[9px] font-bold uppercase ${log.status === 'CONFIRMED' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                             {log.status === 'CONFIRMED' ? `المستلم: ${log.teacher_name}` : 'بانتظار مطابقة الكنترول...'}
                           </p>
                        </div>
                     </div>
                     <span className="text-xl font-black text-slate-800 tabular-nums">{new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                ))}
             </div>
          </div>

          <button onClick={() => window.location.reload()} className="mt-12 w-full bg-slate-900 text-white py-6 rounded-[2.2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4">
            <RefreshCcw size={28}/> تحديث الحالة
          </button>
      </div>
    );
  }

  // واجهة مسح الكود للمباشرة
  if (!activeCommittee) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-12 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
               <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-white rounded-3xl p-1 flex items-center justify-center border-4 border-blue-500/20 shadow-2xl">
                     <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-right">
                     <h3 className="text-3xl font-black">{user.full_name}</h3>
                     <span className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-[10px] mt-2 inline-block uppercase tracking-widest">بانتظار المباشرة</span>
                  </div>
               </div>
            </div>
         </div>
         <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-b-[12px] border-slate-950">
            <div className="space-y-4 mb-12">
               <div className="bg-slate-950 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl text-blue-400"><Shield size={48} /></div>
               <h2 className="text-5xl font-black tracking-tighter">بوابة المباشرة الميدانية</h2>
               <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest">امسح كود اللجنة لبدء الرصد</p>
            </div>
            <button onClick={() => { setIsScanning(true); setTimeout(async () => { try { const scanner = new Html5Qrcode("proctor-qr-v70"); qrScannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { joinCommittee(text); stopScanner(); }, () => {}); } catch (err) { setIsScanning(false); } }, 200); }} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-700 transition-all flex flex-col items-center gap-6">
               <Camera size={84} />
               <span>بدء مسح الكود</span>
            </button>
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
                 <div id="proctor-qr-v70" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl">إلغاء</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  // واجهة الرصد النشط
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-right pb-48 px-4 md:px-0">
       <div className="bg-slate-950 p-8 md:p-10 rounded-[3.5rem] text-white shadow-2xl border-b-[8px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-8">
                <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex flex-col items-center justify-center font-black shadow-2xl">
                   <span className="text-[10px] opacity-50 mb-1 leading-none uppercase">لجنة</span>
                   <span className="text-5xl tabular-nums leading-none">{activeCommittee}</span>
                </div>
                <div className="text-right">
                   <h3 className="text-3xl font-black">{user.full_name}</h3>
                   <div className="flex items-center gap-3 mt-2">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-black text-[9px] uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> مباشر الآن
                      </span>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[100px]">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-1">الحضور</p>
                   <p className="text-2xl font-black text-emerald-400 tabular-nums">{stats.present}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[100px]">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-1">الغياب</p>
                   <p className="text-2xl font-black text-red-500 tabular-nums">{stats.absent}</p>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => { sendRequest("بلاغ ميداني عاجل بانتظار المساعدة.", activeCommittee!); onAlert("تم إرسال بلاغ طوارئ للكنترول", "warning"); }} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-red-700 transition-all border-b-[8px] border-red-800">
             <Zap size={40} fill="white" /> بلاغ ميداني عاجل
          </button>
          <button onClick={() => { setClosingStep(0); setCurrentGradeIdx(0); setIsClosingWizardOpen(true); }} className="p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-blue-600 transition-all border-b-[8px] border-slate-950">
             <PackageCheck size={40} /> إنهاء وإغلاق اللجنة
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
         {myStudents.map((s: Student) => {
           const status = myAbsences.find(a => a.student_id === s.national_id);
           return (
             <div key={s.id} className={`p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[340px] ${status?.type === 'ABSENT' ? 'bg-red-50/70 border-red-200' : status?.type === 'LATE' ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-50 hover:border-blue-100 group'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}><GraduationCap size={28} /></div>
                  <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] shadow-lg uppercase tracking-widest ${status ? (status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white') : 'bg-emerald-600 text-white'}`}>{status ? (status.type === 'ABSENT' ? 'غائب' : 'متأخر') : 'حاضر'}</span>
                </div>
                <div className="flex-1 text-right space-y-3 px-2">
                   <h4 className="text-2xl font-black text-slate-900 break-words leading-tight">{s.name}</h4>
                   <div className="flex items-center gap-2">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500">{s.grade} - فصل {s.section}</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-8">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-white/60 text-slate-400 hover:bg-red-50'}`}>رصد غياب</button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-white/60 text-slate-400 hover:bg-amber-50'}`}>رصد تأخر</button>
                </div>
             </div>
           );
         })}
       </div>

       {isClosingWizardOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 overflow-y-auto animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => !isVerifying && setIsClosingWizardOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4.5rem] shadow-2xl relative z-10 overflow-hidden border-b-[20px] border-slate-900 animate-slide-up my-auto">
               {isVerifying ? (
                  <div className="p-24 text-center space-y-12 flex flex-col items-center">
                    <Loader2 size={140} className="text-blue-600 animate-spin" />
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">جاري الأرشفة والتوثيق...</h3>
                  </div>
               ) : closingStep === 0 ? (
                 <div className="p-12 space-y-10 text-right">
                    <div className="flex items-center gap-6 mb-8">
                       <CheckCircle2 size={48} className="text-emerald-400"/>
                       <h3 className="text-4xl font-black tracking-tighter">تأكيد كشف الغياب</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-4 px-2">
                       {myGrades.map(grade => {
                          const absCount = myAbsences.filter(a => a.type === 'ABSENT' && students.find(s => s.national_id === a.student_id)?.grade === grade).length;
                          return (
                            <div key={grade} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                               <span className="font-black text-slate-900">{grade}</span>
                               <span className="bg-red-500 text-white px-4 py-1 rounded-full font-black text-xs">غائب: {absCount}</span>
                            </div>
                          );
                       })}
                    </div>
                    <button onClick={() => setClosingStep(1)} className="w-full bg-slate-950 text-white py-10 rounded-[2.8rem] font-black text-3xl flex items-center justify-center gap-8 shadow-2xl">استمرار <ChevronLeft size={48} /></button>
                 </div>
               ) : closingStep === 1 ? (
                 <div className="p-14 space-y-14 text-center">
                    <div className="space-y-4">
                       <div className="bg-blue-50 text-blue-600 px-8 py-3 rounded-full w-fit mx-auto text-xl font-black">{myGrades[currentGradeIdx]}</div>
                       <h4 className="text-6xl font-black text-slate-900 tracking-tighter">إدخال عدد المظروف</h4>
                       <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest">العدد الفعلي المسلم للكنترول</p>
                    </div>
                    <div className="flex items-center justify-center gap-12">
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: Math.max(0, (prev[myGrades[currentGradeIdx]] || 0) - 1)}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform"><Minus size={64} /></button>
                       <input type="number" value={closingCounts[myGrades[currentGradeIdx]] || 0} onChange={e => setClosingCounts({...closingCounts, [myGrades[currentGradeIdx]]: parseInt(e.target.value) || 0})} className="w-64 h-64 bg-white border-[10px] border-slate-50 rounded-[5rem] text-center font-black text-[100px] text-slate-900 outline-none tabular-nums shadow-2xl" />
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: (prev[myGrades[currentGradeIdx]] || 0) + 1}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform"><Plus size={64} /></button>
                    </div>
                    <button onClick={() => {
                        const grade = myGrades[currentGradeIdx];
                        const count = closingCounts[grade] || 0;
                        const gradeStudents = myStudents.filter(s => s.grade === grade);
                        const expected = gradeStudents.length - myAbsences.filter(a => a.type === 'ABSENT' && gradeStudents.some(s => s.national_id === a.student_id)).length;
                        if (count !== expected) {
                          onAlert(`خطأ: العدد المدخل (${count}) لا يطابق الحاضرين فعلياً (${expected}) لـ ${grade}.`, 'error');
                          return;
                        }
                        if (currentGradeIdx < myGrades.length - 1) setCurrentGradeIdx(prev => prev + 1);
                        else finalizeClosing();
                    }} className="w-full bg-emerald-600 text-white py-11 rounded-[3rem] font-black text-4xl flex items-center justify-center gap-8 shadow-2xl border-b-[10px] border-emerald-800">
                       {currentGradeIdx === myGrades.length - 1 ? 'إنهاء ومطابقة نهائية' : 'الصف التالي'} <ChevronLeft size={56} />
                    </button>
                 </div>
               ) : null}
            </div>
         </div>
       )}

       <style>{`
         @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
         .animate-fade-in { animation: fade-in 0.4s ease-out; }
         .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
       `}</style>
    </div>
  );
};

export default ProctorDailyAssignmentFlow;
