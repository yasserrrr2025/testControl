
import React, { useState, useEffect, useCallback } from 'react';
import { User, Student, Absence, Supervision, ControlRequest, DeliveryLog, UserRole, SystemConfig } from './types';
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
import ControlRoomMonitor from './screens/admin/ControlRoomMonitor';
import { Bell, Menu, Download, Monitor, X, Volume2 } from 'lucide-react';
import { db, supabase } from './supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [notifications, setNotifications] = useState<{id: string, text: string, type?: string, created_at?: string}[]>([]);
  const [controlRequests, setControlRequests] = useState<ControlRequest[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig & {active_exam_date?: string}>({ 
    id: 'main_config', 
    exam_start_time: '08:00', 
    exam_date: '',
    active_exam_date: new Date().toISOString().split('T')[0]
  });

  const addLocalNotification = (input: any, type?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const msg = typeof input === 'string' ? input : (input?.message || "تنبيه جديد من النظام");
    setNotifications(prev => [{ id, text: msg, type }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000);
  };

  const fetchData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const [u, s, sv, ab, cr, dl, cfg] = await Promise.all([
        db.users.getAll(),
        db.students.getAll(),
        db.supervision.getAll(),
        db.absences.getAll(),
        db.controlRequests.getAll(),
        db.deliveryLogs.getAll(),
        db.config.get()
      ]);

      setUsers(u);
      setStudents(s);
      setSupervisions(sv.filter(i => i.date.startsWith(todayStr)));
      setAbsences(ab.filter(i => i.date.startsWith(todayStr)));
      // نبقي سجلات الاستلام كاملة لدعم ميزة الأرشيف للمراقبين والكنترول
      setDeliveryLogs(dl);
      setControlRequests(cr);
      if (cfg) setSystemConfig(cfg);

      if (currentUser) {
        const { data: notes } = await supabase.from('notifications')
          .select('*')
          .or(`target_role.eq.ALL,target_role.eq.${currentUser.role}`)
          .gte('created_at', todayStr)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notes && notes.length > 0) {
          const lastNote = notes[0];
          setNotifications(prev => {
            const exists = prev.some(n => n.id === lastNote.id);
            if (!exists) return [{ id: lastNote.id, text: lastNote.text, type: 'broadcast' }, ...prev];
            return prev;
          });
        }
      }
    } catch (err: any) {
      console.warn("Fetch Ignored (Check Connection):", err.message);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try { 
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        const lastTab = localStorage.getItem('activeTab');
        
        const isAuthorized = (role: UserRole, tab: string) => {
          if (role === 'ADMIN') return true;
          if (role === 'PROCTOR') return tab === 'my-tasks' || tab === 'digital-id';
          if (role === 'CONTROL_MANAGER') return ['control-manager', 'paper-logs', 'receipt-history'].includes(tab);
          if (role === 'CONTROL') return ['paper-logs', 'receipt-history'].includes(tab);
          if (role === 'ASSISTANT_CONTROL') return ['assigned-requests'].includes(tab);
          if (role === 'COUNSELOR') return ['student-absences'].includes(tab);
          return false;
        };

        if (lastTab && isAuthorized(user.role, lastTab)) {
          setActiveTab(lastTab);
        } else {
          switch (user.role) {
            case 'ADMIN': setActiveTab('dashboard'); break;
            case 'PROCTOR': setActiveTab('my-tasks'); break;
            case 'CONTROL_MANAGER': setActiveTab('control-manager'); break;
            case 'COUNSELOR': setActiveTab('student-absences'); break;
            case 'CONTROL': setActiveTab('paper-logs'); break;
            case 'ASSISTANT_CONTROL': setActiveTab('assigned-requests'); break;
            default: setActiveTab('my-tasks');
          }
        }
      } catch (e) { localStorage.removeItem('currentUser'); }
    }
    
    fetchData();
    const interval = setInterval(fetchData, 20000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab) localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    switch (user.role) {
      case 'ADMIN': setActiveTab('dashboard'); break;
      case 'CONTROL_MANAGER': setActiveTab('control-manager'); break;
      case 'PROCTOR': setActiveTab('my-tasks'); break;
      case 'COUNSELOR': setActiveTab('student-absences'); break;
      case 'CONTROL': setActiveTab('paper-logs'); break;
      case 'ASSISTANT_CONTROL': setActiveTab('assigned-requests'); break;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeTab');
    setShowCommandCenter(false);
  };

  const renderContent = () => {
    if (!currentUser) return null;
    const commonProps = { onAlert: addLocalNotification };

    if (currentUser.role !== 'ADMIN' && activeTab === 'dashboard') {
      return <ProctorDailyAssignmentFlow user={currentUser} supervisions={supervisions} setSupervisions={async () => { await fetchData(); }} students={students} absences={absences} setAbsences={async () => { await fetchData(); }} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log: Partial<DeliveryLog>) => { try { await db.deliveryLogs.upsert(log); await fetchData(); } catch (err: any) { addLocalNotification(err); throw err; } }} sendRequest={async (txt: string, committee: string) => { try { await db.controlRequests.insert({ from: currentUser.full_name, committee, text: txt, time: new Date().toLocaleTimeString('ar-SA'), status: 'PENDING' }); await fetchData(); } catch (err: any) { addLocalNotification(err); } }} controlRequests={controlRequests} {...commonProps} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardOverview stats={{ students: students.length, users: users.length, activeSupervisions: supervisions.length }} absences={absences} supervisions={supervisions} users={users} deliveryLogs={deliveryLogs} studentsList={students} onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} systemConfig={systemConfig} />;
      case 'control-manager':
        return <ControlManager 
          users={users} 
          deliveryLogs={deliveryLogs} 
          students={students} 
          onBroadcast={(m, t) => db.notifications.broadcast(m, t, currentUser.full_name)} 
          onUpdateUserGrades={async (userId, grades) => {
            const user = users.find(u => u.id === userId);
            if (user) {
              try { await db.users.upsert([{ ...user, assigned_grades: grades }]); await fetchData(); } catch (e: any) { addLocalNotification(e); }
            }
          }}
          systemConfig={systemConfig}
          absences={absences}
          supervisions={supervisions}
          setDeliveryLogs={async (log: DeliveryLog) => { try { await db.deliveryLogs.upsert(log); await fetchData(); } catch(e:any){addLocalNotification(e);} }}
        />;
      case 'teachers':
        return <AdminUsersManager users={users} setUsers={async (u: any) => { 
          try { await db.users.upsert(typeof u === 'function' ? u(users) : u); await fetchData(); } catch (e: any) { addLocalNotification(e); }
        }} students={students} onDeleteUser={async (id) => { if(confirm('حذف؟')){ await db.users.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'students':
        return <AdminStudentsManager students={students} setStudents={async (s: any) => { try { await db.students.upsert(typeof s === 'function' ? s(students) : s); await fetchData(); } catch(e:any){addLocalNotification(e);} }} onDeleteStudent={async (id) => { if(confirm('حذف؟')){ await db.students.delete(id); await fetchData(); } }} {...commonProps} />;
      case 'committees':
        return <AdminSupervisionMonitor supervisions={supervisions} users={users} students={students} absences={absences} deliveryLogs={deliveryLogs} />;
      case 'official-forms':
        return <AdminOfficialForms absences={absences} students={students} />;
      case 'settings':
        return <AdminSystemSettings systemConfig={systemConfig} setSystemConfig={async (cfg) => { try { await db.config.upsert(cfg); await fetchData(); } catch(e:any){addLocalNotification(e);} }} resetFunctions={{
          students: async () => { if(confirm('حذف جميع الطلاب؟')){ await supabase.from('students').delete().neq('id', '0000'); await fetchData(); } },
          teachers: async () => { if(confirm('حذف جميع المعلمين؟')){ await supabase.from('users').delete().neq('role', 'ADMIN'); await fetchData(); } },
          operations: async () => { if(confirm('تصفير العمليات الحالية؟')){ await supabase.from('absences').delete().neq('id', '0000'); await supabase.from('delivery_logs').delete().neq('id', '0000'); await fetchData(); } },
          fullReset: () => alert('يرجى استخدام SQL Editor')
        }} />;
      case 'assigned-requests':
        return <AssistantControlView user={currentUser} requests={controlRequests} setRequests={fetchData} absences={absences} students={students} {...commonProps} />;
      case 'paper-logs':
        return <ControlReceiptView user={currentUser} students={students} absences={absences} deliveryLogs={deliveryLogs} setDeliveryLogs={async (log: DeliveryLog) => { try { await db.deliveryLogs.upsert(log); await fetchData(); } catch(e:any){addLocalNotification(e);} }} supervisions={supervisions} users={users} controlRequests={controlRequests} setControlRequests={fetchData} {...commonProps} />;
      case 'receipt-history':
        return <ReceiptLogsView deliveryLogs={deliveryLogs} users={users} />;
      case 'digital-id':
        return <TeacherBadgeView user={currentUser} />;
      case 'student-absences':
        return <CounselorAbsenceMonitor absences={absences} students={students} supervisions={supervisions} users={users} />;
      case 'my-tasks':
        return <ProctorDailyAssignmentFlow 
          user={currentUser} 
          supervisions={supervisions} 
          setSupervisions={async () => { await fetchData(); }} 
          students={students} 
          absences={absences} 
          setAbsences={async () => { await fetchData(); }} 
          deliveryLogs={deliveryLogs} 
          setDeliveryLogs={async (log: Partial<DeliveryLog>) => { 
            try { 
              await db.deliveryLogs.upsert(log); 
              await fetchData(); 
            } catch (err: any) { 
              addLocalNotification(err); 
              throw err;
            } 
          }} 
          sendRequest={async (txt: string, committee: string) => { 
            try { 
              await db.controlRequests.insert({ from: currentUser.full_name, committee, text: txt, time: new Date().toLocaleTimeString('ar-SA'), status: 'PENDING' }); 
              await fetchData(); 
            } catch (err: any) { addLocalNotification(err); } 
          }} 
          controlRequests={controlRequests} 
          {...commonProps} 
        />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-['Tajawal'] overflow-x-hidden text-right" dir="rtl">
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
          <Sidebar user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} controlRequests={controlRequests} />
          
          {currentUser.role === 'ADMIN' && (
            <button 
              onClick={() => setShowCommandCenter(true)} 
              className="fixed bottom-24 lg:bottom-10 left-10 z-[100] bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-4 group no-print border-2 border-blue-600/30"
            >
              <Monitor size={32} className="group-hover:text-blue-400" />
              <div className="text-right hidden md:block">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Command Center</p>
                 <p className="text-sm font-black">شاشة العرض المركزية</p>
              </div>
            </button>
          )}
        </>
      )}

      {showCommandCenter && (
        <div className="fixed inset-0 z-[1000] no-print">
          <div className="absolute top-6 left-6 z-[1001]">
            <button onClick={() => setShowCommandCenter(false)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all">
              <X size={24} />
            </button>
          </div>
          <ControlRoomMonitor 
            absences={absences}
            supervisions={supervisions}
            users={users}
            deliveryLogs={deliveryLogs}
            students={students}
            requests={controlRequests}
          />
        </div>
      )}

      <div className="fixed top-4 left-4 z-[500] flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)] no-print">
        {notifications.map(n => (
          <div key={n.id} className={`${n.type === 'broadcast' ? 'bg-blue-600 border-blue-400 shadow-blue-500/30' : 'bg-slate-900 border-slate-700 shadow-black/50'} text-white border-r-8 px-6 py-5 rounded-3xl flex items-start gap-4 animate-slide-up relative overflow-hidden shadow-2xl`}>
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full -mr-12 -mt-12"></div>
             <Bell size={24} className={`shrink-0 mt-1 ${n.type === 'broadcast' ? 'animate-pulse text-white' : 'text-blue-400'}`} />
             <div className="flex-1 relative z-10">
               <p className="font-bold text-[13px] leading-relaxed break-words whitespace-pre-wrap">{n.text}</p>
               <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} className="mt-2 text-[10px] font-black uppercase text-blue-200 hover:text-white transition-colors">إخفاء التنبيه</button>
             </div>
          </div>
        ))}
      </div>

      <main className={`transition-all duration-300 min-h-screen ${currentUser ? (isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-72') : ''} ${currentUser ? 'p-6 lg:p-10 pt-24 lg:pt-10' : ''}`}>
        {currentUser ? renderContent() : <Login users={users} onLogin={handleLogin} />}
      </main>
    </div>
  );
};

export default App;
