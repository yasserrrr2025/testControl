
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
  BookmarkCheck, Camera, Sparkles, Shield, PenTool
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
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ user, supervisions, setSupervisions, students, absences, setAbsences, onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests }) => {
  const [activeCommittee, setActiveCommittee] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
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
        const config = { 
          fps: 20, 
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        };
        
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            joinCommittee(decodedText);
            stopScanner();
          },
          () => {} 
        );
      } catch (err: any) {
        onAlert(`فشل فتح الكاميرا: تأكد من منح الإذن للمتصفح. (${err.message})`);
        setIsScanning(false);
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {}
    }
    setIsScanning(false);
  };

  const myStudents = useMemo(() => 
    students.filter(s => s.committee_number === activeCommittee), 
    [students, activeCommittee]
  );

  const committeeAbsences = useMemo(() => 
    absences.filter(a => a.committee_number === activeCommittee), 
    [absences, activeCommittee]
  );
  
  const gradesInCommittee = useMemo(() => 
    Array.from(new Set(myStudents.map(s => s.grade))).sort(), 
    [myStudents]
  );

  const stats = useMemo(() => {
    const total = myStudents.length;
    const absent = committeeAbsences.filter(a => a.type === 'ABSENT').length;
    const present = total - absent;
    return { total, absent, present };
  }, [myStudents, committeeAbsences]);

  // سجلات الاستلام المؤكدة لهذا اليوم فقط لتحديد ما إذا كانت اللجنة "مغلقة اليوم"
  const currentSessionConfirmedLogs = useMemo(() => {
    if (!activeCommittee) return [];
    return deliveryLogs.filter(log => 
      log.committee_number === activeCommittee && 
      log.proctor_name === user.full_name && 
      log.status === 'CONFIRMED' &&
      log.time.startsWith(todayStr)
    ).sort((a, b) => b.time.localeCompare(a.time));
  }, [deliveryLogs, activeCommittee, user.full_name, todayStr]);

  // حالة اللجنة مغلقة (لليوم الحالي فقط)
  const isCommitteeClosed = useMemo(() => {
    if (!activeCommittee || gradesInCommittee.length === 0 || isSessionFinished) return false;
    return gradesInCommittee.every(grade => 
      currentSessionConfirmedLogs.some(log => log.grade === grade)
    );
  }, [activeCommittee, gradesInCommittee, currentSessionConfirmedLogs, isSessionFinished]);

  // أرشيف اللجان (يستخدم سجلات الاستلام الكاملة مجمعة حسب اللجنة والتاريخ)
  const myHistory = useMemo(() => {
    const confirmedLogs = deliveryLogs.filter(l => l.proctor_name === user.full_name && l.status === 'CONFIRMED');
    
    const groups: Record<string, DeliveryLog[]> = {};
    confirmedLogs.forEach(l => {
      const date = l.time.split('T')[0];
      const key = `${l.committee_number}-${date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });

    return Object.entries(groups)
      .map(([key, logs]) => ({
        committee_number: logs[0].committee_number,
        logs: logs,
        date: logs[0].time.split('T')[0]
      }))
      // لا يظهر في الأرشيف إذا كانت اللجنة هي النشطة حالياً في نفس اليوم
      .filter(item => !(item.committee_number === activeCommittee && item.date === todayStr))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [deliveryLogs, user.full_name, activeCommittee, todayStr]);

  const joinCommittee = async (committeeNum: string) => {
    const cleanedNum = committeeNum.trim();
    if (!cleanedNum) return;
    try {
      await db.supervision.deleteByTeacherId(user.id);
      const newSV: Supervision = { 
        id: crypto.randomUUID(), 
        teacher_id: user.id, 
        committee_number: cleanedNum, 
        date: new Date().toISOString(), 
        period: 1, 
        subject: 'اختبار الفترة' 
      };
      await db.supervision.insert(newSV);
      setSupervisions((prev: any) => [...prev.filter((s:any) => s.teacher_id !== user.id), newSV]);
      setActiveCommittee(cleanedNum);
      setIsSessionFinished(false);
      onAlert(`✅ تم الالتحاق باللجنة ${cleanedNum} بنجاح.`);
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
    } catch (err: any) {
      onAlert(`خطأ في إنهاء الجلسة: ${err.message}`);
    }
  };

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    const localAbsences = absences.filter(a => a.committee_number === activeCommittee);
    const existing = localAbsences.find(a => a.student_id === student.national_id);
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
      onAlert(`فشل تحديث حالة الطالب: ${err.message}`);
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
      onAlert(`❌ فشل الإرسال: ${err.message}`);
    } finally {
      setIsSendingReport(false);
    }
  };

  const startClosingWizard = () => {
    const initialCounts: Record<string, string> = {};
    gradesInCommittee.forEach(g => { initialCounts[g] = '0'; });
    setClosingCounts(initialCounts);
    setIsClosingWizardOpen(true);
    setCountError(null);
    setClosingStep(-1);
  };

  const validateAndNext = () => {
    setCountError(null);
    const grade = gradesInCommittee[closingStep];
    const entered = parseInt(closingCounts[grade] || '0');
    const actualTotal = myStudents.filter(s => s.grade === grade).length;
    
    if (entered === 0) { setCountError("يرجى إدخال عدد الأوراق للمتابعة"); return; }
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
        const promises = Object.entries(closingCounts).map(async ([grade, count]) => {
          const logEntry: Partial<DeliveryLog> = {
            id: crypto.randomUUID(),
            teacher_name: 'بانتظار عضو الكنترول',
            proctor_name: user.full_name,
            committee_number: activeCommittee!,
            grade: grade,
            type: 'RECEIVE',
            time: new Date().toISOString(),
            period: 1,
            status: 'PENDING'
          };
          return setDeliveryLogs(logEntry);
        });
        await Promise.all(promises);
        await sendRequest(`تم إغلاق اللجنة إلكترونياً. جاري تسليم المظاريف للكنترول.`, activeCommittee);
        setIsVerifying(false);
        setIsClosingWizardOpen(false);
        onAlert("تم إرسال طلبات الإغلاق. توجه للكنترول لمطابقة الاستلام.");
      } catch (err: any) {
        setIsVerifying(false);
        onAlert(`فشل إغلاق اللجنة: ${err.message}`);
      }
    }, 2000);
  };

  const updateCountStep = (grade: string, delta: number) => {
    const current = parseInt(closingCounts[grade] || '0');
    const newVal = Math.max(0, current + delta);
    setClosingCounts({ ...closingCounts, [grade]: newVal.toString() });
  };

  const activeMyRequests = useMemo(() => {
    return controlRequests.filter(r => 
      r.from === user.full_name && 
      r.committee === activeCommittee &&
      r.status !== 'DONE' &&
      r.status !== 'REJECTED'
    ).sort((a, b) => b.time.localeCompare(a.time));
  }, [controlRequests, user.full_name, activeCommittee]);

  // واجهة "الالتحاق" - تم إخفاء اليدوي وتفعيل محرك QR حصرياً
  if (!currentAssignment || isSessionFinished) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-16 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 md:p-20 rounded-[4rem] text-white shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group border-b-[12px] border-blue-600">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
            
            <div className="relative z-10 space-y-12">
               <div className="space-y-4">
                  <div className="bg-blue-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-500">
                     <Shield size={48} className="text-white" />
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter">بوابة المباشرة</h2>
                  <p className="text-blue-400 font-bold text-xl">يرجى مسح رمز الـ QR داخل اللجنة للتحقق والبدء</p>
               </div>

               <button 
                 onClick={startScanner} 
                 className="w-full max-w-lg mx-auto p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 active:scale-95 transition-all group/btn"
               >
                 <div className="bg-white/20 p-8 rounded-[2.5rem] group-hover/btn:rotate-12 transition-transform">
                    <Camera size={80} />
                 </div>
                 <span>مسح رمز اللجنة (QR)</span>
               </button>

               <div className="pt-8 opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Secure Authentication Required</p>
               </div>
            </div>

            {/* مودال الماسح المتطور */}
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 no-print">
                 <div className="relative w-full max-w-sm">
                    <div className="absolute -inset-4 bg-blue-600/30 blur-2xl rounded-full animate-pulse"></div>
                    <div className="relative z-10 w-full aspect-square bg-black rounded-[4rem] overflow-hidden border-8 border-white/20 shadow-2xl">
                       <div id="proctor-qr-reader-v4" className="w-full h-full"></div>
                       <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                          <div className="w-64 h-64 border-2 border-blue-400/30 rounded-[3rem] relative">
                             <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-blue-500 rounded-tl-2xl"></div>
                             <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-blue-500 rounded-tr-2xl"></div>
                             <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-blue-500 rounded-bl-2xl"></div>
                             <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-blue-500 rounded-br-2xl"></div>
                             <div className="w-full h-1 bg-blue-500/50 absolute top-1/2 -translate-y-1/2 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                          </div>
                       </div>
                    </div>
                 </div>
                 <h4 className="mt-12 text-3xl font-black text-white flex items-center gap-4">
                    <Sparkles className="text-blue-400 animate-pulse" /> وجه الكاميرا نحو رمز اللجنة
                 </h4>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 transition-all">إلغاء المسح</button>
               </div>
            )}
         </div>

         {/* أرشيف اللجان في أسفل الصفحة بتصميمه السابق */}
         {myHistory.length > 0 && (
           <div className="text-right space-y-10 animate-slide-up no-print pb-20">
             <div className="flex items-center justify-between px-4 border-b pb-4 border-slate-200">
                <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4">
                  <History className="text-blue-600" size={32} /> سجل اللجان المعتمدة
                </h3>
                <span className="bg-slate-100 text-slate-500 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">{myHistory.length} مهمة مكتملة</span>
             </div>
             <div className="grid grid-cols-1 gap-10">
               {myHistory.map(item => (
                 <div key={`${item.committee_number}-${item.date}`} className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden group hover:border-emerald-200 transition-all duration-500">
                    <div className="bg-slate-950 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-8 text-right">
                          <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl group-hover:scale-110 transition-transform">
                            <span className="text-[10px] opacity-40 uppercase">لجنة</span>
                            <span className="text-4xl leading-none tabular-nums">{item.committee_number}</span>
                          </div>
                          <div>
                            <p className="text-white text-2xl font-black mb-1">اكتملت المراقبة والمطابقة</p>
                            <div className="flex items-center gap-4 text-emerald-400 text-sm font-bold">
                                <span className="flex items-center gap-2"><Clock size={16}/> {item.date}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                <span className="flex items-center gap-2"><PackageCheck size={16}/> {item.logs.length} سندات استلام</span>
                            </div>
                          </div>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {item.logs.map((log) => (
                            <div key={log.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 group/sub hover:bg-emerald-50 hover:border-emerald-100 transition-all">
                               <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover/sub:scale-110 transition-transform">
                                  <UserCheck2 size={28}/>
                               </div>
                               <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                     <BookOpen size={12} className="text-emerald-600" />
                                     <p className="text-[11px] font-black text-slate-500 uppercase leading-none tracking-tight">الصف الدراسي: {log.grade}</p>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase leading-none">مستلم الكنترول المسؤول:</p>
                                     <p className="text-lg font-black text-slate-900 leading-tight">{log.teacher_name}</p>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-400 mt-2 flex items-center gap-1 tabular-nums">
                                    <Clock size={14} className="text-blue-500" /> وقت الاستلام الرسمي: {new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                                  </p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           </div>
         )}
      </div>
    );
  }

  // واجهة "إنجاز معتمد" - تظهر فقط لليوم الحالي
  if (isCommitteeClosed) {
    return (
      <div className="max-w-6xl mx-auto py-10 md:py-16 px-6 text-center space-y-12 animate-fade-in no-print pb-40">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px] opacity-40 animate-pulse"></div>
          <div className="bg-emerald-600 w-32 h-32 md:w-44 md:h-44 rounded-[3.5rem] md:rounded-[4.5rem] flex items-center justify-center mx-auto text-white shadow-[0_20px_60px_rgba(16,185,129,0.5)] relative z-10 animate-bounce">
            <Award size={80} />
          </div>
          <div className="absolute -top-4 -right-4 bg-amber-500 p-3 md:p-4 rounded-full text-white shadow-xl animate-spin-slow">
            <Star size={24} fill="white" />
          </div>
        </div>
        
        <div className="space-y-4">
           <h2 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter">إنجاز مُعتمد</h2>
           <p className="text-slate-400 font-bold text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed">تم توثيق استلام كافة مظاريفك رقمياً ومطابقتها مع الكنترول المركزي بنجاح</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {currentSessionConfirmedLogs.map((log) => {
             const gradeStudents = students.filter(s => s.committee_number === log.committee_number && s.grade === log.grade);
             const gradeAbsences = absences.filter(a => a.committee_number === log.committee_number && gradeStudents.some(gs => gs.national_id === a.student_id));
             const absCount = gradeAbsences.filter(a => a.type === 'ABSENT').length;
             const lateCount = gradeAbsences.filter(a => a.type === 'LATE').length;
             const totalCount = gradeStudents.length;
             const presentCount = totalCount - absCount;
             
             const qrData = `CERT: ${log.id} | Proctor: ${log.proctor_name} | Committee: ${log.committee_number} | Time: ${log.time}`;
             const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

             return (
               <div key={log.id} className="bg-white text-slate-900 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.15)] border-[6px] border-slate-50 relative overflow-hidden group transition-all duration-700 hover:scale-[1.02] flex flex-col page-break-inside-avoid">
                  <div className="bg-slate-950 p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0 border-b-[10px] border-emerald-600">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                     <div className="relative z-10 flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-2xl flex items-center justify-center">
                           <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1 leading-none">Official Digital Document</p>
                           <h4 className="text-3xl font-black leading-none tracking-tight">لجنة رقم {log.committee_number}</h4>
                        </div>
                     </div>
                     <div className="bg-white/10 p-4 rounded-3xl border border-white/5 relative z-10">
                        <BookmarkCheck size={32} className="text-emerald-400" />
                     </div>
                  </div>

                  <div className="p-10 space-y-10 flex-1 text-right relative">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">بيان الصف الدراسي</p>
                           <h5 className="text-4xl font-black text-slate-900 flex items-center gap-4 leading-none">
                              <FileBadge className="text-emerald-600" size={36} /> {log.grade}
                           </h5>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-[2.5rem] border-2 border-white shadow-inner flex flex-col items-center">
                           <img src={qrUrl} alt="Verify" className="w-24 h-24 mix-blend-multiply" />
                           <span className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Scan to Verify</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-900 text-white p-5 rounded-[2.5rem] text-center shadow-2xl">
                           <p className="text-[9px] font-black uppercase opacity-50 mb-1">الطلاب</p>
                           <p className="text-3xl font-black tabular-nums leading-none">{totalCount}</p>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-5 rounded-[2.5rem] text-center">
                           <p className="text-[9px] font-black uppercase mb-1">حضور</p>
                           <p className="text-3xl font-black tabular-nums leading-none">{presentCount}</p>
                        </div>
                        <div className="bg-red-50 text-red-700 border border-red-100 p-5 rounded-[2.5rem] text-center">
                           <p className="text-[9px] font-black uppercase mb-1">غياب</p>
                           <p className="text-3xl font-black tabular-nums leading-none">{absCount}</p>
                        </div>
                        <div className="bg-amber-50 text-amber-700 border border-amber-100 p-5 rounded-[2.5rem] text-center">
                           <p className="text-[9px] font-black uppercase mb-1">تأخر</p>
                           <p className="text-3xl font-black tabular-nums leading-none">{lateCount}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t-2 border-slate-50">
                        <div className="bg-slate-50 p-6 rounded-[2.8rem] border-2 border-white shadow-inner relative">
                           <p className="text-[11px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                             <UserCheck2 size={16} className="text-emerald-600" /> مستلم الكنترول المسؤول
                           </p>
                           <div className="flex items-center gap-4">
                              <span className="font-black text-slate-800 text-xl leading-tight">{log.teacher_name}</span>
                              <div className="absolute top-4 left-4 bg-emerald-500/10 p-2 rounded-xl">
                                 <BadgeCheck size={18} className="text-emerald-600"/>
                              </div>
                           </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.8rem] border-2 border-white shadow-inner">
                           <p className="text-[11px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                             <Clock size={16} className="text-blue-600" /> البصمة الزمنية الرقمية
                           </p>
                           <div className="flex items-center gap-4">
                              <span className="font-black text-slate-800 text-2xl tabular-nums leading-none">
                                 {new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-between items-center opacity-40 pt-6 border-t border-dashed">
                        <div className="flex items-center gap-3">
                           <Fingerprint size={24} className="text-slate-900" />
                           <span className="text-[9px] font-mono font-bold uppercase tracking-widest leading-none">SERIAL ID: {log.id.slice(0,14)}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] tabular-nums">{new Date(log.time).toLocaleDateString('ar-SA')}</span>
                     </div>
                  </div>

                  <button 
                    onClick={() => window.print()}
                    className="bg-slate-950 hover:bg-black text-white py-8 font-black text-sm transition-all flex items-center justify-center gap-4 active:scale-95 no-print"
                  >
                     <Download size={24} className="animate-bounce" /> حفظ السند الرقمي للتوثيق
                  </button>
               </div>
             );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch pt-14 no-print pb-24">
          <button 
            onClick={leaveAndJoinNew} 
            className="bg-emerald-600 text-white px-20 py-8 rounded-[3.5rem] font-black text-2xl flex items-center justify-center gap-8 shadow-[0_30px_60px_rgba(16,185,129,0.4)] hover:bg-emerald-700 transition-all active:scale-95 group"
          >
            <ThumbsUp size={48}/> 
            <span>تأكيد والتحاق بلجنة جديدة</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-white text-slate-900 border-4 border-slate-100 px-16 py-8 rounded-[3.5rem] font-black text-2xl flex items-center justify-center gap-6 hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
          >
             <Printer size={40}/> طباعة ورقية نهائية
          </button>
        </div>
      </div>
    );
  }

  // واجهة "رصد اللجنة"
  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto text-right pb-32 px-4">
       {/* تتبع البلاغات */}
       {activeMyRequests.length > 0 && (
         <div className="space-y-4 animate-slide-up no-print">
            <div className="flex items-center gap-3 px-6">
               <Activity size={18} className="text-blue-600 animate-pulse" />
               <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">تتبع البلاغات النشطة</h4>
            </div>
            <div className="flex flex-col gap-4">
               {activeMyRequests.map(req => (
                 <div key={req.id} className={`glass-card p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden ${req.status === 'IN_PROGRESS' ? 'border-blue-500 shadow-blue-100 bg-blue-50/20' : 'border-red-100 shadow-red-50 bg-white/80'}`}>
                    <div className="flex items-center gap-6 flex-1 w-full">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                          {req.status === 'IN_PROGRESS' ? <Navigation size={24} /> : <ShieldAlert size={24} />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                             {req.status === 'IN_PROGRESS' ? `جاري المباشرة من قبل: ${req.assistant_name || 'عضو الكنترول'}` : 'بانتظار استلام البلاغ...'}
                          </p>
                          <h5 className="text-lg font-black text-slate-800 truncate">{req.text}</h5>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                       <span className="text-[10px] font-mono font-bold text-slate-400 tabular-nums">{req.time}</span>
                       <div className={`px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {req.status === 'IN_PROGRESS' ? <BadgeCheck size={14}/> : <Clock size={14}/>}
                          {req.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'معلق'}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8 text-right flex-1 w-full">
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl shrink-0 tabular-nums">
              <span className="text-[10px] opacity-40 uppercase mb-1">لجنة</span>
              <span className="text-5xl leading-none">{activeCommittee}</span>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4">رصد الحضور المباشر</h3>
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
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
             <button onClick={() => setIsReportModalOpen(true)} className="flex-1 sm:flex-initial bg-red-600 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-red-700 shadow-xl transition-all active:scale-95">
               <AlertTriangle size={24} /> بلاغ عاجل
             </button>
             <button onClick={startClosingWizard} className="flex-1 sm:flex-initial bg-slate-950 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-blue-600 shadow-xl transition-all active:scale-95">
               <ShieldCheck size={24} /> إغلاق اللجنة
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                     <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-200 tabular-nums">ID: {s.national_id}</span>
                     <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black">{s.grade}</span>
                   </div>
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
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" onClick={() => { setIsReportModalOpen(false); setReportStep('MENU'); }}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[12px] border-red-600">
               <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="bg-red-600 p-5 rounded-3xl shadow-red-600/40 animate-pulse border-2 border-white/10">
                        <AlertOctagon size={44} className="text-white" />
                     </div>
                     <div className="text-right">
                        <h3 className="text-3xl font-black tracking-tighter">مركز القيادة والسيطرة</h3>
                        <p className="text-red-400 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                          <BellRing size={14}/> قناة البلاغات العاجلة
                        </p>
                     </div>
                  </div>
                  <button onClick={() => { setIsReportModalOpen(false); setReportStep('MENU'); }} className="bg-white/5 p-3 rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"><X size={32}/></button>
               </div>
               <div className="p-10 space-y-12">
                  {reportStep === 'MENU' ? (
                    <div className="space-y-10">
                      <div className="space-y-6">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { id: "sheets", text: "نقص أوراق الإجابة", icon: FileStack, color: "bg-red-50 text-red-600 border-red-100", detail: "حدد الطلاب الذين يحتاجون أوراقاً", action: () => setReportStep('STUDENT_PICKER') },
                              { id: "health", text: "حالة صحية طارئة", icon: HeartPulse, color: "bg-emerald-50 text-emerald-600 border-emerald-100", detail: "طلب الموجه الصحي للجنة", action: () => handleSendReport("حالة صحية طارئة في اللجنة") },
                              { id: "query", text: "استفسار عن سؤال", icon: HelpCircle, color: "bg-blue-50 text-blue-600 border-blue-100", detail: "طلب توضيح من معلم المادة", action: () => handleSendReport("يوجد استفسار عن سؤال في المادة") },
                              { id: "pencil", text: "نقص مرسام (قلم رصاص)", icon: PenTool, color: "bg-amber-50 text-amber-600 border-amber-100", detail: "طلب أقلام رصاص إضافية", action: () => handleSendReport("نقص أقلام رصاص (مرسام) في اللجنة") },
                            ].map(item => (
                              <button key={item.id} onClick={item.action} className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 active:scale-95 group hover:shadow-2xl ${item.color} text-right`}>
                                <div className="p-4 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6"><item.icon size={28} /></div>
                                <div><span className="font-black text-base block leading-none mb-1">{item.text}</span><span className="text-[10px] opacity-60 font-bold block leading-none">{item.detail}</span></div>
                              </button>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-5">
                         <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="اشرح طبيعة البلاغ هنا بدقة..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 font-bold text-lg h-32 outline-none focus:border-red-600 focus:bg-white transition-all placeholder:text-slate-300 resize-none shadow-inner" />
                         <button onClick={() => handleSendReport(customMessage)} disabled={!customMessage.trim() || isSendingReport} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50 transition-all hover:bg-red-600 group">
                            {isSendingReport ? <Loader2 size={32} className="animate-spin" /> : <Send size={28} />}
                            بث البلاغ المخصص
                          </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-fade-in">
                       <button onClick={() => setReportStep('MENU')} className="flex items-center gap-2 text-slate-400 font-black text-xs hover:text-slate-900 transition-all"><ChevronRight size={16} /> العودة للقائمة الرئيسية</button>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar p-2">
                          {myStudents.map(s => {
                            const isSelected = selectedStudentsForReport.includes(s.name);
                            return (
                              <button key={s.id} onClick={() => { setSelectedStudentsForReport(prev => prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name]); }} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-right group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700 hover:border-blue-200'}`}>
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-200" />}
                                <div className="min-w-0 flex-1"><p className="font-black text-sm truncate">{s.name}</p></div>
                              </button>
                            );
                          })}
                       </div>
                       <button onClick={() => handleSendReport(`نقص أوراق إجابة للطلاب: ${selectedStudentsForReport.join(' - ')}`)} disabled={selectedStudentsForReport.length === 0 || isSendingReport} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50 transition-all group">
                          {isSendingReport ? <Loader2 size={32} className="animate-spin" /> : <Send size={28} />}
                          إرسال طلب الأوراق ({selectedStudentsForReport.length})
                        </button>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}

       {isClosingWizardOpen && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => !isVerifying && setIsClosingWizardOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[10px] border-slate-950">
               {isVerifying ? (
                 <div className="p-20 text-center space-y-8 animate-fade-in">
                    <Loader2 size={80} className="mx-auto text-blue-600 animate-spin" />
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">جاري المراجعة والتدقيق...</h3>
                 </div>
               ) : closingStep === -1 ? (
                 <div className="p-10 space-y-8 animate-fade-in">
                    <div className="flex items-center gap-6 border-b pb-6">
                       <div className={`p-4 rounded-3xl shadow-xl text-white ${committeeAbsences.filter(a => a.type === 'ABSENT').length > 0 ? 'bg-red-600' : 'bg-emerald-600'}`}>
                          <UserX size={32} />
                       </div>
                       <div className="text-right">
                          <h4 className="text-2xl font-black text-slate-950">مراجعة الطلاب الغائبين</h4>
                          <p className="text-slate-400 font-bold text-sm">تأكد من قائمة الأسماء قبل إغلاق اللجنة</p>
                       </div>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                       {committeeAbsences.filter(a => a.type === 'ABSENT').length === 0 ? (
                         <div className="bg-emerald-50/50 p-12 rounded-[3rem] border-2 border-dashed border-emerald-100 text-center flex flex-col items-center gap-4">
                            <CheckCircle2 size={56} className="text-emerald-500" />
                            <p className="text-emerald-800 font-black text-lg italic">لا يوجد غياب مرصود في لجنتك</p>
                         </div>
                       ) : (
                         committeeAbsences.filter(a => a.type === 'ABSENT').map((absence) => {
                            const student = students.find(s => s.national_id === absence.student_id);
                            return (
                              <div key={absence.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between group hover:border-red-200 transition-all">
                                 <div className="flex items-center gap-4">
                                    <div className="bg-red-50 p-3 rounded-2xl text-red-600"><UserMinus2 size={24} /></div>
                                    <div className="text-right">
                                       <p className="font-black text-slate-900 text-lg leading-tight">{absence.student_name}</p>
                                       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{student?.grade || '---'}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => student && toggleStudentStatus(student, 'LATE')} className="p-4 bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl border border-slate-100 transition-all group-hover:scale-105"><Clock size={20} /></button>
                              </div>
                            );
                         })
                       )}
                    </div>
                    <div className="pt-4 space-y-4">
                       <div className="p-6 rounded-3xl border flex items-start gap-4 bg-emerald-50 border-emerald-100 text-emerald-700">
                          <p className="text-xs font-bold leading-relaxed">بضغطك على متابعة، أنت تؤكد صحة بيانات الغياب المرصودة أعلاه لكافة الصفوف يمكنك تغيير حالة الطالب إلى متأخر من خلال الضغط على الساعة الموجودة بجوار اسم الطالب.</p>
                       </div>
                       <button onClick={() => setClosingStep(0)} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all">تأكيد الغياب والمتابعة لعد الأوراق <ChevronLeft size={24} /></button>
                    </div>
                 </div>
               ) : (
                 <>
                   <div className="bg-slate-950 p-10 text-white flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full"></div>
                      <h3 className="text-3xl font-black tracking-tight flex items-center gap-4 relative z-10"><FileStack className="text-blue-400"/> عد أوراق الإجابة</h3>
                      <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black tabular-nums">خطوة {closingStep + 1} من {gradesInCommittee.length}</div>
                   </div>
                   <div className="p-8 md:p-12 text-center space-y-10">
                      {closingStep < gradesInCommittee.length ? (
                        <div className="space-y-12 animate-fade-in">
                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">الصف الحالي المراد جرد أوراقه</p>
                              <h4 className="text-5xl font-black text-slate-900 leading-none">{gradesInCommittee[closingStep]}</h4>
                              <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100 flex items-start gap-3 text-right">
                                 <p>يرجى عد أوراق الإجابة يدوياً بدقة، ثم أدخل العدد الفعلي للأوراق لهذا الصف فقط.</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-center gap-6 md:gap-10">
                             <div className="flex flex-col items-center gap-2">
                                <button onClick={() => updateCountStep(gradesInCommittee[closingStep], 1)} className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200 active:scale-90 transition-all"><UserPlus size={32} /></button>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">إضافة</span>
                             </div>
                             <div className="relative group">
                               <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full group-hover:bg-blue-600/10 transition-all"></div>
                               <input type="number" value={closingCounts[gradesInCommittee[closingStep]]} onChange={(e) => setClosingCounts({...closingCounts, [gradesInCommittee[closingStep]]: e.target.value})} className="relative z-10 w-32 md:w-44 text-center text-7xl md:text-8xl font-black text-slate-900 bg-transparent border-b-4 border-slate-200 focus:border-blue-600 outline-none pb-4 tabular-nums transition-all" />
                             </div>
                             <div className="flex flex-col items-center gap-2">
                                <button onClick={() => updateCountStep(gradesInCommittee[closingStep], -1)} className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 active:scale-90 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"><UserMinus size={32} /></button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إنقاص</span>
                             </div>
                           </div>
                           {countError && <div className="bg-red-50 text-red-600 p-6 rounded-[2.5rem] border-2 border-red-100 font-black text-sm animate-shake flex items-center gap-4 text-right"><AlertCircle className="shrink-0" size={24} /><p>{countError}</p></div>}
                           <button onClick={validateAndNext} className="w-full bg-slate-950 text-white py-7 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl hover:bg-blue-600 transition-all active:scale-95">تأكيد المطابقة والمتابعة <ChevronLeft size={32} /></button>
                        </div>
                      ) : (
                        <div className="space-y-10 animate-fade-in text-center py-6">
                           <div className="relative inline-block">
                              <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                              <div className="relative z-10 bg-emerald-50 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto text-emerald-600 shadow-inner border-2 border-emerald-100"><CheckCircle size={56} /></div>
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-3xl font-black text-slate-900 tracking-tight">جاهز للإغلاق النهائي</h4>
                              <p className="text-slate-400 font-bold text-lg">سيتم إنشاء سجل استلام مستقل لكل صف لضمان دقة المطابقة الورقية.</p>
                           </div>
                           <button onClick={confirmClosing} className="w-full bg-blue-600 text-white py-8 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-6 shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-emerald-600 transition-all active:scale-95">توثيق الإغلاق الميداني <ShieldCheck size={36} /></button>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
         </div>
       )}

       <style>{`
         @keyframes scan {
           0%, 100% { top: 0%; }
           50% { top: 100%; }
         }
         .animate-scan {
           animation: scan 2s linear infinite;
         }
       `}</style>
    </div>
  );
};

export default ProctorDailyAssignmentFlow;
