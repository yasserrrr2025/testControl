
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
  PackageSearch, Unlock, ShieldX, Ghost, Scan
} from 'lucide-react';
import { User, DeliveryLog, Student, UserRole, SystemConfig, Absence, Supervision } from '../../types';
import { ROLES_ARABIC } from '../../constants';

interface ControlManagerProps {
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  onBroadcast: (msg: string, target: UserRole | 'ALL') => void;
  onUpdateUserGrades: (userId: string, grades: string[]) => void;
  systemConfig: SystemConfig;
  absences: Absence[];
  supervisions: Supervision[];
  setDeliveryLogs: (log: DeliveryLog) => Promise<void>;
}

const ControlManager: React.FC<ControlManagerProps> = ({ 
  users, deliveryLogs, students, onBroadcast, onUpdateUserGrades, systemConfig, absences, supervisions, setDeliveryLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'cockpit' | 'assignments' | 'emergency-receipt' | 'comms'>('cockpit');
  const [broadcastTarget, setBroadcastTarget] = useState<UserRole | 'ALL'>('ALL');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Emergency Receipt States
  const [emergencyInput, setEmergencyInput] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const controlStaff = useMemo(() => 
    users.filter(u => u.role === 'CONTROL' || u.role === 'ASSISTANT_CONTROL'), 
    [users]
  );

  const allGrades = useMemo(() => 
    Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort(), 
    [students]
  );

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

  // اللجان التي أغلقها المراقب ولكن لم تستلم بعد
  const pendingReceipts = useMemo(() => {
    return deliveryLogs.filter(l => l.status === 'PENDING');
  }, [deliveryLogs]);

  const handleEmergencyReceipt = async (log: DeliveryLog) => {
    if (!confirm(`تنبيه أمني: هل تود استلام عهدة لجنة ${log.committee_number} (صف ${log.grade}) بصفتك رئيساً للكنترول؟ سيتم تسجيل العملية باسمك فوراً.`)) return;
    
    setIsProcessingReceipt(true);
    try {
      const updatedLog: DeliveryLog = {
        ...log,
        teacher_name: `(رئيس الكنترول) ${users.find(u => u.role === 'CONTROL_MANAGER')?.full_name || 'المشرف'}`,
        status: 'CONFIRMED',
        time: new Date().toISOString()
      };
      await setDeliveryLogs(updatedLog);
      alert('تم الاستلام الاستثنائي وتوثيق العهدة بنجاح.');
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32">
      {/* البانر الاحترافي العلوي */}
      <div className="bg-slate-950 rounded-[4rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl border-b-8 border-blue-600">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="space-y-6 flex-1">
               <div className="flex items-center gap-6">
                  <div className="bg-blue-600 p-5 rounded-[2.2rem] shadow-2xl shadow-blue-500/20">
                     <Gauge size={40} />
                  </div>
                  <div>
                     <h2 className="text-4xl md:text-6xl font-black tracking-tighter">قائد العمليات الميدانية</h2>
                     <p className="text-blue-400 font-bold text-base tracking-widest uppercase mt-2">Strategic Control Command</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 shrink-0">
               <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] text-center min-w-[160px] shadow-inner">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">الإنجاز الكلي</p>
                  <p className="text-6xl font-black text-white tabular-nums">{stats.progress}%</p>
               </div>
               <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[3rem] text-center min-w-[160px] shadow-inner">
                  <p className="text-[10px] font-black text-red-400 uppercase mb-2">إجمالي الغياب</p>
                  <p className="text-6xl font-black text-red-500 tabular-nums">{stats.absentTotal}</p>
               </div>
            </div>
         </div>
      </div>

      {/* المبدل الرئيسي */}
      <div className="flex justify-center">
         <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border flex gap-2 w-full max-w-4xl overflow-x-auto custom-scrollbar">
            {[
              {id: 'cockpit', label: 'الرؤية الاستراتيجية', icon: MonitorPlay},
              {id: 'emergency-receipt', label: 'استلام استثنائي (طوارئ)', icon: ShieldAlert},
              {id: 'assignments', label: 'إسناد الموظفين', icon: Layers},
              {id: 'comms', label: 'المركز الإعلامي', icon: BellRing},
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[150px] py-4 rounded-[1.8rem] font-black text-xs flex items-center justify-center gap-3 transition-all ${activeTab === tab.id ? (tab.id === 'emergency-receipt' ? 'bg-red-600 text-white shadow-red-200 shadow-xl' : 'bg-slate-900 text-white shadow-xl') : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
         </div>
      </div>

      {/* الرؤية الاستراتيجية */}
      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-slide-up">
           <div className="xl:col-span-2 space-y-8">
              <div className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl">
                 <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><TrendingUp size={28}/></div>
                       <h3 className="text-3xl font-black text-slate-900">مصفوفة اللجان المباشرة</h3>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b)).map(num => {
                       const isConfirmed = deliveryLogs.some(l => l.committee_number === num && l.status === 'CONFIRMED');
                       const isPending = deliveryLogs.some(l => l.committee_number === num && l.status === 'PENDING');
                       
                       return (
                         <div key={num} className={`
                           p-6 rounded-[2rem] border-2 text-center transition-all relative overflow-hidden group
                           ${isConfirmed ? 'bg-emerald-600 border-emerald-500 text-white' : 
                             isPending ? 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-100 animate-bounce' : 
                             'bg-slate-50 border-slate-100 opacity-60'}
                         `}>
                            <span className="text-[9px] font-black uppercase block mb-1 opacity-60">لجنة</span>
                            <span className="text-3xl font-black tabular-nums">{num}</span>
                            {isConfirmed && <CheckCircle size={14} className="absolute top-2 right-2 text-white/50" />}
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>

           <div className="space-y-8">
              <div className="bg-slate-950 p-10 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden">
                 <h3 className="text-2xl font-black mb-10 flex items-center gap-4 relative z-10 text-blue-400">
                    <History /> سجل التوثيق الأخير
                 </h3>
                 <div className="space-y-4">
                   {deliveryLogs.filter(l => l.status === 'CONFIRMED').slice(0, 5).map(log => (
                     <div key={log.id} className="p-5 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
                        <div>
                           <p className="text-xs font-black">لجنة {log.committee_number}</p>
                           <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.teacher_name}</p>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                     </div>
                   ))}
                 </div>
                 <button onClick={() => window.print()} className="w-full mt-10 py-5 bg-blue-600 rounded-2xl font-black text-sm flex items-center justify-center gap-3">
                   <FileSpreadsheet size={18}/> التقرير الختامي
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* تبويب الاستلام الاستثنائي (للطوارئ) */}
      {activeTab === 'emergency-receipt' && (
        <div className="space-y-8 animate-slide-up">
           <div className="bg-red-50 border-4 border-dashed border-red-200 p-10 rounded-[4rem] text-center">
              <div className="bg-red-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl mb-8">
                 <ShieldAlert size={48} />
              </div>
              <h3 className="text-4xl font-black text-red-900 mb-4">مركز الاستلام الاستثنائي (الطوارئ)</h3>
              <p className="text-red-700 font-bold text-lg max-w-2xl mx-auto">تستخدم هذه الشاشة في حال غياب عضو كنترول أو حدوث ظرف طارئ يمنع الاستلام العادي. يمكنك هنا استلام أي لجنة فور إغلاقها من المراقب.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingReceipts.length === 0 ? (
                <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border border-slate-100">
                   <Ghost size={80} className="mx-auto text-slate-200 mb-6" />
                   <p className="text-2xl font-black text-slate-300">لا توجد لجان بانتظار الاستلام حالياً</p>
                </div>
              ) : (
                pendingReceipts.map(log => (
                  <div key={log.id} className="bg-white p-8 rounded-[3.5rem] border-2 border-red-100 shadow-xl hover:shadow-red-200 transition-all flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-6">
                        <div className="bg-slate-950 text-white w-20 h-20 rounded-[1.8rem] flex flex-col items-center justify-center font-black">
                           <span className="text-[8px] opacity-40 mb-1">لجنة</span>
                           <span className="text-3xl">{log.committee_number}</span>
                        </div>
                        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-black text-xs animate-pulse">
                           بانتظار الاستلام
                        </div>
                     </div>
                     <div className="space-y-4 mb-8">
                        <h4 className="text-2xl font-black text-slate-900">{log.grade}</h4>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <UserCheck size={20} className="text-blue-600" />
                           <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase">المراقب المسلم:</p>
                              <p className="text-sm font-black">{log.proctor_name}</p>
                           </div>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleEmergencyReceipt(log)}
                        className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-red-700 shadow-xl transition-all active:scale-95"
                      >
                        <Unlock size={24} /> استلام بصفتي رئيساً
                     </button>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* بقية التبويبات تظل كما هي لتحافظ على الوظيفية */}
      {activeTab === 'assignments' && (
        <div className="bg-white p-12 rounded-[4rem] border shadow-2xl animate-slide-up">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
              <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight">إسناد الصلاحيات الاستراتيجية</h3>
                 <p className="text-slate-400 font-bold mt-2">توزيع أعضاء الكنترول على الصفوف الدراسية</p>
              </div>
              <div className="relative w-80">
                 <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                 <input 
                   type="text" 
                   placeholder="بحث عن موظف..." 
                   className="w-full pr-14 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm outline-none focus:border-blue-600 transition-all shadow-inner"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 gap-8">
              {controlStaff.filter(s => s.full_name.includes(searchTerm)).map(staff => (
                <div key={staff.id} className="p-10 bg-slate-50/50 rounded-[4rem] border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:border-blue-100 group">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                      <div className="flex items-center gap-8">
                         <div className="w-20 h-20 bg-slate-950 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl">
                            {staff.full_name[0]}
                         </div>
                         <div className="text-right">
                            <h4 className="text-2xl font-black text-slate-900">{staff.full_name}</h4>
                            <div className="flex gap-4 items-center mt-2">
                               <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-4 py-1 rounded-full border border-blue-100">{ROLES_ARABIC[staff.role]}</span>
                               <span className="text-[10px] font-bold text-slate-400 tabular-nums">ID: {staff.national_id}</span>
                            </div>
                         </div>
                      </div>
                      <div className="bg-white px-8 py-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الصفوف المسندة:</span>
                         <span className="text-3xl font-black text-blue-600 tabular-nums">{staff.assigned_grades?.length || 0}</span>
                      </div>
                   </div>

                   <div className="flex flex-wrap gap-3">
                      {allGrades.map(grade => {
                        const isAssigned = staff.assigned_grades?.includes(grade);
                        return (
                          <button 
                            key={grade}
                            onClick={() => onUpdateUserGrades(staff.id, isAssigned ? staff.assigned_grades!.filter(g => g !== grade) : [...(staff.assigned_grades || []), grade])}
                            className={`
                              px-8 py-4 rounded-[1.8rem] font-black text-xs transition-all border-2 flex items-center gap-3
                              ${isAssigned ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200 scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-400 hover:text-blue-600'}
                            `}
                          >
                            {isAssigned ? <ShieldCheck size={16} /> : <UserPlus size={16} />}
                            {grade}
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'comms' && (
        <div className="max-w-4xl mx-auto animate-slide-up">
           <div className="bg-white p-12 lg:p-16 rounded-[4rem] shadow-2xl border relative overflow-hidden">
              <div className="relative z-10 space-y-12">
                 <div className="text-center space-y-4">
                    <div className="bg-blue-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl mb-8">
                       <Mail size={48} />
                    </div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">مركز البث والتبليغ الاستراتيجي</h3>
                 </div>

                 <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <label className="text-xs font-black text-slate-500 mr-4 uppercase tracking-[0.3em]">الفئة المستهدفة</label>
                          <div className="grid grid-cols-2 gap-4">
                             {['ALL', 'PROCTOR', 'CONTROL', 'COUNSELOR'].map(role => (
                               <button 
                                 key={role}
                                 onClick={() => setBroadcastTarget(role as any)}
                                 className={`p-5 rounded-2xl font-black text-sm border-2 transition-all ${broadcastTarget === role ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-50 hover:bg-blue-50'}`}
                               >
                                 {role === 'ALL' ? 'الكل' : ROLES_ARABIC[role]}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <textarea 
                         value={broadcastMsg}
                         onChange={e => setBroadcastMsg(e.target.value)}
                         placeholder="اكتب تعليماتك هنا بوضوح..."
                         className="w-full bg-slate-50 border-2 border-slate-50 rounded-[3rem] p-10 font-bold text-xl h-44 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                       ></textarea>
                    </div>

                    <button 
                      onClick={() => { if(broadcastMsg) { onBroadcast(broadcastMsg, broadcastTarget); setBroadcastMsg(''); } }}
                      className="w-full bg-slate-950 text-white py-8 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl hover:bg-blue-600 active:scale-95 transition-all"
                    >
                       <Send size={32} /> بث الإشارة الموحدة
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ControlManager;
