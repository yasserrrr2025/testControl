
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest, CommitteeReport } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
// Added X to lucide-react imports to fix "Cannot find name 'X'" error
import { 
  Loader2, ShieldCheck, Camera, Shield, Zap, 
  PackageCheck, RefreshCcw, ChevronLeft, CheckCircle2, 
  Minus, Plus, GraduationCap, History, Clock,
  FileText, UserCog, Pencil, Stethoscope, MessageSquare,
  ChevronRight, Users, Check, AlertCircle, Award,
  Sparkles, CheckCircle, Info, X
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG, ROLES_ARABIC } from '../../constants';

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
  systemConfig: any;
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ 
  user, 
  users = [],
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
  
  // نافذة البلاغات المتطورة
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStep, setReportStep] = useState<'CATEGORIES' | 'SELECT_STUDENTS' | 'SELECT_TEACHER' | 'INPUT_QUANTITY' | 'OTHER'>('CATEGORIES');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [quantity, setQuantity] = useState(1);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const activeDate = useMemo(() => systemConfig?.active_exam_date || new Date().toISOString().split('T')[0], [systemConfig]);

  const activeAssignment = useMemo(() => 
    supervisions.find((s: any) => s.teacher_id === user.id && s.date && s.date.startsWith(activeDate)), 
  [supervisions, user.id, activeDate]);

  const activeCommittee = activeAssignment?.committee_number || null;

  const isCommitteeFinished = useMemo(() => {
    if (!activeCommittee) return false;
    const gradesReported = deliveryLogs.filter(l => 
      l.committee_number === activeCommittee && 
      l.time.startsWith(activeDate)
    ).map(l => l.grade);
    const committeeGrades = Array.from(new Set(students.filter(s => s.committee_number === activeCommittee).map(s => s.grade)));
    return committeeGrades.length > 0 && committeeGrades.every(g => gradesReported.includes(g));
  }, [deliveryLogs, activeCommittee, activeDate, students]);

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
    const late = myAbsences.filter(a => a.type === 'LATE').length;
    return { total, present: total - abs, absent: abs, late };
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

  const handleUrgentReport = async () => {
    let message = "";
    switch(selectedCategory) {
      case 'ANSWER_SHEET': 
        const names = myStudents.filter(s => selectedStudentIds.includes(s.national_id)).map(s => s.name).join('، ');
        message = `طلب ورقة إجابة للطلاب: (${names})`;
        break;
      case 'SUBJECT_TEACHER': message = `مطلوب معلم المادة: (${otherText})`; break;
      case 'PENCIL': message = `مطلوب مرسام/أدوات عدد: (${quantity})`; break;
      case 'QUESTION_SHEET': message = `مطلوب ورقة أسئلة عدد: (${quantity})`; break;
      case 'HEALTH': message = `حالة صحية طارئة في اللجنة`; break;
      case 'OTHER': message = `بلاغ: ${otherText}`; break;
    }

    try {
      await sendRequest(message, activeCommittee!);
      onAlert("تم إرسال البلاغ للكنترول بنجاح", "success");
      setIsReportModalOpen(false);
      resetReportState();
    } catch (err: any) { onAlert(err.message, 'error'); }
  };

  const resetReportState = () => {
    setReportStep('CATEGORIES');
    setSelectedCategory('');
    setSelectedStudentIds([]);
    setOtherText('');
    setQuantity(1);
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

  // واجهة النجاح والقفل (وثيقة الإنجاز الفاخرة)
  if (isCommitteeFinished) {
    const myLogs = deliveryLogs.filter(l => l.committee_number === activeCommittee && l.time.startsWith(activeDate));
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in pb-48 space-y-12">
          {/* الوسام الرقمي */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-[5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white rounded-[4.5rem] p-12 text-center shadow-2xl overflow-hidden border border-slate-100">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
              <div className="relative z-10 space-y-8">
                <div className="w-48 h-48 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[3.5rem] flex items-center justify-center mx-auto shadow-2xl border-8 border-white/20 relative">
                    <Award size={110} className="text-white drop-shadow-lg" />
                    <Sparkles size={32} className="absolute -top-4 -right-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest border border-emerald-100 mb-2">
                       <ShieldCheck size={16}/> وثيقة إنجاز رقمي
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">لجنة {activeCommittee} مكتملة</h2>
                    <p className="text-slate-500 font-bold text-xl italic max-w-md mx-auto leading-relaxed">أستاذ {user.full_name}، لقد أديت الأمانة بتميز. تم أرشفة كافة السجلات وإرسالها لمركز البيانات.</p>
                </div>
              </div>
            </div>
          </div>

          {/* سجل المطابقة المطور */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-6">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
                  <History className="text-blue-600" size={32}/> سجل مطابقة المظاريف
                </h3>
             </div>
             <div className="grid grid-cols-1 gap-6">
                {myLogs.map((log) => {
                  const comAbsences = absences.filter(a => a.committee_number === activeCommittee && a.date.startsWith(activeDate) && students.find(s => s.national_id === a.student_id)?.grade === log.grade);
                  const totalGrade = students.filter(s => s.committee_number === activeCommittee && s.grade === log.grade).length;
                  const absCount = comAbsences.filter(a => a.type === 'ABSENT').length;
                  const lateCount = comAbsences.filter(a => a.type === 'LATE').length;

                  return (
                    <div key={log.id} className="bg-white p-8 rounded-[3.5rem] shadow-xl border-2 border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8 transition-all hover:bg-slate-50 group">
                       <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                          <div className="w-20 h-20 bg-emerald-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0"><PackageCheck size={36}/></div>
                          <div className="flex-1">
                             <div className="flex items-center gap-4 mb-1">
                                <h4 className="text-3xl font-black text-slate-900">{log.grade}</h4>
                                <span className={`px-4 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest ${log.status === 'CONFIRMED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                                   {log.status === 'CONFIRMED' ? 'مستلم' : 'بانتظار الكنترول'}
                                </span>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black">إجمالي: {totalGrade}</span>
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black">حضور: {totalGrade - absCount}</span>
                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black">غياب: {absCount}</span>
                                <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black">تأخر: {lateCount}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6 border-t md:border-t-0 md:border-r border-slate-100 pt-6 md:pt-0 md:pr-10 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المستلم</p>
                             <p className="text-sm font-black text-slate-700">{log.status === 'CONFIRMED' ? log.teacher_name : '---'}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">الوقت</p>
                             <p className="text-xl font-black text-slate-900 tabular-nums">{new Date(log.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
            <RefreshCcw size={32}/> تحديث الحالة الميدانية
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
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[100px]">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-1">التأخر</p>
                   <p className="text-2xl font-black text-amber-500 tabular-nums">{stats.late}</p>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => setIsReportModalOpen(true)} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-xl hover:bg-red-700 transition-all border-b-[8px] border-red-800">
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
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-lg' : 'bg-white/60 text-slate-400 hover:bg-red-50'}`}>رصد غياب</button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/60 text-slate-400 hover:bg-amber-50'}`}>رصد تأخر</button>
                </div>
             </div>
           );
         })}
       </div>

       {/* نافذة البلاغات المتطورة */}
       {isReportModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 animate-fade-in no-print">
             <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => setIsReportModalOpen(false)}></div>
             <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border-b-[15px] border-red-600 animate-slide-up my-auto">
                <div className="bg-red-600 p-8 text-white flex justify-between items-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="bg-white/20 p-3 rounded-2xl"><Zap size={24}/></div>
                      <h3 className="text-2xl font-black italic">مركز بلاغات اللجنة {activeCommittee}</h3>
                   </div>
                   <button onClick={() => { setIsReportModalOpen(false); resetReportState(); }} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all"><X size={24}/></button>
                </div>

                <div className="p-8">
                   {reportStep === 'CATEGORIES' && (
                     <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        {[
                          { id: 'ANSWER_SHEET', label: 'طلب ورقة إجابة', icon: FileText, step: 'SELECT_STUDENTS' },
                          { id: 'SUBJECT_TEACHER', label: 'طلب معلم المادة', icon: UserCog, step: 'SELECT_TEACHER' },
                          { id: 'PENCIL', label: 'طلب مرسام', icon: Pencil, step: 'INPUT_QUANTITY' },
                          { id: 'QUESTION_SHEET', label: 'طلب ورقة أسئلة', icon: FileText, step: 'INPUT_QUANTITY' },
                          { id: 'HEALTH', label: 'حالة صحية', icon: Stethoscope, step: 'CONFIRM' },
                          { id: 'OTHER', label: 'بلاغ آخر', icon: MessageSquare, step: 'OTHER' }
                        ].map(cat => (
                          <button key={cat.id} onClick={() => { 
                             setSelectedCategory(cat.id); 
                             if (cat.step === 'CONFIRM') setSelectedCategory(cat.id); 
                             else setReportStep(cat.step as any);
                          }} className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-red-500 hover:bg-red-50 transition-all group">
                             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><cat.icon className="text-red-600" size={32}/></div>
                             <span className="font-black text-slate-800 text-sm">{cat.label}</span>
                          </button>
                        ))}
                        {selectedCategory === 'HEALTH' && (
                           <button onClick={handleUrgentReport} className="col-span-2 py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl mt-4">تأكيد البلاغ الصحي</button>
                        )}
                     </div>
                   )}

                   {reportStep === 'SELECT_STUDENTS' && (
                     <div className="space-y-6 animate-fade-in">
                        <h4 className="text-xl font-black text-slate-800 mb-4">اختر الطلاب المحتاجين للورقة:</h4>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                           {myStudents.map(s => (
                             <button key={s.id} onClick={() => setSelectedStudentIds(prev => prev.includes(s.national_id) ? prev.filter(id => id !== s.national_id) : [...prev, s.national_id])} className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${selectedStudentIds.includes(s.national_id) ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-slate-100'}`}>
                                <span className="font-bold text-slate-800">{s.name}</span>
                                {selectedStudentIds.includes(s.national_id) ? <CheckCircle2 className="text-blue-600"/> : <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>}
                             </button>
                           ))}
                        </div>
                        <div className="flex gap-3">
                           <button onClick={handleUrgentReport} disabled={selectedStudentIds.length === 0} className="flex-1 py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl disabled:opacity-50">إرسال الطلب ({selectedStudentIds.length})</button>
                           <button onClick={() => setReportStep('CATEGORIES')} className="px-8 bg-slate-100 text-slate-600 rounded-[2rem] font-black">رجوع</button>
                        </div>
                     </div>
                   )}

                   {reportStep === 'SELECT_TEACHER' && (
                     <div className="space-y-6 animate-fade-in">
                        <h4 className="text-xl font-black text-slate-800 mb-4">اختر معلم المادة المتاح:</h4>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                           {users.filter(u => u.role !== 'PROCTOR' && u.role !== 'ADMIN').map(u => (
                             <button key={u.id} onClick={() => setOtherText(u.full_name)} className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${otherText === u.full_name ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-slate-100'}`}>
                                <span className="font-bold text-slate-800">{u.full_name}</span>
                                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-lg">{ROLES_ARABIC[u.role]}</span>
                             </button>
                           ))}
                        </div>
                        <div className="flex gap-3">
                           <button onClick={handleUrgentReport} disabled={!otherText} className="flex-1 py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl disabled:opacity-50">إرسال الاستدعاء</button>
                           <button onClick={() => setReportStep('CATEGORIES')} className="px-8 bg-slate-100 text-slate-600 rounded-[2rem] font-black">رجوع</button>
                        </div>
                     </div>
                   )}

                   {reportStep === 'INPUT_QUANTITY' && (
                     <div className="space-y-8 animate-fade-in text-center">
                        <h4 className="text-xl font-black text-slate-800">حدد الكمية المطلوبة:</h4>
                        <div className="flex items-center justify-center gap-10">
                           <button onClick={() => setQuantity(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform"><Minus size={32}/></button>
                           <span className="text-7xl font-black text-slate-900 tabular-nums">{quantity}</span>
                           <button onClick={() => setQuantity(prev => prev + 1)} className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform"><Plus size={32}/></button>
                        </div>
                        <div className="flex gap-3">
                           <button onClick={handleUrgentReport} className="flex-1 py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl">إرسال الطلب</button>
                           <button onClick={() => setReportStep('CATEGORIES')} className="px-8 bg-slate-100 text-slate-600 rounded-[2rem] font-black">رجوع</button>
                        </div>
                     </div>
                   )}

                   {reportStep === 'OTHER' && (
                     <div className="space-y-6 animate-fade-in">
                        <h4 className="text-xl font-black text-slate-800">اكتب تفاصيل البلاغ:</h4>
                        <textarea value={otherText} onChange={e => setOtherText(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-lg h-32 outline-none focus:border-red-600" placeholder="اكتب هنا..."></textarea>
                        <div className="flex gap-3">
                           <button onClick={handleUrgentReport} disabled={!otherText.trim()} className="flex-1 py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl disabled:opacity-50">إرسال البلاغ</button>
                           <button onClick={() => setReportStep('CATEGORIES')} className="px-8 bg-slate-100 text-slate-600 rounded-[2rem] font-black">رجوع</button>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
       )}

       {/* نافذة إغلاق اللجنة المطورة */}
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
                    <div className="flex items-center gap-6 mb-4">
                       <CheckCircle2 size={48} className="text-emerald-400"/>
                       <h3 className="text-4xl font-black tracking-tighter">مراجعة الحالات النهائية</h3>
                    </div>
                    <p className="text-slate-400 font-bold mb-6">يمكنك تحويل الغائب لمتأخر إذا حضر الآن:</p>
                    <div className="max-h-[300px] overflow-y-auto space-y-3 px-2 custom-scrollbar">
                       {myAbsences.length === 0 ? (
                         <div className="p-8 text-center bg-emerald-50 text-emerald-600 rounded-3xl font-black border-2 border-dashed border-emerald-100">لا يوجد غياب أو تأخر في اللجنة</div>
                       ) : (
                         myAbsences.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 group">
                               <div className="flex flex-col">
                                 <span className="font-black text-slate-900 text-lg">{a.student_name}</span>
                                 <span className={`text-[10px] font-black uppercase ${a.type === 'ABSENT' ? 'text-red-500' : 'text-amber-500'}`}>{a.type === 'ABSENT' ? 'غائب' : 'متأخر'}</span>
                               </div>
                               <button onClick={async () => {
                                  const newType = a.type === 'ABSENT' ? 'LATE' : 'ABSENT';
                                  await db.absences.upsert({ ...a, type: newType });
                                  await setAbsences();
                               }} className="bg-white text-slate-400 p-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 text-xs font-black">
                                  <RefreshCcw size={14}/> {a.type === 'ABSENT' ? 'تحويل لمتأخر' : 'تحويل لغائب'}
                               </button>
                            </div>
                         ))
                       )}
                    </div>
                    <button onClick={() => setClosingStep(1)} className="w-full bg-slate-900 text-white py-10 rounded-[2.8rem] font-black text-3xl flex items-center justify-center gap-8 shadow-2xl shadow-blue-500/10">متابعة العد والفرز <ChevronLeft size={48} /></button>
                 </div>
               ) : closingStep === 1 ? (
                 <div className="p-14 space-y-14 text-center">
                    <div className="space-y-4">
                       <div className="bg-blue-50 text-blue-600 px-8 py-3 rounded-full w-fit mx-auto text-xl font-black">{myGrades[currentGradeIdx]}</div>
                       <h4 className="text-6xl font-black text-slate-900 tracking-tighter">عدد أوراق المظروف</h4>
                       <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest">أدخل عدد أوراق الإجابة الفعلية</p>
                    </div>
                    
                    {/* تحذير ذكي */}
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4 text-amber-800 text-right">
                       <Info className="shrink-0" size={24}/>
                       <p className="text-xs font-bold leading-relaxed">
                          نظام العد الجديد: يرجى إدخال العدد الفعلي للأوراق المسلمة. (الإجمالي المسجل لهذه الفئة هو {myStudents.filter(s => s.grade === myGrades[currentGradeIdx]).length})
                       </p>
                    </div>

                    <div className="flex items-center justify-center gap-12">
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: Math.max(0, (prev[myGrades[currentGradeIdx]] || 0) - 1)}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform shadow-inner"><Minus size={64} /></button>
                       <input type="number" value={closingCounts[myGrades[currentGradeIdx]] || 0} onChange={e => setClosingCounts({...closingCounts, [myGrades[currentGradeIdx]]: parseInt(e.target.value) || 0})} className="w-64 h-64 bg-white border-[10px] border-slate-50 rounded-[5rem] text-center font-black text-[100px] text-slate-900 outline-none tabular-nums shadow-2xl" />
                       <button onClick={() => setClosingCounts(prev => ({...prev, [myGrades[currentGradeIdx]]: (prev[myGrades[currentGradeIdx]] || 0) + 1}))} className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform shadow-inner"><Plus size={64} /></button>
                    </div>
                    
                    <button onClick={() => {
                        const count = closingCounts[myGrades[currentGradeIdx]] || 0;
                        if (count === 0) {
                           onAlert("لا يمكن إغلاق اللجنة بعدد صفر أوراق", "warning");
                           return;
                        }
                        if (currentGradeIdx < myGrades.length - 1) setCurrentGradeIdx(prev => prev + 1);
                        else finalizeClosing();
                    }} className="w-full bg-emerald-600 text-white py-11 rounded-[3rem] font-black text-4xl flex items-center justify-center gap-8 shadow-2xl border-b-[10px] border-emerald-800 active:scale-95 transition-all">
                       {currentGradeIdx === myGrades.length - 1 ? 'إرسال ومطابقة نهائية' : 'الصف التالي'} <ChevronLeft size={56} />
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
         .animate-bounce-subtle { animation: bounce-subtle 3s infinite; }
         @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
       `}</style>
    </div>
  );
};

export default ProctorDailyAssignmentFlow;
