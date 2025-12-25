
import React, { useState } from 'react';
import { Trash2, ShieldAlert, RefreshCcw, AlertTriangle, Database, Users2, History, Clock, Save, Code, Copy, Check, ShieldCheck } from 'lucide-react';
import { SystemConfig } from '../../types';

interface Props {
  systemConfig: SystemConfig;
  setSystemConfig: (cfg: Partial<SystemConfig>) => Promise<void>;
  resetFunctions: {
    students: () => void;
    teachers: () => void;
    operations: () => void;
    fullReset: () => void;
  };
}

const AdminSystemSettings: React.FC<Props> = ({ systemConfig, setSystemConfig, resetFunctions }) => {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [tempStartTime, setTempStartTime] = useState(systemConfig.exam_start_time || '08:00');
  const [isSavingCfg, setIsSavingCfg] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const sqlManualJoinFix = `-- إصلاح مشكلة العمود المفقود في جدول الإعدادات
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS allow_manual_join BOOLEAN DEFAULT false;

-- تحديث جدول الصلاحيات
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'CONTROL_MANAGER', 'PROCTOR', 'CONTROL', 'ASSISTANT_CONTROL', 'COUNSELOR'));`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveConfig = async () => {
    setIsSavingCfg(true);
    try {
      await setSystemConfig({ exam_start_time: tempStartTime });
      alert('تم حفظ إعدادات النظام');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingCfg(false);
    }
  };

  return (
    <div className="space-y-12 animate-slide-up text-right pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">إعدادات وتهيئة النظام</h2>
          <p className="text-slate-400 font-bold italic mt-1">صيانة قواعد البيانات وإصلاح الأعمدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden border-t-4 border-emerald-500">
          <h3 className="text-xl font-black flex items-center gap-4 text-emerald-400"><Code /> إصلاح قاعدة البيانات (SQL)</h3>
          <p className="text-[10px] text-slate-400">انسخ الكود التالي ونفذه في SQL Editor في Supabase لإضافة عمود الالتحاق اليدوي:</p>
          <div className="relative group">
            <pre className="bg-black/50 p-6 rounded-2xl font-mono text-[10px] text-blue-300 border border-white/10 overflow-x-auto text-left dir-ltr">
              {sqlManualJoinFix}
            </pre>
            <button 
              onClick={() => handleCopy(sqlManualJoinFix, 'sql')}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied === 'sql' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
              {copied === 'sql' ? 'تم النسخ' : 'نسخ الكود'}
            </button>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 space-y-8 flex flex-col justify-center">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4"><Clock className="text-blue-600" /> وقت بداية الاختبار</h3>
          <div className="space-y-6">
             <input type="time" value={tempStartTime} onChange={(e) => setTempStartTime(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 font-black text-5xl text-center text-slate-800 outline-none focus:border-blue-600 shadow-inner" />
             <button onClick={handleSaveConfig} disabled={isSavingCfg} className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-4">
               {isSavingCfg ? <RefreshCcw className="animate-spin" /> : <Save size={28} />} حفظ التوقيت
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           {id: 'ops', title: 'تصفير اليومي', action: resetFunctions.operations, icon: History},
           {id: 'stud', title: 'حذف الطلاب', action: resetFunctions.students, icon: Database},
           {id: 'teach', title: 'حذف المعلمين', action: resetFunctions.teachers, icon: Users2}
         ].map(item => (
           <button key={item.id} onClick={() => { if(confirm('هل أنت متأكد؟')) item.action(); }} className="bg-white p-8 rounded-[2.5rem] border shadow-md flex flex-col items-center gap-4 hover:border-red-500 hover:text-red-600 transition-all">
              <item.icon size={40} className="opacity-20" />
              <span className="font-black">{item.title}</span>
           </button>
         ))}
      </div>
    </div>
  );
};

export default AdminSystemSettings;
