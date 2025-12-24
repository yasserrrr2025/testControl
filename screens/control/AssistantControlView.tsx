
import React, { useMemo, useState } from 'react';
import { User, ControlRequest, Absence, Student } from '../../types';
import { 
  Check, ShieldCheck, Loader2, ArrowRightCircle, UserCheck, 
  BellRing, History, Clock, UserX, PenTool, ClipboardList, 
  Activity, CheckCircle, IdCard, ChevronLeft, MapPin, 
  Fingerprint, Award, ShieldAlert, UserSquare2, PhoneOutgoing,
  Hash, QrCode, X, Search
} from 'lucide-react';
import { db } from '../../supabase';
import TeacherBadgeView from '../proctor/TeacherBadgeView';

interface Props {
  user: User;
  requests: ControlRequest[];
  setRequests: any;
  absences: Absence[];
  students: Student[];
  onAlert: any;
}

const AssistantControlView: React.FC<Props> = ({ user, requests, setRequests, absences, students, onAlert }) => {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'ABSENCE_MONITOR'>('REQUESTS');
  const [showBadge, setShowBadge] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // البلاغات الخاصة بلجانه فقط
  const myRequests = useMemo(() => 
    requests.filter((r: ControlRequest) => user.assigned_committees?.includes(r.committee)), 
  [requests, user]);

  // البلاغات النشطة
  const activeRequests = useMemo(() => 
    myRequests.filter(r => r.status !== 'DONE').sort((a,b) => b.time.localeCompare(a.time)),
  [myRequests]);

  // أرشيف البلاغات المكتملة
  const historyRequests = useMemo(() => 
    myRequests.filter(r => r.status === 'DONE').sort((a,b) => b.time.localeCompare(a.time)),
  [myRequests]);

  // إحصائيات الغياب للجان المسندة إليه فقط
  const myCommitteeAbsences = useMemo(() => {
    return absences.filter(a => user.assigned_committees?.includes(a.committee_number));
  }, [absences, user]);

  const updateRequestStatus = async (requestId: string, newStatus: 'IN_PROGRESS' | 'DONE', committee: string) => {
    try {
      await db.controlRequests.updateStatus(requestId, newStatus, user.full_name);
      await setRequests();
      onAlert(`تم تحديث لجنة ${committee}: ${newStatus === 'IN_PROGRESS' ? 'جاري المباشرة' : 'تم الحل'}`);
    } catch (err: any) {
      onAlert(`خطأ: ${err.message}`);
    }
  };

  // عرض الهوية الرقمية في شاشة مستقلة (إذا رغب المستخدم)
  if (showBadge) {
    return (
      <div className="animate-fade-in pb-40">
        <div className="flex items-center justify-between mb-8 px-6 no-print">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Fingerprint className="text-blue-600" /> هويتي الرقمية المعتمدة
          </h2>
          <button onClick={() => setShowBadge(false)} className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <ChevronLeft size={20}/> العودة للمهام
          </button>
        </div>
        <TeacherBadgeView user={user} />
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in text-right pb-48 max-w-7xl mx-auto px-4">
       {/* 1. لوحة المعلومات الرئيسية */}
       <div className="bg-slate-950 p-8 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[10px] border-blue-600">
          <div className="absolute top-0 left-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -ml-40 -mt-40 transition-all group-hover:bg-blue-600/20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="text-center md:text-right space-y-6">
                <div className="flex items-center gap-5 justify-center md:justify-start">
                   <div className="bg-blue-600 p-4 rounded-[2rem] shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse">
                      <ShieldCheck size={36} />
                   </div>
                   <div>
                      <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">مساعد ميداني معتمد</h2>
                      <p className="text-blue-400 font-bold text-sm tracking-widest uppercase mt-2">Certified Field Control Assistant</p>
                   </div>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                   {user.assigned_committees?.map((c: string) => (
                     <span key={c} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2">
                        <MapPin size={12} className="text-blue-500"/> لجنة {c}
                     </span>
                   ))}
                </div>
             </div>
             
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[140px] shadow-inner backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase text-blue-400 mb-2">بلاغات نشطة</p>
                   <p className="text-5xl font-black text-white tabular-nums">{activeRequests.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[140px] shadow-inner backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase text-red-400 mb-2">إجمالي الغياب</p>
                   <p className="text-5xl font-black text-white tabular-nums">{myCommitteeAbsences.filter(a => a.type === 'ABSENT').length}</p>
                </div>
             </div>
          </div>
       </div>

       {/* 2. مبدل التبويبات العلوي */}
       <div className="hidden md:flex justify-center no-print mb-8">
          <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border flex gap-2 w-full max-w-lg">
             <button onClick={() => setActiveTab('REQUESTS')} className={`flex-1 py-4 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${activeTab === 'REQUESTS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                <BellRing size={18} /> مركز البلاغات {activeRequests.length > 0 && <span className="bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-pulse">{activeRequests.length}</span>}
             </button>
             <button onClick={() => setActiveTab('ABSENCE_MONITOR')} className={`flex-1 py-4 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${activeTab === 'ABSENCE_MONITOR' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                <UserX size={18} /> سجل المحاضر
             </button>
          </div>
       </div>

       {/* 3. عرض المحتوى */}
       {activeTab === 'REQUESTS' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
             <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3 px-4">
                   <Activity size={24} className="text-blue-600" />
                   <h3 className="text-2xl font-black text-slate-800">البلاغات النشطة في لجانك</h3>
                </div>

                {activeRequests.length === 0 ? (
                  <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
                     <div className="bg-slate-50 p-8 rounded-full text-slate-200"><ShieldCheck size={80} /></div>
                     <p className="text-2xl font-black text-slate-300 italic">كل اللجان مستقرة، استمر في جولتك الميدانية</p>
                  </div>
                ) : (
                  activeRequests.map(req => (
                    <div key={req.id} className={`bg-white p-8 md:p-12 rounded-[3.5rem] border-2 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10 transition-all ${req.status === 'IN_PROGRESS' ? 'border-blue-400 ring-8 ring-blue-50' : 'border-red-100'}`}>
                       <div className="flex items-start gap-8 w-full text-right">
                          <div className={`w-24 h-24 rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-xl shrink-0 ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-950 text-white'}`}>
                             <span className="text-[10px] opacity-40 uppercase mb-1">لجنة</span>
                             <span className="text-4xl">{req.committee}</span>
                          </div>
                          <div className="flex-1 space-y-4">
                             <div className="flex items-center gap-5">
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{req.from}</h4>
                                <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-xs font-black font-mono shadow-inner">{req.time}</span>
                             </div>
                             <p className="text-slate-600 font-bold text-xl leading-relaxed bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">{req.text}</p>
                          </div>
                       </div>

                       <div className="shrink-0 w-full md:w-auto">
                          {req.status === 'PENDING' || !req.status ? (
                             <button onClick={() => updateRequestStatus(req.id, 'IN_PROGRESS', req.committee)} className="w-full md:w-auto bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 whitespace-nowrap">
                                <ArrowRightCircle size={32} /> مباشرة البلاغ
                             </button>
                          ) : (
                             <button onClick={() => updateRequestStatus(req.id, 'DONE', req.committee)} className="w-full md:w-auto bg-emerald-600 text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 active:scale-95 whitespace-nowrap">
                                <Check size={32} /> إغلاق البلاغ
                             </button>
                          )}
                       </div>
                    </div>
                  ))
                )}
             </div>

             <div className="space-y-6 no-print">
                <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 sticky top-24">
                   <div className="flex items-center gap-3 mb-8 border-b pb-5">
                      <History size={28} className="text-slate-400" />
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">سجل إنجازاتك اليوم</h3>
                   </div>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {historyRequests.length === 0 ? (
                        <p className="text-center text-slate-300 font-bold italic py-24 text-sm">لم تقم بإغلاق أي بلاغ بعد</p>
                      ) : (
                        historyRequests.map(req => (
                          <div key={req.id} className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] space-y-3 opacity-90 hover:opacity-100 transition-all shadow-sm">
                             <div className="flex justify-between items-center">
                                <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">تم الحل</span>
                                <span className="text-[10px] font-mono text-slate-400 font-black">{req.time}</span>
                             </div>
                             <p className="text-xs font-black text-slate-900 leading-snug">لجنة {req.committee}: {req.text}</p>
                          </div>
                        ))
                      )}
                   </div>
                </div>
             </div>
          </div>
       ) : (
          <div className="animate-slide-up space-y-8">
             <div className="bg-white p-6 md:p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10 border-b pb-8">
                   <div className="flex items-center gap-5">
                      <div className="p-4 bg-red-50 text-red-600 rounded-[2rem] shadow-inner">
                         <UserX size={40} />
                      </div>
                      <div>
                         <h3 className="text-3xl font-black text-slate-900 leading-none">تجهيز المحاضر الاستباقي</h3>
                         <p className="text-slate-400 font-bold text-sm mt-2 italic">راقب حالات الغياب في لجانك لتجهيز المحاضر يدوياً وتوفير الوقت</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                   {myCommitteeAbsences.length === 0 ? (
                     <div className="col-span-full py-32 text-center text-slate-300 flex flex-col items-center gap-8">
                        <CheckCircle size={80} className="opacity-10" />
                        <p className="text-2xl font-black italic">لا يوجد حالات غياب مرصودة في لجانك الميدانية حالياً</p>
                     </div>
                   ) : (
                     myCommitteeAbsences.map(a => {
                       const student = students.find(s => s.national_id === a.student_id);
                       return (
                         <div key={a.id} className={`p-8 rounded-[3.5rem] border-2 shadow-2xl flex flex-col justify-between transition-all hover:scale-[1.02] ${a.type === 'ABSENT' ? 'bg-white border-red-100' : 'bg-white border-amber-100'}`}>
                            
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">اللجنة الميدانية</span>
                                  <span className="text-4xl font-black text-slate-900 leading-none">{a.committee_number}</span>
                               </div>
                               <div className="flex flex-col items-end gap-2 text-right">
                                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-lg ${a.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                                    {a.type === 'ABSENT' ? 'غياب' : 'تأخر'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">ID: {student?.national_id.slice(-4)}</span>
                               </div>
                            </div>

                            <div className="space-y-4 mb-8 text-right">
                               <div>
                                  <h4 className="text-2xl font-black text-slate-900 leading-tight mb-1">{a.student_name}</h4>
                                  <div className="flex gap-2 justify-end">
                                     <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black">{student?.grade}</span>
                                     <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black">فصل: {student?.section}</span>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center overflow-hidden">
                                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">رقم الجلوس</p>
                                     <p className="text-sm font-black text-slate-900 break-all leading-tight">{student?.seating_number || '---'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center overflow-hidden">
                                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">وقت الرصد</p>
                                     <p className="text-sm font-black text-slate-900 font-mono leading-tight">{new Date(a.date).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                                  </div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                               <button 
                                 disabled={!student?.parent_phone}
                                 onClick={() => student?.parent_phone && window.open(`tel:${student.parent_phone}`)}
                                 className={`flex-1 py-5 rounded-[2rem] font-black text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${student?.parent_phone ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                               >
                                  <PhoneOutgoing size={18} /> اتصال
                               </button>
                               <button 
                                 onClick={() => student && setSelectedStudent(student)}
                                 className="flex-1 py-5 rounded-[2rem] bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
                               >
                                  <QrCode size={18} /> رمز الطالب
                               </button>
                            </div>
                         </div>
                       );
                     })
                   )}
                </div>
             </div>
          </div>
       )}

       {/* مودال الهوية الرقمية للطالب (QR) */}
       {selectedStudent && (
         <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fade-in no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setSelectedStudent(null)}></div>
            <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border-b-[10px] border-blue-600">
               <div className="bg-slate-950 p-8 text-white flex justify-between items-center text-right dir-rtl">
                  <h3 className="text-xl font-black">هوية الطالب الرقمية</h3>
                  <button onClick={() => setSelectedStudent(null)} className="bg-white/10 p-2 rounded-full"><X size={24}/></button>
               </div>
               
               <div className="p-10 text-center space-y-8">
                  <div className="bg-white p-6 border-4 border-slate-50 rounded-[3rem] shadow-inner inline-block">
                     <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedStudent.national_id}`} 
                       alt="Student QR" 
                       className="w-48 h-48 mix-blend-multiply"
                     />
                  </div>
                  
                  <div className="text-center">
                     <h4 className="text-2xl font-black text-slate-900 leading-tight">{selectedStudent.name}</h4>
                     <p className="text-slate-400 font-bold mt-1 uppercase text-xs tracking-widest">{selectedStudent.grade} - {selectedStudent.section}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 gap-4">
                     <div className="text-center border-l overflow-hidden">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">اللجنة</p>
                        <p className="text-lg font-black text-slate-900 break-all leading-tight">{selectedStudent.committee_number}</p>
                     </div>
                     <div className="text-center overflow-hidden">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الجلوس</p>
                        <p className="text-lg font-black text-slate-900 break-all leading-tight">{selectedStudent.seating_number || '---'}</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg active:scale-95 transition-all"
                  >
                    إغلاق العرض
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* 4. بار التنقل السفلي للهواتف */}
       <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 p-6 flex justify-around items-center z-[200] lg:hidden no-print shadow-[0_-15px_40px_rgba(0,0,0,0.6)] rounded-t-[3.5rem] dir-rtl">
          
          <button onClick={() => setShowBadge(true)} className={`flex flex-col items-center gap-2 transition-all relative ${showBadge ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
             <div className={`p-2 rounded-xl ${showBadge ? 'bg-blue-600/20' : ''}`}>
                <IdCard size={28}/>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">هويتي</span>
          </button>
          
          <button onClick={() => { setActiveTab('REQUESTS'); setShowBadge(false); }} className={`flex flex-col items-center gap-2 transition-all relative ${activeTab === 'REQUESTS' && !showBadge ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
             <div className={`p-3 rounded-2xl ${activeTab === 'REQUESTS' && !showBadge ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white' : 'bg-white/5 text-slate-400'}`}>
                <BellRing size={26}/>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">المهمات</span>
             {activeRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center animate-bounce border-2 border-slate-950">
                   {activeRequests.length}
                </div>
             )}
          </button>

          <button onClick={() => { setActiveTab('ABSENCE_MONITOR'); setShowBadge(false); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'ABSENCE_MONITOR' && !showBadge ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
             <div className={`p-2 rounded-xl ${activeTab === 'ABSENCE_MONITOR' && !showBadge ? 'bg-blue-600/20' : ''}`}>
                <UserX size={28}/>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">الغياب</span>
          </button>
       </div>
    </div>
  );
};

export default AssistantControlView;
