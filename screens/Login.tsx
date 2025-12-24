
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { APP_CONFIG } from '../constants';
import { db } from '../supabase';
import { ShieldCheck, Globe, Zap, Lock, Download } from 'lucide-react';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [loginId, setLoginId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = loginId.trim();
    if (!id) return;
    
    setIsLoading(true);
    try {
      const user = await db.users.getById(id);
      if (user) {
        onLogin(user);
      } else {
        alert('عذراً! رقم الهوية غير مسجل في النظام. يرجى مراجعة إدارة الكنترول.');
      }
    } catch (err) {
      alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] p-6 font-['Tajawal'] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[15%] right-[10%] text-white/5 animate-bounce" style={{ animationDuration: '4s' }}>
          <ShieldCheck size={120} />
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-2xl p-8 lg:p-14 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/20 text-center relative z-10 animate-slide-up border-b-[12px] border-b-blue-600">
        <div className="bg-white w-28 h-28 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl border-4 border-slate-50 overflow-hidden rotate-3 transition-transform hover:rotate-0">
           <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
        </div>
        
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2 tracking-tighter">كنترول الاختبارات</h1>
        <p className="text-slate-400 font-bold mb-10 italic">النظام السحابي المطور للمراقبة</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-right">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">رقم الهوية الوطنية</label>
            <div className="relative">
              <input 
                type="text" 
                inputMode="numeric"
                value={loginId} 
                onChange={(e) => setLoginId(e.target.value)} 
                placeholder="أدخل 10 أرقام" 
                className="w-full p-5 lg:p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black focus:border-blue-600 focus:bg-white outline-none transition-all shadow-inner placeholder:text-slate-200" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className={`
              w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-slate-900/30 
              transition-all flex items-center justify-center gap-3 text-xl
              ${isLoading ? 'opacity-70 scale-95' : 'hover:bg-blue-600 active:scale-95'}
            `}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              'دخول النظام'
            )}
          </button>
        </form>
        
        {deferredPrompt && (
          <button 
            onClick={handleInstallClick}
            className="mt-6 w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-[1.5rem] border-2 border-emerald-100 flex items-center justify-center gap-3 text-sm hover:bg-emerald-100 transition-all shadow-sm"
          >
            <Download size={18} /> تثبيت البرنامج على الجهاز
          </button>
        )}
        
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-center gap-4">
             <div className="h-[1px] w-8 bg-slate-100"></div>
             <p className="text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase">Security Level 5</p>
             <div className="h-[1px] w-8 bg-slate-100"></div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold bg-slate-50 py-2 px-4 rounded-full inline-block">
            إصدار 5.2.0 • الحفظ التلقائي مفعل
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
