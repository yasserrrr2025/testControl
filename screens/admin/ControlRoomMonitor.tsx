
import React, { useMemo, useEffect, useState } from 'react';
import { 
  Activity, Monitor, ShieldAlert, Timer, 
  LayoutGrid, PackageCheck, UserX, UserCheck, 
  History, UserCircle, TriangleAlert, Info,
  Clock, CheckCircle2, Radio, Bell, Signal,
  MapPin, Users, Zap, X, AlertCircle, ChevronDown,
  ArrowDownToLine, Flame
} from 'lucide-react';
import { Supervision, Absence, DeliveryLog, User, Student, ControlRequest } from '../../types';

interface Props {
  absences: Absence[];
  supervisions: Supervision[];
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  requests: ControlRequest[];
}

const ControlRoomMonitor: React.FC<Props> = ({ absences, supervisions, users, deliveryLogs, students, requests }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const activeDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const totalComs = new Set(students.map(s => s.committee_number)).size;
    const completed = new Set(deliveryLogs.filter(l => l.status === 'CONFIRMED').map(l => l.committee_number)).size;
    const absents = absences.filter(a => a.type === 'ABSENT').length;
    const lates = absences.filter(a => a.type === 'LATE').length;
    const activeReqs = requests.filter(r => r.status !== 'DONE').length;
    
    return {
      totalComs,
      completed,
      absents,
      lates,
      activeReqs,
      progress: Math.round((completed / totalComs) * 100) || 0
    };
  }, [students, deliveryLogs, absences, requests]);

  const committeeGrid = useMemo(() => {
    const comNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a: any, b: any) => Number(a) - Number(b));
    return comNums.map(num => {
      const isDone = deliveryLogs.some(l => l.committee_number === num && l.status === 'CONFIRMED');
      const hasAlert = requests.some(r => r.committee === num && r.status === 'PENDING');
      const inProgress = requests.some(r => r.committee === num && r.status === 'IN_PROGRESS');
      const isOccupied = supervisions.some(s => s.committee_number === num);

      return { num, isDone, hasAlert, inProgress, isOccupied };
    });
  }, [students, deliveryLogs, requests, supervisions]);

  // فرز البلاغات بحيث يظهر الأحدث في الأعلى دائماً
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [requests]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white overflow-hidden font-['Tajawal'] z-[100] flex flex-col p-4 dir-rtl text-right">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center h-20 mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 h-full shadow-2xl backdrop-blur-md">
          <div className="text-4xl font-black tabular-nums tracking-widest text-blue-400 flex items-center gap-4">
            <span className="text-xs text-slate-500 font-bold mt-2">ص</span>
            {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/[صم]/, '')}
            <Clock size={20} className="text-blue-500/40" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-1">
           <div className="flex items-center gap-6">
              <span className="text-4xl font-black text-white">{stats.progress}%</span>
              <div className="w-80 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                 <div className="absolute top-0 right-0 h-full bg-gradient-to-l from-blue-600 via-blue-400 to-indigo-500 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${stats.progress}%` }}></div>
              </div>
           </div>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mr-14">معدل الإنجاز الميداني</p>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <span className="bg-emerald-400/10 text-emerald-400 px-5 py-2 rounded-full border border-emerald-400/20 text-[10px] font-black flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> البث المباشر نشط
              </span>
              <p className="text-slate-500 font-bold text-[10px] mt-2 mr-2">اليوم: {activeDate}</p>
           </div>
           <div className="w-14 h-14 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] border border-blue-400/30">
              <Monitor size={28} />
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* --- MAIN CENTER --- */}
        <div className="col-span-9 flex flex-col gap-6 overflow-hidden">
          
          {/* Top: Committee Map */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-8 flex flex-col h-[55%] shadow-inner relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full"></div>
            <div className="flex items-center justify-between mb-8 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="bg-blue-600/10 p-4 rounded-[1.5rem] text-blue-400 shadow-inner"><LayoutGrid size={28} /></div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">خريطة اللجان الحية</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase mt-1">تزامن لحظي مع الميدان</p>
                  </div>
               </div>
               <div className="flex gap-6 items-center bg-black/40 px-8 py-3 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span>مكتملة</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div><span>بلاغ طارئ</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span>تحت الرقابة</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10 opacity-30"></div><span>شاغرة</span></div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
               <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                  {committeeGrid.map(c => (
                    <div key={c.num} className={`
                      aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all duration-700 relative
                      ${c.isDone ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                        c.hasAlert ? 'bg-red-600 border-red-400 shadow-[0_0_40px_rgba(220,38,38,0.5)] animate-pulse scale-110 z-20' : 
                        c.inProgress ? 'bg-blue-600/40 border-blue-400 shadow-inner' :
                        c.isOccupied ? 'bg-blue-600/20 border-blue-500/30' : 
                        'bg-white/5 border-white/5 opacity-10'}
                    `}>
                      <span className="text-[8px] font-black opacity-40 uppercase mb-0.5 tracking-tighter">لجنة</span>
                      <span className="text-3xl font-black tabular-nums tracking-tighter leading-none">{c.num}</span>
                      {c.isOccupied && !c.isDone && <div className="absolute bottom-3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>}
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Bottom: Field Cases (The Area You Pointed To) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[3.5rem] p-10 flex flex-col h-[45%] shadow-2xl relative overflow-hidden border-b-[8px] border-blue-600">
             <div className="absolute top-0 right-0 w-48 h-1 bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,1)]"></div>
             
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl"><Users size={28} /></div>
                   <div>
                      <h3 className="text-2xl font-black text-white">بيانات غياب وتأخر اللجان</h3>
                      <p className="text-slate-500 text-[10px] font-black uppercase mt-1">تفاصيل الحالات المسجلة ميدانياً</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="bg-red-600/10 text-red-500 px-6 py-2 rounded-xl border border-red-600/20 text-xs font-black flex items-center gap-3">
                      <UserX size={16}/> غياب: {stats.absents}
                   </div>
                   <div className="bg-amber-600/10 text-amber-500 px-6 py-2 rounded-xl border border-amber-600/20 text-xs font-black flex items-center gap-3">
                      <Timer size={16}/> تأخر: {stats.lates}
                   </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                   <thead className="sticky top-0 bg-[#020617] text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                      <tr>
                        <th className="py-4 px-6">بيانات الطالب</th>
                        <th className="py-4 px-6">الموقع / اللجنة</th>
                        <th className="py-4 px-6">الصف الدراسي</th>
                        <th className="py-4 px-6">نوع الحالة</th>
                        <th className="py-4 px-6 text-left">التوقيت</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {absences.length === 0 ? (
                        <tr><td colSpan={5} className="py-16 text-center text-slate-700 font-black italic text-xl opacity-20 tracking-widest">الميدان الميداني مستقر تماماً</td></tr>
                      ) : (
                        absences.sort((a,b) => b.date.localeCompare(a.date)).map(a => {
                          const student = students.find(s => s.national_id === a.student_id);
                          return (
                            <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="py-5 px-6">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-3 h-3 rounded-full shadow-lg ${a.type === 'ABSENT' ? 'bg-red-500 shadow-red-500/30' : 'bg-amber-500 shadow-amber-500/30'}`}></div>
                                     <span className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">{a.student_name}</span>
                                  </div>
                               </td>
                               <td className="py-5 px-6">
                                  <div className="flex items-center gap-2">
                                     <MapPin size={14} className="text-slate-600" />
                                     <span className="font-black text-slate-300">لجنة {a.committee_number}</span>
                                  </div>
                               </td>
                               <td className="py-5 px-6">
                                  <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400">{student?.grade || '---'}</span>
                                </td>
                               <td className="py-5 px-6">
                                  <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter ${a.type === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`}>
                                     {a.type === 'ABSENT' ? 'غائب اليوم' : 'تأخر عن الوقت'}
                                  </span>
                                </td>
                               <td className="py-5 px-6 text-left">
                                  <div className="flex flex-col items-end">
                                     <span className="text-lg font-black text-blue-400 font-mono">{new Date(a.date).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                                     <span className="text-[8px] text-slate-600 font-bold uppercase mt-1">توقيت الرصد</span>
                                  </div>
                               </td>
                            </tr>
                          );
                        })
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR --- */}
        <div className="col-span-3 flex flex-col gap-6 overflow-hidden">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4">
             {[
               { icon: Users, color: 'text-blue-500', bg: 'bg-blue-600/10', val: stats.totalComs, label: 'إجمالي لجان اليوم' },
               { icon: PackageCheck, color: 'text-emerald-500', bg: 'bg-emerald-600/10', val: stats.completed, label: 'لجان تم استلامها' },
               { icon: Timer, color: 'text-amber-500', bg: 'bg-amber-600/10', val: stats.lates, label: 'حالات تأخر' },
               { icon: UserX, color: 'text-red-500', bg: 'bg-red-600/10', val: stats.absents, label: 'حالات غياب' }
             ].map((s, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between group transition-all hover:bg-white/[0.06] hover:scale-[1.02] shadow-xl">
                   <div className="text-right">
                      <p className="text-5xl font-black tabular-nums leading-none tracking-tighter mb-2">{s.val}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{s.label}</p>
                   </div>
                   <div className={`p-5 ${s.bg} ${s.color} rounded-[1.8rem] shadow-inner group-hover:scale-110 transition-transform`}><s.icon size={32} /></div>
                </div>
             ))}
          </div>

          {/* Sequential Operations Reports (Balaaghat) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[3.5rem] p-8 flex flex-col flex-1 overflow-hidden relative shadow-2xl">
             <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full"></div>
             
             <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                   <ShieldAlert size={24} className="text-red-500 animate-pulse" />
                   <h2 className="text-xl font-black text-white">بلاغات العمليات</h2>
                </div>
                <div className="flex items-center gap-3 bg-red-600/10 px-4 py-1.5 rounded-full border border-red-600/20">
                   <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                   <span className="text-[10px] font-black text-red-500 uppercase tabular-nums tracking-widest">{stats.activeReqs} طلب نشط</span>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 relative z-10">
                {sortedRequests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 gap-4">
                     <div className="p-8 bg-slate-800/10 rounded-full border-2 border-dashed border-slate-800"><CheckCircle2 size={80} /></div>
                     <p className="text-xl font-black italic tracking-widest">لا يوجد طلبات حالياً</p>
                  </div>
                ) : (
                  sortedRequests.map((req, idx) => {
                    // التحقق إذا كان البلاغ جديداً (أقل من دقيقتين)
                    const isNew = (new Date().getTime() - new Date(req.time).getTime()) < 120000;
                    
                    return (
                      <div key={req.id} className={`
                        p-6 rounded-[2.5rem] border-2 transition-all duration-1000 animate-slide-in relative group overflow-hidden
                        ${req.status === 'IN_PROGRESS' ? 'bg-blue-600/10 border-blue-500/30' : 'bg-red-600/5 border-red-600/30'}
                        ${isNew && req.status === 'PENDING' ? 'shadow-[0_0_30px_rgba(220,38,38,0.2)] animate-pulse border-red-500' : 'shadow-none'}
                      `}>
                         {/* مؤشر الأولوية */}
                         {idx === 0 && <div className="absolute top-0 left-0 bg-red-600 text-[8px] font-black text-white px-4 py-1 rounded-br-2xl shadow-lg flex items-center gap-2 uppercase tracking-widest"><Flame size={10} /> أحدث بلاغ</div>}
                         
                         <div className="flex justify-between items-start mb-4 pt-2">
                            <div className="flex items-center gap-4">
                               <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg ${req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                                  <span className="text-[7px] opacity-60 leading-none">لجنة</span>
                                  <span className="text-2xl leading-none">{req.committee}</span>
                               </div>
                               <div>
                                  <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors leading-tight mb-1">{req.from}</p>
                                  <p className="text-[9px] font-mono text-slate-500">{new Date(req.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="p-5 bg-black/40 rounded-[1.8rem] border border-white/5 shadow-inner">
                            <p className="text-base font-black text-white leading-relaxed">{req.text}</p>
                         </div>
                         
                         <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${req.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-red-600'}`}></div>
                               <span className={`text-[10px] font-black uppercase ${req.status === 'IN_PROGRESS' ? 'text-blue-400' : 'text-red-500'}`}>
                                  {req.status === 'IN_PROGRESS' ? 'قيد المباشرة' : 'في الانتظار'}
                               </span>
                            </div>
                            <ArrowDownToLine size={16} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.2); }
        
        @keyframes slide-in {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 3s linear infinite; }
      `}</style>
    </div>
  );
};

export default ControlRoomMonitor;
