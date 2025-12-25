
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Users, Box, Send, Activity, 
  Settings2, BarChart3, Layers, UserPlus, 
  AlertCircle, CheckCircle2, Clock, Search, 
  Target, Filter, Zap, MessageSquare, Briefcase,
  MonitorPlay, Fingerprint, Award, TrendingUp,
  Mail, BellRing, UserCheck, ShieldAlert, Info,
  Timer, Gauge, FileSpreadsheet, History,
  ArrowRightLeft, UserMinus, UserX, CheckCircle,
  PackageSearch, Unlock, ShieldX, Ghost, Scan,
  UserCog, LogOut, ToggleLeft, ToggleRight,
  Radio, CalendarPlus, AlertOctagon, RefreshCw,
  Plus, X, Check, Navigation, Megaphone,
  Bell, Command, Shield
} from 'lucide-react';
import { User, DeliveryLog, Student, UserRole, SystemConfig, Absence, Supervision } from '../../types';
import { ROLES_ARABIC } from '../../constants';
import { supabase, db } from '../../supabase';

interface ControlManagerProps {
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  onBroadcast: (msg: string, target: UserRole | 'ALL') => void;
  onUpdateUserGrades: (userId: string, grades: string[]) => void;
  systemConfig: SystemConfig & { allow_manual_join?: boolean, active_exam_date?: string };
  absences: Absence[];
  supervisions: Supervision[];
  setDeliveryLogs: (log: DeliveryLog) => Promise<void>;
  setSystemConfig: (cfg: any) => Promise<void>;
  onRemoveSupervision: (teacherId: string) => Promise<void>;
}

