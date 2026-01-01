
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Supervision, Student, Absence, DeliveryLog, ControlRequest, CommitteeReport } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Scan, Users, UserCheck, GraduationCap, 
  CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
  X, Send, RefreshCcw, BellRing, ShieldAlert, AlertOctagon,
  PackageCheck, PackageSearch, Camera, Shield, Zap, FileWarning, 
  Plus, Minus, Check, Info, Ambulance, Pen, NotebookPen, 
  UserSearch, MessageCircleWarning, ArrowRight, MessageCircle, Backpack, History, Clock, ClipboardList,
  FileText, BookOpen, Lightbulb
} from 'lucide-react';
import { db } from '../../supabase';
import { APP_CONFIG } from '../../constants';

interface Props {
  user: User;
  supervisions: Supervision[];
  setSupervisions: any;
  students: Student[];
  absences: Absence[];
  setAbsences: any;
  onAlert: any;
  sendRequest: any;
  deliveryLogs: DeliveryLog[];
  setDeliveryLogs: (log: Partial<DeliveryLog>) => Promise<void>;
  controlRequests: ControlRequest[];
  systemConfig: any;
  committeeReports: CommitteeReport[];
  onReportUpsert: (report: Partial<CommitteeReport>) => Promise<void>;
}

const ProctorDailyAssignmentFlow: React.FC<Props> = ({ user, supervisions, setSupervisions, students, absences, setAbsences, onAlert, sendRequest, deliveryLogs, setDeliveryLogs, controlRequests, systemConfig, committeeReports, onReportUpsert }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'ARCHIVE'>('CURRENT');
  
  // حالات البلاغات
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSubView, setRequestSubView] = useState<'MAIN' | 'SELECT_STUDENTS' | 'COUNTER' | 'CUSTOM_MSG'>('MAIN');
  const [currentRequestLabel, setCurrentRequestLabel] = useState('');
  const [selectedStudentsForReq, setSelectedStudentsForReq] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(1);
  const [customMessage, setCustomMessage] = useState('');

  // حالات التقرير التفصيلي الجديد
  const [isDetailedReportOpen, setIsDetailedReportOpen] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportFormData, setReportFormData] = useState({ observations: '', issues: '', resolutions: '' });

  // حالات الإغلاق
  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [currentGradeIdx, setCurrentGradeIdx] = useState(0);
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const activeDate = systemConfig?.active_exam_date || new Date().toISOString().split('T')[0];

  const activeAssignment = useMemo(() => 
    supervisions.find(s => s.teacher_id === user.id && s.date && s.date.startsWith(activeDate)), 
  [supervisions, user.id, activeDate]);

  const activeCommittee = activeAssignment?.committee_number || null;

  // جلب التقرير الحالي إذا كان موجوداً مسبقاً
  useEffect(() => {
    if (activeCommittee) {
      const existing = committeeReports.find(r => r.committee_number === activeCommittee && r.date === activeDate);
      if (existing) {
        setReportFormData({
          observations: existing.observations || '',
          issues: existing.issues || '',
          resolutions: existing.resolutions || ''
        });
      }
    }
  }, [activeCommittee, activeDate, committeeReports]);

  const handleSaveDetailedReport = async () => {
    if (!activeCommittee) return;
    setIsSavingReport(true);
    try {
      const existing = committeeReports.find(r => r.committee_number === activeCommittee && r.date === activeDate);
      await onReportUpsert({
        id: existing?.id || crypto.randomUUID(),
        committee_number: activeCommittee,
        proctor_id: user.id,
        proctor_name: user.full_name,
        date: activeDate,
        ...reportFormData
      });
      onAlert('تم حفظ تقرير الملاحظات بنجاح');
      setIsDetailedReportOpen(false);
    } catch (err: any) {
      onAlert(err.message);
    } finally {
      setIsSavingReport(false);
    }
  };

  // ... (بقية منطق المباشرة والغياب تبقى كما هي)

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try { if (qrScannerRef.current.isScanning) await qrScannerRef.current.stop(); } catch (e) {} finally {
        qrScannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const joinCommittee = async (committeeNum: string) => {
    const cleanedNum = committeeNum.trim();
    if (!cleanedNum || isJoining) return;
    setIsJoining(true);
    try {
      await db.supervision.deleteByTeacherId(user.id);
      await db.supervision.insert({ id: crypto.randomUUID(), teacher_id: user.id, committee_number: cleanedNum, date: new Date().toISOString(), period: 1, subject: 'اختبار' });
      await setSupervisions();
      onAlert(`تمت المباشرة في اللجنة ${cleanedNum}`);
    } catch (err: any) { onAlert(err.message); } finally { setIsJoining(false); }
  };

  if (!activeCommittee) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 text-center space-y-8 animate-fade-in">
         <div className="bg-white p-12 md:p-20 rounded-[4rem] text-slate-900 shadow-2xl relative overflow-hidden border-b-[12px] border-slate-950">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[150px] rounded-full"></div>
            <div className="relative z-10 space-y-12 text-center">
               <div className="space-y-4">
                  <div className="bg-slate-950 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl text-blue-400"><Shield size={40} /></div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter">بوابة المباشرة</h2>
                  <p className="text-slate-400 font-bold text-xl italic uppercase">امسح كود اللجنة لبدء الرصد</p>
               </div>
               <button onClick={() => { setIsScanning(true); setTimeout(async () => { try { const scanner = new Html5Qrcode("proctor-qr"); qrScannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => { joinCommittee(text); stopScanner(); }, () => {}); } catch (err) { setIsScanning(false); } }, 200); }} className="w-full p-12 bg-blue-600 rounded-[3.5rem] font-black text-3xl text-white shadow-2xl hover:bg-blue-700 transition-all flex flex-col items-center gap-6 group">
                  <Camera size={72} className="group-hover:rotate-12 transition-transform" />
                  <span>بدء مسح الكود</span>
               </button>
            </div>
            {isScanning && (
               <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-white">
                 <div id="proctor-qr" className="w-full max-w-sm aspect-square bg-black rounded-[4rem] border-8 border-white/10 overflow-hidden shadow-2xl"></div>
                 <button onClick={stopScanner} className="mt-12 bg-red-600 text-white px-24 py-6 rounded-[2rem] font-black text-2xl shadow-xl">إلغاء</button>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-right pb-48 px-4 md:px-0">
       <div className="bg-slate-950 p-8 md:p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white rounded-3xl p-1 shadow-2xl flex items-center justify-center border-4 border-blue-500/20">
                   <img src={APP_CONFIG.LOGO_URL} alt="Staff" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h3 className="text-2xl font-black">{user.full_name}</h3>
                   <span className="bg-white/10 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest leading-none mt-2 block">مراقب لجنة {activeCommittee}</span>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setIsRequestModalOpen(true)} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl hover:bg-red-700 transition-all active:scale-95">
             <Zap size={32} fill="white" /> بلاغ ميداني عاجل
          </button>
          {/* زر التقرير التفصيلي الجديد */}
          <button onClick={() => setIsDetailedReportOpen(true)} className="p-8 bg-blue-500 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl hover:bg-blue-600 transition-all active:scale-95">
             <FileText size={32} /> تقرير الملاحظات
          </button>
          <button onClick={() => setIsClosingWizardOpen(true)} className="p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl hover:bg-blue-600 transition-all active:scale-95">
             <PackageCheck size={32} /> إنهاء واغلاق اللجنة
          </button>
       </div>

       {/* مودال التقرير التفصيلي */}
       {isDetailedReportOpen && (
         <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => !isSavingReport && setIsDetailedReportOpen(false)}></div>
            <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border-b-[15px] border-blue-600 animate-slide-up my-auto">
               <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full"></div>
                  <h3 className="text-2xl font-black flex items-center gap-4 relative z-10"><FileText className="text-blue-400"/> التقرير الميداني التفصيلي للجنة</h3>
                  <button onClick={() => setIsDetailedReportOpen(false)} className="bg-white/10 p-2 rounded-full relative z-10 hover:bg-white/20 transition-all"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4 flex items-center gap-2"><BookOpen size={12}/> الملاحظات العامة (سير العمل)</label>
                     <textarea value={reportFormData.observations} onChange={e => setReportFormData({...reportFormData, observations: e.target.value})} placeholder="اكتب ملاحظاتك عن انضباط اللجنة وسير الاختبار..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-bold text-lg h-32 outline-none focus:border-blue-500 transition-all text-right" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-red-400 uppercase tracking-widest mr-4 flex items-center gap-2"><AlertCircle size={12}/> المشكلات التي تمت مواجهتها</label>
                     <textarea value={reportFormData.issues} onChange={e => setReportFormData({...reportFormData, issues: e.target.value})} placeholder="هل واجهت أي مشكلات تقنية، سلوكية، أو لوجستية؟" className="w-full bg-red-50/30 border-2 border-red-100 rounded-2xl p-5 font-bold text-lg h-32 outline-none focus:border-red-400 transition-all text-right" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mr-4 flex items-center gap-2"><Lightbulb size={12}/> الحلول والإجراءات المتخذة</label>
                     <textarea value={reportFormData.resolutions} onChange={e => setReportFormData({...reportFormData, resolutions: e.target.value})} placeholder="كيف تعاملت مع المشكلات؟ أو أي توصيات للمستقبل..." className="w-full bg-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-5 font-bold text-lg h-32 outline-none focus:border-emerald-500 transition-all text-right" />
                  </div>
                  <button onClick={handleSaveDetailedReport} disabled={isSavingReport} className="w-full bg-blue-600 text-white py-6 rounded-[1.8rem] font-black text-xl shadow-xl flex items-center justify-center gap-4 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                    {isSavingReport ? <Loader2 className="animate-spin"/> : <CheckCircle2/>} حفظ وتحديث التقرير التفصيلي
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* ... (بقية المكونات تبقى كما هي) */}
    </div>
  );
};

export default ProctorDailyAssignmentFlow;
