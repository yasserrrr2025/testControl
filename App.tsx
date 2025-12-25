
import React, { useState, useEffect, useCallback } from 'react';
import { User, Student, Absence, Supervision, ControlRequest, DeliveryLog, SystemConfig } from './types';
import Sidebar from './components/Sidebar';
import Login from './screens/Login';
import AdminDashboardOverview from './screens/admin/DashboardOverview';
import AdminUsersManager from './screens/admin/UsersManager';
import AdminStudentsManager from './screens/admin/StudentsManager';
import AdminSupervisionMonitor from './screens/admin/SupervisionMonitor';
import AdminOfficialForms from './screens/admin/OfficialForms';
import AdminSystemSettings from './screens/admin/SystemSettings';
import ControlManager from './screens/admin/ControlManager';
import ProctorDailyAssignmentFlow from './screens/proctor/DailyAssignmentFlow';
import TeacherBadgeView from './screens/proctor/TeacherBadgeView';
import CounselorAbsenceMonitor from './screens/counselor/AbsenceMonitor';
import ControlReceiptView from './screens/control/ReceiptView';
import ReceiptLogsView from './screens/control/ReceiptLogsView';
import AssistantControlView from './screens/control/AssistantControlView';
import { Bell, Menu } from 'lucide-react';
import { db, supabase } from './supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [notifications, setNotifications] = useState<{id: string, text: string, type?: string}[]>([]);
  const [controlRequests, setControlRequests] = useState<ControlRequest[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ 
    id: 'main_config', 
    exam_start_time: '08:00', 
    exam_date: '',
    active_exam_date: new Date().toISOString().split('T')[0],
    allow_manual_join: false
  });

  const addLocalNotification = (input: any, type?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const msg = typeof input === 'string' ? input : (input?.message || "تنبيه جديد من النظام");
    setNotifications(prev => [{ id, text: msg, type }, ...prev].slice(0, 3));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000);
  };

  const fetchData = useCallback(async () => {
    try {
      const cfg = await db.config.get();
      let activeDate = new Date().toISOString().split('T')[0];
      if (cfg) {
        setSystemConfig(prev => ({ ...prev, ...cfg }));
        if (cfg.active_exam_date) activeDate = cfg.active_exam_date;
      }

      const [u, s, sv, ab, cr, dl] = await Promise.all([
        db.users.getAll(),
        db.students.getAll(),
        db.supervision.getAll(),
        db.absences.getAll(),
        db.controlRequests.getAll(),
        db.deliveryLogs.getAll(),
      ]);

      setUsers(u);
      setStudents(s);
      setSupervisions(sv); // نجلب الكل للمطابقة في التقارير
      setAbsences(ab); // نجلب الكل للتقارير التراكمية
      setDeliveryLogs(dl.filter(i => i.time.startsWith(activeDate)));
      setControlRequests(cr.filter(i => i.time.startsWith(activeDate)));

      if (currentUser) {
        const { data: notes } = await supabase.from('notifications')
          .select('*')
          .or(`target_role.eq.ALL,target_role.eq.${currentUser.role}`)
          .gte('created_at', activeDate)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notes && notes.length > 0) {
          const lastNote = notes[0];
          setNotifications(prev => {
            const exists = prev.some(n => n.id === lastNote.id);
            if (!exists) return [{ id: lastNote.id, text: lastNote.text, type: 'broadcast' }, ...prev].slice(0, 3);
            return prev;
          });
        }
      }
    } catch (err: any) {
      console.warn("Sync Warning:", err.message);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try { 
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        const lastTab = localStorage.getItem('activeTab');
        setActiveTab(lastTab || (user.role === 'ADMIN' ? 'dashboard' : 'my-tasks'));
      } catch (e) { localStorage.removeItem('currentUser'); }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeTab');
  };

  const commonProps = { onAlert: addLocalNotification };

  const renderContent = () => {
    if (!currentUser) return null;
    switch (activeTab) {
      case 'dashboard': return <AdminDashboardOverview stats={{ students: students.length, users: users.length, activeSupervisions: supervisions.filter(s => s.date.startsWith(systemConfig.active_exam_date || '')).length }} absences={absences.filter(a => a.date.startsWith(systemConfig.active_exam_date || ''))} supervisions={supervisions.filter(s => s.date.startsWith(systemConfig.active_exam_date || ''))} users={users} deliveryLogs={deliveryLogs} studentsList={students} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} systemConfig={systemConfig} />;
      case 'control-manager': return <ControlManager users={users} deliveryLogs={deliveryLogs} students={students} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} onUpdateUserGrades={async (userId, grades) => { const uMatch = users.find(u => u.id === userId); if (uMatch) { await db.users.upsert([{ ...uMatch, assigned_grades: grades }]); await fetchData(); } }} systemConfig={systemConfig} absences={absences} supervisions={supervisions} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} setSystemConfig={async (cfg) => { await db.config.upsert(cfg); await fetchData(); }} onRemoveSupervision={async (id) => { await db.supervision.deleteByTeacherId(id); await fetchData(); }} />;
      case 'teachers': return <AdminUsersManager users={users} setUsers={async (u) => { await db.users.upsert(typeof u === 'function' ? u(users) : u); await fetchData(); }} students={students} onDeleteUser={async (id) => { if(confirm('حذف؟')) { await db.users.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'students': return <AdminStudentsManager students={students} setStudents={async (s) => { await db.students.upsert(typeof s === 'function' ? s(students) : s); await fetchData(); }} onDeleteStudent={async (id) => { if(confirm('حذف؟')) { await db.students.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'committees': return <AdminSupervisionMonitor supervisions={supervisions.filter(s => s.date.startsWith(systemConfig.active_exam_date || ''))} users={users} students={students} absences={absences.filter(a => a.date.startsWith(systemConfig.active_exam_date || ''))} deliveryLogs={deliveryLogs} />;
      case 'official-forms': return <AdminOfficialForms absences={absences} students={students} supervisions={supervisions} users={users} />;
      case 'settings': return <AdminSystemSettings systemConfig={systemConfig} setSystemConfig={async (cfg) => { await db.config.upsert(cfg); await fetchData(); }} resetFunctions={{ students: async () => { if(confirm('حذف الطلاب؟')) { await supabase.from('students').delete().neq('id', '0'); await fetchData(); } }, teachers: async () => { if(confirm('حذف المعلمين؟')) { await supabase.from('users').delete().neq('role', 'ADMIN'); await fetchData(); } }, operations: async () => { if(confirm('تصفير سجلات اليوم؟')) { await supabase.from('absences').delete().gte('date', systemConfig.active_exam_date); await supabase.from('delivery_logs').delete().gte('time', systemConfig.active_exam_date); await fetchData(); } }, fullReset: () => {} }} />;
      case 'assigned-requests': return <AssistantControlView user={currentUser} requests={controlRequests} setRequests={fetchData} absences={absences} students={students} {...commonProps} />;
      case 'paper-logs': return <ControlReceiptView user={currentUser} students={students} absences={absences} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} supervisions={supervisions} users={users} controlRequests={controlRequests} setControlRequests={fetchData} {...commonProps} />;
      case 'receipt-history': return <ReceiptLogsView deliveryLogs={deliveryLogs} users={users} />;
      case 'digital-id': return <TeacherBadgeView user={currentUser} />;
      case 'student-absences': return <CounselorAbsenceMonitor absences={absences.filter(a => a.date.startsWith(systemConfig.active_exam_date || ''))} students={students} supervisions={supervisions.filter(s => s.date.startsWith(systemConfig.active_exam_date || ''))} users={users} />;
      case 'my-tasks': return <ProctorDailyAssignmentFlow user={currentUser} supervisions={supervisions.filter(s => s.date.startsWith(systemConfig.active_exam_date || ''))} setSupervisions={async () => { await fetchData(); }} students={students} absences={absences.filter(a => a.date.startsWith(systemConfig.active_exam_date || ''))} setAbsences={async () => { await fetchData(); }} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log) => { await db.deliveryLogs.upsert(log); await fetchData(); }} sendRequest={async (txt, com) => { await db.controlRequests.insert({ from: currentUser.full_name, committee: com, text: txt, time: new Date().toISOString(), status: 'PENDING' }); await fetchData(); }} controlRequests={controlRequests} systemConfig={systemConfig} {...commonProps} />;
      default: return null;
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#f8fafc] font-['Tajawal'] overflow-x-hidden text-right" dir="rtl">
      {currentUser && (
        <>
          <header className="fixed top-0 right-0 left-0 bg-white/80 backdrop-blur-md z-[90] lg:hidden border-b px-6 py-4 flex justify-between items-center no-print shadow-sm">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl hover:bg-blue-50 transition-colors"><Menu size={24} className="text-slate-700" /></button>
             <h1 className="font-black text-slate-900 text-lg">كنترول الاختبارات</h1>
             <div className="relative">
                <Bell size={24} className={notifications.length > 0 ? "text-blue-600 animate-bounce" : "text-slate-400"} />
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 w-4 h-4 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{notifications.length}</span>}
             </div>
          </header>
          
          <div className="no-print">
            <Sidebar user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); localStorage.setItem('activeTab', t); }} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} controlRequests={controlRequests} />
          </div>
        </>
      )}
      
      <main className={`transition-all duration-300 min-h-screen ${currentUser ? (isSidebarCollapsed ? 'lg:mr-24' : 'lg:mr-80') : ''} ${currentUser ? 'p-6 lg:p-10 pt-24 lg:pt-10' : ''}`}>
        {currentUser ? renderContent() : <Login users={users} onLogin={(u) => { setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} />}
      </main>
    </div>
  );
};

export default App;