const ControlManager: React.FC<ControlManagerProps> = ({ 
  users, deliveryLogs, students, onBroadcast, onUpdateUserGrades, systemConfig, absences, supervisions, setDeliveryLogs, setSystemConfig, onRemoveSupervision
}) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'assignments' | 'emergency-receipt' | 'comms' | 'proctors-mgmt'>('cockpit');
  const [broadcastTarget, setBroadcastTarget] = useState<UserRole | 'ALL'>('ALL');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const stats = useMemo(() => {
    const totalComs = new Set(students.map(s => s.committee_number)).size;
    const confirmed = deliveryLogs.filter(l => l.status === 'CONFIRMED').length;
    return {
      total: totalComs,
      confirmed,
      absentTotal: absences.filter(a => a.type === 'ABSENT').length,
      progress: Math.round((confirmed / totalComs) * 100) || 0
    };
  }, [students, deliveryLogs, absences]);

  const proctorStatus = useMemo(() => {
    const comNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    return comNums.map(num => {
      const sv = supervisions.find(s => s.committee_number === num);
      const user = users.find(u => u.id === sv?.teacher_id);
      return { num, proctor: user, svId: sv?.id };
    });
  }, [students, supervisions, users]);

  // استخراج الصفوف واللجان المتاحة للإسناد
  const availableGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort(), [students]);
  const availableCommittees = useMemo(() => Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b) => Number(a)-Number(b)), [students]);

  // تصفية المستخدمين لتبويب الإسناد
  const assignmentUsers = useMemo(() => {
    return users.filter(u => 
      (u.role === 'CONTROL' || u.role === 'ASSISTANT_CONTROL') &&
      (u.full_name.includes(assignmentSearch) || u.national_id.includes(assignmentSearch))
    );
  }, [users, assignmentSearch]);

  const toggleGrade = async (user: User, grade: string) => {
    const current = user.assigned_grades || [];
    const updated = current.includes(grade) ? current.filter(g => g !== grade) : [...current, grade];
    
    // تحديث في القاعدة من خلال App callback
    onUpdateUserGrades(user.id, updated);
  };

  const toggleCommittee = async (user: User, committee: string) => {
    const current = user.assigned_committees || [];
    const updated = current.includes(committee) ? current.filter(c => c !== committee) : [...current, committee];
    
    // تحديث مباشر للجان (Assigned Committees)
    const { error } = await supabase.from('users').update({ assigned_committees: updated }).eq('id', user.id);
    if (error) alert(error.message);
    else {
      // إشعار بالنجاح أو مزامنة محلية إذا لزم الأمر
    }
  };

  const handleStartNewDay = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (!confirm(`بدء يوم جديد سيقوم بتصفير اللجان لليوم (${today}). هل أنت متأكد؟`)) return;
    setIsResetting(true);
    try {
      await supabase.from('supervision').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await setSystemConfig({ ...systemConfig, active_exam_date: today });
      onBroadcast(`تم تفعيل يوم الاختبار الجديد (${today}). يرجى المباشرة فوراً.`, 'ALL');
      window.location.reload();
    } catch (err: any) { alert(err.message); } finally { setIsResetting(false); }
  };

  // Fix: Added missing toggleManualJoin function
  const toggleManualJoin = async () => {
    try {
      await setSystemConfig({ ...systemConfig, allow_manual_join: !systemConfig.allow_manual_join });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32">
      {/* Header - Strategic Control Room */}
      <div className="bg-slate-950 rounded-[4rem] p-10 text-white relative overflow-hidden shadow-2xl border-b-8 border-blue-600">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-6">
               <div className="bg-blue-600 p-5 rounded-3xl shadow-2xl ring-4 ring-blue-500/20"><Gauge size={40} /></div>
               <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter">مركز القيادة الاستراتيجي</h2>
                  <div className="flex items-center gap-3 mt-2">
                     <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.active_exam_date === new Date().toISOString().split('T')[0] ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                        اليوم النشط: {systemConfig.active_exam_date}
                     </span>
                     <span className="text-slate-500 font-bold text-xs flex items-center gap-2"><Clock size={14}/> تحديث لحظي نشط</span>
                  </div>
               </div>
            </div>

            <button 
              onClick={handleStartNewDay}
              disabled={isResetting}
              className="bg-white text-slate-950 px-8 py-5 rounded-[2rem] font-black text-lg flex items-center gap-4 shadow-2xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
            >
               {isResetting ? <RefreshCw className="animate-spin" /> : <CalendarPlus size={28} className="text-blue-600" />}
               بدء يوم عمل جديد
            </button>
         </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center overflow-x-auto pb-4 custom-scrollbar">
         <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border flex gap-2 w-full max-w-6xl shrink-0">
            {[
              {id: 'cockpit', label: 'الرؤية العامة', icon: MonitorPlay},
              {id: 'assignments', label: 'إسناد الصلاحيات', icon: Layers},
              {id: 'proctors-mgmt', label: 'إدارة المراقبين', icon: UserCog},
              {id: 'emergency-receipt', label: 'استلام طوارئ', icon: ShieldAlert},
              {id: 'comms', label: 'البث الإعلامي', icon: Megaphone},
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 px-6 rounded-[1.8rem] font-black text-xs flex items-center justify-center gap-3 transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <tab.icon size={18} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
         </div>
      </div>

      {/* Cockpit - Overview Tab */}
      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-slide-up">
           <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800"><Radio size={24} className="text-blue-600"/> مصفوفة اللجان الحية</h3>
                    <div className="flex gap-4 text-[10px] font-black text-slate-400">
                       <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600"></div> نشطة</span>
                       <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-200"></div> شاغرة</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3">
                    {proctorStatus.map(com => (
                      <div key={com.num} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${com.proctor ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                         <span className="text-[8px] font-black uppercase opacity-60">لجنة</span>
                         <span className="text-2xl font-black">{com.num}</span>
                      </div>
                    ))}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex items-center gap-6">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl"><CheckCircle2 size={32}/></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">اللجان المكتملة</p>
                       <p className="text-3xl font-black text-slate-900">{stats.confirmed} لجنة</p>
                    </div>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex items-center gap-6">
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl"><UserX size={32}/></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي الغيابات</p>
                       <p className="text-3xl font-black text-slate-900">{stats.absentTotal} طالب</p>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="bg-slate-950 p-8 rounded-[3.5rem] text-white shadow-xl relative overflow-hidden flex flex-col">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-blue-400"><History /> العمليات الأخيرة</h3>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                 {deliveryLogs.filter(l => l.status === 'CONFIRMED').slice(-8).map(l => (
                   <div key={l.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-2 group hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-center">
                         <span className="font-black text-blue-400">لجنة {l.committee_number}</span>
                         <span className="text-[10px] text-slate-500 font-mono">{new Date(l.time).toLocaleTimeString('ar-SA')}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-300">استلام نهائي: {l.grade}</p>
                   </div>
                 ))}
                 {deliveryLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-30 gap-4">
                       <Ghost size={64}/>
                       <p className="font-black">بانتظار العمليات...</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Assignments - إسناد الصلاحيات */}
      {activeTab === 'assignments' && (
        <div className="space-y-8 animate-slide-up">
           <div className="bg-white p-10 rounded-[3.5rem] border shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="bg-indigo-50 text-indigo-600 p-5 rounded-3xl"><Layers size={40} /></div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-900">وحدة إسناد الصلاحيات</h3>
                    <p className="text-slate-400 font-bold">توزيع الصفوف واللجان على أعضاء الكنترول والمساعدين</p>
                 </div>
              </div>
              <div className="relative w-full lg:w-96">
                 <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="بحث في طاقم العمل..." 
                    className="w-full pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold outline-none focus:border-indigo-600"
                    value={assignmentSearch}
                    onChange={e => setAssignmentSearch(e.target.value)}
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {assignmentUsers.map(user => (
                <div key={user.id} className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-2xl flex flex-col gap-8 transition-all hover:border-indigo-100">
                   <div className="flex items-center gap-6">
                      <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center shadow-xl ${user.role === 'CONTROL' ? 'bg-blue-600' : 'bg-indigo-900'} text-white`}>
                         <UserCheck size={40} />
                      </div>
                      <div className="flex-1">
                         <h4 className="text-2xl font-black text-slate-900 leading-tight">{user.full_name}</h4>
                         <div className="flex items-center gap-4 mt-1 text-xs font-bold text-slate-400">
                            <span>{ROLES_ARABIC[user.role]}</span>
                            <span>ID: {user.national_id}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                        {user.role === 'CONTROL' ? 'تخصيص الصفوف الدراسية للاستلام' : 'تخصيص اللجان للمتابعة الميدانية'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                         {user.role === 'CONTROL' ? (
                            availableGrades.map(grade => {
                               const isActive = user.assigned_grades?.includes(grade);
                               return (
                                 <button key={grade} onClick={() => toggleGrade(user, grade)} className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-2 ${isActive ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                                    {isActive ? <Check size={14}/> : <Plus size={14}/>}
                                    {grade}
                                 </button>
                               );
                            })
                         ) : (
                            availableCommittees.map(com => {
                               const isActive = user.assigned_committees?.includes(com);
                               return (
                                 <button key={com} onClick={() => toggleCommittee(user, com)} className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-2 ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                                    {isActive ? <Check size={14}/> : <Plus size={14}/>}
                                    لجنة {com}
                                 </button>
                               );
                            })
                         )}
                      </div>
                   </div>
                </div>
              ))}
              {assignmentUsers.length === 0 && (
                <div className="col-span-full py-40 text-center text-slate-300 italic">لا يوجد أعضاء كنترول أو مساعدين مطابقين للبحث.</div>
              )}
           </div>
        </div>
      )}

      {/* Comms - البث الإعلامي */}
      {activeTab === 'comms' && (
        <div className="space-y-8 animate-slide-up">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] border shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full"></div>
                 <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><Megaphone size={32} className="text-blue-600" /> إرسال بلاغ أو تعميم مركزي</h3>
                 
                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-2"><Target size={14}/> الجمهور المستهدف</label>
                          <div className="flex flex-wrap gap-2">
                             {['ALL', 'PROCTOR', 'CONTROL', 'ASSISTANT_CONTROL', 'COUNSELOR'].map(role => (
                               <button 
                                 key={role} 
                                 onClick={() => setBroadcastTarget(role as any)} 
                                 className={`px-6 py-3 rounded-2xl font-black text-xs transition-all border-2 ${broadcastTarget === role ? 'bg-slate-900 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                               >
                                 {role === 'ALL' ? 'الكل' : ROLES_ARABIC[role]}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-2"><Zap size={14}/> نمط التنبيه</label>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-dashed text-slate-500 font-bold text-xs flex items-center gap-3 italic">
                             <BellRing size={18} className="text-amber-500 animate-swing" /> سيتم إرسال إشعار فوري لأجهزة المستهدفين.
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">نص البلاغ / التعليمات</label>
                       <textarea 
                          value={broadcastMsg}
                          onChange={e => setBroadcastMsg(e.target.value)}
                          placeholder="اكتب التعليمات هنا بوضوح..."
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 font-bold text-lg h-48 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner resize-none"
                       />
                    </div>

                    <button 
                       onClick={() => {
                          if (broadcastMsg.trim()) {
                             onBroadcast(broadcastMsg, broadcastTarget);
                             setBroadcastMsg('');
                             alert('تم بث البلاغ بنجاح');
                          }
                       }}
                       disabled={!broadcastMsg.trim()}
                       className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                       <Send size={32}/> بث التعليمات الآن
                    </button>
                 </div>
              </div>

              <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl flex flex-col gap-8 relative overflow-hidden border-b-8 border-amber-500">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[100px] rounded-full"></div>
                 <h3 className="text-xl font-black flex items-center gap-3 text-amber-500 relative z-10"><History size={24} /> سجل البث (24 ساعة)</h3>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-4">
                    {/* محاكاة للسجلات أو استعراض من notifications إذا كانت متوفرة */}
                    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-amber-500/60">
                          <span>إلى: الجميع</span>
                          <span>قبل قليل</span>
                       </div>
                       <p className="text-sm font-bold text-slate-300 italic">"يرجى الالتزام بالهدوء عند تسليم المظاريف للكنترول..."</p>
                    </div>
                    <div className="p-20 flex flex-col items-center justify-center gap-4 opacity-20">
                       <Bell size={48} />
                       <p className="font-black text-xs uppercase tracking-[0.3em]">End of logs</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Emergency Receipt - استلام طوارئ */}
      {activeTab === 'emergency-receipt' && (
        <div className="space-y-8 animate-slide-up">
           <div className="bg-red-600 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                 <div className="space-y-4">
                    <div className="flex items-center gap-6">
                       <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md"><ShieldAlert size={48}/></div>
                       <h3 className="text-4xl font-black tracking-tighter">بوابة استلام الطوارئ (Manual Bypass)</h3>
                    </div>
                    <p className="text-red-100 font-bold text-lg max-w-xl">يستخدم هذا الخيار في حال تعطل جهاز المراقب أو تعذر الإغلاق الرقمي. الاستلام هنا يتم يدوياً ويتطلب موافقة رئيس الكنترول.</p>
                 </div>
                 <div className="bg-white/10 p-8 rounded-[3rem] border border-white/20 text-center min-w-[180px]">
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">إجمالي تجاوزات اليوم</p>
                    <p className="text-6xl font-black tabular-nums">0</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proctorStatus.filter(c => !c.proctor).map(com => (
                <div key={com.num} className="bg-white p-8 rounded-[3.5rem] border-2 border-red-50 shadow-xl flex flex-col gap-6 group hover:border-red-600 transition-all">
                   <div className="flex justify-between items-center">
                      <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black">
                         <span className="text-[8px] opacity-40 leading-none mb-1">لجنة</span>
                         <span className="text-3xl leading-none">{com.num}</span>
                      </div>
                      <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">شاغرة رقمياً</div>
                   </div>
                   <button 
                      onClick={() => {
                        const grade = prompt('أدخل الصف الدراسي للاستلام اليدوي:');
                        if (grade) {
                           setDeliveryLogs({
                              id: crypto.randomUUID(),
                              teacher_name: 'رئيس الكنترول (تجاوز يدوي)',
                              proctor_name: 'تجاوز طوارئ',
                              committee_number: com.num,
                              grade,
                              type: 'RECEIVE',
                              time: new Date().toISOString(),
                              period: 1,
                              status: 'CONFIRMED'
                           });
                           alert(`تم استلام لجنة ${com.num} بنجاح.`);
                        }
                      }}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-red-600 transition-all"
                   >
                      <Unlock size={20} /> استلام يدوي اضطراري
                   </button>
                </div>
              ))}
              {proctorStatus.filter(c => !c.proctor).length === 0 && (
                 <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                    <CheckCircle2 size={64} className="text-emerald-500 opacity-20" />
                    <p className="text-slate-300 font-black text-xl italic">لا توجد لجان شاغرة تتطلب استلام طوارئ حالياً.</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Proctors Mgmt - إدارة المراقبين */}
      {activeTab === 'proctors-mgmt' && (
        <div className="space-y-8 animate-slide-up">
           <div className="bg-white p-10 rounded-[3.5rem] border shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl"><UserCog size={40} /></div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-900">إدارة مباشرة اللجان</h3>
                    <p className="text-slate-400 font-bold">تحرير المراقبين وتفعيل التحاق الطوارئ</p>
                 </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">الالتحاق اليدوي للمراقب</p>
                    <p className="text-sm font-bold text-slate-600">{systemConfig.allow_manual_join ? 'مفعل الآن' : 'معطل (QR فقط)'}</p>
                 </div>
                 <button onClick={toggleManualJoin} className={`transition-all ${systemConfig.allow_manual_join ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {systemConfig.allow_manual_join ? <ToggleRight size={56} /> : <ToggleLeft size={56} />}
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proctorStatus.map(com => (
                <div key={com.num} className={`bg-white p-8 rounded-[3rem] border-2 shadow-lg transition-all relative overflow-hidden flex flex-col justify-between ${com.proctor ? 'border-blue-100 shadow-blue-50' : 'border-slate-50 opacity-60'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div className="bg-slate-950 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black">
                         <span className="text-[8px] opacity-40 mb-1">لجنة</span>
                         <span className="text-3xl">{com.num}</span>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${com.proctor ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                         {com.proctor ? 'قيد المراقبة' : 'شاغرة'}
                      </span>
                   </div>
                   <div className="mb-8">
                      {com.proctor ? (
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><UserCheck size={24}/></div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[9px] font-black text-slate-400 uppercase">المراقب الحالي:</p>
                               <h4 className="text-lg font-black text-slate-900 leading-tight truncate">{com.proctor.full_name}</h4>
                            </div>
                         </div>
                      ) : (
                         <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-300 font-bold italic text-sm">بانتظار مراقب</div>
                      )}
                   </div>
                   {com.proctor && (
                     <button 
                       onClick={() => confirm(`تحرير اللجنة لتمكين مراقب آخر؟`) && onRemoveSupervision(com.proctor!.id)}
                       className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all"
                     >
                        <LogOut size={18} /> إلغاء تكليف / تبديل المراقب
                     </button>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes swing {
           0% { transform: rotate(0deg); }
           20% { transform: rotate(15deg); }
           40% { transform: rotate(-10deg); }
           60% { transform: rotate(5deg); }
           80% { transform: rotate(-5deg); }
           100% { transform: rotate(0deg); }
        }
        .animate-swing {
           animation: swing 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default ControlManager;
