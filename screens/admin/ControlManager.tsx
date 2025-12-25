
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
  Radio
} from 'lucide-react';
import { User, DeliveryLog, Student, UserRole, SystemConfig, Absence, Supervision } from '../../types';
import { ROLES_ARABIC } from '../../constants';

interface ControlManagerProps {
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  onBroadcast: (msg: string, target: UserRole | 'ALL') => void;
  onUpdateUserGrades: (userId: string, grades: string[]) => void;
  systemConfig: SystemConfig & { allow_manual_join?: boolean };
  absences: Absence[];
  supervisions: Supervision[];
  setDeliveryLogs: (log: DeliveryLog) => Promise<void>;
  setSystemConfig: (cfg: any) => Promise<void>;
  onRemoveSupervision: (teacherId: string) => Promise<void>;
}

const ControlManager: React.FC<ControlManagerProps> = ({ 
  users, deliveryLogs, students, onBroadcast, onUpdateUserGrades, systemConfig, absences, supervisions, setDeliveryLogs, setSystemConfig, onRemoveSupervision
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'cockpit' | 'assignments' | 'emergency-receipt' | 'comms' | 'proctors-mgmt'>('cockpit');
  const [broadcastTarget, setBroadcastTarget] = useState<UserRole | 'ALL'>('ALL');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const controlStaff = useMemo(() => 
    users.filter(u => u.role === 'CONTROL' || u.role === 'ASSISTANT_CONTROL'), 
    [users]
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

  // اللجان والمراقبين الحاليين
  const proctorStatus = useMemo(() => {
    const comNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    return comNums.map(num => {
      const sv = supervisions.find(s => s.committee_number === num);
      const user = users.find(u => u.id === sv?.teacher_id);
      return { num, proctor: user, svId: sv?.id };
    });
  }, [students, supervisions, users]);

  const toggleManualJoin = async () => {
    await setSystemConfig({ ...systemConfig, allow_manual_join: !systemConfig.allow_manual_join });
  };

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32">
      <div className="bg-slate-950 rounded-[4rem] p-10 text-white relative overflow-hidden shadow-2xl border-b-8 border-blue-600">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full -mr-48 -mt-48"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-6">
               <div className="bg-blue-600 p-5 rounded-3xl shadow-2xl"><Gauge size={40} /></div>
               <div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter">مركز القيادة الاستراتيجي</h2>
                  <p className="text-blue-400 font-bold text-sm tracking-widest uppercase mt-2">Strategic Control Command</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الإنجاز</p>
                  <p className="text-5xl font-black tabular-nums">{stats.progress}%</p>
               </div>
               <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] text-center min-w-[140px]">
                  <p className="text-[10px] font-black text-red-400 uppercase mb-1">الغياب</p>
                  <p className="text-5xl font-black text-red-500 tabular-nums">{stats.absentTotal}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="flex justify-center overflow-x-auto pb-4 custom-scrollbar">
         <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border flex gap-2 w-full max-w-5xl shrink-0">
            {[
              {id: 'cockpit', label: 'الرؤية العامة', icon: MonitorPlay},
              {id: 'proctors-mgmt', label: 'إدارة المراقبين', icon: UserCog},
              {id: 'emergency-receipt', label: 'استلام طوارئ', icon: ShieldAlert},
              {id: 'assignments', label: 'إسناد الصلاحيات', icon: Layers},
              {id: 'comms', label: 'البث الإعلامي', icon: BellRing},
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

      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-slide-up">
           <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
                 <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Radio size={24} className="text-blue-600"/> مصفوفة اللجان الحية</h3>
                 <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                    {proctorStatus.map(com => (
                      <div key={com.num} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${com.proctor ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                         <span className="text-[8px] font-black uppercase opacity-60">لجنة</span>
                         <span className="text-2xl font-black">{com.num}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="bg-slate-950 p-8 rounded-[3.5rem] text-white shadow-xl relative overflow-hidden">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-blue-400"><History /> العمليات الأخيرة</h3>
              <div className="space-y-4">
                 {deliveryLogs.filter(l => l.status === 'CONFIRMED').slice(-5).map(l => (
                   <div key={l.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center text-xs">
                      <span className="font-bold">لجنة {l.committee_number}</span>
                      <span className="text-slate-400">{new Date(l.time).toLocaleTimeString('ar-SA')}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

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
      
      {activeTab === 'emergency-receipt' && <div className="p-10 bg-white rounded-[3rem] border shadow text-center italic text-slate-400">شاشة استلام الطوارئ قيد العمل...</div>}
      {activeTab === 'assignments' && <div className="p-10 bg-white rounded-[3rem] border shadow text-center italic text-slate-400">شاشة إسناد الصلاحيات قيد العمل...</div>}
      {activeTab === 'comms' && <div className="p-10 bg-white rounded-[3rem] border shadow text-center italic text-slate-400">مركز البث الإعلامي قيد العمل...</div>}
    </div>
  );
};

export default ControlManager;
