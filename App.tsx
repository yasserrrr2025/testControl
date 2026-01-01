
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, Absence, Supervision, ControlRequest, DeliveryLog, SystemConfig, CommitteeReport } from './types';
import Sidebar from './components/Sidebar';
import Login from './screens/Login';
import AdminDashboardOverview from './screens/admin/DashboardOverview';
import AdminUsersManager from './screens/admin/UsersManager';
import AdminStudentsManager from './screens/admin/StudentsManager';
import AdminSupervisionMonitor from './screens/admin/SupervisionMonitor';
import AdminDailyReports from './screens/admin/DailyReports';
import AdminOfficialForms from './screens/admin/OfficialForms';
import AdminSystemSettings from './screens/admin/SystemSettings';
import AdminProctorPerformance from './screens/admin/ProctorPerformance';
import CommitteeLabelsPrint from './screens/admin/CommitteeLabelsPrint';
import ControlHeadDashboard from './screens/admin/ControlHeadDashboard';
import ControlManager from './screens/admin/ControlManager';
import ControlRoomMonitor from './screens/admin/ControlRoomMonitor';
import ProctorDailyAssignmentFlow from './screens/proctor/DailyAssignmentFlow';
import TeacherBadgeView from './screens/proctor/TeacherBadgeView';
import CounselorAbsenceMonitor from './screens/counselor/AbsenceMonitor';
import ControlReceiptView from './screens/control/ReceiptView';
import ReceiptLogsView from './screens/control/ReceiptLogsView';
import AssistantControlView from './screens/control/AssistantControlView';
import { Bell, Menu, X, CheckCircle2, AlertCircle, Info, AlertTriangle, BellRing } from 'lucide-react';
import { db, supabase } from './supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastProcessedRequestId, setLastProcessedRequestId] = useState<string | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [notifications, setNotifications] = useState<{id: string, text: string, type: 'success' | 'error' | 'info' | 'warning'}[]>([]);
  const [controlRequests, setControlRequests] = useState<ControlRequest[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [committeeReports, setCommitteeReports] = useState<CommitteeReport[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ 
    id: 'main_config', 
    exam_start_time: '08:00', 
    exam_date: '',
    active_exam_date: new Date().toISOString().split('T')[0],
    allow_manual_join: false
  });

  const addLocalNotification = (input: any, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const msg = typeof input === 'string' ? input : (input?.message || "تنبيه جديد من النظام");
    setNotifications(prev => [{ id, text: msg, type }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  // طلب إذن التنبيهات
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addLocalNotification('تم تفعيل التنبيهات الذكية بنجاح', 'success');
      }
    }
  };

  // معالجة التنبيهات المتقدمة (Push Simulation via System Notifications)
  const triggerSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.hidden) {
      navigator.serviceWorker.ready.then(registration => {
        // Fix: Casting to any to allow 'vibrate' property which might not be present in some local TypeScript definitions for NotificationOptions
        registration.showNotification(title, {
          body,
          icon: 'https://www.raed.net/img?id=1488645',
          vibrate: [200, 100, 200],
          tag: 'control-alert',
          badge: 'https://www.raed.net/img?id=1488645'
        } as any);
      });
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const cfg = await db.config.get();
      let filterDate = systemConfig.active_exam_date;
      if (cfg) {
        setSystemConfig(prev => ({ ...prev, ...cfg }));
        filterDate = cfg.active_exam_date || filterDate;
      }
      const [u, s, sv, ab, cr, dl, reports] = await Promise.all([
        db.users.getAll(),
        db.students.getAll(),
        db.supervision.getAll(),
        db.absences.getAll(),
        db.controlRequests.getAll(),
        db.deliveryLogs.getAll(),
        db.committeeReports.getAll(),
      ]);
      setUsers(u);
      setStudents(s);
      
      if (filterDate) {
        const activeRequests = cr.filter(i => i.time && i.time.startsWith(filterDate));
        setSupervisions(sv.filter(i => i.date && i.date.startsWith(filterDate))); 
        setAbsences(ab.filter(i => i.date && i.date.startsWith(filterDate))); 
        setDeliveryLogs(dl.filter(i => i.time && i.time.startsWith(filterDate)));
        setControlRequests(activeRequests);
        setCommitteeReports(reports.filter(r => r.date && r.date.startsWith(filterDate)));

        // تفقد البلاغات الجديدة لإرسال تنبيه نظام
        if (activeRequests.length > 0) {
          const latest = activeRequests[0];
          if (latest.status === 'PENDING' && latest.id !== lastProcessedRequestId) {
            setLastProcessedRequestId(latest.id);
            triggerSystemNotification(`بلاغ عاجل: لجنة ${latest.committee}`, latest.text);
          }
        }
      }
    } catch (err: any) {
      console.warn("Sync Warning:", err.message);
    }
  }, [systemConfig.active_exam_date, lastProcessedRequestId]);

  const runAutoConfirmation = useCallback(async () => {
    if (!currentUser || !['ADMIN', 'CONTROL', 'CONTROL_MANAGER'].includes(currentUser.role)) return;

    const pendingLogs = deliveryLogs.filter(l => l.status === 'PENDING' && l.type === 'RECEIVE');
    if (pendingLogs.length === 0) return;

    for (const log of pendingLogs) {
      const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'CONTROL_MANAGER' || currentUser.assigned_grades?.includes(log.grade);
      if (!isAuthorized) continue;

      const committeeStudents = students.filter(s => s.committee_number === log.committee_number && s.grade === log.grade);
      if (committeeStudents.length > 0) {
        await db.deliveryLogs.upsert({
          ...log,
          status: 'CONFIRMED',
          teacher_name: `تلقائي (${currentUser.full_name})`,
          time: new Date().toISOString()
        });
        addLocalNotification(`تم استلام لجنة ${log.committee_number} (${log.grade}) تلقائياً للمطابقة`, 'success');
      }
    }
    await fetchData();
  }, [currentUser, deliveryLogs, students, fetchData]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try { 
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        const lastTab = localStorage.getItem('activeTab');
        setActiveTab(lastTab || (user.role === 'ADMIN' ? 'dashboard' : user.role === 'CONTROL_MANAGER' ? 'head-dash' : 'my-tasks'));
        requestNotificationPermission(); // اطلب الإذن عند الدخول
      } catch (e) { localStorage.removeItem('currentUser'); }
    }
    fetchData();
    const interval = setInterval(fetchData, 8000); // تسريع المزامنة قليلاً للبلاغات
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const isAutoMode = localStorage.getItem('auto_receipt_enabled') === 'true';
    if (isAutoMode && deliveryLogs.some(l => l.status === 'PENDING')) {
      runAutoConfirmation();
    }
  }, [deliveryLogs, runAutoConfirmation]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeTab');
  };

  const onAssignProctor = async (teacherId: string, committeeNumber: string) => {
    try {
      await db.supervision.deleteByTeacherId(teacherId);
      const existingInCommittee = supervisions.find(s => s.committee_number === committeeNumber);
      if (existingInCommittee) {
        // إذا وجد مراقب سابق، نقوم بحذفه (أو تحريره) لإحلال الجديد مكانه
        await db.supervision.deleteByTeacherId(existingInCommittee.teacher_id);
      }
      await db.supervision.insert({
        id: crypto.randomUUID(),
        teacher_id: teacherId,
        committee_number: committeeNumber,
        date: new Date().toISOString(),
        period: 1,
        subject: 'اختبار'
      });
      await fetchData();
      addLocalNotification(`تم تبديل/إسناد اللجنة ${committeeNumber} بنجاح`, 'success');
    } catch (error: any) {
      addLocalNotification(`خطأ في الإسناد: ${error.message}`, 'error');
    }
  };

  const commonProps = { onAlert: addLocalNotification };

  const renderContent = () => {
    if (!currentUser) return null;
    switch (activeTab) {
      case 'dashboard': return <AdminDashboardOverview stats={{ students: students.length, users: users.length, activeSupervisions: supervisions.length }} absences={absences} supervisions={supervisions} users={users} deliveryLogs={deliveryLogs} studentsList={students} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} systemConfig={systemConfig} />;
      case 'head-dash': return <ControlHeadDashboard users={users} students={students} absences={absences} deliveryLogs={deliveryLogs} requests={controlRequests} supervisions={supervisions} systemConfig={systemConfig} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} />;
      case 'control-monitor': return (
        <div className="fixed inset-0 z-[200] bg-slate-950">
           <button onClick={() => setActiveTab('dashboard')} className="fixed top-6 left-6 z-[210] bg-white/10 hover:bg-white/20 text-white p-3 rounded-full no-print">
              <X size={32} />
           </button>
           <ControlRoomMonitor absences={absences} supervisions={supervisions} users={users} deliveryLogs={deliveryLogs} students={students} requests={controlRequests} />
        </div>
      );
      case 'proctor-excellence': return <AdminProctorPerformance users={users} supervisions={supervisions} deliveryLogs={deliveryLogs} absences={absences} systemConfig={systemConfig} />;
      case 'committee-labels': return <CommitteeLabelsPrint students={students} />;
      case 'control-manager': return <ControlManager users={users} deliveryLogs={deliveryLogs} students={students} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} onUpdateUserGrades={async (userId, grades) => { const uMatch = users.find(u => u.id === userId); if (uMatch) { await db.users.upsert([{ ...uMatch, assigned_grades: grades }]); await fetchData(); } }} systemConfig={systemConfig} absences={absences} supervisions={supervisions} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} setSystemConfig={async (cfg) => { await db.config.upsert(cfg); await fetchData(); }} onRemoveSupervision={async (id) => { await db.supervision.deleteByTeacherId(id); await fetchData(); }} onAssignProctor={onAssignProctor} />;
      case 'teachers': return <AdminUsersManager users={users} setUsers={async (u) => { await db.users.upsert(typeof u === 'function' ? u(users) : u); await fetchData(); }} students={students} onDeleteUser={async (id) => { if(confirm('حذف؟')) { await db.users.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'students': return <AdminStudentsManager students={students} setStudents={async (s) => { await db.students.upsert(typeof s === 'function' ? s(students) : s); await fetchData(); }} onDeleteStudent={async (id) => { if(confirm('حذف؟')) { await db.students.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'committees': return <AdminSupervisionMonitor supervisions={supervisions} users={users} students={students} absences={absences} deliveryLogs={deliveryLogs} />;
      case 'daily-reports': return <AdminDailyReports supervisions={supervisions} users={users} students={students} deliveryLogs={deliveryLogs} systemConfig={systemConfig} committeeReports={committeeReports} />;
      case 'official-forms': return <AdminOfficialForms absences={absences} students={students} supervisions={supervisions} users={users} />;
      case 'settings': return <AdminSystemSettings systemConfig={systemConfig} setSystemConfig={async (cfg) => { await db.config.upsert(cfg); await fetchData(); }} resetFunctions={{ students: async () => { if(confirm('حذف الطلاب؟')) { await supabase.from('students').delete().neq('id', '0'); await fetchData(); } }, teachers: async () => { if(confirm('حذف المعلمين؟')) { await supabase.from('users').delete().neq('role', 'ADMIN'); await fetchData(); } }, operations: async () => { if(confirm('تصفير سجلات اليوم؟')) { await supabase.from('absences').delete().gte('date', systemConfig.active_exam_date); await supabase.from('delivery_logs').delete().gte('time', systemConfig.active_exam_date); await fetchData(); } }, fullReset: () => {} }} onAlert={addLocalNotification} />;
      case 'assigned-requests': return <AssistantControlView user={currentUser} requests={controlRequests} setRequests={fetchData} absences={absences} students={students} users={users} {...commonProps} />;
      case 'paper-logs': return <ControlReceiptView user={currentUser} students={students} absences={absences} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} supervisions={supervisions} users={users} controlRequests={controlRequests} setControlRequests={fetchData} systemConfig={systemConfig} {...commonProps} />;
      case 'receipt-history': return <ReceiptLogsView deliveryLogs={deliveryLogs} users={users} />;
      case 'digital-id': return <TeacherBadgeView user={currentUser} />;
      case 'student-absences': return <CounselorAbsenceMonitor absences={absences} students={students} supervisions={supervisions} users={users} />;
      case 'my-tasks': return <ProctorDailyAssignmentFlow user={currentUser} users={users} supervisions={supervisions} setSupervisions={async () => { await fetchData(); }} students={students} absences={absences} setAbsences={async () => { await fetchData(); }} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} sendRequest={async (txt, com) => { await db.controlRequests.insert({ from: currentUser.full_name, committee: com, text: txt, time: new Date().toISOString(), status: 'PENDING' }); await fetchData(); }} controlRequests={controlRequests} systemConfig={systemConfig} committeeReports={committeeReports} onReportUpsert={async (report) => { await db.committeeReports.upsert(report); await fetchData(); }} {...commonProps} />;
      default: return null;
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#f8fafc] font-['Tajawal'] overflow-x-hidden text-right" dir="rtl">
      {/* Toast Notification Hub */}
      <div className="fixed top-24 left-6 right-6 lg:right-auto lg:left-8 z-[1000] flex flex-col gap-3 max-w-sm pointer-events-none no-print">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-in pointer-events-auto border-r-[6px] ${
            n.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' :
            n.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-900' :
            n.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-900' :
            'bg-blue-50 border-blue-500 text-blue-900'
          }`}>
            <div className="shrink-0">
              {n.type === 'success' ? <CheckCircle2 size={24} /> :
               n.type === 'error' ? <AlertCircle size={24} /> :
               n.type === 'warning' ? <AlertTriangle size={24} /> :
               <Info size={24} />}
            </div>
            <p className="font-black text-xs lg:text-sm">{n.text}</p>
            <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} className="mr-auto opacity-40 hover:opacity-100"><X size={16}/></button>
          </div>
        ))}
      </div>

      {currentUser && (
        <>
          <header className="fixed top-0 right-0 left-0 bg-white/80 backdrop-blur-md z-[90] lg:hidden border-b px-6 py-4 flex justify-between items-center no-print shadow-sm">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl hover:bg-blue-50 transition-colors"><Menu size={24} className="text-slate-700" /></button>
             <h1 className="font-black text-slate-900 text-lg">كنترول الاختبارات</h1>
             <button onClick={requestNotificationPermission} className="relative p-2 hover:bg-blue-50 rounded-xl transition-all">
                <BellRing size={24} className={notifications.length > 0 ? "text-blue-600 animate-bounce" : "text-slate-400"} />
                {Notification.permission !== 'granted' && <span className="absolute top-0 right-0 bg-red-600 w-2 h-2 rounded-full animate-ping"></span>}
             </button>
          </header>
          <div className="no-print">
            <Sidebar user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); localStorage.setItem('activeTab', t); }} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} controlRequests={controlRequests} />
          </div>
        </>
      )}
      <main className={`transition-all duration-300 min-h-screen ${currentUser ? (isSidebarCollapsed ? 'lg:mr-24' : 'lg:mr-80') : ''} ${currentUser ? 'p-6 lg:p-10 pt-24 lg:pt-10' : ''}`}>
        {currentUser ? renderContent() : <Login users={users} onLogin={(u) => { setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} {...commonProps} />}
      </main>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
