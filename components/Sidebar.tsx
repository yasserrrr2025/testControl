
import React from 'react';
import { 
  LayoutDashboard, Users, GraduationCap, ClipboardList, LogOut,
  ShieldAlert, Inbox, FileText, Settings, X, ChevronRight, ChevronLeft,
  History, IdCard, UserCircle, ShieldCheck, ShieldHalf, Bell, Shield,
  Monitor, Fingerprint, MonitorPlay, Award, LayoutPanelTop, QrCode,
  FileSpreadsheet, MessageSquareQuote
} from 'lucide-react';
import { UserRole, User, ControlRequest } from '../types';
import { APP_CONFIG, ROLES_ARABIC } from '../constants';

interface SidebarLink {
  id: string;
  label: string;
  icon: any;
  badge?: number | null;
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  controlRequests?: ControlRequest[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  user, onLogout, activeTab, setActiveTab, isOpen, setIsOpen, isCollapsed, setIsCollapsed, controlRequests = []
}) => {
  const role = user?.role || 'PROCTOR';
  
  const pendingCount = controlRequests.filter(r => 
    (role === 'PROCTOR' ? r.from === user.full_name : user.assigned_committees?.includes(r.committee)) && 
    (r.status === 'PENDING' || r.status === 'IN_PROGRESS')
  ).length;

  const adminLinks: SidebarLink[] = [
    { id: 'head-dash', label: 'غرفة العمليات', icon: LayoutPanelTop },
    { id: 'dashboard', label: 'الإحصائيات العامة', icon: LayoutDashboard },
    { id: 'control-monitor', label: 'لوحة العرض (TV)', icon: MonitorPlay },
    { id: 'control-manager', label: 'مركز القيادة', icon: ShieldHalf },
    { id: 'proctor-excellence', label: 'سجل التميز', icon: Award },
    { id: 'committee-labels', label: 'ملصقات اللجان (QR)', icon: QrCode },
    { id: 'teachers', label: 'الصلاحيات', icon: Users },
    { id: 'students', label: 'الطلاب', icon: GraduationCap },
    { id: 'committees', label: 'المراقبة', icon: ClipboardList },
    { id: 'daily-reports', label: 'التقارير اليومية', icon: FileSpreadsheet },
    { id: 'official-forms', label: 'النماذج', icon: FileText },
    { id: 'settings', label: 'إعدادات النظام', icon: Settings },
  ];

  const controlManagerLinks: SidebarLink[] = [
    { id: 'head-dash', label: 'غرفة العمليات', icon: LayoutPanelTop },
    { id: 'control-manager', label: 'مركز القيادة', icon: ShieldHalf },
    { id: 'paper-logs', label: 'استلام المظاريف', icon: Inbox },
    { id: 'receipt-history', label: 'سجل العمليات', icon: History },
  ];

  const proctorLinks: SidebarLink[] = [
    { id: 'my-tasks', label: 'رصد اللجنة', icon: ClipboardList },
    { id: 'proctor-alerts', label: 'سجل البلاغات', icon: MessageSquareQuote, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'digital-id', label: 'الهوية الرقمية', icon: Fingerprint },
  ];

  const counselorLinks: SidebarLink[] = [
    { id: 'student-absences', label: 'متابعة الغياب', icon: Users },
  ];

  const controlLinks: SidebarLink[] = [
    { id: 'paper-logs', label: 'استلام المظاريف', icon: Inbox },
    { id: 'receipt-history', label: 'سجل العمليات', icon: History },
  ];

  const assistantControlLinks: SidebarLink[] = [
    { id: 'assigned-requests', label: 'بلاغات اللجان', icon: ShieldAlert, badge: pendingCount > 0 ? pendingCount : null },
  ];

  const links = role === 'ADMIN' ? adminLinks : 
                role === 'CONTROL_MANAGER' ? controlManagerLinks :
                role === 'PROCTOR' ? proctorLinks : 
                role === 'COUNSELOR' ? counselorLinks : 
                role === 'ASSISTANT_CONTROL' ? assistantControlLinks :
                controlLinks;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setIsOpen(false)}/>
      )}

      <div className={`fixed right-0 top-0 h-full bg-[#020617] text-white shadow-2xl z-[110] flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0 w-80' : 'translate-x-full lg:translate-x-0'} ${!isOpen && isCollapsed ? 'lg:w-24' : 'lg:w-80'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
               <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="animate-fade-in whitespace-nowrap text-right">
                <h1 className="text-lg font-black text-blue-400 leading-none tracking-tighter uppercase">كنترول الاختبارات</h1>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Smart Control System</p>
              </div>
            )}
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex p-2 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors">
            {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => { setActiveTab(link.id); setIsOpen(false); }}
              className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all group relative ${isCollapsed && !isOpen ? 'justify-center' : 'gap-4 flex-row-reverse'} ${activeTab === link.id ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <link.icon size={22} className={activeTab === link.id ? 'animate-pulse' : 'shrink-0 group-hover:scale-110 transition-transform'} />
              {(!isCollapsed || isOpen) && <span className="font-bold text-sm flex-1 text-right">{link.label}</span>}
              {link.badge && (
                <span className={`absolute ${isCollapsed && !isOpen ? 'top-2 right-2' : 'left-4'} bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-[#020617]`}>
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {(!isCollapsed || isOpen) && (
          <div className="px-6 pb-4">
            <div className="bg-[#0f172a] rounded-[2rem] p-5 border border-blue-900/30 relative overflow-hidden group shadow-2xl transition-all hover:border-blue-500/50">
               <div className="absolute top-0 left-0 w-24 h-24 bg-blue-600/10 blur-3xl rounded-full -ml-12 -mt-12"></div>
               <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-white rounded-xl p-1.5 shadow-xl border border-white/10 group-hover:scale-105 transition-transform">
                     <img src={APP_CONFIG.LOGO_URL} alt="MinLogo" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-black text-white leading-tight mb-2 truncate max-w-[180px]">{user.full_name}</h4>
                    <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg text-[10px] font-black inline-block uppercase tracking-tight">
                       {ROLES_ARABIC[user.role]}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/5">
          <button onClick={onLogout} className={`w-full flex items-center px-4 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all font-bold text-sm ${isCollapsed && !isOpen ? 'justify-center' : 'gap-4 flex-row-reverse'}`}>
            <LogOut size={20} className="shrink-0" />
            {(!isCollapsed || isOpen) && <span className="flex-1 text-right">تسجيل الخروج</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
