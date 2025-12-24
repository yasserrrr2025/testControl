
import React from 'react';
import { User } from '../../types';
import { ROLES_ARABIC, APP_CONFIG } from '../../constants';
import { ShieldCheck, UserCircle, Briefcase, Hash, Phone, MapPin } from 'lucide-react';

interface Props {
  user: User;
}

const TeacherBadgeView: React.FC<Props> = ({ user }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${user.national_id}`;
  
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in no-print">
      <div className="relative group max-w-sm w-full perspective-1000">
        <div className="absolute inset-0 bg-blue-600 rounded-[4rem] blur-[60px] opacity-20 group-hover:opacity-40 transition-all"></div>
        
        <div className="bg-white rounded-[4rem] shadow-2xl border-8 border-white overflow-hidden text-center relative z-10 transition-transform duration-500 hover:rotate-y-6">
          {/* Header */}
          <div className="bg-slate-950 p-12 text-white relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/30 rounded-full blur-[80px] -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[60px] -ml-16 -mb-16"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white w-20 h-20 rounded-[1.8rem] flex items-center justify-center p-2 mb-6 shadow-2xl">
                <img src={APP_CONFIG.LOGO_URL} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-blue-400">نظام كنترول الاختبارات</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mt-2">Professional Staff Identity</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-10 -mt-10 bg-white rounded-t-[4rem] relative z-20 space-y-8">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-36 h-36 bg-white rounded-[3rem] p-1 border-8 border-slate-50 shadow-2xl overflow-hidden mb-6 flex items-center justify-center transition-transform hover:scale-105">
                  <img src={APP_CONFIG.LOGO_URL} alt="Staff" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-xl border-4 border-white">
                  <ShieldCheck size={24} />
                </div>
              </div>
              
              <h4 className="text-3xl font-black text-slate-900 mb-1 leading-none">{user.full_name}</h4>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-2 rounded-full font-black text-xs border border-blue-100 shadow-sm">
                <Briefcase size={14} />
                {ROLES_ARABIC[user.role] || user.role}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">الرقم المدني</p>
                <p className="font-black text-slate-800 text-sm font-mono">{user.national_id}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">حالة الحساب</p>
                <p className="font-black text-emerald-600 text-sm">نشط حالياً</p>
              </div>
            </div>

            <div className="p-8 bg-white border-2 border-slate-50 rounded-[3.5rem] shadow-inner flex flex-col items-center gap-4 relative group/qr overflow-hidden">
               <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover/qr:opacity-100 transition-opacity"></div>
               <img src={qrUrl} alt="QR ID" className="w-48 h-48 mix-blend-multiply relative z-10" />
               <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] relative z-10">Scan for verification</p>
            </div>
          </div>
          
          <div className="bg-slate-50 py-4 border-t border-slate-100">
             <p className="text-[8px] font-bold text-slate-400 tracking-tighter">هذه البطاقة رقمية ومعتمدة داخل نظام الكنترول فقط</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => window.print()}
        className="mt-12 bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-4"
      >
        <Hash size={24}/> طباعة البطاقة الورقية
      </button>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .rotate-y-6:hover { transform: rotateY(6deg); }
      `}</style>
    </div>
  );
};

export default TeacherBadgeView;
