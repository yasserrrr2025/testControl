
import React, { useMemo, useState, useEffect } from 'react';
import { 
  ShieldCheck, Activity, Bell, Zap, Users, 
  MonitorPlay, Radio, Megaphone, Send, Timer,
  AlertCircle, CheckCircle2, ShieldAlert,
  Signal, UserCheck, UserX, Clock, ArrowRight,
  TrendingUp, Gauge, LayoutGrid, HeartPulse,
  Server, MessageSquare, Briefcase, RefreshCw
} from 'lucide-react';
import { User, Student, Absence, DeliveryLog, ControlRequest, Supervision, SystemConfig } from '../../types';
import { ROLES_ARABIC } from '../../constants';

interface Props {
  users: User[];
  students: Student[];
  absences: Absence[];
  deliveryLogs: DeliveryLog[];
  requests: ControlRequest[];
  supervisions: Supervision[];
  systemConfig: SystemConfig;
  onBroadcast: (msg: string, target: any) => void;
}

const ControlHeadDashboard: React.FC<Props> = ({ 
  users, students, absences, deliveryLogs, requests, supervisions, systemConfig, onBroadcast 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickMsg, setQuickMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const totalAbsents = absences.filter(a => a.type === 'ABSENT').length;
    const attendanceRate = totalStudents > 0 ? Math.round(((totalStudents - totalAbsents) / totalStudents) * 100) : 0;
    
    const committeeNums = new Set(students.map(s => s.committee_number));
    const activeComs = supervisions.length;
    const readiness = committeeNums.size > 0 ? Math.round((activeComs / committeeNums.size) * 100) : 0;

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const urgentRequests = requests.filter(r => r.status === 'PENDING' && r.text.includes('صحية') || r.text.includes('نقص'));

    return {
      attendanceRate,
      readiness,
      pendingCount: pendingRequests.length,
      urgentCount: urgentRequests.length,
      totalComs: committeeNums.size,
      activeProctors: users.filter(u => u.role === 'PROCTOR' && supervisions.some(s => s.teacher_id === u.id)).length,
      idleProctors: users.filter(u => u.role === 'PROCTOR' && !supervisions.some(s => s.teacher_id === u.id)).length
    };
  }, [students, absences, supervisions, requests, users]);

  return (
    <div className="space-y-8 animate-fade-in text-right pb-32">
      {/* Header / System Pulse */}
      <div className="bg-[#020617] rounded-[4rem] p-10 md:p-14 text-white relative overflow-hidden border-b-[12px] border-blue-600 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -mr-64 -mt-64"></div>
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-8">
            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(37,99,235,0.4)] animate-pulse">
               <ShieldCheck size={56} />
            </div>
            <div>
               <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">غرفة العمليات المركزية</h1>
               <div className="flex items-center gap-4 mt-4">
                  <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-black flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> الاتصال بقاعدة البيانات مستقر
                  </span>
                  <span className="text-slate-500 font-bold text-xs flex items-center gap-2 tracking-widest uppercase">
                     <Server size={14}/> System ID: CTR-2025-V5
                  </span>
               </div>
            </div>
          </div>

          <div className="flex gap-8 items-center bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-xl">
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">توقيت الكنترول</p>
                <p className="text-5xl font-black tabular-nums text-blue-400 font-mono tracking-tighter">
                   {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/[صم]/, '')}
                </p>
             </div>
             <div className="w-[2px] h-16 bg-white/10"></div>
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">معدل الإنجاز</p>
                <div className="flex items-center gap-3">
                   <p className="text-5xl font-black tabular-nums text-white">{metrics.readiness}%</p>
                   <TrendingUp className="text-emerald-500" size={32} />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'جاهزية اللجان', val: metrics.readiness + '%', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-50' },
           { label: 'حضور الطلاب', val: metrics.attendanceRate + '%', icon: HeartPulse, color: 'text-emerald-500', bg: 'bg-emerald-50' },
           { label: 'المراقبين المباشرين', val: metrics.activeProctors, icon: UserCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
           { label: 'البلاغات العاجلة', val: metrics.urgentCount, icon: Zap, color: 'text-red-500', bg: 'bg-red-50', animate: metrics.urgentCount > 0 }
         ].map((m, i) => (
           <div key={i} className={`bg-white p-8 rounded-[3rem] shadow-xl border-2 border-slate-50 flex items-center justify-between group transition-all hover:scale-105 ${m.animate ? 'ring-4 ring-red-100' : ''}`}>
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                 <p className={`text-4xl font-black ${m.color} tabular-nums`}>{m.val}</p>
              </div>
              <div className={`p-5 ${m.bg} ${m.color} rounded-[1.8rem] shadow-inner ${m.animate ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`}>
                 <m.icon size={32} />
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
         {/* Live Alert Radar */}
         <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col h-[700px] border-b-8 border-red-600">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl"></div>
               <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                  <h3 className="text-2xl font-black flex items-center gap-4 text-red-500">
                     <Signal className="animate-pulse" /> رادار البلاغات الميدانية
                  </h3>
                  <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{requests.filter(r => r.status !== 'DONE').length} بلاغ نشط</span>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {requests.filter(r => r.status !== 'DONE').length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700 space-y-4 opacity-30">
                       <CheckCircle2 size={80} />
                       <p className="font-black text-xl italic text-center">لا توجد تهديدات ميدانية أو بلاغات عاجلة حالياً</p>
                    </div>
                  ) : (
                    requests.filter(r => r.status !== 'DONE').sort((a,b) => b.time.localeCompare(a.time)).map(req => (
                      <div key={req.id} className={`p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group ${req.status === 'PENDING' ? 'bg-red-600/10 border-red-500/30' : 'bg-blue-600/10 border-blue-500/30 opacity-70'}`}>
                         {req.status === 'PENDING' && <div className="absolute top-0 left-0 w-1 h-full bg-red-600 animate-pulse"></div>}
                         <div className="flex justify-between items-start mb-3">
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-xs">لجنة {req.committee}</span>
                            <span className="text-[10px] font-mono text-slate-500">{new Date(req.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                         </div>
                         <p className="text-lg font-black text-white leading-tight mb-3">{req.text}</p>
                         <div className="flex items-center justify-between mt-4">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{req.from}</span>
                            {req.status === 'IN_PROGRESS' && <span className="flex items-center gap-2 text-blue-400 text-[10px] font-black italic"><Timer size={12} className="animate-spin" /> قيد المباشرة</span>}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {/* Overall System Health Status */}
            <div className="bg-white rounded-[3rem] p-8 shadow-xl border-2 border-slate-50 flex flex-col gap-6">
               <h4 className="text-xl font-black text-slate-800 flex items-center gap-3"><RefreshCw size={24} className="text-emerald-500" /> تكامل الدورة الامتحانية</h4>
               <div className="space-y-3">
                  {[
                    { label: 'رصد الغياب الفوري', status: absences.length > 0 ? 'ACTIVE' : 'IDLE', detail: 'رصد نشط لليوم' },
                    { label: 'قنوات البث المباشر', status: 'ACTIVE', detail: 'جميع القنوات مستقرة' },
                    { label: 'تزامن السحابة', status: 'ACTIVE', detail: 'مزامنة Supabase لحظية' }
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="font-bold text-sm text-slate-700">{s.label}</span>
                       <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-slate-400 italic">{s.detail}</span>
                          <div className={`w-3 h-3 rounded-full ${s.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Center: Live Ops Monitor */}
         <div className="xl:col-span-8 space-y-8">
            <div className="bg-white rounded-[4rem] p-10 shadow-2xl border-2 border-slate-50 min-h-[500px] flex flex-col">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl"><MonitorPlay size={28}/></div>
                     <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">مراقب اللجان والانتشار الميداني</h3>
                        <p className="text-slate-400 font-bold italic text-sm mt-1">تتبع حالة التكليف المباشر والمنجز</p>
                     </div>
                  </div>
                  <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl shrink-0">
                     <div className="bg-white px-6 py-2 rounded-xl text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase">إجمالي اللجان</p>
                        <p className="text-xl font-black text-slate-900">{metrics.totalComs}</p>
                     </div>
                     <div className="bg-white px-6 py-2 rounded-xl text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase">مراقب متاح</p>
                        <p className="text-xl font-black text-emerald-600">{metrics.idleProctors}</p>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                  {Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a,b)=>Number(a)-Number(b)).map(num => {
                    const isOccupied = supervisions.some(s => s.committee_number === num);
                    const isFinished = deliveryLogs.some(l => l.committee_number === num && l.status === 'CONFIRMED');
                    const hasPendingReq = requests.some(r => r.committee === num && r.status === 'PENDING');
                    const proctor = users.find(u => u.id === supervisions.find(s => s.committee_number === num)?.teacher_id);

                    return (
                      <div key={num} className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500 relative group cursor-help ${isFinished ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl' : hasPendingReq ? 'bg-red-600 border-red-400 text-white shadow-2xl animate-pulse scale-110 z-10' : isOccupied ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105' : 'bg-slate-50 border-slate-100 opacity-30'}`}>
                         <span className="text-[8px] font-black uppercase opacity-60">لجنة</span>
                         <span className="text-2xl font-black tabular-nums">{num}</span>
                         {/* Tooltip on Hover */}
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white p-3 rounded-xl text-[10px] font-black text-center hidden group-hover:block z-[100] shadow-2xl border border-white/10 animate-fade-in">
                            {isOccupied ? <>المراقب: {proctor?.full_name}</> : 'شاغرة - بانتظار المباشرة'}
                            {isFinished && <div className="mt-1 text-emerald-400">✓ تم الاستلام النهائي</div>}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 rotate-45"></div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Unified Broadcast Hub */}
            <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[15px] border-blue-600">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full"></div>
               <div className="relative z-10 space-y-10">
                  <div className="flex items-center gap-6">
                     <div className="bg-blue-600 p-5 rounded-[2rem] shadow-2xl group-hover:rotate-6 transition-transform"><Megaphone size={40} /></div>
                     <div>
                        <h3 className="text-4xl font-black tracking-tight">مركز التوجيه والتعميم الفوري</h3>
                        <p className="text-slate-500 font-bold text-base mt-1 uppercase tracking-widest">Global Broadcast Command</p>
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-stretch">
                     <div className="flex-1 relative">
                        <MessageSquare className="absolute right-6 top-6 text-slate-600" size={24} />
                        <textarea 
                           value={quickMsg}
                           onChange={e => setQuickMsg(e.target.value)}
                           placeholder="اكتب التوجيه العاجل لجميع المراقبين..."
                           className="w-full bg-white/5 border-2 border-white/10 rounded-[2.5rem] p-10 pr-16 font-bold text-xl h-48 outline-none focus:border-blue-600 focus:bg-white/10 transition-all text-right shadow-inner resize-none"
                        />
                     </div>
                     <button 
                        onClick={() => {
                           if(quickMsg.trim()) {
                              onBroadcast(quickMsg, 'ALL');
                              setQuickMsg('');
                              alert('تم بث التعليمات لجميع الأطراف بنجاح');
                           }
                        }}
                        disabled={!quickMsg.trim()}
                        className="bg-blue-600 text-white px-14 py-8 rounded-[2.5rem] font-black text-2xl flex flex-col items-center justify-center gap-4 shadow-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                     >
                        <Send size={48}/>
                        بث الآن
                     </button>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full mb-2">تعليمات سريعة جاهزة:</p>
                     {['متبقي 10 دقائق على النهاية', 'يرجى التأكد من توقيع كشوف الغياب', 'بدء سحب المظاريف الآن', 'تنبيه: التوجه لغرفة الكنترول'].map((msg, i) => (
                       <button key={i} onClick={() => setQuickMsg(msg)} className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl text-[10px] font-black hover:bg-white/10 transition-all">
                          {msg}
                       </button>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ControlHeadDashboard;
