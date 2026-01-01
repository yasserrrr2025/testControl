
import React, { useMemo, useState } from 'react';
import { User, ControlRequest, Absence, Student } from '../../types';
import { 
  Check, ShieldCheck, Loader2, ArrowRightCircle, UserCheck, 
  BellRing, History, Clock, UserX, Activity, CheckCircle, 
  ChevronLeft, MapPin, Fingerprint, ShieldAlert, PhoneOutgoing,
  QrCode, X, Search, Navigation, AlertOctagon, Users, Phone,
  CircleDot, HelpCircle
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
  users?: User[]; // أضفنا هذا لاستقبال قائمة المستخدمين كاملة
}

const AssistantControlView: React.FC<Props> = ({ user, requests, setRequests, absences, students, onAlert, users = [] }) => {
  const [activeTab, setActiveTab] = useState<'MISSION_CONTROL' | 'FIELD_LOGS' | 'TEAM_RADAR'>('MISSION_CONTROL');
  const [showBadge, setShowBadge] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // تحليل حالة الفريق
  const teamStatus = useMemo(() => {
    const fieldStaff = users.filter(u => 
      (u.role === 'ASSISTANT_CONTROL' || u.role === 'CONTROL') && u.id !== user.id
    );

    return fieldStaff.map(member => {
      const activeTask = requests.find(r => r.assistant_name === member.full_name && r.status === 'IN_PROGRESS');
      return {
        ...member,
        isBusy: !!activeTask,
        currentCommittee: activeTask?.committee || null,
        currentTask: activeTask?.text || null
      };
    });
  }, [users, requests, user.id]);

  const myRequests = useMemo(() => 
    requests.filter((r: ControlRequest) => user.assigned_committees?.includes(r.committee)), 
  [requests, user]);

  const activeRequests = useMemo(() => 
    myRequests.filter(r => r.status !== 'DONE').sort((a,b) => b.time.localeCompare(a.time)),
  [myRequests]);

  const urgentCount = activeRequests.filter(r => r.status === 'PENDING').length;

  const myCommitteeAbsences = useMemo(() => {
    return absences.filter(a => user.assigned_committees?.includes(a.committee_number));
  }, [absences, user]);

  const updateRequestStatus = async (requestId: string, newStatus: 'IN_PROGRESS' | 'DONE', committee: string) => {
    try {
      await db.controlRequests.updateStatus(requestId, newStatus, user.full_name);
      await setRequests();
      onAlert(`تم تحديث حالة اللجنة ${committee} بنجاح.`);
    } catch (err: any) {
      onAlert(`خطأ في التحديث: ${err.message}`);
    }
  };

  if (showBadge) {
    return (
      <div className="animate-fade-in pb-40">
        <div className="flex items-center justify-between mb-8 px-6 no-print">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Fingerprint className="text-blue-600" /> الهوية الرقمية للمساعد
          </h2>
          <button onClick={() => setShowBadge(false)} className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl active:scale-95 transition-all flex items-center gap-2 font-black">
            <ChevronLeft size={20}/> رجوع للمهام
          </button>
        </div>
        <TeacherBadgeView user={user} />
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-fade-in text-right pb-48 max-w-7xl mx-auto px-4">
       {/* رأس العمليات الميدانية */}
       <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[12px] border-blue-600">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="space-y-6 flex-1">
                <div className="flex items-center gap-6">
                   <div className="bg-blue-600 p-5 rounded-[2.2rem] shadow-2xl animate-pulse ring-4 ring-blue-500/20">
                      <Navigation size={40} className="text-white" />
                   </div>
                   <div>
                      <h2 className="text-4xl md:text-6xl font-black tracking-tighter">وحدة التدخل الميداني</h2>
                      <p className="text-blue-400 font-bold text-base tracking-widest uppercase mt-2">Field Ops Division</p>
                   </div>
                </div>
                <div className="flex flex-wrap gap-3">
                   {user.assigned_committees?.map((c: string) => (
                     <div key={c} className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-colors">
                        <MapPin size={16} className="text-blue-500"/>
                        <span className="text-sm font-black">نطاق عمل: لجنة {c}</span>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="flex gap-4">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] text-center min-w-[160px] shadow-inner relative overflow-hidden group">
                   {urgentCount > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-2">طلبات معلقة</p>
                   <p className={`text-6xl font-black tabular-nums ${urgentCount > 0 ? 'text-red-500' : 'text-white'}`}>{urgentCount}</p>
                </div>
                <div onClick={() => setActiveTab('TEAM_RADAR')} className="bg-blue-600/20 border border-blue-500/30 p-8 rounded-[3rem] text-center min-w-[160px] shadow-inner cursor-pointer hover:bg-blue-600/30 transition-all group">
                   <p className="text-[10px] font-black uppercase text-blue-400 mb-2 group-hover:text-white transition-colors">رادار الفريق</p>
                   <div className="flex items-center justify-center gap-2">
                     <p className="text-6xl font-black text-white tabular-nums">{teamStatus.length}</p>
                     <Users size={24} className="text-blue-400" />
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* مبدل المهام العصري */}
       <div className="flex justify-center mb-10 overflow-x-auto custom-scrollbar pb-2">
          <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border flex gap-2 w-full max-w-xl shrink-0">
             <button onClick={() => setActiveTab('MISSION_CONTROL')} className={`flex-1 py-4 px-6 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${activeTab === 'MISSION_CONTROL' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                <BellRing size={20} /> البلاغات
             </button>
             <button onClick={() => setActiveTab('TEAM_RADAR')} className={`flex-1 py-4 px-6 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${activeTab === 'TEAM_RADAR' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Activity size={20} /> رادار الفريق
             </button>
             <button onClick={() => setActiveTab('FIELD_LOGS')} className={`flex-1 py-4 px-6 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${activeTab === 'FIELD_LOGS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                <UserX size={20} /> الغياب
             </button>
          </div>
       </div>

       {/* عرض رادار الفريق */}
       {activeTab === 'TEAM_RADAR' && (
         <div className="animate-slide-up space-y-8">
            <div className="flex items-center justify-between px-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                   <Users size={28} className="text-blue-600" /> حالة الفريق الميداني اللحظية
                </h3>
                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Live Coordination</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {teamStatus.length === 0 ? (
                 <div className="col-span-full py-40 text-center text-slate-300">
                    <HelpCircle size={80} className="mx-auto opacity-20 mb-4" />
                    <p className="text-2xl font-black italic">لا يوجد أعضاء فريق ميداني مسجلين حالياً</p>
                 </div>
               ) : (
                 teamStatus.map(member => (
                   <div key={member.id} className={`bg-white p-8 rounded-[3.5rem] border-2 shadow-xl transition-all relative overflow-hidden group ${member.isBusy ? 'border-blue-400 bg-blue-50/10' : 'border-slate-50'}`}>
                      <div className="flex justify-between items-start mb-6">
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${member.isBusy ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                            <UserCheck size={32} />
                         </div>
                         <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${member.isBusy ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                            <CircleDot size={12} fill="currentColor" />
                            {member.isBusy ? 'في مهمة عمل' : 'متاح حالياً'}
                         </div>
                      </div>

                      <div className="space-y-4 mb-8">
                         <div>
                            <h4 className="text-xl font-black text-slate-900 leading-tight">{member.full_name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">مساعد ميداني معتمد</p>
                         </div>
                         
                         {member.isBusy ? (
                           <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-2">
                              <p className="text-[8px] font-black text-blue-400 uppercase leading-none">الموقع الحالي:</p>
                              <div className="flex items-center gap-2">
                                 <MapPin size={14} className="text-blue-600" />
                                 <span className="text-sm font-black text-slate-800">لجنة رقم {member.currentCommittee}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold truncate">المهمة: {member.currentTask}</p>
                           </div>
                         ) : (
                           <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                              <p className="text-[10px] font-black text-emerald-600">جاهز لاستلام بلاغات جديدة</p>
                           </div>
                         )}
                      </div>

                      <div className="grid grid-cols-1">
                         <button 
                           onClick={() => member.phone && window.open(`tel:${member.phone}`)}
                           disabled={!member.phone}
                           className={`w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${member.phone ? 'bg-slate-950 text-white hover:bg-black' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                         >
                            <Phone size={18} /> اتصال تنسيقي سريع
                         </button>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>
       )}

       {/* عرض المهام الحية */}
       {activeTab === 'MISSION_CONTROL' ? (
          <div className="space-y-8 animate-slide-up">
             <div className="flex items-center justify-between px-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                   <Activity size={28} className="text-blue-600" /> مركز استقبال البلاغات الحية
                </h3>
                {activeRequests.length > 0 && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-black text-xs animate-pulse">تنبيه: يوجد مهام تتطلب تدخل فوري</div>}
             </div>

             {activeRequests.length === 0 ? (
               <div className="py-40 text-center bg-white rounded-[5rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-8 shadow-inner">
                  <div className="bg-slate-50 p-10 rounded-full text-slate-100 shadow-inner"><ShieldCheck size={120} /></div>
                  <div className="space-y-2">
                     <p className="text-3xl font-black text-slate-300 italic">نظامك الميداني آمن تماماً</p>
                     <p className="text-slate-400 font-bold">لا يوجد بلاغات نشطة في النطاق المسند إليك حالياً</p>
                  </div>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-6">
                 {activeRequests.map(req => (
                   <div key={req.id} className={`bg-white p-8 md:p-12 rounded-[4rem] border-2 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10 transition-all group relative overflow-hidden ${req.status === 'IN_PROGRESS' ? 'border-blue-400 bg-blue-50/10 ring-8 ring-blue-50' : 'border-red-100'}`}>
                      {req.status === 'PENDING' && <div className="absolute top-0 right-0 w-3 h-full bg-red-600 animate-pulse"></div>}
                      
                      <div className="flex items-start gap-8 w-full">
                         <div className={`w-28 h-28 rounded-[2.5rem] flex flex-col items-center justify-center font-black shadow-2xl shrink-0 transition-transform group-hover:scale-105 ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-white'}`}>
                            <span className="text-xs opacity-50 uppercase mb-1">لجنة</span>
                            <span className="text-5xl">{req.committee}</span>
                         </div>
                         <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-5">
                               <h4 className="text-2xl font-black text-slate-900">{req.from}</h4>
                               <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black font-mono flex items-center gap-2"><Clock size={14}/> {req.time}</span>
                            </div>
                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group-hover:bg-white transition-colors">
                               <AlertOctagon size={48} className="absolute -left-4 -top-4 text-red-500/10" />
                               <p className="text-2xl font-black text-slate-700 leading-relaxed text-right">{req.text}</p>
                            </div>
                         </div>
                      </div>

                      <div className="shrink-0 w-full lg:w-auto flex flex-col gap-3">
                         {req.status === 'PENDING' ? (
                            <button onClick={() => updateRequestStatus(req.id, 'IN_PROGRESS', req.committee)} className="w-full lg:w-72 bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 hover:shadow-blue-200">
                               <ArrowRightCircle size={40} /> مباشرة الطلب
                            </button>
                         ) : (
                            <button onClick={() => updateRequestStatus(req.id, 'DONE', req.committee)} className="w-full lg:w-72 bg-emerald-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 active:scale-95 hover:shadow-emerald-200">
                               <CheckCircle size={40} /> إغلاق البلاغ
                            </button>
                         )}
                         <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المهمة رقم: {req.id.slice(0, 8)}</p>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
       ) : activeTab === 'FIELD_LOGS' ? (
          <div className="animate-slide-up space-y-8">
             <div className="bg-white p-10 md:p-14 rounded-[4rem] border-2 border-slate-50 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b pb-10">
                   <div className="flex items-center gap-6">
                      <div className="p-5 bg-red-50 text-red-600 rounded-[2.2rem] shadow-inner">
                         <UserX size={48} />
                      </div>
                      <div>
                         <h3 className="text-4xl font-black text-slate-900 leading-none">متابعة الغياب الميداني</h3>
                         <p className="text-slate-400 font-bold text-lg mt-2 italic">راقب لجانك واستعد لتسليم المحاضر الورقية فوراً</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {myCommitteeAbsences.length === 0 ? (
                     <div className="col-span-full py-40 text-center text-slate-300 flex flex-col items-center gap-8">
                        <CheckCircle size={100} className="opacity-10" />
                        <p className="text-2xl font-black italic">لا يوجد حالات غياب مسجلة في لجانك حالياً</p>
                     </div>
                   ) : (
                     myCommitteeAbsences.map(a => {
                       const student = students.find(s => s.national_id === a.student_id);
                       return (
                         <div key={a.id} className="bg-white rounded-[3.5rem] border-2 border-slate-50 p-8 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-8">
                               <div className="bg-slate-950 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black">
                                  <span className="text-[8px] opacity-40 leading-none mb-1">لجنة</span>
                                  <span className="text-2xl leading-none">{a.committee_number}</span>
                               </div>
                               <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-sm ${a.type === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                                 {a.type === 'ABSENT' ? 'غياب' : 'تأخر'}
                               </span>
                            </div>

                            <div className="space-y-5 text-right mb-10">
                               <h4 className="text-2xl font-black text-slate-900 leading-tight truncate">{a.student_name}</h4>
                               <div className="flex flex-wrap gap-2 justify-end">
                                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black border border-blue-100">{student?.grade}</span>
                                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black">فصل: {student?.section}</span>
                               </div>
                               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl text-[12px] font-black text-slate-400">
                                  <span>رقم الجلوس:</span>
                                  <span className="text-slate-800 text-lg tabular-nums">{student?.seating_number || '---'}</span>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <button 
                                 disabled={!student?.parent_phone}
                                 onClick={() => student?.parent_phone && window.open(`tel:${student.parent_phone}`)}
                                 className={`py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${student?.parent_phone ? 'bg-slate-950 text-white hover:bg-black' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                               >
                                  <PhoneOutgoing size={18} /> اتصال
                               </button>
                               <button 
                                 onClick={() => student && setSelectedStudent(student)}
                                 className="py-5 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all hover:bg-blue-700 active:scale-95"
                               >
                                  <QrCode size={18} /> عرض الهوية
                               </button>
                            </div>
                         </div>
                       );
                     })
                   )}
                </div>
             </div>
          </div>
       ) : null}

       {/* بار التنقل السفلي المطور للهواتف */}
       <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 p-8 flex justify-around items-center z-[200] lg:hidden no-print shadow-[0_-20px_50px_rgba(0,0,0,0.6)] rounded-t-[4rem] dir-rtl">
          <button onClick={() => setShowBadge(true)} className={`flex flex-col items-center gap-2 transition-all ${showBadge ? 'text-blue-400 scale-110' : 'text-slate-500'}`}>
             <div className={`p-3 rounded-2xl ${showBadge ? 'bg-blue-600/20 shadow-lg shadow-blue-500/20' : ''}`}><Fingerprint size={32}/></div>
             <span className="text-[10px] font-black uppercase tracking-widest">هويتي</span>
          </button>
          
          <button onClick={() => { setActiveTab('MISSION_CONTROL'); setShowBadge(false); }} className={`flex flex-col items-center gap-2 transition-all relative ${activeTab === 'MISSION_CONTROL' && !showBadge ? 'text-blue-400 scale-125' : 'text-slate-500'}`}>
             <div className={`p-5 rounded-[2rem] -mt-14 border-4 border-slate-950 transition-all ${activeTab === 'MISSION_CONTROL' && !showBadge ? 'bg-blue-600 shadow-2xl shadow-blue-600/40 text-white' : 'bg-white/5 text-slate-500'}`}>
                <BellRing size={32} className={urgentCount > 0 ? "animate-bounce" : ""}/>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest mt-1">البلاغات</span>
             {urgentCount > 0 && <div className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-950 animate-pulse">{urgentCount}</div>}
          </button>

          <button onClick={() => { setActiveTab('TEAM_RADAR'); setShowBadge(false); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'TEAM_RADAR' && !showBadge ? 'text-blue-400 scale-110' : 'text-slate-500'}`}>
             <div className={`p-3 rounded-2xl ${activeTab === 'TEAM_RADAR' && !showBadge ? 'bg-blue-600/20 shadow-lg shadow-blue-500/20' : ''}`}><Users size={32}/></div>
             <span className="text-[10px] font-black uppercase tracking-widest">الفريق</span>
          </button>
       </div>
    </div>
  );
};

export default AssistantControlView;
