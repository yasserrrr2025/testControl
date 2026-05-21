import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  MonitorPlay,
  PackageCheck,
  Radio,
  ShieldCheck,
  Sparkles,
  Timer,
  Truck,
  UserCheck,
  UserX,
  Users,
  Zap,
} from 'lucide-react';
import { Absence, ControlRequest, DeliveryLog, Student, Supervision, User } from '../../types';
import { getAbsenceKindLabel, getAbsenceReceipt } from '../../services/absenceReceipt';

interface Props {
  absences: Absence[];
  supervisions: Supervision[];
  users: User[];
  deliveryLogs: DeliveryLog[];
  students: Student[];
  requests: ControlRequest[];
}

type Scene = 'overview' | 'map' | 'alerts' | 'attendance' | 'timeline';

const sceneOrder: Scene[] = ['overview', 'map', 'alerts', 'attendance', 'timeline'];

const formatTime = (value?: string) => {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
};

const ControlRoomMonitor2: React.FC<Props> = ({ absences, supervisions, users, deliveryLogs, students, requests }) => {
  const [now, setNow] = useState(new Date());
  const [scene, setScene] = useState<Scene>('overview');
  const activeDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setScene(prev => sceneOrder[(sceneOrder.indexOf(prev) + 1) % sceneOrder.length]);
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  const committees = useMemo(() => {
    const nums = Array.from(new Set(students.map(s => s.committee_number))).filter(Boolean).sort((a, b) => Number(a) - Number(b));
    return nums.map(num => {
      const committeeStudents = students.filter(s => s.committee_number === num);
      const grades = Array.from(new Set(committeeStudents.map(s => s.grade)));
      const supervision = supervisions.find(s => s.committee_number === num);
      const proctor = users.find(u => u.id === supervision?.teacher_id);
      const logs = deliveryLogs.filter(l => l.committee_number === num && l.time.startsWith(activeDate));
      const confirmed = grades.length > 0 && grades.every(g => logs.some(l => l.grade === g && l.status === 'CONFIRMED'));
      const submitted = !confirmed && grades.length > 0 && grades.every(g => logs.some(l => l.grade === g));
      const pendingAlert = requests.some(r => r.committee === num && r.status === 'PENDING');
      const inProgressAlert = requests.some(r => r.committee === num && r.status === 'IN_PROGRESS');
      const committeeAbsences = absences.filter(a => a.committee_number === num);
      const status = confirmed ? 'confirmed' : pendingAlert ? 'alert' : submitted ? 'submitted' : inProgressAlert ? 'progress' : supervision ? 'active' : 'idle';
      const receiptLog = logs.find(l => l.status === 'CONFIRMED');
      const closeLog = logs.find(l => l.status === 'PENDING');

      return {
        num,
        grades,
        proctorName: proctor?.full_name || 'غير مسندة',
        totalStudents: committeeStudents.length,
        absents: committeeAbsences.filter(a => a.type === 'ABSENT').length,
        lates: committeeAbsences.filter(a => a.type === 'LATE').length,
        status,
        joinedAt: supervision?.date,
        closedAt: closeLog?.time,
        receivedAt: receiptLog?.time,
        receiverName: receiptLog?.teacher_name || '',
      };
    });
  }, [absences, activeDate, deliveryLogs, requests, students, supervisions, users]);

  const insights = useMemo(() => {
    const total = committees.length;
    const confirmed = committees.filter(c => c.status === 'confirmed').length;
    const active = committees.filter(c => c.status === 'active' || c.status === 'progress' || c.status === 'alert').length;
    const submitted = committees.filter(c => c.status === 'submitted').length;
    const idle = committees.filter(c => c.status === 'idle').length;
    const urgent = requests.filter(r => r.status === 'PENDING').length;
    const activeRequests = requests.filter(r => r.status !== 'DONE').length;
    const absentCount = absences.filter(a => a.type === 'ABSENT').length;
    const lateCount = absences.filter(a => a.type === 'LATE').length;
    const progress = total ? Math.round((confirmed / total) * 100) : 0;

    const receiptDurations = committees
      .map(c => {
        const start = c.closedAt || c.joinedAt;
        if (!start || !c.receivedAt) return null;
        const mins = Math.max(0, Math.round((new Date(c.receivedAt).getTime() - new Date(start).getTime()) / 60000));
        return { ...c, mins };
      })
      .filter(Boolean) as Array<any>;

    const fastest = [...receiptDurations].sort((a, b) => a.mins - b.mins)[0];
    const delayed = [
      ...receiptDurations.filter(c => c.mins > 10).sort((a, b) => b.mins - a.mins),
      ...committees.filter(c => c.status === 'submitted').map(c => ({ ...c, mins: null })),
    ].slice(0, 5);

    const alertsByCommittee = requests.reduce((acc, item) => {
      const key = item.committee || 'غير محدد';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topAlert = Object.entries(alertsByCommittee).sort((a, b) => b[1] - a[1])[0];

    const attendanceHotspot = [...committees].sort((a, b) => (b.absents + b.lates) - (a.absents + a.lates))[0];

    return {
      total,
      confirmed,
      active,
      submitted,
      idle,
      urgent,
      activeRequests,
      absentCount,
      lateCount,
      progress,
      fastest,
      delayed,
      topAlert: topAlert ? { committee: topAlert[0], count: topAlert[1] } : null,
      attendanceHotspot,
    };
  }, [absences, committees, requests]);

  const recentEvents = useMemo(() => {
    const deliveryEvents = deliveryLogs.map(log => ({
      time: log.time,
      tone: log.status === 'CONFIRMED' ? 'emerald' : 'orange',
      title: log.status === 'CONFIRMED' ? 'استلام نهائي' : 'إغلاق ميداني',
      text: `لجنة ${log.committee_number} - ${log.grade} - ${log.teacher_name}`,
      icon: log.status === 'CONFIRMED' ? PackageCheck : Truck,
    }));
    const requestEvents = requests.map(req => ({
      time: req.time,
      tone: req.status === 'DONE' ? 'slate' : 'red',
      title: req.status === 'DONE' ? 'إغلاق بلاغ' : 'بلاغ لجنة',
      text: `لجنة ${req.committee} - ${req.text}`,
      icon: BellRing,
    }));
    const absenceEvents = absences.map(absence => ({
      time: absence.date,
      tone: absence.type === 'ABSENT' ? 'rose' : 'amber',
      title: getAbsenceKindLabel(absence.type),
      text: `لجنة ${absence.committee_number} - ${absence.student_name}`,
      icon: absence.type === 'ABSENT' ? UserX : Timer,
    }));
    return [...deliveryEvents, ...requestEvents, ...absenceEvents].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12);
  }, [absences, deliveryLogs, requests]);

  const newsItems = useMemo(() => {
    const items = [
      `نسبة الإنجاز الآن ${insights.progress}% من إجمالي اللجان`,
      insights.urgent ? `${insights.urgent} بلاغ عاجل يحتاج متابعة فورية` : 'لا توجد بلاغات عاجلة حالياً',
      insights.submitted ? `${insights.submitted} لجنة متجهة للكنترول بانتظار المطابقة` : 'لا توجد لجان في الطريق للكنترول',
      insights.fastest ? `أسرع استلام: لجنة ${insights.fastest.num} خلال ${insights.fastest.mins} دقيقة` : 'بانتظار اكتمال أول استلام',
      insights.attendanceHotspot && (insights.attendanceHotspot.absents || insights.attendanceHotspot.lates)
        ? `أعلى حالات حضور: لجنة ${insights.attendanceHotspot.num} (${insights.attendanceHotspot.absents} غياب، ${insights.attendanceHotspot.lates} تأخير)`
        : 'حالات الحضور مستقرة حتى الآن',
    ];
    return [...items, ...items];
  }, [insights]);

  const statusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'from-emerald-500 to-teal-500 border-emerald-200 shadow-emerald-500/30';
      case 'alert': return 'from-red-600 to-rose-500 border-red-200 shadow-red-500/60 animate-pulse';
      case 'submitted': return 'from-orange-500 to-amber-400 border-orange-100 shadow-orange-500/60 tv2-flash';
      case 'progress': return 'from-indigo-500 to-blue-500 border-blue-200 shadow-blue-500/40';
      case 'active': return 'from-blue-600 to-cyan-500 border-blue-200 shadow-blue-500/30';
      default: return 'from-slate-700 to-slate-600 border-slate-400/30 shadow-slate-700/20 opacity-70';
    }
  };

  const topCards = [
    { label: 'نسبة الإنجاز', value: `${insights.progress}%`, icon: Gauge, tone: 'text-emerald-300', sub: `${insights.confirmed} من ${insights.total} لجنة` },
    { label: 'لجان نشطة', value: insights.active, icon: Activity, tone: 'text-blue-300', sub: 'قيد المتابعة' },
    { label: 'متجه للكنترول', value: insights.submitted, icon: Truck, tone: 'text-orange-300', sub: 'بانتظار المطابقة' },
    { label: 'بلاغات مفتوحة', value: insights.activeRequests, icon: BellRing, tone: 'text-red-300', sub: `${insights.urgent} عاجل` },
    { label: 'غياب', value: insights.absentCount, icon: UserX, tone: 'text-rose-300', sub: 'حالات مرصودة' },
    { label: 'تأخير', value: insights.lateCount, icon: Timer, tone: 'text-amber-300', sub: 'حالات مرصودة' },
  ];

  const SceneBadge = ({ id, label }: { id: Scene; label: string }) => (
    <button
      onClick={() => setScene(id)}
      className={`h-2 flex-1 rounded-full transition-all ${scene === id ? 'bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.8)]' : 'bg-white/10'}`}
      aria-label={label}
      title={label}
    />
  );

  return (
    <div className="tv2-root fixed inset-0 overflow-hidden bg-[#020617] text-white font-['Tajawal']" dir="rtl">
      <div className="pointer-events-none absolute inset-0 tv2-grid-bg" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-orange-500/20 blur-[130px]" />

      <div className="relative z-10 flex h-full flex-col p-5 2xl:p-8">
        <header className="mb-5 flex h-24 items-center justify-between gap-5">
          <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-4 shadow-2xl backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400 text-slate-950 shadow-[0_0_35px_rgba(251,146,60,0.55)]">
              <MonitorPlay size={30} />
            </div>
            <div>
              <p className="text-xs font-black text-orange-200">TV2 العرض الذكي</p>
              <h1 className="text-3xl font-black tracking-tight">غرفة الكنترول الحية</h1>
            </div>
          </div>

          <div className="min-w-0 flex-1 px-4">
            <div className="mb-3 flex items-center justify-center gap-3 text-sm font-black text-slate-300">
              <Radio size={18} className="animate-pulse text-emerald-300" />
              <span>عرض تلقائي متزامن مع اللجان والبلاغات والاستلام</span>
            </div>
            <div className="mx-auto flex max-w-xl gap-2">
              <SceneBadge id="overview" label="المؤشرات" />
              <SceneBadge id="map" label="الخريطة" />
              <SceneBadge id="alerts" label="البلاغات" />
              <SceneBadge id="attendance" label="الحضور" />
              <SceneBadge id="timeline" label="السجل" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-4 text-left shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black text-slate-400">الوقت الآن</p>
            <p className="font-mono text-4xl font-black tabular-nums text-orange-200">
              {now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-6 gap-4">
          {topCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400">{card.label}</p>
                    <p className="mt-2 text-4xl font-black tabular-nums">{card.value}</p>
                  </div>
                  <Icon className={card.tone} size={30} />
                </div>
                <p className="mt-3 truncate text-xs font-bold text-slate-400">{card.sub}</p>
              </div>
            );
          })}
        </section>

        <main className="min-h-0 flex-1">
          {scene === 'overview' && (
            <div className="grid h-full grid-cols-12 gap-5 tv2-scene">
              <div className="col-span-7 rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-orange-200">المؤشر العام</p>
                    <h2 className="text-5xl font-black tracking-tight">نبض اليوم الاختباري</h2>
                  </div>
                  <Sparkles size={44} className="text-orange-300" />
                </div>
                <div className="grid grid-cols-[18rem_1fr] gap-8">
                  <div className="relative grid aspect-square place-items-center rounded-full bg-slate-950 shadow-inner">
                    <div className="absolute inset-4 rounded-full border-[18px] border-white/5" />
                    <div
                      className="absolute inset-4 rounded-full"
                      style={{ background: `conic-gradient(#34d399 ${insights.progress * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}
                    />
                    <div className="absolute inset-12 rounded-full bg-[#020617]" />
                    <div className="relative text-center">
                      <p className="text-7xl font-black tabular-nums">{insights.progress}%</p>
                      <p className="text-xs font-black text-slate-400">اكتمال الاستلام</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['مكتملة', insights.confirmed, 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20'],
                      ['نشطة', insights.active, 'bg-blue-500/15 text-blue-200 border-blue-400/20'],
                      ['في الطريق', insights.submitted, 'bg-orange-500/15 text-orange-200 border-orange-400/20'],
                      ['غير مسندة', insights.idle, 'bg-slate-500/15 text-slate-200 border-slate-400/20'],
                    ].map(([label, value, cls]) => (
                      <div key={String(label)} className={`rounded-[2rem] border p-6 ${cls}`}>
                        <p className="text-xs font-black opacity-70">{label}</p>
                        <p className="mt-4 text-6xl font-black tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-5 grid grid-rows-2 gap-5">
                <div className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-red-500/10 p-7 shadow-2xl">
                  <div className="mb-5 flex items-center gap-3">
                    <Flame size={34} className="text-orange-300" />
                    <h3 className="text-3xl font-black">أبرز لقطة</h3>
                  </div>
                  <p className="text-lg font-bold leading-9 text-orange-50">
                    {insights.fastest
                      ? `أسرع استلام حتى الآن للجنة ${insights.fastest.num} خلال ${insights.fastest.mins} دقيقة.`
                      : insights.submitted
                        ? `${insights.submitted} لجنة أغلقت ميدانيًا وتتجه للكنترول.`
                        : 'بانتظار اكتمال أول عملية استلام نهائية.'}
                  </p>
                </div>
                <div className="rounded-[3rem] border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
                  <div className="mb-5 flex items-center gap-3">
                    <Zap size={34} className="text-cyan-300" />
                    <h3 className="text-3xl font-black">تنبيه ذكي</h3>
                  </div>
                  <p className="text-lg font-bold leading-9 text-slate-200">
                    {insights.topAlert
                      ? `لجنة ${insights.topAlert.committee} هي الأكثر بلاغًا اليوم بعدد ${insights.topAlert.count} بلاغ.`
                      : insights.attendanceHotspot && (insights.attendanceHotspot.absents || insights.attendanceHotspot.lates)
                        ? `أعلى حالات حضور في لجنة ${insights.attendanceHotspot.num}.`
                        : 'الوضع مستقر ولا توجد نقاط حرجة بارزة الآن.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {scene === 'map' && (
            <div className="h-full rounded-[3rem] border border-white/10 bg-white/[0.035] p-8 shadow-2xl backdrop-blur-xl tv2-scene">
              <div className="mb-7 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <LayoutGrid size={44} className="text-cyan-300" />
                  <div>
                    <h2 className="text-5xl font-black">خريطة اللجان الحية</h2>
                    <p className="mt-2 text-sm font-black text-slate-400">الألوان: أزرق نشطة، أخضر مكتملة، برتقالي متجهة، أحمر بلاغ، رمادي غير مسندة.</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-black">
                  <span className="rounded-full bg-blue-500 px-4 py-2">نشطة</span>
                  <span className="rounded-full bg-orange-500 px-4 py-2">متجهة</span>
                  <span className="rounded-full bg-red-600 px-4 py-2">بلاغ</span>
                  <span className="rounded-full bg-emerald-500 px-4 py-2">مكتملة</span>
                </div>
              </div>
              <div className="grid h-[calc(100%-7rem)] grid-cols-[repeat(auto-fit,minmax(8.2rem,1fr))] content-start gap-5 overflow-hidden">
                {committees.map(c => (
                  <div key={c.num} className={`relative aspect-[1.18] overflow-hidden rounded-[2rem] border-2 bg-gradient-to-br p-4 shadow-2xl ${statusStyle(c.status)}`}>
                    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                    {c.status === 'submitted' && <Truck className="absolute left-4 top-4 animate-bounce text-white/80" size={26} />}
                    {c.status === 'alert' && <BellRing className="absolute left-4 top-4 animate-pulse text-white" size={26} />}
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div>
                        <p className="text-xs font-black opacity-75">لجنة</p>
                        <p className="text-6xl font-black leading-none tabular-nums">{c.num}</p>
                      </div>
                      <div>
                        <p className="truncate text-xs font-black opacity-80">{c.proctorName}</p>
                        <p className="mt-1 text-[10px] font-black opacity-70">{c.totalStudents} طالب · {c.grades.length} صف</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scene === 'alerts' && (
            <div className="grid h-full grid-cols-12 gap-5 tv2-scene">
              <div className="col-span-7 rounded-[3rem] border border-red-400/20 bg-red-500/10 p-8 shadow-2xl">
                <div className="mb-7 flex items-center gap-4">
                  <BellRing size={44} className="animate-pulse text-red-300" />
                  <div>
                    <h2 className="text-5xl font-black">لوحة البلاغات</h2>
                    <p className="mt-2 text-sm font-black text-red-100">متابعة البلاغات المفتوحة والمغلقة خلال اليوم.</p>
                  </div>
                </div>
                <div className="space-y-4 overflow-hidden">
                  {requests.length ? requests.slice(0, 6).map(req => (
                    <div key={req.id} className={`rounded-[2rem] border p-5 ${req.status === 'DONE' ? 'border-white/10 bg-white/5 opacity-60' : 'border-red-300/30 bg-red-600/20'}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-2xl bg-slate-950 px-5 py-2 text-xl font-black">لجنة {req.committee}</span>
                        <span className="font-mono text-sm font-black text-red-100">{formatTime(req.time)}</span>
                      </div>
                      <p className="text-2xl font-black leading-9">{req.text}</p>
                      <p className="mt-2 text-xs font-black text-red-100/70">{req.from}</p>
                    </div>
                  )) : (
                    <div className="grid h-96 place-items-center rounded-[3rem] border border-emerald-400/20 bg-emerald-500/10 text-center">
                      <div>
                        <CheckCircle2 size={90} className="mx-auto text-emerald-300" />
                        <p className="mt-5 text-4xl font-black">لا توجد بلاغات</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-5 rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                <h3 className="mb-6 text-4xl font-black">أكثر اللجان احتياجًا للمتابعة</h3>
                <div className="space-y-4">
                  {committees
                    .filter(c => c.status === 'alert' || c.absents || c.lates || c.status === 'submitted')
                    .slice(0, 6)
                    .map(c => (
                      <div key={c.num} className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                        <div>
                          <p className="text-2xl font-black">لجنة {c.num}</p>
                          <p className="text-xs font-bold text-slate-400">{c.proctorName}</p>
                        </div>
                        <div className="flex gap-2 text-xs font-black">
                          {c.absents > 0 && <span className="rounded-xl bg-rose-500 px-3 py-2">{c.absents} غياب</span>}
                          {c.lates > 0 && <span className="rounded-xl bg-amber-500 px-3 py-2">{c.lates} تأخير</span>}
                          {c.status === 'submitted' && <span className="rounded-xl bg-orange-500 px-3 py-2">في الطريق</span>}
                          {c.status === 'alert' && <span className="rounded-xl bg-red-600 px-3 py-2">بلاغ</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {scene === 'attendance' && (
            <div className="grid h-full grid-cols-12 gap-5 tv2-scene">
              <div className="col-span-5 rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                <div className="mb-8 flex items-center gap-4">
                  <Users size={44} className="text-amber-300" />
                  <div>
                    <h2 className="text-5xl font-black">الحضور والغياب</h2>
                    <p className="mt-2 text-sm font-black text-slate-400">استلام الغياب والتأخير يظهر مباشرة.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-[3rem] bg-rose-500/15 p-8 text-center text-rose-100">
                    <UserX size={54} className="mx-auto mb-4" />
                    <p className="text-7xl font-black">{insights.absentCount}</p>
                    <p className="text-sm font-black">غياب</p>
                  </div>
                  <div className="rounded-[3rem] bg-amber-500/15 p-8 text-center text-amber-100">
                    <Timer size={54} className="mx-auto mb-4" />
                    <p className="text-7xl font-black">{insights.lateCount}</p>
                    <p className="text-sm font-black">تأخير</p>
                  </div>
                </div>
              </div>
              <div className="col-span-7 rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                <h3 className="mb-6 text-4xl font-black">آخر حالات الغياب والتأخير</h3>
                <div className="space-y-4 overflow-hidden">
                  {absences.length ? absences.slice(0, 7).map(a => {
                    const receipt = getAbsenceReceipt(a);
                    return (
                      <div key={a.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                        <div>
                          <p className="text-2xl font-black">{a.student_name}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">لجنة {a.committee_number} · {formatTime(a.date)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-2xl px-4 py-2 text-xs font-black ${a.type === 'ABSENT' ? 'bg-rose-500' : 'bg-amber-500'}`}>{getAbsenceKindLabel(a.type)}</span>
                          <span className={`rounded-2xl px-4 py-2 text-xs font-black ${receipt ? 'bg-emerald-500/20 text-emerald-200' : 'bg-orange-500/20 text-orange-200 animate-pulse'}`}>
                            {receipt ? `استلمه ${receipt.by}` : 'بانتظار الاستلام'}
                          </span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="grid h-96 place-items-center rounded-[3rem] border border-emerald-400/20 bg-emerald-500/10 text-center">
                      <div>
                        <ShieldCheck size={90} className="mx-auto text-emerald-300" />
                        <p className="mt-5 text-4xl font-black">لا توجد حالات مسجلة</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {scene === 'timeline' && (
            <div className="h-full rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl tv2-scene">
              <div className="mb-7 flex items-center gap-4">
                <Clock3 size={44} className="text-cyan-300" />
                <div>
                  <h2 className="text-5xl font-black">الشريط الزمني للعمليات</h2>
                  <p className="mt-2 text-sm font-black text-slate-400">آخر حركة في النظام خلال اليوم.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                {recentEvents.slice(0, 9).map((event, idx) => {
                  const Icon = event.icon;
                  return (
                    <div key={`${event.time}-${idx}`} className="rounded-[2rem] border border-white/10 bg-slate-950/50 p-5 shadow-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <Icon size={28} className={
                          event.tone === 'red' ? 'text-red-300' :
                          event.tone === 'orange' ? 'text-orange-300' :
                          event.tone === 'rose' ? 'text-rose-300' :
                          event.tone === 'amber' ? 'text-amber-300' :
                          event.tone === 'emerald' ? 'text-emerald-300' : 'text-slate-300'
                        } />
                        <span className="font-mono text-xs font-black text-slate-500">{formatTime(event.time)}</span>
                      </div>
                      <p className="text-xl font-black">{event.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-slate-300">{event.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <footer className="mt-5 flex h-14 items-center gap-4 overflow-hidden rounded-[1.8rem] border border-orange-300/20 bg-orange-500/10 px-5">
          <Megaphone size={26} className="shrink-0 text-orange-200" />
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="tv2-news-track flex gap-12 whitespace-nowrap text-lg font-black text-orange-50">
              {newsItems.map((item, idx) => <span key={idx}>{item}</span>)}
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .tv2-grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
        }
        .tv2-scene {
          animation: tv2SceneIn 700ms cubic-bezier(.2,.9,.2,1) both;
        }
        .tv2-news-track {
          width: max-content;
          animation: tv2Ticker 44s linear infinite;
        }
        .tv2-flash {
          animation: tv2OrangeFlash 1.4s ease-in-out infinite;
        }
        @keyframes tv2SceneIn {
          from { opacity: 0; transform: translateY(20px) scale(.985); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes tv2Ticker {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @keyframes tv2OrangeFlash {
          0%, 100% { box-shadow: 0 0 22px rgba(249,115,22,.45); filter: saturate(1); }
          50% { box-shadow: 0 0 58px rgba(249,115,22,.95); filter: saturate(1.3); }
        }
        @media (max-width: 1300px) {
          .tv2-root header { height: 5.5rem; }
          .tv2-root h1, .tv2-root h2 { font-size: clamp(1.8rem, 3vw, 3rem); }
          .tv2-root .grid-cols-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
};

export default ControlRoomMonitor2;
