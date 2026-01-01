
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Users, UserCheck, GraduationCap, 
  CheckCircle2, ChevronLeft, Loader2, ShieldCheck,
  X, BellRing, ShieldAlert, 
  PackageCheck, PackageSearch, Camera, Shield, Zap, FileWarning, 
  Plus, Minus, Check, Info, Ambulance, Pen, NotebookPen, 
  UserSearch, MessageCircle, Backpack, History, Clock, ClipboardCheck,
  Trophy, Heart, Star, Sparkles, Medal, Fingerprint
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG } from '../../constants';

interface Props {
  user: User;
  supervisions: Supervision[];
  setSupervisions: any;
  students: Student[];
  absences: Absence[];
  setAbsences: any;
  onAlert: any;
  sendRequest: any;
  deliveryLogs: DeliveryLog[];
  setDeliveryLogs: (log: Partial<DeliveryLog>) => Promise<void>;
  controlRequests: ControlRequest[];
  systemConfig: any;
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ 
  user, supervisions, setSupervisions, students, absences, setAbsences, 
  onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests, systemConfig 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  // حالات الإغلاق والبلاغات
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSubView, setRequestSubView] = useState<'MAIN' | 'SELECT_STUDENTS' | 'COUNTER' | 'CUSTOM_MSG'>('MAIN');
  const [currentRequestLabel, setCurrentRequestLabel] = useState('');
  const [selectedStudentsForReq, setSelectedStudentsForReq] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(1);
  const [customMessage, setCustomMessage] = useState('');

  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [currentGradeIdx, setCurrentGradeIdx] = useState(0);
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const activeDate = useMemo(() => systemConfig?.active_exam_date || new Date().toISOString().split('T')[0], [systemConfig]);

  // تحديد اللجنة النشطة
  const activeAssignment = useMemo(() => 
    supervisions.find((s: any) => s.teacher_id === user.id && s.date && s.date.startsWith(activeDate)), 
  [supervisions, user.id, activeDate]);

  const activeCommittee = activeAssignment?.committee_number || null;

  // جلب كافة سجلات الاستلام المؤكدة لهذه اللجنة اليوم (لدعم تعدد الصفوف والمستلمين)
  const confirmedLogs = useMemo(() => {
    if (!activeCommittee) return [];
    return deliveryLogs.filter(l => 
      l.committee_number === activeCommittee && 
      l.status === 'CONFIRMED' && 
      l.time.startsWith(activeDate)
    );
  }, [deliveryLogs, activeCommittee, activeDate]);

  // التحقق هل المراقب أنهى رصد اللجنة ميدانياً (أو تم استلام أي جزء منها)
  const isClosedLocally = useMemo(() => {
    if (!activeCommittee) return false;
    return deliveryLogs.some(l => 
      l.committee_number === activeCommittee && 
      l.proctor_name === user.full_name && 
      l.time.startsWith(activeDate)
    );
  }, [deliveryLogs, activeCommittee, user.full_name, activeDate]);

  // هل تم استلام كافة الصفوف المسندة لهذه اللجنة بالكامل؟
  const isFullyDelivered = useMemo(() => {
    if (!activeCommittee) return false;
    const committeeGrades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    return committeeGrades.length > 0 && committeeGrades.every(g => confirmedLogs.some(l => l.grade === g));
  }, [confirmedLogs, students, activeCommittee]);

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
    const lates = myAbsences.filter(a => a.type === 'LATE').length;
    return { total, present: total - abs, absent: abs, lates };
  }, [myStudents, myAbsences]);

  const joinCommittee = async (committeeNum: string) => {
    const cleanedNum = committeeNum.trim();
    if (!cleanedNum || isJoining) return;
    setIsJoining(true);
    try {
      await db.supervision.deleteByTeacherId(user.id);
      await db.supervision.insert({ id: crypto.randomUUID(), teacher_id: user.id, committee_number: cleanedNum, date: new Date().toISOString(), period: 1, subject: 'اختبار' });
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
    if (isClosedLocally) return;
    const existing = absences.find(a => a.student_id === student.national_id && a.date.startsWith(activeDate));
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
      } else {
        await db.absences.upsert({ id: crypto.randomUUID(), student_id: student.national_id, student_name: student.name, committee_number: activeCommittee!, period: 1, type, proctor_id: user.id, date: new Date().toISOString() });
      }
      await setAbsences();
    } catch (err: any) { onAlert(err, 'error'); }
  };

  const finalizeClosing = async () => {
    setIsVerifying(true);
    try {
      for (const grade of myGrades) {
        await setDeliveryLogs({ id: crypto.randomUUID(), teacher_name: 'بانتظار الكنترول', proctor_name: user.full_name, committee_number: activeCommittee!, grade, type: 'RECEIVE', time: new Date().toISOString(), period: 1, status: 'PENDING' });
      }
      await sendRequest(`المراقب ${user.full_name} أنهى رصد اللجنة وجاهز للتسليم.`, activeCommittee!);
      setIsClosingWizardOpen(false);
      onAlert('تم إغلاق اللجنة بنجاح', 'success');
    } catch (err: any) { onAlert(err.message, 'error'); } finally { setIsVerifying(false); }
  };

  if (isInitialLoading) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-pulse text-slate-400"><Loader2 size={64} className="animate-spin text-blue-600" /><p className="font-black text-xl italic">جاري مزامنة بيانات اللجنة...</p></div>;
  }

  // --- 1. لوحة الإنجاز الذهبية (بعد اكتمال استلام الكنترول لكافة الصفوف) ---
  if (isFullyDelivered) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center space-y-10 animate-fade-in flex flex-col items-center justify-center min-h-[85vh]">
          <div className="relative group">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse group-hover:bg-emerald-500/30 transition-all"></div>
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-36 h-36 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl border-8 border-white relative z-10">
                <Trophy size={80} className="text-white animate-bounce-subtle" />
             </div>
             <Sparkles className="absolute -top-4 -right-4 text-amber-400 animate-spin-slow" size={32} />
          </div>

          <div className="space-y-4">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter">تقبل الله جهودكم</h2>
              <p className="text-2xl font-bold text-slate-500 italic max-w-lg mx-auto">أستاذ {user.full_name}، تم إيداع كافة أوراق اللجنة {activeCommittee} في خزنة الكنترول بنجاح.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
             {/* ملخص اللجنة */}
             <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 space-y-6 text-right relative overflow-hidden flex flex-col h-full">
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ClipboardCheck size={20}/></div>
                   <span className="text-lg font-black text-slate-800">الحالة النهائية للجنة</span>
                </div>
                <div className="grid grid-cols-3 gap-3 flex-1 items-center">
                   <div className="bg-emerald-50 p-5 rounded-[2rem] text-center border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">حاضر</p>
                      <p className="text-3xl font-black text-emerald-700">{stats.present}</p>
                   </div>
                   <div className="bg-red-50 p-5 rounded-[2rem] text-center border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase mb-1">غائب</p>
                      <p className="text-3xl font-black text-red-700">{stats.absent}</p>
                   </div>
                   <div className="bg-amber-50 p-5 rounded-[2rem] text-center border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-1">تأخر</p>
                      <p className="text-3xl font-black text-amber-700">{stats.lates}</p>
                   </div>
                </div>
             </div>

             {/* سجل الاستلام المتعدد */}
             <div className="bg-slate-950 p-8 rounded-[3.5rem] shadow-2xl text-white space-y-6 text-right relative overflow-hidden border-b-8 border-blue-600 flex flex-col h-full">
                <div className="flex items-center gap-3 border-b pb-4 border-white/10 relative z-10">
                   <div className="p-2 bg-white/10 text-emerald-400 rounded-xl"><UserCheck size={20}/></div>
                   <span className="text-lg font-black">سجل التوثيق الرسمي</span>
                </div>
                <div className="space-y-4 relative z-10 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
                   {confirmedLogs.map(log => (
                      <div key={log.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 group hover:bg-white/10 transition-colors">
                         <div className="flex justify-between items-center">
                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{log.grade}</span>
                            <span className="text-[10px] font-mono text-slate-500">{new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400"><UserCheck size={16}/></div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[8px] font-black text-slate-500 uppercase">عضو الكنترول المستلم</p>
                               <p className="text-sm font-black text-white truncate">{log.teacher_name}</p>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="pt-8">
             <div className="flex items-center justify-center gap-4 text-slate-300">
                <div className="h-[1px] w-12 bg-slate-200"></div>
                <Heart size={24} className="text-red-500 fill-red-500 animate-pulse" />
                <div className="h-[1px] w-12 bg-slate-200"></div>
             </div>
             <p className="mt-6 text-sm font-black text-slate-400 italic">تم أرشفة هذه الجلسة - نلقاكم في يوم جديد</p>
          </div>
      </div>
    );
  }

  // --- 2. شاشة "بانتظار الكنترول" (بعد الإغلاق وقبل تمام الاستلام) ---
  if (isClosedLocally) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center space-y-12 animate-fade-in flex flex-col items-center justify-center min-h-[85vh]">
          <div className="bg-blue-600/5 p-10 md:p-14 rounded-[5rem] border-4 border-blue-100 shadow-2xl space-y-8 max-w-xl w-full relative overflow-hidden">
             <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full"></div>
             
             <div className="space-y-4 relative z-10">
                <div className="bg-blue-600 text-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl mb-6 ring-8 ring-blue-50">
                   <PackageCheck size={40} />
                </div>
                <h2 className="text-4xl font-black text-slate-950 tracking-tighter">بانتظار عضو الكنترول</h2>
                <p className="text-xl font-bold text-slate-500 leading-relaxed italic">شكراً أستاذ {user.full_name}، يرجى عرض الباركود لعضو الكنترول المسؤول عن صفك.</p>
             </div>

             <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-50 relative group transition-all hover:scale-[1.03] active:scale-95 cursor-pointer">
                <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${activeCommittee}`} 
                   alt="Committee QR" 
                   className="w-72 h-72 mx-auto rounded-[2rem] shadow-inner"
                />
                <div className="mt-8 flex flex-col items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Scan Verification Token</span>
                   <span className="bg-slate-950 text-white px-10 py-3 rounded-2xl font-black text-3xl tabular-nums shadow-2xl border-b-4 border-blue-600">لجنة {activeCommittee}</span>
                </div>
             </div>

             {confirmedLogs.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mt-4 animate-bounce">
                   <p className="text-emerald-700 font-black text-xs">تم استلام {confirmedLogs.length} من أصل {myGrades.length} صفوف</p>
                </div>
             )}
          </div>

          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-4 bg-amber-50 text-amber-700 px-8 py-4 rounded-full border border-amber-200 animate-pulse shadow-sm">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-black text-sm uppercase tracking-widest">جاري المزامنة مع الكنترول...</span>
             </div>
             <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-blue-600 transition-all font-black text-xs underline underline-offset-8 decoration-dotted uppercase tracking-widest mt-4 flex items-center gap-2">
                <History size={14}/> تحديث يدوي للحالة
             </button>
          </div>
      </div>
    );
  }

  // --- 3. شاشة البداية: مسح كود اللجنة للانضمام (تختفي بعد الإغلاق) ---
  if (!activeCommittee) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-12 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-right">
               <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-2xl flex items-center justify-center border-4 border-blue-500/20">
                     <img src={APP_CONFIG.LOGO_URL} alt="Staff" className="w-full h-full object-contain" />
                  </div>
                  <div>
                     <h3 className="text-3xl font-black">{user.full_name}</h3>
                     <span className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-[10px] mt-2 inline-block">بانتظار المباشرة الميدانية</span>
                  </div>
               </div>
               <button onClick={() => setShowHistory(true)} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center gap-3 text-xs font-black transition-all">
                  <History size={18}/> سجل اللجان السابقة
               </button>
            </div>
         </div>
         <div className="bg-white p-12 md:p-20 rounded-[4rem] text-slate-900 shadow-2xl relative overflow-hidden border-b-[12px] border-slate-950">
            <div className="relative z-10 space-y-12 text-center">
               <div className="space-y-4">
                  <div className="bg-slate-950 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl text-blue-400 border-4 border-white/10"><Shield size={48} /></div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter">بوابة المباشرة</h2>
                  <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest">امسح كود اللجنة لبدء الرصد</p>
               </div>
               <button onClick={() => { setIsScanning(true); setTimeout(async () => { try { const scanner = new Html5Qrcode("proctor-qr-v6"); qrScannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { joinCommittee(text); stopScanner(); }, () => {}); } catch (err) { setIsScanning(false); } }, 200); }} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-700 transition-all flex flex-col items-center gap-6 group active:scale-95 border-b-[8px] border-blue-800">
                  <Camera size={84} className="group-hover:rotate-12 transition-transform" />
                  <span>بدء مسح الكود</span>
               </button>
            </div>
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
                 <div id="proctor-qr-v6" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95">إلغاء</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  // --- 4. شاشة اللجنة النشطة (أثناء العمل الميداني) ---
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-right pb-48 px-4 md:px-0">
       
       <div className="bg-slate-950 p-8 md:p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-8">
                <div className="w-28 h-28 bg-blue-600 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl ring-4 ring-blue-500/20">
                   <span className="text-[10px] opacity-50 uppercase leading-none mb-1">لجنة</span>
                   <span className="text-6xl tabular-nums leading-none">{activeCommittee}</span>
                </div>
                <div>
                   <h3 className="text-3xl font-black">{user.full_name}</h3>
                   <div className="flex items-center gap-3 mt-3">
                      <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> مباشر حالياً
                      </span>
                      <button onClick={() => setShowHistory(true)} className="text-slate-500 font-bold text-xs flex items-center gap-2 hover:text-white transition-colors underline"><History size={14}/> السجل الميداني لليوم</button>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[120px] shadow-inner group transition-all hover:bg-white/10">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-2 leading-none">الحضور</p>
                   <p className="text-4xl font-black text-emerald-400 tabular-nums">{stats.present}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[120px] shadow-inner group transition-all hover:bg-white/10">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-2 leading-none">الغياب</p>
                   <p className="text-4xl font-black text-red-500 tabular-nums">{stats.absent}</p>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => { setRequestSubView('MAIN'); setIsRequestModalOpen(true); }} className="p-10 bg-red-600 text-white rounded-[3rem] font-black text-3xl flex items-center justify-center gap-8 shadow-2xl hover:bg-red-700 transition-all active:scale-95 border-b-[10px] border-red-800">
             <Zap size={48} fill="white" /> بلاغ ميداني عاجل
          </button>
          <button onClick={() => { setClosingStep(0); setIsClosingWizardOpen(true); }} className="p-10 bg-slate-900 text-white rounded-[3rem] font-black text-3xl flex items-center justify-center gap-8 shadow-2xl hover:bg-blue-600 transition-all active:scale-95 border-b-[10px] border-slate-950">
             <PackageCheck size={48} /> إنهاء واغلاق اللجنة
          </button>
       </div>

       {/* قائمة الطلاب المرقمة والمميزة */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6">
         {myStudents.map((s: Student) => {
           const status = myAbsences.find(a => a.student_id === s.national_id);
           return (
             <div key={s.id} className={`p-10 rounded-[4rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[380px] ${status?.type === 'ABSENT' ? 'bg-red-50/70 border-red-200 shadow-red-100' : status?.type === 'LATE' ? 'bg-amber-50/70 border-amber-200 shadow-amber-100' : 'bg-white border-slate-50 hover:border-blue-200'}`}>
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}><GraduationCap size={32} /></div>
                  {status ? (
                    <span className={`px-5 py-2 rounded-2xl font-black text-[11px] shadow-xl uppercase tracking-widest ${status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{status.type === 'ABSENT' ? 'غائب اليوم' : 'متأخر'}</span>
                  ) : (
                    <span className="px-5 py-2 rounded-2xl font-black text-[11px] bg-emerald-600 text-white shadow-xl uppercase tracking-widest">حاضر</span>
                  )}
                </div>
                <div className="flex-1 text-right space-y-4 px-2">
                   <h4 className="text-3xl font-black text-slate-900 break-words leading-tight tracking-tighter">{s.name}</h4>
                   <div className="flex flex-wrap gap-2">
                      <span className="bg-slate-100 px-4 py-1.5 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.grade} - فصل {s.section}</span>
                      {s.seating_number && <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black border border-blue-100 tabular-nums">رقم: {s.seating_number}</span>}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-10">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-6 rounded-[2rem] font-black text-xs transition-all shadow-lg active:scale-95 ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-white text-slate-400 hover:bg-red-50 border-2 border-slate-50'}`}>رصد غياب</button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-6 rounded-[2rem] font-black text-xs transition-all shadow-lg active:scale-95 ${status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 hover:bg-red-50 border-2 border-slate-50'}`}>رصد تأخر</button>
                </div>
             </div>
           );
         })}
       </div>

       {/* مودال البلاغات المطور */}
       {isRequestModalOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-fade-in no-print overflow-y-auto">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setIsRequestModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border-b-[20px] border-red-600 animate-slide-up my-auto">
                <div className="bg-slate-950 p-12 text-white flex justify-between items-center relative">
                    <div className="flex items-center gap-6 relative z-10">
                       <ShieldAlert className="text-red-500 animate-pulse" size={40}/>
                       <h3 className="text-4xl font-black tracking-tighter">بلاغ ميداني عاجل</h3>
                    </div>
                    <button onClick={() => setIsRequestModalOpen(false)} className="bg-white/10 p-4 rounded-full relative z-10 hover:bg-white/20 transition-all active:scale-90"><X size={32}/></button>
                </div>
                <div className="p-12">
                   {requestSubView === 'SELECT_STUDENTS' ? (
                     <div className="space-y-10 animate-fade-in">
                        <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar px-2">
                           {myStudents.map(s => (
                             <button key={s.id} onClick={() => setSelectedStudentsForReq(prev => prev.includes(s.national_id) ? prev.filter(id => id !== s.national_id) : [...prev, s.national_id])} className={`w-full p-8 rounded-[3rem] border-2 transition-all text-right flex justify-between items-center ${selectedStudentsForReq.includes(s.national_id) ? 'border-red-600 bg-red-50 shadow-2xl' : 'border-slate-100 bg-slate-50'}`}>
                                <span className="font-black text-2xl text-slate-800">{s.name}</span>
                                {selectedStudentsForReq.includes(s.national_id) && <CheckCircle2 className="text-red-600" size={36} />}
                             </button>
                           ))}
                        </div>
                        <button onClick={() => { 
                           const names = myStudents.filter(s => selectedStudentsForReq.includes(s.national_id)).map(s => s.name).join('، ');
                           handleQuickRequest(`${currentRequestLabel} لـ: ${names}`); 
                        }} disabled={selectedStudentsForReq.length === 0} className="w-full bg-red-600 text-white py-10 rounded-[2.5rem] font-black text-3xl shadow-2xl disabled:opacity-50 active:scale-95 border-b-[8px] border-red-800">إرسال البلاغ فوراً</button>
                     </div>
                   ) : requestSubView === 'COUNTER' ? (
                     <div className="text-center space-y-12 animate-fade-in">
                        <div className="flex items-center justify-center gap-12">
                           <button onClick={() => setRequestCount(c => Math.max(1, c-1))} className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Minus size={48}/></button>
                           <span className="text-[140px] font-black tabular-nums text-slate-900 leading-none tracking-tighter">{requestCount}</span>
                           <button onClick={() => setRequestCount(c => c+1)} className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Plus size={48}/></button>
                        </div>
                        <button onClick={() => handleQuickRequest(`${currentRequestLabel} (العدد: ${requestCount})`)} className="w-full bg-red-600 text-white py-10 rounded-[2.5rem] font-black text-3xl shadow-2xl active:scale-95 border-b-[8px] border-red-800">تأكيد وإرسال البلاغ</button>
                     </div>
                   ) : requestSubView === 'CUSTOM_MSG' ? (
                      <div className="space-y-10 animate-fade-in">
                         <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="اكتب بلاغك هنا بوضوح..." className="w-full bg-slate-50 border-4 border-slate-100 rounded-[3rem] p-12 font-bold text-3xl h-72 outline-none focus:border-red-600 transition-all text-right shadow-inner resize-none" />
                         <button onClick={() => handleQuickRequest(`بلاغ مخصص: ${customMessage}`)} disabled={!customMessage.trim()} className="w-full bg-red-600 text-white py-10 rounded-[2.5rem] font-black text-3xl shadow-2xl disabled:opacity-50 active:scale-95 border-b-[8px] border-red-800">إرسال البلاغ المكتوب</button>
                      </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-6">
                        {[
                          { icon: PackageSearch, label: 'نقص ورق إجابة', type: 'STUDENTS' },
                          { icon: Ambulance, label: 'حالة صحية طارئة' },
                          { icon: Pen, label: 'طلب أقلام/أدوات' },
                          { icon: NotebookPen, label: 'طلب ورق هامش' },
                          { icon: FileWarning, label: 'نقص ورق أسئلة', type: 'COUNT' },
                          { icon: UserSearch, label: 'طلب معلم المادة' },
                          { icon: Backpack, label: 'طلب مرسام' },
                          { icon: MessageCircle, label: 'بلاغ آخر (كتابة)', type: 'CUSTOM' }
                        ].map((item, idx) => (
                          <button key={idx} onClick={() => {
                             if(item.type) { setCurrentRequestLabel(item.label); setRequestSubView(item.type as any); }
                             else handleQuickRequest(item.label);
                          }} className="p-12 bg-slate-50 border-2 border-slate-100 rounded-[4rem] flex flex-col items-center gap-6 hover:border-red-300 transition-all group hover:bg-white active:scale-95 shadow-lg">
                             <item.icon size={64} className="text-red-600 group-hover:scale-110 transition-transform" />
                             <span className="font-black text-lg text-slate-700 text-center">{item.label}</span>
                          </button>
                        ))}
                     </div>
                   )}
                </div>
            </div>
         </div>
       )}

       {/* معالج إغلاق اللجنة المتطور */}
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
                 <div className="animate-fade-in">
                    <div className="bg-slate-900 p-12 text-white flex justify-between items-center relative overflow-hidden">
                       <div className="flex items-center gap-6 relative z-10">
                          <CheckCircle2 size={48} className="text-emerald-400 animate-pulse"/>
                          <h3 className="text-4xl font-black tracking-tighter">تأكيد كشف الغياب</h3>
                       </div>
                       <button onClick={() => setIsClosingWizardOpen(false)} className="bg-white/10 p-4 rounded-full relative z-10 hover:bg-white/20 transition-all active:scale-90"><X size={32}/></button>
                    </div>
                    <div className="p-12 space-y-10">
                       <div className="max-h-[400px] overflow-y-auto space-y-5 custom-scrollbar px-2 text-right">
                          {myStudents.filter(s => myAbsences.some(a => a.student_id === s.national_id)).length === 0 ? (
                             <div className="p-20 text-center text-slate-300 italic font-black border-4 border-dashed rounded-[3.5rem] text-2xl bg-slate-50/50 shadow-inner">اللجنة مكتملة (لا يوجد غياب)</div>
                          ) : (
                             myStudents.filter(s => myAbsences.some(a => a.student_id === s.national_id)).map(s => {
                                const abs = myAbsences.find(a => a.student_id === s.national_id)!;
                                return (
                                  <div key={s.id} className="flex items-center justify-between p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100 group transition-all hover:bg-white hover:shadow-2xl">
                                     <div className="text-right">
                                        <span className="font-black text-slate-800 text-2xl block tracking-tighter">{s.name}</span>
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 block">{s.grade}</span>
                                     </div>
                                     <button onClick={() => toggleStudentStatus(s, abs.type === 'ABSENT' ? 'LATE' : 'ABSENT')} className={`px-10 py-5 rounded-[1.8rem] font-black text-[10px] shadow-xl transition-all uppercase tracking-widest active:scale-90 ${abs.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-50 text-white'}`}>
                                        {abs.type === 'ABSENT' ? 'تحويل لمتأخر' : 'تحويل لغائب'}
                                     </button>
                                  </div>
                                );
                             })
                          )}
                       </div>
                       <button onClick={() => setClosingStep(1)} className="w-full bg-slate-950 text-white py-10 rounded-[2.8rem] font-black text-3xl flex items-center justify-center gap-8 shadow-2xl hover:bg-blue-600 transition-all border-b-[8px] border-black">الخطوة التالية <ChevronLeft size={48} /></button>
                    </div>
                 </div>
               ) : closingStep === 1 ? (
                 <div className="animate-fade-in p-14 space-y-14">
                    <div className="text-center space-y-4">
                       <div className="bg-blue-50 text-blue-600 px-8 py-3 rounded-full w-fit mx-auto text-xl font-black shadow-inner">{myGrades[currentGradeIdx]}</div>
                       <h4 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">إدخال عدد المظروف</h4>
                       <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest">أدخل العدد الفعلي المسلم للكنترول</p>
                    </div>
                    <div className="flex items-center justify-center gap-12">
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: Math.max(0, (prev[myGrades[currentGradeIdx]] || 0) - 1)}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Minus size={64} /></button>
                       <input type="number" value={closingCounts[myGrades[currentGradeIdx]] || 0} onChange={e => setClosingCounts({...closingCounts, [myGrades[currentGradeIdx]]: parseInt(e.target.value) || 0})} className="w-64 h-64 bg-white border-[10px] border-slate-50 rounded-[5rem] text-center font-black text-[130px] text-slate-900 outline-none shadow-2xl tabular-nums focus:border-blue-500" />
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: (prev[myGrades[currentGradeIdx]] || 0) + 1}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Plus size={64} /></button>
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
                    }} className="w-full bg-emerald-600 text-white py-11 rounded-[3rem] font-black text-4xl flex items-center justify-center gap-8 shadow-2xl active:scale-95 border-b-[10px] border-emerald-800">
                       {currentGradeIdx === myGrades.length - 1 ? 'إنهاء ومطابقة نهائية' : 'الصف التالي'} <ChevronLeft size={56} />
                    </button>
                 </div>
               ) : null}
            </div>
         </div>
       )}

       <style>{`
         @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
         .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
         @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
         .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
         @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
         .animate-spin-slow { animation: spin-slow 12s linear infinite; }
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
       `}</style>
    </div>
  );

  async function handleQuickRequest(label: string) {
     if (isClosedLocally) return;
     await sendRequest(label, activeCommittee!);
     onAlert('تم إرسال البلاغ للكنترول بنجاح.', 'success');
     setIsRequestModalOpen(false);
     setRequestSubView('MAIN');
     setSelectedStudentsForReq([]);
     setRequestCount(1);
     setCustomMessage('');
  }
};

export default ProctorDailyAssignmentFlow;
