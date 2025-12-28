
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog } from '../../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  LogIn, Scan, Users, UserCheck, GraduationCap, 
  UserPlus, UserMinus, Clock, History, CheckCircle, 
  ArrowRightCircle, AlertTriangle, PenTool, 
  AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
  LayoutGrid, X, Send, FileStack, RefreshCcw, BellRing,
  HeartPulse, HelpCircle, ShieldAlert, AlertOctagon,
  ScrollText, UserCircle, CheckSquare, Square, ThumbsUp,
  UserCheck2, PackageCheck, ClipboardCheck, ArrowUpRight,
  CheckCircle2, Award, Zap, Star, FileBadge, BookOpen
} from 'lucide-react';
import { db } from '../../supabase';

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
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ user, supervisions, setSupervisions, students, absences, setAbsences, onAlert, sendRequest, deliveryLogs, setDeliveryLogs }) => {
  const [activeCommittee, setActiveCommittee] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
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
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const currentAssignment = useMemo(() => supervisions.find((s: any) => s.teacher_id === user.id), [supervisions, user]);
  
  useEffect(() => { 
    if (currentAssignment) {
      setActiveCommittee(currentAssignment.committee_number);
      setIsSessionFinished(false);
    } else {
      setActiveCommittee(null);
    }
  }, [currentAssignment]);

  const currentSessionConfirmedLogs = useMemo(() => {
    if (!activeCommittee || !currentAssignment) return [];
    return deliveryLogs.filter(log => 
      log.committee_number === activeCommittee && 
      log.proctor_name === user.full_name && 
      log.status === 'CONFIRMED'
    ).sort((a, b) => b.time.localeCompare(a.time));
  }, [deliveryLogs, activeCommittee, user.full_name, currentAssignment]);

  const activePendingLogs = useMemo(() => {
    if (!activeCommittee || !currentAssignment) return [];
    return deliveryLogs.filter(log => 
      log.committee_number === activeCommittee && 
      log.proctor_name === user.full_name && 
      log.status === 'PENDING'
    );
  }, [deliveryLogs, activeCommittee, user.full_name, currentAssignment]);

  const isCommitteeClosed = useMemo(() => {
    return !!currentAssignment && currentSessionConfirmedLogs.length > 0 && !isSessionFinished;
  }, [currentAssignment, currentSessionConfirmedLogs, isSessionFinished]);

  const isAwaitingReceipt = useMemo(() => {
    return !!currentAssignment && activePendingLogs.length > 0 && currentSessionConfirmedLogs.length === 0;
  }, [currentAssignment, activePendingLogs, currentSessionConfirmedLogs]);

  // منطق الأرشيف المطور: تجميع السجلات حسب اللجنة
  const myHistory = useMemo(() => {
    const confirmedLogs = deliveryLogs.filter(log => 
      log.proctor_name === user.full_name && 
      log.type === 'RECEIVE' && 
      log.status === 'CONFIRMED'
    );
    
    const grouped = new Map<string, DeliveryLog[]>();
    confirmedLogs.forEach(log => {
      if (!grouped.has(log.committee_number)) {
        grouped.set(log.committee_number, []);
      }
      grouped.get(log.committee_number)?.push(log);
    });
    
    return Array.from(grouped.entries()).map(([committeeNum, logs]) => ({
      committee_number: committeeNum,
      logs: logs.sort((a, b) => b.time.localeCompare(a.time))
    })).sort((a, b) => b.logs[0].time.localeCompare(a.logs[0].time));
  }, [deliveryLogs, user.full_name]);

  const myStudents = useMemo(() => students.filter((s: Student) => s.committee_number === activeCommittee), [students, activeCommittee]);
  
  const gradesInCommittee = useMemo(() => {
    return Array.from(new Set(myStudents.map(s => s.grade))).sort();
  }, [myStudents]);

  const committeeAbsences = useMemo(() => {
    return absences.filter((a: Absence) => a.committee_number === activeCommittee);
  }, [absences, activeCommittee]);

  const stats = useMemo(() => {
    const total = myStudents.length;
    const absent = committeeAbsences.filter((a: any) => a.type === 'ABSENT').length;
    const present = total - absent;
    return { total, absent, present };
  }, [committeeAbsences, myStudents]);

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    const existing = committeeAbsences.find(a => a.student_id === student.national_id);
    
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
        setAbsences((prev: Absence[]) => prev.filter(a => a.student_id !== student.national_id));
      } else {
        const newAbsence: Absence = {
          id: existing?.id || crypto.randomUUID(),
          student_id: student.national_id,
          student_name: student.name,
          committee_number: activeCommittee!,
          period: 1,
          type: type,
          proctor_id: user.id,
          date: new Date().toISOString()
        };
        await db.absences.upsert(newAbsence);
        setAbsences((prev: Absence[]) => {
          const filtered = prev.filter(a => a.student_id !== student.national_id);
          return [...filtered, newAbsence];
        });
      }
    } catch (err: any) {
      onAlert(`فشل في تحديث حالة الطالب: ${err.message}`);
    }
  };

  const handleSendReport = async (text: string) => {
    if (!text.trim()) return;
    setIsSendingReport(true);
    try {
      await sendRequest(text, activeCommittee);
      onAlert("🚀 تم إرسال البلاغ فوراً لغرفة العمليات.");
      setIsReportModalOpen(false);
      setReportStep('MENU');
      setSelectedStudentsForReport([]);
      setCustomMessage('');
    } catch (err: any) {
      onAlert(`❌ فشل في إرسال البلاغ: ${err.message}`);
    } finally {
      setIsSendingReport(false);
    }
  };

  const startClosingWizard = () => {
    const initialCounts: Record<string, string> = {};
    gradesInCommittee.forEach(g => {
      initialCounts[g] = '0';
    });
    setClosingCounts(initialCounts);
    setIsClosingWizardOpen(true);
    setCountError(null);
    
    if (committeeAbsences.some(a => a.type === 'ABSENT')) {
      setClosingStep(-1);
    } else {
      setClosingStep(0);
    }
  };

  const validateAndNext = () => {
    setCountError(null);
    const grade = gradesInCommittee[closingStep];
    const entered = parseInt(closingCounts[grade] || '0');
    const actualTotal = myStudents.filter(s => s.grade === grade).length;

    if (entered === 0) {
      setCountError("يرجى إدخال عدد الأوراق للمتابعة");
      return;
    }

    if (entered !== actualTotal) {
      setCountError(`تنبيه: يوجد اختلاف! عدد الأوراق المدخل (${entered}) لا يطابق إجمالي طلاب الصف (${actualTotal}). يرجى إعادة العد بدقة.`);
      return;
    }

    setClosingStep(s => s + 1);
  };

  const confirmClosing = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      try {
        const countsString = Object.entries(closingCounts).map(([g, c]) => `${g}: (${c} ورقة)`).join(' | ');
        const logEntry: Partial<DeliveryLog> = {
          id: crypto.randomUUID(),
          teacher_name: 'بانتظار عضو الكنترول',
          proctor_name: user.full_name,
          committee_number: activeCommittee!,
          grade: countsString,
          type: 'RECEIVE',
          time: new Date().toISOString(),
          period: 1,
          status: 'PENDING'
        };
        await setDeliveryLogs(logEntry);
        await sendRequest(`طلب إغلاق اللجنة. أعداد الأوراق المعتمدة: ${countsString}`, activeCommittee);
        setIsVerifying(false);
        setIsClosingWizardOpen(false);
        onAlert("تم إرسال طلب الإغلاق. جاري التدقيق الرقمي...");
      } catch (err: any) {
        setIsVerifying(false);
        onAlert(`فشل في إغلاق اللجنة: ${err.message}`);
      }
    }, 2000);
  };

  const joinCommittee = async (committeeNum: string) => {
    if (!committeeNum) return;
    try {
      await db.supervision.deleteByTeacherId(user.id);
      const newSV: Supervision = { 
        id: crypto.randomUUID(), 
        teacher_id: user.id, 
        committee_number: committeeNum, 
        date: new Date().toISOString(), 
        period: 1, 
        subject: 'اختبار الفترة' 
      };
      await db.supervision.insert(newSV);
      setSupervisions((prev: any) => [...prev.filter((s:any) => s.teacher_id !== user.id), newSV]);
      setActiveCommittee(committeeNum);
      setIsSessionFinished(false);
      setManualInput('');
    } catch (err: any) {
      onAlert(`فشل الالتحاق باللجنة: ${err.message}`);
    }
  };

  const leaveAndJoinNew = async () => {
    try {
      await db.supervision.deleteByTeacherId(user.id);
      setSupervisions((prev: any) => prev.filter((s: any) => s.teacher_id !== user.id));
      setActiveCommittee(null);
      setIsSessionFinished(true);
      setManualInput('');
    } catch (err: any) {
      onAlert(`خطأ في إنهاء الجلسة: ${err.message}`);
    }
  };

  // شاشة الالتحاق والأرشيف المطور
  if (!currentAssignment || isSessionFinished) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-16 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 md:p-20 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            <LogIn size={80} className="mx-auto text-blue-500 mb-10 group-hover:scale-110 transition-transform duration-500" />
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">التحاق بلجنة المراقبة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
               <button onClick={() => {
                 setIsScanning(true);
                 setTimeout(() => {
                   scannerRef.current = new Html5QrcodeScanner("proctor-join-reader", { fps: 15, qrbox: 250 }, false);
                   scannerRef.current.render((text) => { joinCommittee(text); setIsScanning(false); scannerRef.current?.clear(); }, () => {});
                 }, 100);
               }} className="p-10 bg-blue-600 rounded-[3rem] font-black text-2xl flex flex-col items-center gap-6 shadow-2xl hover:bg-blue-500 active:scale-95 transition-all">
                 <Scan size={48} />
                 <span>مسح الرمز (QR)</span>
               </button>
               <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col items-center gap-6">
                 <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="رقم اللجنة" className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-5 text-center text-4xl font-black text-white outline-none focus:border-blue-500 placeholder:text-white/10" />
                 <button onClick={() => joinCommittee(manualInput)} disabled={!manualInput} className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all active:scale-95">التحاق يدوي</button>
               </div>
            </div>
            {isScanning && (
               <div className="fixed inset-0 z-[300] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8">
                 <div id="proctor-join-reader" className="w-full max-sm rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/10 bg-white"></div>
                 <button onClick={() => {setIsScanning(false); scannerRef.current?.clear();}} className="mt-12 bg-white text-slate-950 px-16 py-5 rounded-[2rem] font-black text-2xl shadow-xl">إلغاء المسح</button>
               </div>
            )}
         </div>

         {/* أرشيف اللجان المطور بتفصيل كل صف */}
         {myHistory.length > 0 && (
           <div className="text-right space-y-10 animate-slide-up">
             <div className="flex items-center justify-between px-4 border-b pb-4 border-slate-200">
                <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4">
                  <History className="text-blue-600" size={32} /> أرشيف اللجان المعتمدة
                </h3>
                <span className="bg-slate-100 text-slate-500 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">{myHistory.length} لجنة منتهية</span>
             </div>

             <div className="grid grid-cols-1 gap-10">
               {myHistory.map(item => (
                 <div key={item.committee_number} className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden group hover:border-emerald-200 transition-all duration-500">
                    <div className="bg-slate-950 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-8 text-right">
                          <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl group-hover:scale-110 transition-transform">
                            <span className="text-[10px] opacity-40 uppercase">لجنة</span>
                            <span className="text-4xl leading-none">{item.committee_number}</span>
                          </div>
                          <div>
                            <p className="text-white text-2xl font-black mb-1">اكتملت المراقبة والمطابقة</p>
                            <div className="flex items-center gap-4 text-emerald-400 text-sm font-bold">
                                <span className="flex items-center gap-2"><Clock size={16}/> {new Date(item.logs[0].time).toLocaleDateString('ar-SA')}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                <span className="flex items-center gap-2"><PackageCheck size={16}/> {item.logs.length} سندات استلام</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/10 px-8 py-4 rounded-[2rem] border border-white/5 flex items-center gap-3 text-white">
                           <ShieldCheck size={28} className="text-emerald-400" />
                           <span className="font-black text-sm uppercase tracking-widest">إغلاق مُعتمد نظامياً</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">بيان المستلمين والصفوف:</p>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {item.logs.map((log, idx) => (
                            <div key={log.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 group/sub hover:bg-emerald-50 hover:border-emerald-100 transition-all">
                               <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover/sub:scale-110 transition-transform">
                                  <UserCheck2 size={28}/>
                               </div>
                               <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                     <BookOpen size={12} className="text-emerald-600" />
                                     <p className="text-[10px] font-black text-slate-400 uppercase leading-none">صف: {log.grade}</p>
                                  </div>
                                  <p className="text-base font-black text-slate-700 truncate">{log.teacher_name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock size={10} /> تم الاستلام الساعة {new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}
                                  </p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 py-4 px-8 border-t border-slate-100 flex justify-center">
                       <p className="text-[10px] font-bold text-slate-400 italic">هذه السجلات محفوظة بشكل دائم في قاعدة بيانات النظام للرجوع إليها مستقبلاً</p>
                    </div>
                 </div>
               ))}
             </div>
           </div>
         )}
      </div>
    );
  }

  // شاشة النجاح (عند اعتماد الكنترول للجنة بالكامل أو صفوف منها)
  if (isCommitteeClosed) {
    return (
      <div className="max-w-6xl mx-auto py-12 md:py-24 px-6 text-center space-y-12 animate-fade-in no-print">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px] opacity-40 animate-pulse"></div>
          <div className="bg-emerald-600 w-44 h-44 rounded-[4.5rem] flex items-center justify-center mx-auto text-white shadow-[0_20px_60px_rgba(16,185,129,0.5)] relative z-10 animate-bounce">
            <Award size={100} />
          </div>
          <div className="absolute -top-4 -right-4 bg-amber-500 p-4 rounded-full text-white shadow-xl animate-spin-slow">
            <Star size={32} fill="white" />
          </div>
        </div>
        
        <div className="space-y-4">
           <h2 className="text-6xl md:text-7xl font-black text-slate-950 tracking-tighter">إنجاز مُعتمد</h2>
           <p className="text-slate-400 font-bold text-2xl">تم استلام وتوثيق كافة المظاريف بنجاح تام</p>
        </div>

        {/* لوحة سندات الاستلام الملكية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {currentSessionConfirmedLogs.map((log, index) => {
             const gradeLabel = log.grade.split(':')[0] || 'غير محدد';
             const gradeStudents = myStudents.filter(s => s.grade === gradeLabel);
             const gradeAbsences = committeeAbsences.filter(a => gradeStudents.some(s => s.national_id === a.student_id));
             
             const totalS = gradeStudents.length;
             const absS = gradeAbsences.filter(a => a.type === 'ABSENT').length;
             const lateS = gradeAbsences.filter(a => a.type === 'LATE').length;
             const presS = totalS - absS;

             return (
               <div key={log.id} className="bg-slate-950 text-white rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border-2 border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"></div>
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full"></div>
                  
                  <div className="p-10 text-right space-y-8">
                     <div className="flex justify-between items-start">
                        <div className="bg-white/10 px-5 py-2 rounded-2xl font-black text-[10px] tracking-widest text-emerald-400 uppercase border border-white/5">
                           سند استلام رقم {currentSessionConfirmedLogs.length - index}
                        </div>
                        <div className="text-amber-500 font-black flex items-center gap-3">
                           <CheckCircle2 size={24}/>
                           <span className="text-sm">مطابقة رقمية</span>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">بيان الصف والعهدة:</p>
                        <h4 className="text-4xl font-black text-white leading-tight flex items-center gap-4">
                          <FileBadge className="text-emerald-500" size={32} /> {gradeLabel}
                        </h4>
                     </div>

                     <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white/5 p-4 rounded-3xl text-center border border-white/5 group-hover:bg-white/10 transition-colors">
                           <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">طلاب</p>
                           <p className="text-xl font-black tabular-nums">{totalS}</p>
                        </div>
                        <div className="bg-emerald-500/10 p-4 rounded-3xl text-center border border-emerald-500/20">
                           <p className="text-[9px] font-black text-emerald-400 mb-1 uppercase">حاضر</p>
                           <p className="text-xl font-black tabular-nums">{presS}</p>
                        </div>
                        <div className="bg-red-500/10 p-4 rounded-3xl text-center border border-red-500/20">
                           <p className="text-[9px] font-black text-red-400 mb-1 uppercase">غائب</p>
                           <p className="text-xl font-black tabular-nums">{absS}</p>
                        </div>
                        <div className="bg-amber-500/10 p-4 rounded-3xl text-center border border-amber-500/20">
                           <p className="text-[9px] font-black text-amber-400 mb-1 uppercase">تأخر</p>
                           <p className="text-xl font-black tabular-nums">{lateS}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 flex items-center gap-6">
                        <div className="w-16 h-16 bg-white text-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shrink-0">
                           <UserCheck2 size={32}/>
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[9px] font-black text-slate-500 uppercase mb-1">المسؤول المستلم (الكنترول):</p>
                           <p className="text-lg font-black text-white truncate">{log.teacher_name}</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3"><Clock size={16} className="text-emerald-500"/> {new Date(log.time).toLocaleTimeString('ar-SA')}</div>
                        <div className="flex items-center gap-3"><LayoutGrid size={16} className="text-emerald-500"/> لجنة {log.committee_number}</div>
                     </div>
                  </div>
               </div>
             );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch pt-14">
          <button 
            onClick={leaveAndJoinNew} 
            className="bg-emerald-600 text-white px-16 py-8 rounded-[3.5rem] font-black text-3xl flex items-center justify-center gap-8 shadow-[0_30px_70px_rgba(16,185,129,0.4)] hover:bg-emerald-700 hover:scale-[1.04] transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <ThumbsUp size={44} className="group-hover:rotate-12 transition-transform"/> 
            <span>اعتماد والتحاق بلجنة جديدة</span>
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="bg-slate-950 text-white px-12 py-8 rounded-[3.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl border-2 border-white/10 hover:bg-blue-600 transition-all active:scale-95 group"
          >
            <ArrowUpRight size={32} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> 
            طباعة سجل الاعتماد 
          </button>
        </div>
      </div>
    );
  }

  // شاشة العمل الحالية
  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto text-right pb-32 px-4">
       <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8 text-right flex-1 w-full">
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl shrink-0">
              <span className="text-[10px] opacity-40 uppercase mb-1">لجنة</span>
              <span className="text-5xl leading-none">{activeCommittee}</span>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4">{isAwaitingReceipt ? 'جاري التدقيق الرقمي...' : 'رصد حضور اللجنة الرقمي'}</h3>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-slate-50 border px-6 py-2 rounded-2xl flex items-center gap-3 text-slate-600 font-black text-sm">
                    <Users size={18} className="text-blue-600"/> {stats.total} طالب
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-2xl flex items-center gap-3 text-emerald-700 font-black text-sm">
                    <UserCheck size={18}/> {stats.present} حاضر
                  </div>
                  {stats.absent > 0 && (
                    <div className="bg-red-50 border border-red-100 px-6 py-2 rounded-2xl flex items-center gap-3 text-red-700 font-black text-sm">
                      <UserMinus size={18}/> {stats.absent} غائب
                    </div>
                  )}
               </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
             <button onClick={() => setIsReportModalOpen(true)} className="flex-1 sm:flex-initial bg-red-600 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-red-700 shadow-xl transition-all active:scale-95">
               <AlertTriangle size={24} /> بلاغ عاجل
             </button>
             {!isAwaitingReceipt && (
               <button onClick={startClosingWizard} className="flex-1 sm:flex-initial bg-slate-950 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-blue-600 shadow-xl transition-all active:scale-95">
                 <ShieldCheck size={24} /> إغلاق اللجنة
               </button>
             )}
          </div>
       </div>

       {isAwaitingReceipt && (
         <div className="bg-amber-50 border-4 border-dashed border-amber-200 p-10 rounded-[3.5rem] text-center space-y-6 animate-pulse shadow-2xl shadow-amber-100">
            <Loader2 size={48} className="mx-auto text-amber-500 animate-spin" />
            <h4 className="text-3xl font-black text-amber-900 tracking-tight">جاري التدقيق الرقمي والمطابقة...</h4>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-amber-100 max-w-xl mx-auto space-y-4 text-right">
               <p className="text-amber-600 font-black text-xs uppercase tracking-widest mb-2 border-b pb-2">تفاصيل الملف المرفوع للكنترول:</p>
               <p className="font-black text-slate-700 text-2xl leading-relaxed">{activePendingLogs[0]?.grade}</p>
            </div>
            <p className="text-amber-700 font-bold text-lg max-w-xl mx-auto">يرجى تسليم المظروف لأقرب عضو كنترول ليقوم بمطابقة الأوراق الورقية وإنهاء المهمة.</p>
         </div>
       )}

       <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${isAwaitingReceipt ? 'opacity-30 pointer-events-none grayscale scale-95 transition-all' : ''}`}>
         {myStudents.map((s: Student) => {
           const status = committeeAbsences.find(a => a.student_id === s.national_id);
           return (
             <div key={s.id} className={`p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[400px] ${status?.type === 'ABSENT' ? 'bg-red-50/50 border-red-200' : status?.type === 'LATE' ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-white hover:border-blue-100'}`}>
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                    <GraduationCap size={32} />
                  </div>
                  {status && (
                    <span className={`px-5 py-2 rounded-2xl font-black text-xs uppercase shadow-lg ${status.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {status.type === 'ABSENT' ? 'غائب' : 'متأخر'}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-4 text-right">
                   <h4 className="text-2xl font-black text-slate-900 leading-tight mb-2 break-words">{s.name}</h4>
                   <div className="flex flex-wrap gap-2">
                     <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-200">ID: {s.national_id}</span>
                     <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black border border-blue-100">{s.grade}</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-10">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-6 rounded-[2.2rem] font-black text-sm transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-red-50'}`}>
                     {status?.type === 'ABSENT' ? <RefreshCcw size={24} /> : <UserMinus size={24} />}
                     <span>{status?.type === 'ABSENT' ? 'إلغاء الغياب' : 'رصد غياب'}</span>
                   </button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-6 rounded-[2.2rem] font-black text-sm transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-amber-50'}`}>
                     {status?.type === 'LATE' ? <RefreshCcw size={24} /> : <Clock size={24} />}
                     <span>{status?.type === 'LATE' ? 'إلغاء التأخر' : 'رصد تأخر'}</span>
                   </button>
                </div>
             </div>
           );
         })}
       </div>

       {/* النوافذ المنبثقة للبلاغات والعد تظل كما هي لتحافظ على الوظيفية */}
       {isReportModalOpen && (
         <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" onClick={() => { setIsReportModalOpen(false); setReportStep('MENU'); }}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[12px] border-red-600">
               <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="bg-red-600 p-5 rounded-3xl shadow-2xl shadow-red-600/40 animate-pulse border-2 border-white/10">
                        <AlertOctagon size={44} className="text-white" />
                     </div>
                     <div className="text-right">
                        <h3 className="text-3xl font-black tracking-tighter">مركز القيادة والسيطرة</h3>
                        <p className="text-red-400 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                          <BellRing size={14}/> قناة البلاغات العاجلة للجنة {activeCommittee}
                        </p>
                     </div>
                  </div>
                  <button onClick={() => { setIsReportModalOpen(false); setReportStep('MENU'); }} className="bg-white/5 p-3 rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"><X size={32}/></button>
               </div>
               
               <div className="p-10 space-y-12">
                  {reportStep === 'MENU' ? (
                    <div className="space-y-10">
                      <div className="space-y-6">
                         <div className="flex items-center gap-3 px-2">
                            <div className="h-6 w-1.5 bg-red-600 rounded-full"></div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">بلاغات الاستجابة السريعة (One-Tap)</p>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { id: "sheets", text: "نقص أوراق الإجابة", icon: FileStack, color: "bg-red-50 text-red-600 border-red-100", detail: "حدد الطلاب الذين يحتاجون أوراقاً", action: () => setReportStep('STUDENT_PICKER') },
                              { id: "health", text: "حالة صحية طارئة", icon: HeartPulse, color: "bg-emerald-50 text-emerald-600 border-emerald-100", detail: "طلب الموجه الصحي للجنة", action: () => handleSendReport("حالة صحية طارئة في اللجنة") },
                              { id: "query", text: "استفسار عن سؤال", icon: HelpCircle, color: "bg-blue-50 text-blue-600 border-blue-100", detail: "طلب توضيح من معلم المادة", action: () => handleSendReport("يوجد استفسار عن سؤال في المادة") },
                              { id: "pencil", text: "نقص مرسام (قلم رصاص)", icon: PenTool, color: "bg-amber-50 text-amber-600 border-amber-100", detail: "طلب أقلام رصاص إضافية", action: () => handleSendReport("نقص أقلام رصاص (مرسام) في اللجنة") },
                              { id: "scratch", text: "طلب ورق هامش", icon: ScrollText, color: "bg-purple-50 text-purple-600 border-purple-100", detail: "أوراق مسودة إضافية", action: () => handleSendReport("طلب ورق هامش (مسودة) إضافي") }
                            ].map(item => (
                              <button 
                                key={item.id} 
                                onClick={item.action}
                                className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 active:scale-95 group hover:shadow-2xl ${item.color} text-right`}
                              >
                                <div className="p-4 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6">
                                   <item.icon size={28} />
                                </div>
                                <div>
                                   <span className="font-black text-base block leading-none mb-1">{item.text}</span>
                                   <span className="text-[10px] opacity-60 font-bold block leading-none">{item.detail}</span>
                                </div>
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-5">
                         <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                               <div className="h-6 w-1.5 bg-slate-900 rounded-full"></div>
                               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">تقرير مفصل</p>
                            </div>
                         </div>
                         <div className="relative group">
                            <textarea 
                              value={customMessage}
                              onChange={e => setCustomMessage(e.target.value)}
                              placeholder="اشرح طبيعة البلاغ هنا بدقة ليتمكن الكنترول من مساعدتك..."
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 font-bold text-lg h-32 outline-none focus:border-red-600 focus:bg-white transition-all placeholder:text-slate-300 resize-none shadow-inner"
                            />
                         </div>
                         <button 
                            onClick={() => handleSendReport(customMessage)}
                            disabled={!customMessage.trim() || isSendingReport}
                            className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50 transition-all hover:bg-red-600 group"
                          >
                            {isSendingReport ? <Loader2 size={32} className="animate-spin" /> : <Send size={28} />}
                            بث البلاغ المخصص
                          </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-fade-in">
                       <button onClick={() => setReportStep('MENU')} className="flex items-center gap-2 text-slate-400 font-black text-xs hover:text-slate-900 transition-all">
                          <ChevronRight size={16} /> العودة للقائمة الرئيسية
                       </button>
                       <div className="bg-blue-50 p-8 rounded-[3rem] border border-blue-100">
                          <h4 className="text-xl font-black text-blue-900 mb-2">تحديد الطلاب المحتاجين لأوراق</h4>
                          <p className="text-blue-600 text-[11px] font-bold">يمكنك اختيار طالب واحد أو أكثر من القائمة بالضغط على الاسم</p>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar p-2">
                          {myStudents.map(s => {
                            const isSelected = selectedStudentsForReport.includes(s.name);
                            return (
                              <button 
                                key={s.id} 
                                onClick={() => {
                                  setSelectedStudentsForReport(prev => 
                                    prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name]
                                  );
                                }}
                                className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-right group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700 hover:border-blue-200'}`}
                              >
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-200" />}
                                <div className="min-w-0 flex-1">
                                   <p className="font-black text-sm truncate">{s.name}</p>
                                   <p className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>جلوس: {s.seating_number || '---'}</p>
                                </div>
                              </button>
                            );
                          })}
                       </div>
                       <button 
                          onClick={() => handleSendReport(`نقص أوراق إجابة للطلاب: ${selectedStudentsForReport.join(' - ')}`)}
                          disabled={selectedStudentsForReport.length === 0 || isSendingReport}
                          className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50 transition-all group"
                        >
                          {isSendingReport ? <Loader2 size={32} className="animate-spin" /> : <Send size={28} className="group-hover:translate-x-[-10px] transition-transform" />}
                          إرسال طلب الأوراق ({selectedStudentsForReport.length})
                        </button>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}

       {/* معالج إغلاق اللجنة */}
       {isClosingWizardOpen && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => !isVerifying && setIsClosingWizardOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up">
               {isVerifying ? (
                 <div className="p-20 text-center space-y-8 animate-fade-in">
                    <Loader2 size={80} className="mx-auto text-blue-600 animate-spin" />
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">جاري المراجعة والتدقيق...</h3>
                    <p className="text-slate-500 font-bold text-lg">نقوم بمطابقة أعداد الأوراق والبيانات الرقمية لضمان الدقة الكاملة.</p>
                 </div>
               ) : closingStep === -1 ? (
                 <div className="p-10 space-y-8 animate-fade-in">
                    <div className="bg-red-50 p-8 rounded-[3rem] border border-red-100 flex flex-col items-center gap-4 text-center">
                       <AlertCircle size={56} className="text-red-500 animate-bounce" />
                       <h4 className="text-3xl font-black text-red-900">مراجعة حالة غياب الطلاب</h4>
                       <p className="text-red-700 font-bold">يوجد طلاب مسجلين كـ "غائبين" في النظام. هل ترغب في تحديث حالتهم قبل إغلاق اللجنة؟</p>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-2">
                       {committeeAbsences.filter(a => a.type === 'ABSENT').map(abs => {
                         const student = myStudents.find(s => s.national_id === abs.student_id);
                         return (
                           <div key={abs.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                              <span className="font-black text-slate-800 text-sm">{abs.student_name}</span>
                              <div className="flex gap-2">
                                 <button onClick={() => toggleStudentStatus(student!, 'LATE')} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] hover:bg-amber-600 transition-all">تحويل لمتأخر</button>
                                 <button onClick={() => toggleStudentStatus(student!, 'ABSENT')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] hover:bg-emerald-600 transition-all">تحويل لحاضر</button>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                    <button onClick={() => setClosingStep(0)} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all">
                       تم التأكيد.. الانتقال للعد <ChevronLeft size={24} />
                    </button>
                 </div>
               ) : (
                 <>
                   <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                      <div className="relative z-10 text-right">
                        <h3 className="text-3xl font-black tracking-tight">إغلاق اللجنة (عد الأوراق)</h3>
                        <p className="text-slate-500 text-sm font-bold mt-1">يجب أن يشمل العد أوراق الإجابة + محاضر الغياب</p>
                      </div>
                      <div className="bg-white/10 px-6 py-2 rounded-full font-black text-xs">خطوة {closingStep + 1} من {gradesInCommittee.length + 1}</div>
                   </div>
                   <div className="p-12">
                      {closingStep < gradesInCommittee.length ? (
                        <div className="space-y-8 animate-fade-in">
                           <div className="text-center">
                              <span className="bg-blue-50 text-blue-600 px-6 py-2 rounded-full font-black text-sm border border-blue-100 mb-4 inline-block tracking-widest uppercase">عد أوراق صف</span>
                              <h4 className="text-5xl font-black text-slate-900 leading-none mt-2">{gradesInCommittee[closingStep]}</h4>
                           </div>
                           
                           <div className="flex flex-col items-center gap-6">
                              <p className="text-slate-500 font-bold italic">أدخل إجمالي عدد الأوراق (لا تستثني الغائبين):</p>
                              <div className="flex items-center gap-8">
                                 <button onClick={() => {
                                   const current = parseInt(closingCounts[gradesInCommittee[closingStep]] || '0');
                                   if (current > 0) setClosingCounts({...closingCounts, [gradesInCommittee[closingStep]]: (current - 1).toString()});
                                 }} className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-all active:scale-90"><UserMinus size={32}/></button>
                                 <input type="number" value={closingCounts[gradesInCommittee[closingStep]]} onChange={(e) => setClosingCounts({...closingCounts, [gradesInCommittee[closingStep]]: e.target.value})} className="w-40 text-center text-7xl font-black text-blue-600 bg-transparent border-b-4 border-blue-600 outline-none tabular-nums placeholder:text-blue-100" placeholder="0" />
                                 <button onClick={() => {
                                   const current = parseInt(closingCounts[gradesInCommittee[closingStep]] || '0');
                                   setClosingCounts({...closingCounts, [gradesInCommittee[closingStep]]: (current + 1).toString()});
                                 }} className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-all active:scale-90"><UserPlus size={32}/></button>
                              </div>

                              {countError && (
                                <div className="flex items-center gap-2 text-red-600 font-black animate-pulse bg-red-50 px-6 py-4 rounded-xl border border-red-100 text-center max-w-sm">
                                   <AlertTriangle size={18} className="shrink-0" />
                                   <span className="text-xs leading-relaxed">{countError}</span>
                                </div>
                              )}
                           </div>
                           
                           <button onClick={validateAndNext} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
                             تأكيد العدد والمتابعة <ChevronLeft size={24} />
                           </button>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-fade-in">
                           <div className="bg-emerald-50 p-8 rounded-[3rem] border-2 border-emerald-100 flex flex-col items-center gap-4 text-center">
                              <FileStack size={56} className="text-emerald-500" />
                              <h4 className="text-2xl font-black text-emerald-900 tracking-tight">مراجعة أعداد المظروف النهائية</h4>
                              <div className="w-full space-y-3 text-right">
                                 {Object.entries(closingCounts).map(([g, c]) => (
                                   <div key={g} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                      <span className="font-bold text-slate-500">{g}</span>
                                      <span className="font-black text-emerald-700 text-2xl tabular-nums">{c} ورقة</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                           <div className="flex gap-4">
                              <button onClick={() => setClosingStep(0)} className="flex-1 bg-slate-100 text-slate-600 py-6 rounded-[2rem] font-black hover:bg-slate-200 transition-all active:scale-95">إعادة العد</button>
                              <button onClick={confirmClosing} className="flex-[2] bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                تأكيد التوثيق والإغلاق <ShieldCheck size={28} />
                              </button>
                           </div>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
         </div>
       )}
       <style>{`
         @keyframes spin-slow {
           from { transform: rotate(0deg); }
           to { transform: rotate(360deg); }
         }
         .animate-spin-slow {
           animation: spin-slow 8s linear infinite;
         }
       `}</style>
    </div>
  );
};

export default ProctorDailyAssignmentFlow;