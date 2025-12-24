import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest } from '../../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  LogIn, Scan, Users, UserCheck, GraduationCap, 
  UserMinus, Clock, CheckCircle, 
  AlertTriangle, Loader2, ShieldCheck,
  RefreshCcw, BellRing,
  UserRoundCheck, ClipboardList, X, Send, FileStack, HeartPulse, HelpCircle, PenTool, CheckCircle2, Search, Check
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
  controlRequests: ControlRequest[];
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ user, supervisions, setSupervisions, students, absences, setAbsences, onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests }) => {
  const [activeCommittee, setActiveCommittee] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const [reportSubMode, setReportSubMode] = useState<'TYPE' | 'STUDENTS'>('TYPE');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // وظيفة لتنظيف ومقارنة الأرقام (تجنب مشاكل string vs number)
  const cleanId = (id: any) => String(id || '').trim();

  const currentAssignment = useMemo(() => supervisions.find((s: any) => cleanId(s.teacher_id) === cleanId(user.id)), [supervisions, user.id]);
  
  useEffect(() => { 
    if (currentAssignment) {
      const commNum = cleanId(currentAssignment.committee_number);
      setActiveCommittee(commNum);
      
      // التحقق من تاريخ اليوم لضمان عدم الخلط مع أيام سابقة
      const todayStr = new Date().toISOString().split('T')[0];
      
      const isAlreadyFinished = deliveryLogs.some(l => 
        cleanId(l.committee_number) === commNum && 
        l.time.startsWith(todayStr) &&
        (l.status === 'PENDING' || l.status === 'CONFIRMED')
      );
      
      // إذا كانت مغلقة في الداتابيز، نثبت الحالة
      if (isAlreadyFinished) {
        setIsSessionFinished(true);
      }
    } else {
      setActiveCommittee(null);
    }
  }, [currentAssignment, deliveryLogs]);

  const myCommitteeRequests = useMemo(() => {
    if (!activeCommittee) return [];
    return controlRequests.filter(r => cleanId(r.committee) === activeCommittee).sort((a,b) => b.time.localeCompare(a.time));
  }, [controlRequests, activeCommittee]);

  const activeRequests = useMemo(() => {
    return myCommitteeRequests.filter(r => r.status !== 'DONE');
  }, [myCommitteeRequests]);

  const stats = useMemo(() => {
    const myStudents = students.filter((s: Student) => cleanId(s.committee_number) === activeCommittee);
    const committeeAbsences = absences.filter((a: Absence) => cleanId(a.committee_number) === activeCommittee);
    const total = myStudents.length;
    const absent = committeeAbsences.filter((a: any) => a.type === 'ABSENT').length;
    const present = total - absent;
    return { total, absent, present, myStudents, committeeAbsences };
  }, [absences, students, activeCommittee]);

  const filteredStudentsForReport = useMemo(() => {
    return stats.myStudents.filter(s => s.name.includes(studentSearch) || (s.seating_number && s.seating_number.includes(studentSearch)));
  }, [stats.myStudents, studentSearch]);

  const toggleStudentStatus = async (student: Student, type: 'ABSENT' | 'LATE') => {
    const existing = stats.committeeAbsences.find(a => cleanId(a.student_id) === cleanId(student.national_id));
    try {
      if (existing && existing.type === type) {
        await db.absences.delete(student.national_id);
        setAbsences((prev: Absence[]) => prev.filter(a => cleanId(a.student_id) !== cleanId(student.national_id)));
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
        setAbsences((prev: Absence[]) => [...prev.filter(a => cleanId(a.student_id) !== cleanId(student.national_id)), newAbsence]);
      }
    } catch (err: any) { onAlert(err.message); }
  };

  const handleSendReport = async (text: string, studentNames?: string[]) => {
    let finalMsg = text;
    if (studentNames && studentNames.length > 0) {
      finalMsg += ` - الطلاب: (${studentNames.join('، ')})`;
    }

    setIsSendingReport(true);
    try {
      await sendRequest(finalMsg, activeCommittee);
      onAlert("🚀 تم إرسال البلاغ فوراً لغرفة العمليات.");
      setIsReportModalOpen(false);
      setCustomMessage('');
      setReportSubMode('TYPE');
      setSelectedStudentIds([]);
    } catch (err: any) { onAlert(err.message); } finally { setIsSendingReport(false); }
  };

  const joinCommittee = async (committeeNum: string) => {
    try {
      await db.supervision.deleteByTeacherId(user.id);
      const newSV = { id: crypto.randomUUID(), teacher_id: user.id, committee_number: cleanId(committeeNum), date: new Date().toISOString(), period: 1, subject: 'اختبار' };
      await db.supervision.insert(newSV);
      setSupervisions((prev: any) => [...prev.filter((s:any) => cleanId(s.teacher_id) !== cleanId(user.id)), newSV]);
      setActiveCommittee(cleanId(committeeNum));
      setIsSessionFinished(false);
    } catch (err: any) { onAlert(err.message); }
  };

  const finishSession = async (event: React.MouseEvent) => {
    if (isFinishing || !activeCommittee) return;
    
    const confirmMsg = 'هل أنت متأكد من إغلاق اللجنة وتسليمها للكنترول رقمياً؟\n\nتأكد من رصد جميع حالات الغياب قبل الضغط على موافق.';
    
    if (window.confirm(confirmMsg)) {
      setIsFinishing(true);
      try {
        const log: DeliveryLog = {
          id: crypto.randomUUID(),
          teacher_name: '---', 
          proctor_name: user.full_name,
          committee_number: activeCommittee,
          grade: Array.from(new Set(stats.myStudents.map(s => s.grade))).join('، ') || 'عام',
          type: 'RECEIVE',
          time: new Date().toISOString(),
          period: 1,
          status: 'PENDING'
        };
        
        // تنفيذ الإرسال للسيرفر
        await setDeliveryLogs(log);
        
        // تحديث الحالة المحلية فوراً ومنع التراجع
        setIsSessionFinished(true);
        
        onAlert('✅ تم إغلاق اللجنة رقمياً. يرجى التوجه لمقر الكنترول الآن لتسليم المظاريف.');
      } catch (err: any) { 
        console.error("Finish error:", err);
        onAlert("عذراً، حدث خطأ أثناء الإغلاق: " + (err.message || "حاول مرة أخرى")); 
      } finally {
        setIsFinishing(false);
      }
    }
  };

  if (!currentAssignment || isSessionFinished) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-16 animate-fade-in text-center">
         <div className="bg-slate-950 p-10 md:p-20 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[12px] border-blue-600">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
            {isSessionFinished ? (
              <div className="space-y-8 relative z-10 animate-slide-up">
                 <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={60} className="animate-bounce" />
                 </div>
                 <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">تم إغلاق اللجنة بنجاح</h2>
                 <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-lg mx-auto">
                    <p className="text-slate-300 text-lg font-bold leading-relaxed">
                      لقد أتممت عملية الرصد الرقمي للجنة رقم <span className="text-white text-2xl px-2 underline decoration-blue-500">{activeCommittee}</span>.
                      <br/>
                      يرجى التوجه لمقر الكنترول لتسليم المظاريف والتوثيق النهائي.
                    </p>
                 </div>
                 <button onClick={() => window.location.reload()} className="mt-10 bg-white text-slate-950 px-12 py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all flex items-center gap-3 mx-auto">
                    {/* Fixed: changed RefreshCw to RefreshCcw */}
                    <RefreshCcw size={24}/> تحديث الحالة
                 </button>
              </div>
            ) : (
              <div className="relative z-10 space-y-10">
                <LogIn size={80} className="mx-auto text-blue-500 mb-10" />
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">التحاق بمقر اللجنة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                   <button onClick={() => {
                     setIsScanning(true);
                     setTimeout(() => {
                       scannerRef.current = new Html5QrcodeScanner("proctor-join-reader", { fps: 15, qrbox: 250 }, false);
                       scannerRef.current.render((text) => { joinCommittee(text); setIsScanning(false); scannerRef.current?.clear(); }, () => {});
                     }, 100);
                   }} className="p-10 bg-blue-600 rounded-[3rem] font-black text-2xl flex flex-col items-center gap-6 shadow-2xl hover:bg-blue-500 transition-all">
                     <Scan size={48} />
                     <span>مسح الرمز (QR)</span>
                   </button>
                   <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col items-center gap-6">
                     <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="رقم اللجنة" className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-5 text-center text-4xl font-black text-white outline-none focus:border-blue-500" />
                     <button onClick={() => joinCommittee(manualInput)} className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95">التحاق يدوي</button>
                   </div>
                </div>
              </div>
            )}
         </div>
         {isScanning && (
           <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8">
              <div id="proctor-join-reader" className="w-full max-sm:w-full max-w-sm rounded-3xl overflow-hidden bg-white p-2"></div>
              <button onClick={() => setIsScanning(false)} className="mt-10 bg-white text-slate-950 px-16 py-5 rounded-[2rem] font-black text-2xl shadow-2xl">إلغاء المسح</button>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto text-right pb-32 px-4">
       {/* رأس الشاشة */}
       <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6 text-right flex-1 w-full">
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2rem] flex flex-col items-center justify-center font-black shadow-lg shrink-0">
              <span className="text-[10px] opacity-40 uppercase mb-0.5 tracking-widest">لجنة</span>
              <span className="text-4xl leading-none">{activeCommittee}</span>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">رصد الحضور الميداني</h3>
               <div className="flex flex-wrap gap-2 font-black text-[12px]">
                  <span className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl text-blue-700"> {stats.total} طالب </span>
                  <span className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700"> {stats.present} حاضرين </span>
                  {stats.absent > 0 && <span className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-red-700">{stats.absent} غياب</span>}
               </div>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto shrink-0">
             <button onClick={() => setIsReportModalOpen(true)} className="flex-1 bg-red-600 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-red-700 shadow-xl active:scale-95 transition-all">
               <AlertTriangle size={24} /> بلاغ عاجل
             </button>
             <button 
                onClick={finishSession} 
                disabled={isFinishing}
                className={`flex-1 bg-slate-950 text-white px-8 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-blue-600 shadow-xl active:scale-95 transition-all ${isFinishing ? 'opacity-70 cursor-not-allowed' : ''}`}
             >
               {isFinishing ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
               <span>إغلاق اللجنة</span>
             </button>
          </div>
       </div>

       {/* شريط البلاغات النشطة */}
       {activeRequests.length > 0 && (
         <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-red-50 animate-slide-up no-print">
            <div className="flex items-center gap-3 mb-5 border-b pb-3">
               <BellRing size={22} className="text-red-600 animate-bounce" />
               <h3 className="text-xl font-black text-slate-800 tracking-tight">حالة بلاغاتك الحالية</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeRequests.map(req => (
                 <div key={req.id} className={`p-6 rounded-[2rem] border-2 transition-all space-y-3 ${req.status === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${req.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">{req.time}</span>
                       </div>
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                          {req.status === 'IN_PROGRESS' ? 'جاري المباشرة' : 'بانتظار الاستلام'}
                       </span>
                    </div>
                    <p className="text-[15px] font-black text-slate-800 leading-relaxed">{req.text}</p>
                 </div>
               ))}
            </div>
         </div>
       )}

       {/* قائمة الطلاب */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {stats.myStudents.map((s: Student) => {
           const status = stats.committeeAbsences.find(a => cleanId(a.student_id) === cleanId(s.national_id));
           return (
             <div key={s.id} className={`p-8 rounded-[3rem] border-2 transition-all flex flex-col justify-between shadow-lg min-h-[320px] relative overflow-hidden ${status?.type === 'ABSENT' ? 'bg-red-50 border-red-200 shadow-red-100' : status?.type === 'LATE' ? 'bg-amber-50 border-amber-200 shadow-amber-100' : 'bg-white border-white hover:border-blue-100'}`}>
                {status && <div className={`absolute top-0 right-0 w-2 h-full ${status.type === 'ABSENT' ? 'bg-red-600' : 'bg-amber-500'}`}></div>}
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${status?.type === 'ABSENT' ? 'bg-red-600 text-white' : status?.type === 'LATE' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                    <GraduationCap size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">رقم الجلوس</span>
                    <span className="text-3xl font-black text-slate-900 tabular-nums">{s.seating_number || '---'}</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 text-right">
                   <h4 className="text-xl font-black text-slate-900 leading-tight mb-1">{s.name}</h4>
                   <p className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-lg w-fit mr-0">{s.grade} - {s.section}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                   <button onClick={() => toggleStudentStatus(s, 'ABSENT')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all flex flex-col items-center justify-center gap-2 active:scale-95 shadow-md ${status?.type === 'ABSENT' ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-red-50'}`}>
                     {status?.type === 'ABSENT' ? <RefreshCcw size={20} /> : <UserMinus size={20} />}
                     <span>{status?.type === 'ABSENT' ? 'إلغاء الغياب' : 'رصد غياب'}</span>
                   </button>
                   <button onClick={() => toggleStudentStatus(s, 'LATE')} className={`py-5 rounded-[1.8rem] font-black text-xs transition-all flex flex-col items-center justify-center gap-2 active:scale-95 shadow-md ${status?.type === 'LATE' ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'}`}>
                     {status?.type === 'LATE' ? <RefreshCcw size={20} /> : <Clock size={20} />}
                     <span>{status?.type === 'LATE' ? 'إلغاء التأخر' : 'رصد تأخر'}</span>
                   </button>
                </div>
             </div>
           );
         })}
       </div>

       {/* الأرشيف */}
       <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 mt-10 no-print">
          <button onClick={() => setShowFullHistory(!showFullHistory)} className="w-full flex justify-between items-center">
             <div className="flex items-center gap-3">
                <ClipboardList size={22} className="text-slate-400" />
                <h3 className="text-lg font-black text-slate-700">أرشيف بلاغات اللجنة</h3>
             </div>
             <span className="text-blue-600 font-black text-xs">{showFullHistory ? 'إخفاء' : 'عرض السجل'}</span>
          </button>
          
          {showFullHistory && (
            <div className="mt-6 space-y-4 animate-slide-up">
               {myCommitteeRequests.length === 0 ? (
                 <p className="text-center text-slate-300 italic py-6">لا توجد بلاغات سابقة</p>
               ) : (
                 myCommitteeRequests.map(req => (
                   <div key={req.id} className="bg-white p-5 rounded-[1.8rem] border border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                         <div className={`p-2 rounded-xl ${req.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {req.status === 'DONE' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                         </div>
                         <div className="text-right">
                            <p className="text-[14px] font-black text-slate-800">{req.text}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{req.time} • {req.status === 'DONE' ? 'تم الحل بنجاح' : 'جاري المتابعة'}</p>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}
       </div>

       {/* مودال البلاغات المطور مع خانة اختيار الطلاب */}
       {isReportModalOpen && (
         <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => { setIsReportModalOpen(false); setReportSubMode('TYPE'); }}></div>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[12px] border-red-600">
               <div className="bg-slate-950 p-10 text-white flex justify-between items-center">
                  <h3 className="text-2xl font-black">{reportSubMode === 'TYPE' ? 'مركز البلاغات العاجلة' : 'تحديد الطلاب المعنيين'}</h3>
                  <button onClick={() => { setIsReportModalOpen(false); setReportSubMode('TYPE'); setSelectedStudentIds([]); }} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
               </div>
               
               <div className="p-10 space-y-8 text-right dir-rtl">
                  {reportSubMode === 'TYPE' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'papers', text: "نقص أوراق", icon: FileStack, color: "bg-red-50 text-red-600", msg: "نقص أوراق الإجابة في اللجنة" },
                            { id: 'health', text: "حالة صحية", icon: HeartPulse, color: "bg-emerald-50 text-emerald-600", msg: "حالة صحية طارئة في اللجنة" },
                            { id: 'query', text: "استفسار", icon: HelpCircle, color: "bg-blue-50 text-blue-600", msg: "يوجد استفسار عن سؤال من أحد الطلاب" },
                            { id: 'tools', text: "نقص أدوات", icon: PenTool, color: "bg-amber-50 text-amber-600", msg: "نقص أدوات مكتبية في اللجنة" }
                          ].map(item => (
                            <button 
                              key={item.id} 
                              onClick={() => {
                                if (item.id === 'papers') {
                                  setReportSubMode('STUDENTS');
                                } else {
                                  handleSendReport(item.msg);
                                }
                              }} 
                              className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${item.color} border-transparent hover:border-current shadow-sm`}
                            >
                              <item.icon size={32} />
                              <span className="font-black text-sm">{item.text}</span>
                            </button>
                          ))}
                      </div>
                      <div className="space-y-3">
                         <label className="text-xs font-black text-slate-400 mr-4 uppercase tracking-widest">بلاغ مخصص</label>
                         <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="اكتب تفاصيل البلاغ هنا..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-6 font-bold text-lg h-36 outline-none focus:border-red-600 focus:bg-white transition-all resize-none shadow-inner" />
                      </div>
                      <button onClick={() => handleSendReport(customMessage)} disabled={!customMessage.trim() || isSendingReport} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-red-600 transition-all shadow-2xl disabled:opacity-50">
                        {isSendingReport ? <Loader2 size={24} className="animate-spin" /> : <Send size={28} />}
                        إرسال البلاغ الآن
                      </button>
                    </>
                  ) : (
                    <div className="space-y-6 animate-fade-in">
                       <div className="relative">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="بحث عن طالب..." 
                            className="w-full pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />
                       </div>

                       <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                          {filteredStudentsForReport.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => {
                                setSelectedStudentIds(prev => prev.includes(s.national_id) ? prev.filter(id => id !== s.national_id) : [...prev, s.national_id]);
                              }}
                              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedStudentIds.includes(s.national_id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100'}`}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudentIds.includes(s.national_id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                     {selectedStudentIds.includes(s.national_id) ? <Check size={20} /> : <Users size={20} />}
                                  </div>
                                  <div className="text-right">
                                     <p className="text-sm font-black">{s.name}</p>
                                     <p className="text-[10px] font-bold opacity-60">جلوس: {s.seating_number || '---'}</p>
                                  </div>
                               </div>
                               {selectedStudentIds.includes(s.national_id) && <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black">مختار</span>}
                            </button>
                          ))}
                       </div>

                       <div className="flex gap-4">
                          <button onClick={() => setReportSubMode('TYPE')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-sm active:scale-95 transition-all">رجوع</button>
                          <button 
                            disabled={selectedStudentIds.length === 0 || isSendingReport}
                            onClick={() => {
                              const names = stats.myStudents.filter(s => selectedStudentIds.includes(s.national_id)).map(s => s.name);
                              handleSendReport("نقص أوراق الإجابة في اللجنة", names);
                            }} 
                            className="flex-[2] py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-all"
                          >
                             {isSendingReport ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                             تأكيد وإرسال البلاغ ({selectedStudentIds.length})
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default ProctorDailyAssignmentFlow;