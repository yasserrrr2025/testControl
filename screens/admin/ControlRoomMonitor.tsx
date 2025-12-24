
import React, { useMemo, useEffect, useState } from 'react';
import { 
  Activity, Bell, Users, GraduationCap, AlertTriangle, 
  CheckCircle2, Clock, Map, Zap, ShieldAlert, Timer, 
  ChevronLeft, LayoutGrid, Monitor, Radio, ArrowUpRight,
  PackageCheck, UserX, UserCheck, History, UserCircle,
  FileStack, MessageSquare, ListFilter, CalendarDays
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // وظيفة معالجة التاريخ والوقت الاحترافية لحل مشكلة Invalid Date نهائياً
  const formatLiveTime = (timeStr: string) => {
    if (!timeStr) return "---";
    try {
      // محاولة تحويل النص إلى كائن تاريخ
      let dateObj;
      if (timeStr.includes('T') || timeStr.includes('-')) {
        dateObj = new Date(timeStr);
      } else {
        // إذا كان التنسيق وقت محلي (مثل 04:30:15 م)
        const now = new Date();
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
          period === 'م' && hours < 12 ? hours + 12 : (period === 'ص' && hours === 12 ? 0 : hours), 
          minutes);
      }
      
      if (isNaN(dateObj.getTime())) return timeStr; // العودة للنص الأصلي إذا فشل التحويل

      return dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  const stats = useMemo(() => {
    const totalCommittees = new Set(students.map(s => s.committee_number)).size;
    const activeReqs = requests.filter(r => r.status !== 'DONE').length;
    const totalAbsents = absences.filter(a => a.type === 'ABSENT').length;
    const finishedCommittees = new Set(deliveryLogs.filter(l => l.status === 'CONFIRMED').map(l => l.committee_number)).size;
    
    return {
      totalCommittees,
      activeReqs,
      totalAbsents,
      finishedCommittees,
      progress: Math.round((finishedCommittees / totalCommittees) * 100) || 0
    };
  }, [students, requests, absences, deliveryLogs]);

  const committeeMap = useMemo(() => {
    const committeeNums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a: any, b: any) => Number(a) - Number(b));
    return committeeNums.map(num => {
      const isFinished = deliveryLogs.some(l => l.committee_number === num && l.status === 'CONFIRMED');
      const hasProblem = requests.some(r => r.committee === num && r.status !== 'DONE');
      const isActive = supervisions.some(s => s.committee_number === num);
      
      let status: 'DONE' | 'PROBLEM' | 'ACTIVE' | 'IDLE' = 'IDLE';
      if (isFinished) status = 'DONE';
      else if (hasProblem) status = 'PROBLEM';
      else if (isActive) status = 'ACTIVE';

      return { num, status };
    });
  }, [students, deliveryLogs, requests, supervisions]);

  const urgentRequests = useMemo(() => 
    requests.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').sort((a,b) => b.time.localeCompare(a.time)),
  [requests]);

  const liveFeed = useMemo(() => {
    const logs: { id: string, type: string, text: string, time: string, icon: any, color: string, bg: string }[] = [];
    
    deliveryLogs.slice(-5).forEach(l => {
      logs.push({
        id: `dl-${l.id}`,
        type: 'DELIVERY',
        text: `تم استلام لجنة ${l.committee_number} (${l.grade}) بنجاح من قبل الكنترول.`,
        time: l.time,
        icon: PackageCheck,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10'
      });
    });

    supervisions.slice(-5).forEach(s => {
      const teacher = users.find(u => u.id === s.teacher_id);
      logs.push({
        id: `sv-${s.id}`,
        type: 'JOIN',
        text: `المراقب ${teacher?.full_name || '---'} باشر العمل الآن في اللجنة رقم ${s.committee_number}.`,
        time: s.date,
        icon: UserCheck,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10'
      });
    });

    requests.slice(-10).forEach(r => {
      logs.push({
        id: `req-${r.id}`,
        type: 'REQ',
        text: `بلاغ من لجنة ${r.committee}: ${r.text}`,
        time: r.time,
        icon: MessageSquare,
        color: 'text-red-400',
        bg: 'bg-red-500/10'
      });
    });

    return logs.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 15);
  }, [deliveryLogs, supervisions, requests, users]);

  const latestAbsents = useMemo(() => {
    return absences.filter(a => a.type === 'ABSENT')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map(a => {
        const student = students.find(s => s.national_id === a.student_id);
        return { 
          ...a, 
          seating_number: student?.seating_number, 
          grade: student?.grade,
          section: student?.section,
          shortId: a.student_id.slice(-4)
        };
      });
  }, [absences, students]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white overflow-hidden font-['Tajawal'] z-[100] flex flex-col p-4 md:p-8 dir-rtl text-right">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse">
            <Radio size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">مركز القيادة والسيطرة الرقمي</h1>
            <p className="text-blue-400 font-bold text-sm tracking-widest uppercase mt-1 flex items-center gap-2">
              <Activity size={14} className="animate-spin-slow" /> LIVE OPERATIONS MONITORING SYSTEM
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">نسبة الإنجاز</p>
              <div className="flex items-center gap-4">
                 <div className="w-48 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)] transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div>
                 </div>
                 <span className="text-3xl font-black tabular-nums">{stats.progress}%</span>
              </div>
           </div>
           <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem] text-center min-w-[200px]">
              <div className="text-4xl font-black tabular-nums tracking-tighter text-blue-400">
                {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest">{currentTime.toLocaleDateString('ar-SA', { weekday: 'long' })}</p>
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column (Alerts & Stats) */}
        <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
          {/* Urgent Alerts Hub */}
          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col h-[55%] overflow-hidden shadow-2xl relative">
             <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/10 blur-[80px] rounded-full"></div>
             <div className="flex items-center justify-between mb-6 relative z-10 border-b border-white/5 pb-4">
                <h2 className="text-2xl font-black flex items-center gap-4 text-red-500"><ShieldAlert size={28} /> بلاغات الميدان</h2>
                <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black animate-pulse">{urgentRequests.length} نشط</span>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 relative z-10">
                {urgentRequests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                     <CheckCircle2 size={80} className="opacity-5" />
                     <p className="text-xl font-bold italic opacity-30 uppercase tracking-widest">جميع اللجان مستقرة</p>
                  </div>
                ) : (
                  urgentRequests.map(req => (
                    <div key={req.id} className={`p-6 rounded-[2.5rem] border-2 transition-all ${req.status === 'IN_PROGRESS' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-red-600/10 border-red-500/50 shadow-lg shadow-red-900/20'}`}>
                       <div className="flex justify-between items-start mb-3">
                          <span className="bg-white/10 text-white px-5 py-2 rounded-2xl text-xl font-black">لجنة {req.committee}</span>
                          <span className="text-xs font-mono font-black text-red-400">{formatLiveTime(req.time)}</span>
                       </div>
                       <p className="text-xl font-black leading-snug text-white">{req.text}</p>
                       <div className="mt-4 flex items-center justify-between opacity-50">
                          <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><UserCircle size={14}/> المرسل: {req.from}</p>
                          {req.status === 'IN_PROGRESS' && <span className="text-[10px] font-black text-blue-400 animate-pulse">جاري المباشرة...</span>}
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 h-[45%]">
             {[
               { icon: UserX, color: 'text-red-500', bg: 'bg-red-600/10', val: stats.totalAbsents, label: 'إجمالي الغياب' },
               { icon: PackageCheck, color: 'text-emerald-500', bg: 'bg-emerald-600/10', val: stats.finishedCommittees, label: 'لجان مكتملة' },
               { icon: Users, color: 'text-blue-500', bg: 'bg-blue-600/10', val: supervisions.length, label: 'مراقب ميداني' },
               { icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-600/10', val: students.length, label: 'إجمالي الطلاب' }
             ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 flex flex-col justify-center items-center gap-4 shadow-xl group hover:border-blue-500/50 transition-all">
                   <div className={`p-5 ${s.bg} ${s.color} rounded-[2rem] group-hover:scale-110 transition-transform`}><s.icon size={36} /></div>
                   <div className="text-center">
                      <p className="text-6xl font-black tabular-nums tracking-tighter leading-none mb-2">{s.val}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Right Column (Map + Live Feed) */}
        <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
           {/* Top: Live Committee Grid */}
           <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 flex flex-col h-1/2 overflow-hidden shadow-2xl relative">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 text-blue-500 rounded-2xl"><LayoutGrid size={28} /></div>
                    <h2 className="text-3xl font-black tracking-tight">خريطة اللجان المباشرة</h2>
                 </div>
                 <div className="flex gap-4 items-center bg-black/40 px-8 py-3 rounded-full border border-white/5 text-[10px] font-black shadow-inner">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span>مكتملة</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div><span>بلاغ عاجل</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span>نشطة</span></div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                 <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                    {committeeMap.map(c => (
                      <div key={c.num} className={`
                        aspect-square rounded-[1.8rem] border-2 flex flex-col items-center justify-center transition-all duration-500 group
                        ${c.status === 'DONE' ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 
                          c.status === 'PROBLEM' ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse' : 
                          c.status === 'ACTIVE' ? 'bg-blue-600/20 border-blue-500/50 shadow-inner' : 
                          'bg-white/5 border-white/5 opacity-20'}
                      `}>
                        <span className="text-[8px] font-black opacity-40 uppercase mb-0.5 tracking-widest">لجنة</span>
                        <span className="text-3xl font-black tabular-nums leading-none tracking-tighter">{c.num}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Bottom Grid: Live Feed & Latest Absences */}
           <div className="h-1/2 grid grid-cols-2 gap-6 overflow-hidden">
              {/* Live Operation Feed - NO TRUNCATION */}
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col overflow-hidden shadow-2xl relative">
                 <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-xl font-black flex items-center gap-3 text-blue-400"><History size={24} /> سجل العمليات المباشر</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <Zap size={12} className="text-blue-500 animate-pulse" /> تحديث حي
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {liveFeed.length === 0 ? (
                       <p className="text-center text-slate-600 italic py-10 font-bold">بانتظار بدء العمليات الميدانية...</p>
                    ) : (
                       liveFeed.map(f => (
                          <div key={f.id} className="bg-white/[0.03] border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 group hover:bg-white/[0.07] transition-all">
                             <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-3 ${f.color} font-black text-xs uppercase tracking-tight`}>
                                   <div className={`p-2 rounded-xl ${f.bg}`}><f.icon size={16} /></div>
                                   {f.type === 'REQ' ? 'بلاغ من الميدان' : f.type === 'DELIVERY' ? 'توثيق استلام' : 'التحاق بمقر'}
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 font-bold">{formatLiveTime(f.time)}</span>
                             </div>
                             {/* إظهار النص كاملاً بدون اختصار مع حجم خط مريح */}
                             <p className="text-[15px] font-black text-white leading-relaxed text-right">{f.text}</p>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              {/* Critical Absences List */}
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col overflow-hidden shadow-2xl relative">
                 <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-xl font-black flex items-center gap-3 text-amber-500"><UserX size={24} /> غياب غير مبرر</h3>
                    <div className="bg-amber-600/20 text-amber-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                       أحدث {latestAbsents.length} حالات
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {latestAbsents.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
                          <CheckCircle2 size={48} className="opacity-10" />
                          <p className="text-sm font-black italic opacity-30">لا يوجد غياب مسجل</p>
                       </div>
                    ) : (
                       latestAbsents.map(a => (
                          <div key={a.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-[2.5rem] flex items-center justify-between group hover:border-amber-500/40 transition-all">
                             <div className="flex items-center gap-5">
                                <div className="text-center bg-white/5 w-16 py-3 rounded-[1.5rem] border border-white/10 group-hover:bg-amber-600/20 group-hover:border-amber-500/30 transition-all">
                                   <p className="text-[8px] font-black text-slate-500 leading-none mb-1 uppercase tracking-tighter">اللجنة</p>
                                   <p className="text-2xl font-black leading-none text-white tracking-tighter">{a.committee_number}</p>
                                </div>
                                <div>
                                   <h4 className="text-[16px] font-black text-white leading-tight mb-1">{a.student_name}</h4>
                                   <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                      <span className="flex items-center gap-1"><CalendarDays size={12}/> {a.grade}</span>
                                      <span className="text-blue-400 font-black">جلوس: {a.seating_number || '---'}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="bg-red-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">بانتظار المحضر</span>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.4);
        }
      `}</style>
    </div>
  );
};

export default ControlRoomMonitor;
