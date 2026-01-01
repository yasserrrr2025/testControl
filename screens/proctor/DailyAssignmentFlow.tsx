
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Scan, Users, UserCheck, GraduationCap, 
  CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
  X, Send, RefreshCcw, BellRing, ShieldAlert, AlertOctagon,
  PackageCheck, PackageSearch, Camera, Shield, Zap, FileWarning, 
  Plus, Minus, Check, Info, Ambulance, Pen, NotebookPen, 
  UserSearch, MessageCircleWarning, ArrowRight, MessageCircle, Backpack, History, Clock, Search
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG } from '../../constants';

interface Props {
  user: User;
  users: User[];
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
  user, users, supervisions, setSupervisions, students, absences, setAbsences, 
  onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests, systemConfig 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  // حالات البلاغات
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSubView, setRequestSubView] = useState<'MAIN' | 'SELECT_STUDENTS' | 'COUNTER' | 'CUSTOM_MSG' | 'SELECT_TEACHER'>('MAIN');
  const [currentRequestLabel, setCurrentRequestLabel] = useState('');
  const [selectedStudentsForReq, setSelectedStudentsForReq] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(1);
  const [customMessage, setCustomMessage] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

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
    const timer = setTimeout(() => setIsInitialLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const isAlreadyDelivered = useMemo(() => {
    if (!activeCommittee) return false;
    const committeeGrades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    const confirmedGrades = deliveryLogs.filter(l => l.committee_number === activeCommittee && l.status === 'CONFIRMED' && l.time.startsWith(activeDate)).map(l => l.grade);
    return committeeGrades.length > 0 && committeeGrades.every(g => confirmedGrades.includes(g));
  }, [deliveryLogs, activeCommittee, activeDate, students]);

  const myStudents = useMemo(() => students.filter(s => s.committee_number === activeCommittee), [students, activeCommittee]);
  const myGrades = useMemo(() => Array.from(new Set(myStudents.map(s => s.grade))).sort(), [myStudents]);
  const myAbsences = useMemo(() => absences.filter(a => a.committee_number === activeCommittee && a.date.startsWith(activeDate)), [absences, activeCommittee, activeDate]);
  
  // تتبع الطلبات الحية للجنة المراقب الحالية فقط
  const committeeRequests = useMemo(() => 
    controlRequests.filter(r => r.committee === activeCommittee).sort((a,b) => b.time.localeCompare(a.time)),
  [controlRequests, activeCommittee]);

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
      onAlert(`تمت المباشرة بنجاح في اللجنة ${cleanedNum}.`, 'success');
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

  const handleQuickRequest = async (label: string, type: 'STUDENTS' | 'COUNT' | 'TEACHER' | 'CUSTOM' | 'NORMAL' = 'NORMAL') => {
    if (type === 'STUDENTS') {
      setCurrentRequestLabel(label);
      setRequestSubView('SELECT_STUDENTS');
      return;
    }
    if (type === 'COUNT') {
      setCurrentRequestLabel(label);
      setRequestSubView('COUNTER');
      return;
    }
    if (type === 'TEACHER') {
      setCurrentRequestLabel(label);
      setRequestSubView('SELECT_TEACHER');
      return;
    }
    if (type === 'CUSTOM') {
      setRequestSubView('CUSTOM_MSG');
      return;
    }

    // إرسال مباشر للبلاغات العادية
    await sendFinalRequest(label);
  };

  const sendFinalRequest = async (msg: string) => {
    let finalMsg = msg;
    if (requestSubView === 'SELECT_STUDENTS') {
      const names = myStudents.filter(s => selectedStudentsForReq.includes(s.national_id)).map(s => s.name).join('، ');
      finalMsg = `${currentRequestLabel} لـ: ${names}`;
    } else if (requestSubView === 'COUNTER') {
      finalMsg = `${currentRequestLabel} (العدد: ${requestCount})`;
    } else if (requestSubView === 'CUSTOM_MSG') {
      finalMsg = `بلاغ مخصص: ${customMessage}`;
    }

    await sendRequest(finalMsg, activeCommittee!);
    onAlert('تم إرسال البلاغ للكنترول بنجاح.', 'success');
    resetRequestModal();
  };

  const resetRequestModal = () => {
    setIsRequestModalOpen(false);
    setRequestSubView('MAIN');
    setSelectedStudentsForReq([]);
    setRequestCount(1);
    setCustomMessage('');
    setTeacherSearch('');
  };

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    const existing = absences.find(a => a.student_id === student.national_id && a.date.startsWith(activeDate));
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
      } else {
        await db.absences.upsert({ id: existing?.id || crypto.randomUUID(), student_id: student.national_id, student_name: student.name, committee_number: activeCommittee!, period: 1, type, proctor_id: user.id, date: new Date().toISOString() });
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
      setClosingStep(2);
    } catch (err: any) { onAlert(err.message, 'error'); } finally { setIsVerifying(false); }
  };

  const filteredTeachers = useMemo(() => {
    return users.filter(u => u.full_name.includes(teacherSearch) || u.national_id.includes(teacherSearch)).slice(0, 10);
  }, [users, teacherSearch]);

  if (isInitialLoading) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-pulse text-slate-400"><Loader2 size={64} className="animate-spin text-blue-600" /><p className="font-black text-xl italic text-slate-500 tracking-tighter">جاري مزامنة بيانات اللجنة...</p></div>;
  }

  if (isAlreadyDelivered || (isClosingWizardOpen && closingStep === 2)) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-6 text-center space-y-12 animate-fade-in min-h-[80vh] flex flex-col items-center justify-center">
          <div className="bg-emerald-500 w-36 h-36 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl border-8 border-white animate-bounce">
              <ShieldCheck size={84} className="text-white" />
          </div>
          <div className="space-y-6">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter">بانتظار عضو الكنترول</h2>
              <p className="text-2xl font-bold text-slate-500 italic leading-relaxed">شكراً لجهودك {user.full_name}، تم توثيق بيانات اللجنة {activeCommittee} بنجاح. يرجى إبقاء هذه الشاشة مفتوحة أمام عضو الكنترول لإتمام الاستلام النهائي.</p>
          </div>
          <button onClick={() => window.location.reload()} className="bg-slate-950 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-xl active:scale-95 transition-all">تحديث الحالة</button>
      </div>
    );
  }

  if (!activeCommittee) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-12 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
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
               <button onClick={() => { setIsScanning(true); setTimeout(async () => { try { const scanner = new Html5Qrcode("proctor-qr-v50"); qrScannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { joinCommittee(text); stopScanner(); }, () => {}); } catch (err) { setIsScanning(false); } }, 200); }} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-700 transition-all flex flex-col items-center gap-6 group">
                  <Camera size={72} className="group-hover:rotate-12 transition-transform" />
                  <span>بدء مسح الكود</span>
               </button>
            </div>
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print text-white">
                 <div id="proctor-qr-v50" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl">إلغاء</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-right pb-48 px-4 md:px-0">
       
       <div className="bg-slate-950 p-8 md:p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-600 text-white rounded-[1.8rem] flex flex-col items-center justify-center font-black shadow-2xl ring-4 ring-blue-500/20">
                   <span className="text-[10px] opacity-50 uppercase leading-none mb-1">لجنة</span>
                   <span className="text-5xl tabular-nums leading-none">{activeCommittee}</span>
                </div>
                <div>
                   <h3 className="text-2xl font-black">{user.full_name}</h3>
                   <div className="flex items-center gap-3 mt-2">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> مباشر الآن
                      </span>
                      <button onClick={() => setShowHistory(true)} className="text-slate-500 font-bold text-xs flex items-center gap-2 hover:text-white transition-colors underline tracking-tighter"><History size={14}/> السجل اليومي</button>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[90px]">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-1">الحضور</p>
                   <p className="text-2xl font-black text-emerald-400 tabular-nums">{stats.present}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[90px]">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-1">الغياب</p>
                   <p className="text-2xl font-black text-red-500 tabular-nums">{stats.absent}</p>
                </div>
             </div>
          </div>
       </div>

       {/* قسم تتبع البلاغات النشطة للجنة - لتطمين المراقب */}
       {committeeRequests.length > 0 && (
          <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border-2 border-slate-50 overflow-hidden">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-2"><Clock size={16} className="text-blue-600"/> تتبع حالة البلاغات النشطة</h4>
             <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {committeeRequests.slice(0, 5).map(req => (
                  <div key={req.id} className="min-w-[260px] bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2 relative group transition-all hover:bg-white">
                     <div className={`absolute top-0 right-0 w-1.5 h-full ${req.status === 'DONE' ? 'bg-emerald-500' : req.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                     <div className="flex justify-between items-center pr-2">
                        <span className="text-[8px] font-black text-slate-400 font-mono">{new Date(req.time).toLocaleTimeString('ar-SA')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${req.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                           {req.status === 'DONE' ? 'تمت المباشرة' : req.status === 'IN_PROGRESS' ? 'جاري التنفيذ' : 'بانتظار الرد'}
                        </span>
                     </div>
                     <p className="text-xs font-black text-slate-800 truncate pr-2">{req.text}</p>
                  </div>
                ))}
             </div>
          </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => { setRequestSubView('MAIN'); setIsRequestModalOpen(true); }} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-red-700 transition-all active:scale-95 border-b-[8px] border-red-800">
             <Zap size={40} fill="white" /> بلاغ ميداني عاجل
          </button>
          <button onClick={() => { setClosingStep(0); setIsClosingWizardOpen(true); }} className="p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-blue-600 transition-all active:scale-95 border-b-[8px] border-slate-950">
             <PackageCheck size={40} /> إنهاء واغلاق اللجنة
          </button>
       </div>

       {/* قائمة الطلاب الملونة */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
         {myStudents.map((s: Student) => {
           const status = myAbsences.find(a => a.student_id === s.national_id);
           return (
             <div key={s.id} className={`p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[340px] ${status?.type === 'ABSENT' ? 'bg-red-50/70 border-red-200' : status?.type === 'LATE' ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-50 hover:border-blue-100'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}><GraduationCap size={28} /></div>
                  <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] shadow-lg uppercase tracking-widest ${status ? (status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white') : 'bg-emerald-600 text-white'}`}>{status ? (status.type === 'ABSENT' ? 'غائب' : 'متأخر') : 'حاضر'}</span>
                </div>
                <div className="flex-1 text-right space-y-3 px-2">
                   <h4 className="text-2xl font-black text-slate-900 break-words leading-tight">{s.name}</h4>
                   <div className="flex items-center gap-2">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{s.grade} - فصل {s.section}</span>
                      {s.seating_number && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black border border-blue-100">رقم: {s.seating_number}</span>}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-8">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all active:scale-95 ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-white/60 text-slate-400 hover:bg-red-50'}`}>رصد غياب</button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all active:scale-95 ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-md' : 'bg-white/60 text-slate-400 hover:bg-amber-50'}`}>رصد تأخر</button>
                </div>
             </div>
           );
         })}
       </div>

       {/* مودال البلاغات المتخصص (نظام التحديد المتعدد وبحث المعلم) */}
       {isRequestModalOpen && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-fade-in no-print overflow-y-auto">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={resetRequestModal}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border-b-[20px] border-red-600 animate-slide-up my-auto">
                <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-3xl rounded-full"></div>
                    <div className="flex items-center gap-5 relative z-10">
                       {requestSubView !== 'MAIN' && (
                         <button onClick={() => setRequestSubView('MAIN')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><ArrowRight size={24}/></button>
                       )}
                       <ShieldAlert className="text-red-500 animate-pulse" size={32}/>
                       <h3 className="text-3xl font-black tracking-tighter">بلاغ ميداني عاجل</h3>
                    </div>
                    <button onClick={resetRequestModal} className="bg-white/10 p-3 rounded-full relative z-10 hover:bg-white/20 transition-all"><X size={32}/></button>
                </div>

                <div className="p-10">
                   {requestSubView === 'SELECT_STUDENTS' ? (
                     <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                           <h4 className="text-2xl font-black text-slate-800 tracking-tight">اختيار الطلاب المعنيين</h4>
                           <p className="text-slate-400 font-bold italic mt-1 text-sm">حدد الطلاب للإبلاغ عن ({currentRequestLabel})</p>
                        </div>
                        <div className="max-h-[380px] overflow-y-auto space-y-3 custom-scrollbar px-2">
                           {myStudents.map(s => (
                             <button 
                                key={s.id} 
                                onClick={() => setSelectedStudentsForReq(prev => prev.includes(s.national_id) ? prev.filter(id => id !== s.national_id) : [...prev, s.national_id])} 
                                className={`w-full p-6 rounded-[2.5rem] border-2 transition-all text-right flex justify-between items-center ${selectedStudentsForReq.includes(s.national_id) ? 'border-red-600 bg-red-50 shadow-xl' : 'border-slate-100 bg-slate-50'}`}
                             >
                                <div className="text-right">
                                   <span className="font-black text-lg text-slate-800 block leading-none">{s.name}</span>
                                   <span className="text-[10px] text-slate-400 font-bold mt-1">رقم الجلوس: {s.seating_number || '---'}</span>
                                </div>
                                {selectedStudentsForReq.includes(s.national_id) ? <CheckCircle2 className="text-red-600" size={32} /> : <div className="w-8 h-8 rounded-full border-2 border-slate-200"></div>}
                             </button>
                           ))}
                        </div>
                        <button onClick={() => sendFinalRequest('')} disabled={selectedStudentsForReq.length === 0} className="w-full bg-red-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl active:scale-95 disabled:opacity-50 border-b-[8px] border-red-800">
                           إرسال البلاغ لـ ({selectedStudentsForReq.length}) طلاب
                        </button>
                     </div>
                   ) : requestSubView === 'SELECT_TEACHER' ? (
                     <div className="space-y-8 animate-fade-in">
                        <div className="relative">
                           <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                           <input 
                              type="text" 
                              placeholder="ابحث عن اسم المعلم..." 
                              className="w-full pr-16 p-6 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] font-black text-xl outline-none focus:border-indigo-600 transition-all shadow-inner"
                              value={teacherSearch}
                              onChange={e => setTeacherSearch(e.target.value)}
                           />
                        </div>
                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar space-y-3 px-2">
                           {filteredTeachers.map(t => (
                             <button 
                               key={t.id} 
                               onClick={() => sendFinalRequest(`طلب معلم المادة: ${t.full_name}`)}
                               className="w-full p-8 rounded-[3rem] border-2 bg-slate-50 border-slate-100 text-right font-black text-2xl hover:border-indigo-600 hover:bg-white transition-all shadow-md group flex items-center justify-between"
                             >
                                <span>{t.full_name}</span>
                                <ArrowRight size={24} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -rotate-180" />
                             </button>
                           ))}
                           {filteredTeachers.length === 0 && (
                             <div className="py-20 text-center text-slate-300 font-bold italic">لا توجد نتائج مطابقة لبحثك</div>
                           )}
                        </div>
                     </div>
                   ) : requestSubView === 'COUNTER' ? (
                     <div className="text-center space-y-12 animate-fade-in">
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">تحديد العدد المطلوب</h4>
                        <div className="flex items-center justify-center gap-12">
                           <button onClick={() => setRequestCount(c => Math.max(1, c-1))} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Minus size={40}/></button>
                           <span className="text-[120px] font-black tabular-nums text-slate-900 leading-none">{requestCount}</span>
                           <button onClick={() => setRequestCount(c => c+1)} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner hover:bg-slate-200 transition-colors active:scale-90"><Plus size={40}/></button>
                        </div>
                        <button onClick={() => sendFinalRequest('')} className="w-full bg-red-600 text-white py-9 rounded-[2.5rem] font-black text-3xl shadow-xl active:scale-95 border-b-[8px] border-red-800">تأكيد وإرسال البلاغ</button>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-5">
                        {[
                          { icon: PackageSearch, label: 'نقص ورق إجابة', type: 'STUDENTS', color: 'text-rose-600', bg: 'bg-rose-50' },
                          { icon: Ambulance, label: 'حالة صحية طارئة', color: 'text-red-600', bg: 'bg-red-50' },
                          { icon: Pen, label: 'طلب أقلام/أدوات', color: 'text-blue-600', bg: 'bg-blue-50' },
                          { icon: NotebookPen, label: 'طلب ورق هامش', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                          { icon: FileWarning, label: 'نقص ورق أسئلة', type: 'COUNT', color: 'text-orange-600', bg: 'bg-orange-50' },
                          { icon: UserSearch, label: 'طلب معلم المادة', type: 'TEACHER', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                          { icon: Backpack, label: 'طلب مرسام/مساطر', color: 'text-slate-600', bg: 'bg-slate-50' },
                          { icon: MessageCircle, label: 'بلاغ آخر (كتابة)', type: 'CUSTOM', color: 'text-slate-400', bg: 'bg-slate-50' }
                        ].map((item, idx) => (
                          <button key={idx} onClick={() => handleQuickRequest(item.label, item.type as any)} className={`p-8 ${item.bg} border-2 border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-5 hover:scale-105 transition-all group hover:bg-white active:scale-95 shadow-lg`}>
                             <item.icon size={56} className={`${item.color} group-hover:scale-110 transition-transform`} />
                             <span className="font-black text-sm text-slate-700 text-center">{item.label}</span>
                          </button>
                        ))}
                     </div>
                   )}
                </div>
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
