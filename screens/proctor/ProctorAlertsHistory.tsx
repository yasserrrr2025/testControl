
import React, { useMemo } from 'react';
import { ControlRequest } from '../../types';
import { History, Clock, MessageSquare, CheckCircle2, Timer, UserCheck, Search, Ghost } from 'lucide-react';

interface Props {
  requests: ControlRequest[];
  userFullName: string;
}

const ProctorAlertsHistory: React.FC<Props> = ({ requests, userFullName }) => {
  const myHistory = useMemo(() => 
    requests.filter(r => r.from === userFullName)
      .sort((a, b) => b.time.localeCompare(a.time)),
  [requests, userFullName]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-10 animate-fade-in text-right">
      <div className="bg-slate-950 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-blue-600">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
         <div className="relative z-10 flex items-center gap-8">
            <div className="bg-blue-600 p-5 rounded-3xl shadow-2xl ring-4 ring-blue-500/20"><History size={40} /></div>
            <div>
               <h2 className="text-4xl font-black tracking-tighter">أرشيف البلاغات الميدانية</h2>
               <p className="text-slate-400 font-bold text-sm italic mt-1 uppercase tracking-widest">تتبع سجل طلباتك والمباشرات السابقة</p>
            </div>
         </div>
      </div>

      <div className="space-y-6">
        {myHistory.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-8 shadow-inner">
             <Ghost size={80} className="text-slate-200" />
             <p className="text-2xl font-black text-slate-300 italic">لا توجد بلاغات مسجلة في أرشيفك</p>
          </div>
        ) : (
          myHistory.map((req) => (
            <div key={req.id} className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-slate-50 hover:border-blue-100 transition-all group relative overflow-hidden">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                     <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg shrink-0 ${
                       req.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 
                       req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                     }`}>
                        {req.status === 'DONE' ? <CheckCircle2 size={32} /> : 
                         req.status === 'IN_PROGRESS' ? <Timer size={32} className="animate-spin-slow" /> : <Clock size={32} />}
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <span className="bg-slate-900 text-white px-3 py-0.5 rounded-lg font-black text-[10px] tabular-nums">لجنة {req.committee}</span>
                           <span className={`px-3 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-widest ${
                             req.status === 'DONE' ? 'bg-emerald-600 text-white' : 
                             req.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                           }`}>
                             {req.status === 'DONE' ? 'مكتمل' : req.status === 'IN_PROGRESS' ? 'قيد المباشرة' : 'في الانتظار'}
                           </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{req.text}</h4>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-8 w-full md:w-auto shrink-0">
                     <div className="flex items-center gap-2 text-slate-400 font-black text-xs font-mono">
                        <Clock size={14}/> {new Date(req.time).toLocaleString('ar-SA', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}
                     </div>
                     {req.assistant_name && (
                       <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1 rounded-full border border-blue-100">
                          <UserCheck size={14}/>
                          <span className="text-[10px] font-black">{req.assistant_name}</span>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProctorAlertsHistory;
