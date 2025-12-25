
import React, { useState } from 'react';
import { Trash2, ShieldAlert, RefreshCcw, AlertTriangle, Database, Users2, History, Clock, Save, Code, Copy, Check, ShieldCheck, Calendar, Settings2 } from 'lucide-react';
import { SystemConfig } from '../../types';

interface Props {
  systemConfig: SystemConfig & { active_exam_date?: string };
  setSystemConfig: (cfg: Partial<SystemConfig>) => Promise<void>;
  resetFunctions: {
    students: () => void;
    teachers: () => void;
    operations: () => void;
    fullReset: () => void;
  };
}

const AdminSystemSettings: React.FC<Props> = ({ systemConfig, setSystemConfig, resetFunctions }) => {
  const [tempStartTime, setTempStartTime] = useState(systemConfig.exam_start_time || '08:00');
  const [tempActiveDate, setTempActiveDate] = useState(systemConfig.active_exam_date || new Date().toISOString().split('T')[0]);
  const [isSavingCfg, setIsSavingCfg] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const sqlManualJoinFix = `-- إصلاح مشكلة العمود المفقود في جدول الإعدادات
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS allow_manual_join BOOLEAN DEFAULT false;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS active_exam_date TEXT DEFAULT '';

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
      await setSystemConfig({ 
        exam_start_time: tempStartTime,
        active_exam_date: tempActiveDate
      } as any);
      alert('تم حفظ إعدادات النظام وتحديث تاريخ الاختبار النشط');
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
          <p className="text-slate-400 font-bold italic mt-1">إدارة التاريخ النشط وصيانة القاعدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden border-t-4 border-emerald-500">
          <h3 className="text-xl font-black flex items-center gap-4 text-emerald-400"><Code /> إصلاح قاعدة البيانات (SQL)</h3>
          <p className="text-[10px] text-slate-400">انسخ الكود التالي ونفذه في SQL Editor في Supabase إذا كانت هناك أعمدة مفقودة:</p>
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
          {/* Fix: Ensure Settings2 is imported from lucide-react */}
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4"><Settings2 className="text-blue-600" /> إعدادات اليوم النشط</h3>
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 mr-2 uppercase flex items-center gap-2"><Clock size={12}/> وقت البداية</label>
                   <input type="time" value={tempStartTime} onChange={(e) => setTempStartTime(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-black text-xl text-center outline-none focus:border-blue-600 shadow-inner" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 mr-2 uppercase flex items-center gap-2"><Calendar size={12}/> التاريخ النشط</label>
                   <input type="date" value={tempActiveDate} onChange={(e) => setTempActiveDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-black text-xl text-center outline-none focus:border-blue-600 shadow-inner" />
                </div>
             </div>
             <button onClick={handleSaveConfig} disabled={isSavingCfg} className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-4">
               {isSavingCfg ? <RefreshCcw className="animate-spin" /> : <Save size={28} />} حفظ التعديلات
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           {id: 'ops', title: 'تصفير اليومي', action: resetFunctions.operations, icon: History, sub: 'حذف غياب واستلامات اليوم المختار'},
           {id: 'stud', title: 'حذف الطلاب', action: resetFunctions.students, icon: Database, sub: 'حذف كافة بيانات الطلاب'},
           {id: 'teach', title: 'حذف المعلمين', action: resetFunctions.teachers, icon: Users2, sub: 'حذف كافة المعلمين (عدا المشرف)'}
         ].map(item => (
           <button key={item.id} onClick={() => { if(confirm('هل أنت متأكد؟')) item.action(); }} className="bg-white p-8 rounded-[2.5rem] border shadow-md flex flex-col items-center gap-4 hover:border-red-500 hover:text-red-600 transition-all group">
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-red-50 transition-colors"><item.icon size={32} className="opacity-40 group-hover:opacity-100" /></div>
              <div className="text-center">
                 <span className="font-black block">{item.title}</span>
                 <span className="text-[10px] font-bold text-slate-400 block mt-1">{item.sub}</span>
              </div>
           </button>
         ))}
      </div>
    </div>
  );
};

export default AdminSystemSettings;
