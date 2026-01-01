
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Scan, Users, UserCheck, GraduationCap, 
  CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
  X, Send, RefreshCcw, BellRing, ShieldAlert, AlertOctagon,
  PackageCheck, PackageSearch, Camera, Shield, Zap, FileWarning, 
  Plus, Minus, Check, Info, Ambulance, Pen, NotebookPen, 
  UserSearch, MessageCircleWarning, ArrowRight, MessageCircle, Backpack, History, Clock, ClipboardCheck
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG, ROLES_ARABIC } from '../../constants';

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

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ user, supervisions, setSupervisions, students, absences, setAbsences, onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests, systemConfig }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  // حالات البلاغات
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSubView, setRequestSubView] = useState<'MAIN' | 'SELECT_STUDENTS' | 'COUNTER' | 'CUSTOM_MSG'>('MAIN');
  const [currentRequestLabel, setCurrentRequestLabel] = useState('');
  const [selectedStudentsForReq, setSelectedStudentsForReq] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(1);
  const [customMessage, setCustomMessage] = useState('');

  // حالات الإغلاق
  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [currentGradeIdx, setCurrentGradeIdx] = useState(0);
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const activeDate = useMemo(() => systemConfig?.active_exam_date || new Date().toISOString().split('T')[0], [systemConfig]);

  const activeAssignment = useMemo(() => 
    supervisions.find((s: any) => s.teacher_id === user.id && s.date && s.date.startsWith(activeDate)), 
  [supervisions, user.id, activeDate]);

  const activeCommittee = activeAssignment?.committee_number || null;

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, [supervisions]);

  // فحص سجلات الاستلام المؤكدة لهذه اللجنة اليوم
  const confirmedLogs = useMemo(() => {
    if (!activeCommittee) return [];
    return deliveryLogs.filter(l => 
      l.committee_number === activeCommittee && 
      l.status === 'CONFIRMED' && 
      l.time.startsWith(activeDate)
    );
  }, [deliveryLogs, activeCommittee, activeDate]);

  // هل تم تسليم جميع الصفوف في هذه اللجنة؟
  const isFullyDelivered = useMemo(() => {
    if (!activeCommittee) return false;
    const committeeGrades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    return committeeGrades.length > 0 && committeeGrades.every(g => confirmedLogs.some(l => l.grade === g));
  }, [confirmedLogs, students, activeCommittee]);

  // الأرشيف (اللجان التي سلمها المراقب سابقاً)
  const archivedLogs = useMemo(() => {
    return deliveryLogs.filter(l => 
      l.proctor_name === user.full_name && 
      l.status === 'CONFIRMED' &&
      l.committee_number !== activeCommittee
    ).sort((a,b) => b.time.localeCompare(a.time));
  }, [deliveryLogs, user.full_name, activeCommittee]);

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
      await db.supervision.insert({ id: crypto.randomUUID(), teacher_id: user.id, committee_number: cleanedNum, date: new Date().toISOString(), period: 1, subject: 'اختبار' });
      await setSupervisions();
      onAlert(`تمت المباشرة في اللجنة ${cleanedNum}`);
    } catch (err: any) { onAlert(err.message); } finally { setIsJoining(false); }
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
    const existing = absences.find(a => a.student_id === student.national_id && a.date.startsWith(activeDate));
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
      } else {
        await db.absences.upsert({ id: crypto.randomUUID(), student_id: student.national_id, student_name: student.name, committee_number: activeCommittee!, period: 1, type, proctor_id: user.id, date: new Date().toISOString() });
      }
      await setAbsences();
    } catch (err: any) { onAlert(err); }
  };

  const finalizeClosing = async () => {
    setIsVerifying(true);
    try {
      for (const grade of myGrades) {
        await setDeliveryLogs({ id: crypto.randomUUID(), teacher_name: 'بانتظار الكنترول', proctor_name: user.full_name, committee_number: activeCommittee!, grade, type: 'RECEIVE', time: new Date().toISOString(), period: 1, status: 'PENDING' });
      }
      await sendRequest(`المراقب ${user.full_name} أنهى رصد اللجنة وجاهز للتسليم.`, activeCommittee!);
      setClosingStep(2); // الانتقال لشاشة الباركود
    } catch (err: any) { onAlert(err.message); } finally { setIsVerifying(false); }
  };

  if (isInitialLoading) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-pulse text-slate-400"><Loader2 size={64} className="animate-spin text-blue-600" /><p className="font-black text-xl italic">جاري مزامنة البيانات...</p></div>;
  }

  // شاشة الأرشيف
  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-32">
         <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4"><History className="text-blue-600"/> أرشيف اللجان المسلمة</h2>
            <button onClick={() => setShowHistory(false)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all">العودة للمهام</button>
         </div>
         {archivedLogs.length === 0 ? (
           <div className="py-32 text-center text-slate-300 italic font-black border-4 border-dashed rounded-[3rem] text-xl bg-white">لا يوجد سجلات مؤرشفة حالياً</div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {archivedLogs.map(log => (
                <div key={log.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex items-center justify-between group hover:border-blue-200 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black">
                         <span className="text-[8px] opacity-40 leading-none">لجنة</span>
                         <span className="text-2xl leading-none">{log.committee_number}</span>
                      </div>
                      <div className="text-right">
                         <h4 className="font-black text-xl text-slate-900 leading-none mb-1">{log.grade}</h4>
                         <p className="text-[10px] font-bold text-slate-400">مستلم الكنترول: {log.teacher_name}</p>
                      </div>
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1 flex items-center gap-2 justify-end"><CheckCircle2 size={12}/> تم التوثيق</p>
                      <p className="text-[10px] font-mono text-slate-400">{new Date(log.time).toLocaleDateString('ar-SA')} - {new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>
    );
  }

  // شاشة النجاح النهائية وتفاصيل المستلم
  if (isFullyDelivered) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center space-y-10 animate-fade-in flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-emerald-500 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border-8 border-white animate-bounce">
              <ShieldCheck size={72} className="text-white" />
          </div>
          <div className="space-y-4">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter">تم تسليم اللجنة بنجاح</h2>
              <p className="text-xl font-bold text-slate-500 italic">تم توثيق محضر الاستلام في قاعدة البيانات المركزية</p>
          </div>

          <div className="bg-white w-full max-w-lg p-8 rounded-[3.5rem] shadow-2xl border-2 border-emerald-100 space-y-6 text-right">
             <div className="flex justify-between items-center border-b border-emerald-50 pb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">بيانات التوثيق</span>
                <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black">مكتمل</span>
             </div>
             {confirmedLogs.map(l => (
                <div key={l.id} className="space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="bg-blue-600/10 p-3 rounded-xl text-blue-600"><Users size={24}/></div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase">مستلم الكنترول</p>
                         <p className="text-xl font-black text-slate-900">{l.teacher_name}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 mb-1">اللجنة والصف</p>
                         <p className="font-black text-sm text-slate-800">لجنة {l.committee_number} | {l.grade}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 mb-1">وقت التوثيق</p>
                         <p className="font-black text-sm text-slate-800 tabular-nums">{new Date(l.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>

          <div className="flex gap-4 w-full max-w-lg">
             <button onClick={() => window.location.reload()} className="flex-1 bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">جلسة جديدة</button>
             <button onClick={() => setShowHistory(true)} className="flex-1 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><History size={24}/> سجل العمليات</button>
          </div>
      </div>
    );
  }

  if (!activeCommittee) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-12 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
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
                  <div className="bg-slate-950 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl text-blue-400"><Shield size={40} /></div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter">بوابة المباشرة</h2>
                  <p className="text-slate-400 font-bold text-xl italic uppercase">امسح كود اللجنة لبدء الرصد</p>
               </div>
               <button onClick={() => { setIsScanning(true); setTimeout(async () => { try { const scanner = new Html5Qrcode("proctor-qr-v3"); qrScannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { joinCommittee(text); stopScanner(); }, () => {}); } catch (err) { setIsScanning(false); } }, 200); }} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-700 transition-all flex flex-col items-center gap-6 group">
                  <Camera size={72} className="group-hover:rotate-12 transition-transform" />
                  <span>بدء مسح الكود</span>
               </button>
            </div>
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
                 <div id="proctor-qr-v3" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl">إلغاء</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-right pb-48 px-4 md:px-0">
       
       {/* هيدر معلومات اللجنة */}
       <div className="bg-slate-950 p-8 md:p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex flex-col items-center justify-center font-black shadow-2xl ring-4 ring-blue-500/20">
                   <span className="text-[10px] opacity-50 uppercase leading-none mb-1">لجنة</span>
                   <span className="text-5xl tabular-nums leading-none">{activeCommittee}</span>
                </div>
                <div>
                   <h3 className="text-3xl font-black">{user.full_name}</h3>
                   <div className="flex items-center gap-3 mt-2">
                      <span className="bg-white/10 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> مباشر حالياً
                      </span>
                      <button onClick={() => setShowHistory(true)} className="text-slate-500 font-bold text-xs flex items-center gap-2 hover:text-white transition-colors underline"><History size={14}/> السجل الميداني لليوم</button>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center min-w-[100px]">
                   <p className="text-[9px] font-black uppercase text-slate-500 mb-1">الحضور</p>
                   <p className="text-3xl font-black text-emerald-400 tabular-nums">{stats.present}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center min-w-[100px]">
                   <p className="text-[9px] font-black uppercase text-slate-500 mb-1">الغياب</p>
                   <p className="text-3xl font-black text-red-500 tabular-nums">{stats.absent}</p>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => { setRequestSubView('MAIN'); setIsRequestModalOpen(true); }} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-red-700 transition-all active:scale-95">
             <Zap size={40} fill="white" /> بلاغ ميداني عاجل
          </button>
          <button onClick={() => { setClosingStep(0); setIsClosingWizardOpen(true); }} className="p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-blue-600 transition-all active:scale-95">
             <PackageCheck size={40} /> إنهاء واغلاق اللجنة
          </button>
       </div>

       {/* قائمة الطلاب الملونة */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
         {myStudents.map((s: Student) => {
           const status = myAbsences.find(a => a.student_id === s.national_id);
           return (
             <div key={s.id} className={`p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[340px] ${status?.type === 'ABSENT' ? 'bg-red-50/70 border-red-200' : status?.type === 'LATE' ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/40 border-emerald-100'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}><GraduationCap size={28} /></div>
                  {status ? (
                    <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] shadow-lg ${status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{status.type === 'ABSENT' ? 'غائب اليوم' : 'متأخر'}</span>
                  ) : (
                    <span className="px-4 py-1.5 rounded-xl font-black text-[10px] bg-emerald-600 text-white shadow-lg">حاضر</span>
                  )}
                </div>
                <div className="flex-1 text-right space-y-3 px-2">
                   <h4 className="text-2xl font-black text-slate-900 break-words leading-tight">{s.name}</h4>
                   <div className="flex items-center gap-2">
                      <span className="bg-white/50 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500">{s.grade} - فصل {s.section}</span>
                      {s.seating_number && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black border border-blue-100">رقم: {s.seating_number}</span>}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-8">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-white/60 text-slate-400 hover:bg-red-50'}`}>رصد غياب</button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-md' : 'bg-white/60 text-slate-400 hover:bg-amber-50'}`}>رصد تأخر</button>
                </div>
             </div>
           );
         })}
       </div>

       {/* مودال البلاغات المطور */}
       {isRequestModalOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-fade-in no-print overflow-y-auto">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setIsRequestModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border-b-[15px] border-red-600 animate-slide-up my-auto">
                <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative">
                    <div className="flex items-center gap-4 relative z-10">
                       <h3 className="text-3xl font-black flex items-center gap-4"><ShieldAlert className="text-red-500"/> بلاغ ميداني عاجل</h3>
                    </div>
                    <button onClick={() => setIsRequestModalOpen(false)} className="bg-white/10 p-3 rounded-full relative z-10 hover:bg-white/20 transition-all"><X size={32}/></button>
                </div>
                <div className="p-10">
                   {requestSubView === 'SELECT_STUDENTS' ? (
                     <div className="space-y-8 animate-fade-in">
                        <div className="max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar px-2">
                           {myStudents.map(s => (
                             <button key={s.id} onClick={() => setSelectedStudentsForReq(prev => prev.includes(s.national_id) ? prev.filter(id => id !== s.national_id) : [...prev, s.national_id])} className={`w-full p-7 rounded-[2.5rem] border-2 transition-all text-right flex justify-between items-center ${selectedStudentsForReq.includes(s.national_id) ? 'border-red-600 bg-red-50 shadow-xl' : 'border-slate-100 bg-slate-50'}`}>
                                <span className="font-black text-xl text-slate-800">{s.name}</span>
                                {selectedStudentsForReq.includes(s.national_id) && <CheckCircle2 className="text-red-600" size={28} />}
                             </button>
                           ))}
                        </div>
                        <button onClick={() => { 
                           const names = myStudents.filter(s => selectedStudentsForReq.includes(s.national_id)).map(s => s.name).join('، ');
                           handleQuickRequest(`${currentRequestLabel} لـ: ${names}`); 
                        }} disabled={selectedStudentsForReq.length === 0} className="w-full bg-red-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl disabled:opacity-50">إرسال البلاغ للطلاب المحددين</button>
                     </div>
                   ) : requestSubView === 'COUNTER' ? (
                     <div className="text-center space-y-12 animate-fade-in">
                        <div className="flex items-center justify-center gap-10">
                           <button onClick={() => setRequestCount(c => Math.max(1, c-1))} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors"><Minus size={40}/></button>
                           <span className="text-[120px] font-black tabular-nums text-slate-900 leading-none">{requestCount}</span>
                           <button onClick={() => setRequestCount(c => c+1)} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors"><Plus size={40}/></button>
                        </div>
                        <button onClick={() => handleQuickRequest(`${currentRequestLabel} (العدد: ${requestCount})`)} className="w-full bg-red-600 text-white py-9 rounded-[2.5rem] font-black text-3xl shadow-xl active:scale-95 hover:bg-red-700">تأكيد وإرسال البلاغ</button>
                     </div>
                   ) : requestSubView === 'CUSTOM_MSG' ? (
                      <div className="space-y-10 animate-fade-in">
                         <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="اكتب بلاغك هنا..." className="w-full bg-slate-50 border-4 border-slate-100 rounded-[3rem] p-10 font-bold text-2xl h-64 outline-none focus:border-red-600 transition-all text-right shadow-inner" />
                         <button onClick={() => handleQuickRequest(`بلاغ مخصص: ${customMessage}`)} disabled={!customMessage.trim()} className="w-full bg-red-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl disabled:opacity-50">إرسال البلاغ المكتوب</button>
                      </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-4">
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
                          }} className="p-10 bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-5 hover:border-red-300 transition-all group hover:bg-white">
                             <item.icon size={56} className="text-red-600 group-hover:scale-110 transition-transform" />
                             <span className="font-black text-sm text-slate-700 text-center">{item.label}</span>
                          </button>
                        ))}
                     </div>
                   )}
                </div>
            </div>
         </div>
       )}

       {/* معالج إغلاق اللجنة */}
       {isClosingWizardOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 overflow-y-auto animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => !isVerifying && setIsClosingWizardOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border-b-[15px] border-slate-900 animate-slide-up my-auto">
               {isVerifying ? (
                 <div className="p-24 text-center space-y-10 flex flex-col items-center">
                    <Loader2 size={120} className="text-blue-600 animate-spin" />
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">جاري مطابقة البيانات...</h3>
                 </div>
               ) : closingStep === 0 ? (
                 <div className="animate-fade-in">
                    <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
                       <h3 className="text-3xl font-black flex items-center gap-4 relative z-10"><CheckCircle2 size={40} className="text-emerald-400"/> تأكيد كشف الغياب</h3>
                       <button onClick={() => setIsClosingWizardOpen(false)} className="bg-white/10 p-3 rounded-full relative z-10 hover:bg-white/20 transition-all"><X size={32}/></button>
                    </div>
                    <div className="p-10 space-y-8">
                       <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar px-2">
                          {myStudents.filter(s => myAbsences.some(a => a.student_id === s.national_id)).length === 0 ? (
                             <div className="p-16 text-center text-slate-300 italic font-black border-4 border-dashed rounded-[3rem] text-xl">لا توجد حالات غياب (اللجنة مكتملة)</div>
                          ) : (
                             myStudents.filter(s => myAbsences.some(a => a.student_id === s.national_id)).map(s => {
                                const abs = myAbsences.find(a => a.student_id === s.national_id)!;
                                return (
                                  <div key={s.id} className="flex items-center justify-between p-7 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 group transition-all hover:bg-white">
                                     <div className="text-right">
                                        <span className="font-black text-slate-800 text-xl block">{s.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{s.grade}</span>
                                     </div>
                                     <button onClick={() => toggleStudentStatus(s, abs.type === 'ABSENT' ? 'LATE' : 'ABSENT')} className={`px-8 py-4 rounded-2xl font-black text-xs shadow-lg transition-all ${abs.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                                        {abs.type === 'ABSENT' ? 'غائب (تحويل لمتأخر)' : 'متأخر (تحويل لغائب)'}
                                     </button>
                                  </div>
                                );
                             })
                          )}
                       </div>
                       <button onClick={() => setClosingStep(1)} className="w-full bg-slate-950 text-white py-8 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl hover:bg-blue-600 transition-all">الخطوة التالية <ChevronLeft size={32} /></button>
                    </div>
                 </div>
               ) : closingStep === 1 ? (
                 <div className="animate-fade-in p-12 space-y-12">
                    <div className="text-center space-y-4">
                       <h4 className="text-6xl font-black text-slate-900 tracking-tighter">{myGrades[currentGradeIdx]}</h4>
                       <p className="text-slate-400 font-bold text-xl italic uppercase">أدخل العدد الفعلي للمظروف</p>
                    </div>
                    <div id="count-box-wizard" className="flex items-center justify-center gap-10">
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: Math.max(0, (prev[myGrades[currentGradeIdx]] || 0) - 1)}))} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors"><Minus size={48} /></button>
                       <input type="number" value={closingCounts[myGrades[currentGradeIdx]] || 0} onChange={e => setClosingCounts({...closingCounts, [myGrades[currentGradeIdx]]: parseInt(e.target.value) || 0})} className="w-56 h-56 bg-white border-8 border-slate-50 rounded-[4.5rem] text-center font-black text-[110px] text-slate-900 outline-none shadow-2xl tabular-nums focus:border-blue-500" />
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: (prev[myGrades[currentGradeIdx]] || 0) + 1}))} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors"><Plus size={48} /></button>
                    </div>
                    <button onClick={() => {
                        const grade = myGrades[currentGradeIdx];
                        const count = closingCounts[grade] || 0;
                        const gradeStudents = myStudents.filter(s => s.grade === grade);
                        const expected = gradeStudents.length - myAbsences.filter(a => a.type === 'ABSENT' && gradeStudents.some(s => s.national_id === a.student_id)).length;
                        if (count !== expected) {
                          onAlert(`خطأ: العدد المدخل (${count}) لا يطابق عدد الحاضرين الفعلي (${expected}) لصف ${grade}.`);
                          return;
                        }
                        if (currentGradeIdx < myGrades.length - 1) setCurrentGradeIdx(prev => prev + 1);
                        else finalizeClosing();
                    }} className="w-full bg-emerald-600 text-white py-9 rounded-[2.5rem] font-black text-3xl flex items-center justify-center gap-5 shadow-2xl active:scale-95">
                       {currentGradeIdx === myGrades.length - 1 ? 'إنهاء ومطابقة نهائية' : 'الصف التالي'} <ChevronLeft size={40} />
                    </button>
                 </div>
               ) : closingStep === 2 ? (
                 <div className="animate-fade-in p-10 space-y-10 text-center">
                    <div className="space-y-4">
                       <h3 className="text-4xl font-black text-slate-950">بانتظار مسح الكود من الكنترول</h3>
                       <p className="text-slate-400 font-bold">يرجى توجيه هذه الشاشة لعضو الكنترول لإتمام عملية الاستلام</p>
                    </div>
                    
                    <div className="bg-slate-50 p-10 rounded-[4rem] border-4 border-dashed border-slate-200 relative group overflow-hidden inline-block mx-auto">
                       <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${activeCommittee}`} 
                         alt="Committee QR" 
                         className="w-64 h-64 mx-auto shadow-2xl border-8 border-white rounded-[2rem] relative z-10"
                       />
                       <div className="mt-6 flex items-center justify-center gap-4 text-slate-900 font-black text-2xl relative z-10 tabular-nums">
                          <span className="bg-slate-900 text-white px-6 py-2 rounded-2xl">لجنة {activeCommittee}</span>
                       </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4 text-right">
                       <Info className="text-blue-600 shrink-0" size={28}/>
                       <p className="text-xs font-bold text-blue-900 leading-relaxed">ستختفي هذه الشاشة تلقائياً بمجرد قيام الكنترول بمسح الكود وتوثيق الاستلام في النظام.</p>
                    </div>

                    <button onClick={() => setIsClosingWizardOpen(false)} className="w-full py-5 text-slate-400 font-black hover:text-slate-900 transition-colors">إغلاق المعاينه والعودة للمهام</button>
                 </div>
               ) : null}
            </div>
         </div>
       )}

       <style>{`
         @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
         .animate-fade-in { animation: fade-in 0.4s ease-out; }
       `}</style>
    </div>
  );

  async function handleQuickRequest(label: string) {
     await sendRequest(label, activeCommittee!);
     onAlert('تم إرسال البلاغ للكنترول.');
     setIsRequestModalOpen(false);
     setRequestSubView('MAIN');
     setSelectedStudentsForReq([]);
     setRequestCount(1);
     setCustomMessage('');
  }
};

export default ProctorDailyAssignmentFlow;
