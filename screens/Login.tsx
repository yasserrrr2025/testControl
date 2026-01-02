
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { APP_CONFIG } from '../constants';
import { db } from '../supabase';
import { ShieldCheck, Download, Smartphone, Share, X, Info } from 'lucide-react';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onAlert: (msg: string, type: any) => void;
}

const Login: React.FC<Props> = ({ onLogin, onAlert }) => {
  const [loginId, setLoginId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // كشف iOS لتقديم تعليمات التثبيت اليدوي
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
      setShowIosHint(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = loginId.trim();
    if (!id) {
      onAlert('يرجى إدخال رقم الهوية', 'warning');
      return;
    }
    
    setIsLoading(true);
    try {
      const user = await db.users.getById(id);
      if (user) {
        onAlert(`أهلاً بك، ${user.full_name}`, 'success');
        onLogin(user);
      } else {
        onAlert('عذراً! رقم الهوية غير مسجل.', 'error');
      }
    } catch (err: any) {
      onAlert(err.message || 'خطأ في الاتصال بقاعدة البيانات.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020617] p-6 font-['Tajawal'] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-2xl p-8 lg:p-14 rounded-[4rem] shadow-2xl w-full max-w-md border border-white/20 text-center relative z-10 animate-slide-up border-b-[12px] border-b-blue-600">
        <div className="bg-white w-24 h-24 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl border-4 border-slate-50 overflow-hidden rotate-3 transition-transform hover:rotate-0">
           <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase">كنترول الاختبارات</h1>
        <p className="text-slate-400 font-bold mb-8 italic text-sm">النظام الموحد للمراقبة والتوثيق</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="text" 
            inputMode="numeric"
            value={loginId} 
            onChange={(e) => setLoginId(e.target.value)} 
            placeholder="أدخل رقم الهوية" 
            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-center text-2xl font-black focus:border-blue-600 outline-none transition-all shadow-inner" 
          />
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-slate-950 text-white font-black py-6 rounded-[2.5rem] shadow-2xl transition-all flex items-center justify-center gap-3 text-xl hover:bg-blue-600 active:scale-95"
          >
            {isLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : 'دخول النظام'}
          </button>
        </form>

        {deferredPrompt && (
          <button onClick={handleInstallClick} className="mt-6 w-full bg-emerald-500 text-white p-5 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg animate-bounce">
            <Download size={20} /> تثبيت التطبيق على الجوال
          </button>
        )}

        {showIosHint && (
          <div className="mt-8 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 text-right animate-fade-in">
             <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Smartphone size={24} />
                <h4 className="font-black text-sm">تثبيت على iPhone</h4>
             </div>
             <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                لأفضل تجربة، انقر على أيقونة المشاركة <Share size={14} className="inline mx-1"/> في أسفل المتصفح ثم اختر <span className="text-blue-600">"إضافة إلى الشاشة الرئيسية"</span>.
             </p>
          </div>
        )}
        
        <p className="mt-10 text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase">V 7.0 PRO SECURE</p>
      </div>
    </div>
  );
};

export default Login;
