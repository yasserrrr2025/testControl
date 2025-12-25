
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  LogIn, Scan, Users, UserCheck, GraduationCap, 
  UserPlus, UserMinus, Clock, History, CheckCircle, CheckCircle2,
  AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
  X, Send, FileStack, RefreshCcw, BellRing,
  HeartPulse, HelpCircle, ShieldAlert, AlertOctagon,
  CheckSquare, Square, ThumbsUp,
  UserCheck2, PackageCheck, Award, Star, FileBadge, BookOpen,
  Activity, Navigation, BadgeCheck,
  UserX, UserMinus2, Info,
  Download, QrCode, Fingerprint, Printer,
  BookmarkCheck, Camera, Sparkles, Shield, PenTool,
  Briefcase, Hash, Zap
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
  const [activeCommittee, setActiveCommittee] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCommitteeInput, setManualCommitteeInput] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStep, setReportStep] = useState<'MENU' | 'STUDENT_PICKER'>('MENU');
  const [selectedStudentsForReport, setSelectedStudentsForReport] = useState<string[]>([]);
  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [closingCounts, setClosingCounts] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const qrIdentityUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.national_id}`;

  const currentAssignment = useMemo(() => supervisions.find((s: any) => s.teacher_id === user.id), [supervisions, user]);
  
  useEffect(() => { 
    if (currentAssignment) {
      setActiveCommittee(currentAssignment.committee_number);
      setIsSessionFinished(false);
    } else {
      setActiveCommittee(null);
    }
  }, [currentAssignment]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("proctor-qr-reader-v4");
        qrScannerRef.current = scanner;
        const config = { fps: 20, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 };
        await scanner.start({ facingMode: "environment" }, config, (text) => { joinCommittee(text); stopScanner(); }, () => {});
      } catch (err: any) {
        onAlert(`فشل الكاميرا: ${err.message}`);
        setIsScanning(false);
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) { try { await qrScannerRef.current.stop(); qrScannerRef.current = null; } catch {} }
    setIsScanning(false);
  };

  const joinCommittee = async (committeeNum: string) => {
    const cleanedNum = committeeNum.trim();
    if (!cleanedNum) return;
    
    const committeeExists = students.some(s => s.committee_number === cleanedNum);
    if (!committeeExists) {
      onAlert(`تنبيه: اللجنة رقم ${cleanedNum} غير مسجلة في بيانات الطلاب لهذا اليوم.`);
      return;
    }

    try {
      await db.supervision.deleteByTeacherId(user.id);
      const newSV: Supervision = { id: crypto.randomUUID(), teacher_id: user.id, committee_number: cleanedNum, date: new Date().toISOString(), period: 1, subject: 'اختبار الفترة' };
      await db.supervision.insert(newSV);
      setSupervisions((prev: any) => [...prev.filter((s:any) => s.teacher_id !== user.id), newSV]);
      setActiveCommittee(cleanedNum);
      setIsSessionFinished(false);
      onAlert(`✅ تم المباشرة في اللجنة رقم ${cleanedNum} بنجاح.`);
    } catch (err: any) {
      onAlert(`فشل المباشرة: قد تكون اللجنة مشغولة أو يوجد خطأ في الاتصال.`);
    }
  };

  const leaveAndJoinNew = async () => {
    try {
      await db.supervision.deleteByTeacherId(user.id);
      setSupervisions((prev: any) => prev.filter((s: any) => s.teacher_id !== user.id));
      setActiveCommittee(null);
      setIsSessionFinished(true);
    } catch (err: any) { onAlert(err); }
  };

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    const existing = absences.find(a => a.student_id === student.national_id && a.committee_number === activeCommittee);
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
        setAbsences((prev: Absence[]) => prev.filter(a => a.student_id !== student.national_id));
      } else {
        const newAbsence: Absence = { id: existing?.id || crypto.randomUUID(), student_id: student.national_id, student_name: student.name, committee_number: activeCommittee!, period: 1, type, proctor_id: user.id, date: new Date().toISOString() };
        await db.absences.upsert(newAbsence);
        setAbsences((prev: Absence[]) => [...prev.filter(a => a.student_id !== student.national_id), newAbsence]);
      }
    } catch (err: any) { onAlert(err); }
  };

  const startClosingWizard = () => {
    const initialCounts: Record<string, string> = {};
    const grades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    grades.forEach(g => { initialCounts[g] = '0'; });
    setClosingCounts(initialCounts);
    setIsClosingWizardOpen(true);
    setClosingStep(-1);
  };

  const confirmClosing = async () => {
    setIsVerifying(true);
    try {
      const promises = Object.entries(closingCounts).map(async ([grade, count]) => {
        return setDeliveryLogs({ id: crypto.randomUUID(), proctor_name: user.full_name, committee_number: activeCommittee!, grade, type: 'RECEIVE', time: new Date().toISOString(), period: 1, status: 'PENDING' });
      });
      await Promise.all(promises);
      await sendRequest(`تم إغلاق اللجنة وإرسال سندات الاستلام للكنترول.`, activeCommittee);
      setIsVerifying(false);
      setIsClosingWizardOpen(false);
      onAlert("تم إغلاق اللجنة رقمياً. يرجى التوجه للكنترول للمطابقة.");
    } catch (err: any) {
      setIsVerifying(false);
      onAlert(err);
    }
  };

  const handleSendReport = async (msg: string) => {
    if (!msg.trim()) return;
    setIsSendingReport(true);
    try {
      await sendRequest(msg, activeCommittee);
      setCustomMessage('');
      setIsReportModalOpen(false);
      onAlert('تم إرسال البلاغ بنجاح');
    } catch (err: any) {
      onAlert(`فشل الإرسال: ${err.message}`);
    } finally {
      setIsSendingReport(false);
    }
  };

  const myStudents = useMemo(() => students.filter(s => s.committee_number === activeCommittee), [students, activeCommittee]);
  const stats = useMemo(() => {
    const total = myStudents.length;
    const abs = absences.filter(a => a.committee_number === activeCommittee && a.type === 'ABSENT').length;
    return { total, present: total - abs, absent: abs };
  }, [myStudents, absences, activeCommittee]);

  const activeMyRequests = useMemo(() => controlRequests.filter(r => r.from === user.full_name && r.committee === activeCommittee && r.status !== 'DONE'), [controlRequests, user.full_name, activeCommittee]);

  if (!currentAssignment || isSessionFinished) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-12 animate-fade-in text-center">
         <div className="bg-slate-950 p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[10px] border-blue-600 mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
               <div className="flex items-center gap-8 text-right flex-1">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-2xl flex items-center justify-center border-4 border-blue-500/20">
                       <img src={APP_CONFIG.LOGO_URL} alt="Staff" className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-slate-900"><ShieldCheck size={16} /></div>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">المراقب المعتمد</p>
                     <h3 className="text-3xl font-black tracking-tight">{user.full_name}</h3>
                     <div className="flex items-center gap-4 mt-2">
                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase">{ROLES_ARABIC[user.role]}</span>
                        <span className="text-slate-500 font-bold text-xs tabular-nums flex items-center gap-1"><Hash size={12}/> {user.national_id}</span>
                     </div>
                  </div>
               </div>
               <div className="bg-white p-4 rounded-[2rem] shadow-2xl shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 animate-scan"></div>
                  <img src={qrIdentityUrl} alt="ID" className="w-24 h-24 mix-blend-multiply" />
               </div>
            </div>
         </div>

         <div className="bg-white p-10 md:p-20 rounded-[4rem] text-slate-900 shadow-2xl relative overflow-hidden border-b-[12px] border-slate-950">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[150px] rounded-full -mr-48 -mt-48"></div>
            <div className="relative z-10 space-y-12">
               <div className="space-y-4">
                  <div className="bg-slate-950 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"><Shield size={40} className="text-blue-400" /></div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter">بوابة المباشرة الميدانية</h2>
                  <p className="text-slate-400 font-bold text-xl">يرجى تأكيد حضورك في مقر اللجنة المخصص</p>
               </div>

               <div className="max-w-lg mx-auto space-y-6">
                  <button onClick={startScanner} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-50 transition-all flex flex-col items-center gap-6 active:scale-95 group">
                    <Camera size={72} className="group-hover:rotate-12 transition-transform" />
                    <span>مسح رمز اللجنة (QR)</span>
                  </button>

                  {systemConfig?.allow_manual_join && (
                    <div className="space-y-4 pt-10 animate-fade-in">
                       <div className="flex items-center gap-4">
                          <div className="h-[1px] flex-1 bg-slate-100"></div>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">أو الالتحاق الطارئ</span>
                          <div className="h-[1px] flex-1 bg-slate-100"></div>
                       </div>
                       <div className="flex gap-2 bg-slate-50 p-3 rounded-[2.5rem] border-2 border-slate-100 focus-within:border-blue-600 transition-all">
                          <input type="text" inputMode="numeric" value={manualCommitteeInput} onChange={e => setManualCommitteeInput(e.target.value)} placeholder="أدخل رقم اللجنة يدوياً..." className="bg-transparent border-0 flex-1 px-8 font-black text-2xl text-center outline-none" />
                          <button onClick={() => joinCommittee(manualCommitteeInput)} className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl hover:bg-blue-600 active:scale-95 transition-all"><Zap size={28} /></button>
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
                 <div className="relative w-full max-w-sm">
                    <div className="relative z-10 w-full aspect-square bg-black rounded-[4rem] overflow-hidden border-8 border-white/20 shadow-2xl">
                       <div id="proctor-qr-reader-v4" className="w-full h-full"></div>
                       <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                          <div className="w-64 h-64 border-2 border-blue-400/30 rounded-[3rem] relative overflow-hidden">
                             <div className="w-full h-1 bg-blue-500/50 absolute top-1/2 -translate-y-1/2 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                          </div>
                       </div>
                    </div>
                 </div>
                 <h4 className="mt-12 text-3xl font-black">وجه الكاميرا نحو رمز اللجنة</h4>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl active:scale-95 shadow-xl">إلغاء المسح</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto text-right pb-32">
       <div className="bg-slate-950 p-8 md:p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-blue-600 mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
             <div className="flex items-center gap-8 text-right flex-1">
                <div className="relative">
                  <div className="w-20 h-20 bg-white rounded-3xl p-1 shadow-2xl flex items-center justify-center border-4 border-blue-500/20">
                     <img src={APP_CONFIG.LOGO_URL} alt="Staff" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg border-2 border-slate-900"><ShieldCheck size={12} /></div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">المراقب المسؤول</p>
                   <h3 className="text-2xl font-black tracking-tight leading-tight">{user.full_name}</h3>
                   <div className="flex items-center gap-4 mt-2">
                      <div className="bg-white/10 px-3 py-1 rounded-lg flex items-center gap-2 border border-white/5">
                         <span className="font-black text-[10px] uppercase">{ROLES_ARABIC[user.role]}</span>
                      </div>
                      <span className="text-slate-500 font-bold text-[10px] tabular-nums">ID: {user.national_id}</span>
                   </div>
                </div>
             </div>
             <div className="bg-white p-4 rounded-[2rem] shadow-2xl shrink-0">
                <img src={qrIdentityUrl} alt="Identity QR" className="w-20 h-20 mix-blend-multiply" />
             </div>
          </div>
       </div>

       {activeMyRequests.length > 0 && (
         <div className="space-y-4 animate-slide-up no-print">
            <div className="flex flex-col gap-4">
               {activeMyRequests.map(req => (
                 <div key={req.id} className={`p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden bg-white ${req.status === 'IN_PROGRESS' ? 'border-blue-500 shadow-blue-100' : 'border-red-100 animate-pulse'}`}>
                    <div className="flex items-center gap-6 flex-1 w-full">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                          {req.status === 'IN_PROGRESS' ? <Navigation size={24} /> : <ShieldAlert size={24} />}
                       </div>
                       <div className="flex-1 min-w-0 text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{req.status === 'IN_PROGRESS' ? 'البلاغ قيد المباشرة الآن' : 'بانتظار وصول المساعد...'}</p>
                          <h5 className="text-lg font-black text-slate-800 truncate">{req.text}</h5>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8 text-right flex-1 w-full">
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl shrink-0">
              <span className="text-[10px] opacity-40 uppercase mb-1">لجنة</span>
              <span className="text-5xl tabular-nums">{activeCommittee}</span>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">رصد الحضور المباشر</h3>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-slate-50 border px-6 py-2 rounded-2xl flex items-center gap-3 text-slate-600 font-black text-sm tabular-nums">
                    <Users size={18} className="text-blue-600"/> {stats.total} طالب
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-2xl flex items-center gap-3 text-emerald-700 font-black text-sm tabular-nums">
                    <UserCheck size={18}/> {stats.present} حاضر
                  </div>
               </div>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto shrink-0">
             <button onClick={() => setIsReportModalOpen(true)} className="flex-1 sm:flex-initial bg-red-600 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-red-700 shadow-xl active:scale-95"><AlertTriangle size={24} /> بلاغ عاجل</button>
             <button onClick={startClosingWizard} className="flex-1 sm:flex-initial bg-slate-950 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-blue-600 shadow-xl active:scale-95"><ShieldCheck size={24} /> إغلاق اللجنة</button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-0">
         {myStudents.map((s: Student) => {
           const status = absences.find(a => a.student_id === s.national_id && a.committee_number === activeCommittee);
           return (
             <div key={s.id} className={`p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[380px] ${status?.type === 'ABSENT' ? 'bg-red-50/50 border-red-200' : status?.type === 'LATE' ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-white hover:border-blue-100'}`}>
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}><GraduationCap size={32} /></div>
                  {status && <span className={`px-5 py-2 rounded-2xl font-black text-xs shadow-lg ${status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{status.type === 'ABSENT' ? 'غائب' : 'متأخر'}</span>}
                </div>
                <div className="flex-1 space-y-4 text-right">
                   <h4 className="text-2xl font-black text-slate-900 leading-tight mb-2 break-words">{s.name}</h4>
                   <div className="flex flex-wrap gap-2"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-200 tabular-nums">ID: {s.national_id}</span><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black">{s.grade}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-10">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-6 rounded-[2.2rem] font-black text-sm transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-red-50'}`}>
                     {status?.type === 'ABSENT' ? <RefreshCcw size={24} /> : <UserMinus size={24} />}
                     <span>{status?.type === 'ABSENT' ? 'إلغاء الغياب' : 'رصد غياب'}</span>
                   </button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-6 rounded-[2.2rem] font-black text-sm transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-red-50'}`}>
                     {status?.type === 'LATE' ? <RefreshCcw size={24} /> : <Clock size={24} />}
                     <span>{status?.type === 'LATE' ? 'إلغاء التأخر' : 'رصد تأخر'}</span>
                   </button>
                </div>
             </div>
           );
         })}
       </div>

       {isReportModalOpen && (
         <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" onClick={() => setIsReportModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[12px] border-red-600">
               <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="bg-red-600 p-5 rounded-3xl shadow-red-600/40 animate-pulse border-2 border-white/10"><AlertOctagon size={44} className="text-white" /></div>
                     <div className="text-right">
                        <h3 className="text-3xl font-black tracking-tighter">بث بلاغ عاجل</h3>
                        <p className="text-red-400 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2"><BellRing size={14}/> قناة العمليات الميدانية</p>
                     </div>
                  </div>
                  <button onClick={() => setIsReportModalOpen(false)} className="bg-white/5 p-3 rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"><X size={32}/></button>
               </div>
               <div className="p-10 space-y-12 text-center">
                  <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="اشرح طبيعة البلاغ هنا بدقة..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 font-bold text-lg h-32 outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner resize-none" />
                  <button onClick={async () => { await handleSendReport(customMessage); }} disabled={!customMessage.trim() || isSendingReport} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50 hover:bg-red-600 transition-all">
                    {isSendingReport ? <Loader2 className="animate-spin" /> : <Send size={24} />} بث البلاغ الآن
                  </button>
               </div>
            </div>
         </div>
       )}

       {isClosingWizardOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
            <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[10px] border-slate-950">
               {isVerifying ? (
                 <div className="p-20 text-center space-y-8 animate-fade-in">
                    <Loader2 size={80} className="mx-auto text-blue-600 animate-spin" />
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">جاري المراجعة والتدقيق...</h3>
                 </div>
               ) : (
                 <div className="p-12 text-center space-y-10 animate-fade-in">
                    <div className="bg-emerald-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto text-emerald-600 border-2 border-emerald-100 shadow-inner"><CheckCircle size={56} /></div>
                    <div className="space-y-2">
                       <h4 className="text-3xl font-black text-slate-900 tracking-tight">جاهز للإغلاق النهائي</h4>
                       <p className="text-slate-400 font-bold text-lg">سيتم إرسال سجل استلام رسمي لكل صف دراسي في لجنتك لضمان دقة المطابقة.</p>
                    </div>
                    <button onClick={confirmClosing} className="w-full bg-blue-600 text-white py-8 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">توثيق المباشرة الميدانية <ShieldCheck size={36} /></button>
                 </div>
               )}
            </div>
         </div>
       )}

       <style>{`
         @keyframes scan { 0%, 100% { top: 0%; } 50% { top: 100%; } }
         .animate-scan { animation: scan 2s linear infinite; }
       `}</style>
    </div>
  );
};

export default ProctorDailyAssignmentFlow;
