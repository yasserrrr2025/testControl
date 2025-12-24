
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

  const sqlRoleFix = `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'CONTROL_MANAGER', 'PROCTOR', 'CONTROL', 'ASSISTANT_CONTROL', 'COUNSELOR'));`;

  const sqlAbsenceFix = `-- إصلاح قيد التحديث لجدول الغياب (حل مشكلة تكرار السجلات)
ALTER TABLE absences DROP CONSTRAINT IF EXISTS absences_student_id_key;
ALTER TABLE absences ADD CONSTRAINT absences_student_id_key UNIQUE (student_id);`;

  const sqlRLSFix = `-- إصلاح سياسات الأمان لجدول سجلات التسليم (حل مشكلة RLS violates)
-- السماح للجميع بالوصول الكامل (مناسب للمشاريع المفتوحة أو خلال التطوير)
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access for all" ON delivery_logs;
CREATE POLICY "Allow full access for all" ON delivery_logs FOR ALL USING (true) WITH CHECK (true);

-- تأكد أيضاً من صلاحيات الجداول الأخرى
ALTER TABLE control_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for requests" ON control_requests;
CREATE POLICY "Allow all for requests" ON control_requests FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAction = (id: string, action: () => void) => {
    if (confirming === id) {
      action();
      setConfirming(null);
    } else {
      setConfirming(id);
      setTimeout(() => setConfirming(null), 5000);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingCfg(true);
    try {
      await setSystemConfig({ exam_start_time: tempStartTime });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingCfg(false);
    }
  };

  const ActionCard = ({ id, title, description, icon: Icon, colorClass, action }: any) => {
    const isConfirming = confirming === id;
    
    return (
      <div className={`
        relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 overflow-hidden
        ${isConfirming 
          ? 'bg-red-600 border-red-600 text-white scale-[1.02] shadow-2xl shadow-red-200' 
          : 'bg-white border-slate-50 shadow-xl hover:shadow-2xl'
        }
      `}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
             <div className={`
               w-16 h-16 rounded-2xl flex items-center justify-center shrink-0
               ${isConfirming ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}
             `}>
                <Icon size={32} />
             </div>
             <div className="text-right">
                <h3 className={`text-xl font-black ${isConfirming ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                <p className={`text-sm font-bold ${isConfirming ? 'text-white/80' : 'text-slate-400'}`}>{description}</p>
             </div>
          </div>
          
          <button 
            onClick={() => handleAction(id, action)}
            className={`
              px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shrink-0
              ${isConfirming 
                ? 'bg-white text-red-600 hover:bg-slate-100 animate-pulse' 
                : `${colorClass} text-white shadow-lg`
              }
            `}
          >
            {isConfirming ? <ShieldAlert size={20}/> : <Trash2 size={20}/>}
            {isConfirming ? 'اضغط مرة أخرى للتأكيد النهائي' : 'بدء الحذف'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-slide-up text-right pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">إعدادات وتهيئة النظام</h2>
          <p className="text-slate-400 font-bold italic mt-1">إدارة قواعد البيانات وبدء المواسم الجديدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SQL Fix: Roles */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
          <h3 className="text-xl font-black flex items-center gap-4"><Code className="text-blue-400" /> صيانة الرتب</h3>
          <div className="relative group">
            <pre className="bg-black/50 p-6 rounded-2xl font-mono text-[9px] text-blue-300 border border-white/10 overflow-x-auto text-left dir-ltr">
              {sqlRoleFix}
            </pre>
            <button 
              onClick={() => handleCopy(sqlRoleFix, 'role')}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied === 'role' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* SQL Fix: Absences */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
          <h3 className="text-xl font-black flex items-center gap-4 text-amber-400"><Database className="text-amber-400" /> تحديث الغياب</h3>
          <div className="relative group">
            <pre className="bg-black/50 p-6 rounded-2xl font-mono text-[9px] text-amber-200 border border-white/10 overflow-x-auto text-left dir-ltr">
              {sqlAbsenceFix}
            </pre>
            <button 
              onClick={() => handleCopy(sqlAbsenceFix, 'absence')}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied === 'absence' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* SQL Fix: RLS Issues */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden border-t-4 border-emerald-500">
          <h3 className="text-xl font-black flex items-center gap-4 text-emerald-400"><ShieldCheck className="text-emerald-400" /> إصلاح صلاحيات الاستلام (RLS)</h3>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">حل مشكلة "new row violates row-level security policy" عند إغلاق اللجان أو توثيق الاستلام:</p>
          <div className="relative group">
            <pre className="bg-black/50 p-6 rounded-2xl font-mono text-[9px] text-emerald-200 border border-white/10 overflow-x-auto text-left dir-ltr">
              {sqlRLSFix}
            </pre>
            <button 
              onClick={() => handleCopy(sqlRLSFix, 'rls')}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied === 'rls' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
              {copied === 'rls' ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 space-y-8">
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
           <Clock className="text-blue-600" /> إعدادات الاختبار الحالية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="space-y-3">
             <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">وقت بداية الاختبار</label>
             <input 
               type="time" 
               value={tempStartTime}
               onChange={(e) => setTempStartTime(e.target.value)}
               className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 font-black text-3xl text-slate-800 outline-none focus:border-blue-600 shadow-inner"
             />
          </div>
          <button 
            onClick={handleSaveConfig}
            disabled={isSavingCfg}
            className="bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            {isSavingCfg ? <RefreshCcw className="animate-spin" /> : <Save size={28} />}
            حفظ إعدادات التوقيت
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ActionCard id="ops" title="تصفير العمليات اليومية" description="حذف سجلات الاستلام والتسليم، البلاغات عاجلة، وحالات الغياب المرصودة لهذا اليوم." icon={History} colorClass="bg-slate-900" action={resetFunctions.operations} />
        <ActionCard id="students" title="حذف الطلاب واللجان" description="مسح كافة قوائم الطلاب، الصفوف، أرقام الجلوس، وتوزيع اللجان الحالي." icon={Database} colorClass="bg-slate-900" action={resetFunctions.students} />
        <ActionCard id="teachers" title="حذف الهيئة التعليمية" description="إزالة جميع المعلمين والمراقبين المسجلين (سيتم الحفاظ على حساب مدير النظام فقط)." icon={Users2} colorClass="bg-slate-900" action={resetFunctions.teachers} />
      </div>
    </div>
  );
};

export default AdminSystemSettings;
