
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Users, Box, Send, Activity, 
  Settings2, BarChart3, Layers, UserPlus, 
  AlertCircle, CheckCircle2, Clock, Search, 
  Target, Filter, Zap, MessageSquare, Briefcase,
  MonitorPlay, Fingerprint, Award, TrendingUp,
  Mail, BellRing, UserCheck, ShieldAlert, Info
} from 'lucide-react';
import { User, DeliveryLog, Student, UserRole } from '../../types';
import { ROLES_ARABIC } from '../../constants';

interface ControlManagerProps {
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  onBroadcast: (msg: string, target: UserRole | 'ALL') => void;
  onUpdateUserGrades: (userId: string, grades: string[]) => void;
}

const ControlManager: React.FC<ControlManagerProps> = ({ 
  users, deliveryLogs, students, onBroadcast, onUpdateUserGrades 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'cockpit' | 'assignments' | 'comms'>('cockpit');
  const [broadcastTarget, setBroadcastTarget] = useState<UserRole | 'ALL'>('ALL');
  const [broadcastMsg, setBroadcastMsg] = useState('');

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
    const pending = deliveryLogs.filter(l => l.status === 'PENDING').length;
    return {
      total: totalComs,
      confirmed,
      pending,
      progress: (confirmed / totalComs) * 100 || 0
    };
  }, [students, deliveryLogs]);

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32">
      {/* Top Banner - Executive Identity */}
      <div className="bg-slate-900 rounded-[4rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl border-b-8 border-blue-600">
         <div className="absolute inset-0 opacity-5">
            <div className="h-full w-full" style={{backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '40px 40px'}}></div>
         </div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="space-y-6 flex-1">
               <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
                     <Fingerprint size={32} />
                  </div>
                  <div>
                     <h2 className="text-4xl md:text-5xl font-black tracking-tighter">مركز قيادة الكنترول</h2>
                     <p className="text-blue-400 font-bold text-sm tracking-widest uppercase mt-1">Control Operations Command Center</p>
                  </div>
               </div>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                     <Activity size={18} className="text-emerald-400 animate-pulse"/>
                     <span className="text-xs font-bold">الحالة: نشط</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                     <Users size={18} className="text-blue-400"/>
                     <span className="text-xs font-bold">{controlStaff.length} موظفاً تحت قيادتك</span>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 shrink-0">
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[150px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">لجان مكتملة</p>
                  <p className="text-5xl font-black text-blue-500 tabular-nums">{stats.confirmed}</p>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center min-w-[150px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">قيد التدقيق</p>
                  <p className="text-5xl font-black text-amber-500 tabular-nums">{stats.pending}</p>
               </div>
            </div>
         </div>
      </div>

      {/* Navigation Switcher */}
      <div className="flex justify-center">
         <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border flex gap-2">
            {[
              {id: 'cockpit', label: 'الرؤية الشاملة', icon: MonitorPlay},
              {id: 'assignments', label: 'إدارة الإسناد', icon: Layers},
              {id: 'comms', label: 'مركز المراسلة', icon: BellRing},
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-8 py-4 rounded-full font-black text-sm flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* Cockpit Content */}
      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-slide-up">
           <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4"><TrendingUp className="text-blue-600"/> مراقبة التدفق اللحظي</h3>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">منتهية</span></div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div><span className="text-[10px] font-bold text-slate-500 uppercase">بانتظار العضو</span></div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b)).map(num => {
                       const isConfirmed = deliveryLogs.some(l => l.committee_number === num && l.status === 'CONFIRMED');
                       const isPending = deliveryLogs.some(l => l.committee_number === num && l.status === 'PENDING');
                       return (
                         <div key={num} className={`
                           p-5 rounded-2xl border-2 text-center transition-all cursor-help
                           ${isConfirmed ? 'bg-emerald-50 border-emerald-200' : 
                             isPending ? 'bg-amber-50 border-amber-300 shadow-lg shadow-amber-100 animate-pulse' : 
                             'bg-white border-slate-50 opacity-40'}
                         `}>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">لجنة</span>
                            <span className={`text-2xl font-black ${isConfirmed ? 'text-emerald-700' : isPending ? 'text-amber-700' : 'text-slate-300'}`}>{num}</span>
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
                 <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3"><Award className="text-blue-600" /> كادر العمل النشط</h3>
                 <div className="space-y-4">
                    {controlStaff.map(staff => (
                      <div key={staff.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4 group hover:bg-white hover:shadow-xl transition-all">
                         <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                           {staff.full_name[0]}
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-black text-slate-800">{staff.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{ROLES_ARABIC[staff.role]}</p>
                         </div>
                         <div className={`w-3 h-3 rounded-full bg-emerald-500 ${staff.assigned_grades?.length ? 'animate-pulse' : 'grayscale'}`}></div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Assignments Content */}
      {activeTab === 'assignments' && (
        <div className="bg-white p-12 rounded-[4rem] border shadow-2xl animate-slide-up">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
              <div>
                 <h3 className="text-3xl font-black text-slate-900">مصفوفة الإسناد الإستراتيجية</h3>
                 <p className="text-slate-400 font-bold mt-1">توزيع الصلاحيات وضمان تغطية كافة الصفوف الدراسية</p>
              </div>
              <div className="relative w-80">
                 <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                 <input 
                   type="text" 
                   placeholder="بحث عن موظف..." 
                   className="w-full pr-14 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm outline-none focus:border-blue-600 transition-all"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 gap-8">
              {controlStaff.filter(s => s.full_name.includes(searchTerm)).map(staff => (
                <div key={staff.id} className="p-8 bg-slate-50/50 rounded-[3rem] border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:border-blue-100 group">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl">
                            {staff.full_name[0]}
                         </div>
                         <div>
                            <h4 className="text-2xl font-black text-slate-900">{staff.full_name}</h4>
                            <div className="flex gap-3 items-center mt-1">
                               <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{ROLES_ARABIC[staff.role]}</span>
                               <span className="text-[10px] font-bold text-slate-400">{staff.national_id}</span>
                            </div>
                         </div>
                      </div>
                      <div className="bg-white px-8 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase">الصفوف المسندة:</span>
                         <span className="text-2xl font-black text-slate-900 tabular-nums">{staff.assigned_grades?.length || 0}</span>
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
                              px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all border-2 flex items-center gap-3
                              ${isAssigned ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-400 hover:text-blue-600'}
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

      {/* Communications Content */}
      {activeTab === 'comms' && (
        <div className="max-w-4xl mx-auto animate-slide-up">
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full"></div>
              
              <div className="relative z-10 space-y-10">
                 <div className="text-center space-y-2">
                    <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl mb-6">
                       <Mail size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">مركز المراسلة والتبليغ</h3>
                    <p className="text-slate-400 font-bold">إرسال تعليمات فورية لمجموعات محددة من الكادر التعليمي</p>
                 </div>

                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 mr-4 uppercase tracking-widest">تحديد الفئة المستهدفة</label>
                          <div className="grid grid-cols-2 gap-3">
                             {[
                               {id: 'ALL', label: 'الكل'},
                               {id: 'PROCTOR', label: 'المراقبين'},
                               {id: 'CONTROL', label: 'الكنترول'},
                               {id: 'COUNSELOR', label: 'الموجهين'}
                             ].map(role => (
                               <button 
                                 key={role.id}
                                 onClick={() => setBroadcastTarget(role.id as any)}
                                 className={`p-4 rounded-2xl font-black text-xs border-2 transition-all ${broadcastTarget === role.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-50 hover:bg-blue-50'}`}
                               >
                                 {role.label}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 mr-4 uppercase tracking-widest">نوع التنبيه</label>
                          <div className="flex gap-3">
                             <button className="flex-1 p-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs border border-red-100 flex flex-col items-center gap-2">
                                <ShieldAlert size={20}/> عاجل
                             </button>
                             <button className="flex-1 p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs border border-emerald-100 flex flex-col items-center gap-2">
                                <CheckCircle2 size={20}/> تحديث
                             </button>
                             <button className="flex-1 p-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs border border-blue-100 flex flex-col items-center gap-2">
                                <Info size={20}/> تنظيمي
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-xs font-black text-slate-500 mr-4 uppercase tracking-widest">نص الرسالة</label>
                       <textarea 
                         value={broadcastMsg}
                         onChange={e => setBroadcastMsg(e.target.value)}
                         placeholder="اكتب تعليماتك الاستراتيجية هنا..."
                         className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] p-8 font-bold text-lg h-44 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300 resize-none shadow-inner"
                       ></textarea>
                    </div>

                    <button 
                      onClick={() => { if(broadcastMsg) { onBroadcast(broadcastMsg, broadcastTarget); setBroadcastMsg(''); } }}
                      className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl hover:bg-blue-600 active:scale-95 transition-all"
                    >
                       <Send size={28} /> بث الإشارة الآن
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
