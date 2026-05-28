import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarPlus,
  Check,
  FileDown,
  Printer,
  RefreshCcw,
  Repeat,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
  Wand2,
} from 'lucide-react';
import { Student, Supervision, User } from '../../types';
import { supabase } from '../../supabase';
import { APP_CONFIG } from '../../constants';

export interface SmartExamSlot {
  id: string;
  date: string;
  subject: string;
  period: number;
}

export interface SmartDistributionItem {
  id: string;
  slotId: string;
  date: string;
  subject: string;
  period: number;
  committeeNumber: string;
  teacherId: string;
  teacherName: string;
  assignedCount: number;
  reserveCount: number;
  previousCount: number;
  forcedRepeat: boolean;
  assignmentType?: 'PRIMARY' | 'RESERVE';
  reserveOrder?: number;
}

interface Props {
  users: User[];
  students: Student[];
  supervisions: Supervision[];
  activeDate?: string;
  onCommit: (items: SmartDistributionItem[], replaceExisting: boolean) => Promise<void>;
  onDeleteSupervisions?: (ids: string[]) => Promise<void>;
}

const isReserveSupervision = (item: Supervision) => String(item.subject || '').includes('[RESERVE]');
const cleanSubject = (subject?: string) => String(subject || 'ط§ط®طھط¨ط§ط±').replace('[RESERVE]', '').trim() || 'ط§ط®طھط¨ط§ط±';
const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const formatOfficialDate = (date: string) => {
  const key = date || today();
  const [year, month, day] = key.split('-');
  return `${year}/${month}/${day}`;
};

const getArabicDay = (date: string) => (
  new Date(`${date || today()}T12:00:00`).toLocaleDateString('ar-SA', { weekday: 'long' })
);

const OfficialDistributionHeader: React.FC<{ date: string }> = ({ date }) => (
  <div className="distribution-official-header">
    <div className="official-side official-right">
      <div>ط§ظ„ظ…ظ…ظ„ظƒط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط³ط¹ظˆط¯ظٹط©</div>
      <div>ظˆط²ط§ط±ط© ط§ظ„طھط¹ظ„ظٹظ…</div>
      <div>ط¥ط¯ط§ط±ط© ط§ظ„طھط¹ظ„ظٹظ… ط¨ظ…ط­ط§ظپط¸ط© ط¬ط¯ط©</div>
      <div>ظ…ط¯ط±ط³ط© ط¹ظ…ط§ط¯ ط§ظ„ط¯ظٹظ† ط²ظ†ظƒظٹ ط§ظ„ظ…طھظˆط³ط·ط©</div>
    </div>
    <div className="official-logo">
      <img src={APP_CONFIG.LOGO_URL} alt="ظˆط²ط§ط±ط© ط§ظ„طھط¹ظ„ظٹظ…" />
      <div>ظ†ط¸ط§ظ… ظƒظ†طھط±ظˆظ„ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ</div>
    </div>
    <div className="official-side official-left">
      <div>ط§ظ„طھط§ط±ظٹط®: {formatOfficialDate(date)}</div>
      <div>ط§ظ„ظٹظˆظ…: {getArabicDay(date)}</div>
      <div>ط§ظ„ط¹ط§ظ… ط§ظ„ط¯ط±ط§ط³ظٹ: 1446 / 1447</div>
    </div>
  </div>
);

const SmartProctorDistribution: React.FC<Props> = ({
  users,
  students,
  supervisions,
  activeDate,
  onCommit,
  onDeleteSupervisions,
}) => {
  const committees = useMemo(
    () => Array.from(new Set(students.map(s => s.committee_number).filter(Boolean))).sort((a, b) => Number(a) - Number(b)),
    [students],
  );
  const proctors = useMemo(() => users.filter(u => u.role === 'PROCTOR'), [users]);

  const [slots, setSlots] = useState<SmartExamSlot[]>([
    { id: crypto.randomUUID(), date: activeDate || today(), subject: 'ط§ط®طھط¨ط§ط±', period: 1 },
  ]);
  const [selectedExclusionDate, setSelectedExclusionDate] = useState(activeDate || today());
  const [exclusionSearch, setExclusionSearch] = useState('');
  const [excludedByDate, setExcludedByDate] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('smart_proctor_exclusions_by_date') || '{}');
    } catch {
      return {};
    }
  });
  const [preview, setPreview] = useState<SmartDistributionItem[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [distributionDateFilter, setDistributionDateFilter] = useState(activeDate || today());
  const [distributionSubjectFilter, setDistributionSubjectFilter] = useState('');
  const [previewDateFilter, setPreviewDateFilter] = useState('');
  const [previewSubjectFilter, setPreviewSubjectFilter] = useState('');
  const [previewPeriodFilter, setPreviewPeriodFilter] = useState('');
  const [previewCommitteeFilter, setPreviewCommitteeFilter] = useState('');
  const [previewTeacherFilter, setPreviewTeacherFilter] = useState('');
  const [isPrintingDistribution, setIsPrintingDistribution] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [reserveCountPerSlot, setReserveCountPerSlot] = useState(2);

  const assignedCounts = useMemo(() => {
    return supervisions.filter(item => !isReserveSupervision(item)).reduce<Record<string, number>>((acc, item) => {
      acc[item.teacher_id] = (acc[item.teacher_id] || 0) + 1;
      return acc;
    }, {});
  }, [supervisions]);
  const reserveCounts = useMemo(() => {
    return supervisions.filter(isReserveSupervision).reduce<Record<string, number>>((acc, item) => {
      acc[item.teacher_id] = (acc[item.teacher_id] || 0) + 1;
      return acc;
    }, {});
  }, [supervisions]);
  const previousCounts = useMemo(() => {
    return supervisions.filter(item => !isReserveSupervision(item)).reduce<Record<string, number>>((acc, item) => {
      const d = new Date(item.date);
      const started = item.date && !Number.isNaN(d.getTime()) && !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
      if (started) acc[item.teacher_id] = (acc[item.teacher_id] || 0) + 1;
      return acc;
    }, {});
  }, [supervisions]);

  const slotDates = useMemo(
    () => Array.from(new Set(slots.map(slot => slot.date || today()))).sort(),
    [slots],
  );
  const excludedIdsForSelectedDate = excludedByDate[selectedExclusionDate] || [];
  const sortedProctors = useMemo(
    () => [...proctors].sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')),
    [proctors],
  );
  const filteredProctors = useMemo(() => {
    const q = exclusionSearch.trim().toLowerCase();
    if (!q) return sortedProctors;
    return sortedProctors.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      String(p.national_id || '').includes(q),
    );
  }, [sortedProctors, exclusionSearch]);
  const getEligibleProctors = (date: string) => {
    const excluded = excludedByDate[date] || [];
    return proctors.filter(p => !excluded.includes(p.id));
  };
  const eligibleProctors = getEligibleProctors(selectedExclusionDate);
  const subjectOptions = useMemo(
    () => Array.from(new Set(supervisions.filter(s => !isReserveSupervision(s)).map(s => cleanSubject(s.subject)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')),
    [supervisions],
  );
  const committedRows = useMemo(() => {
    return supervisions
      .filter(s => !isReserveSupervision(s))
      .filter(s => !distributionDateFilter || s.date?.slice(0, 10) === distributionDateFilter)
      .filter(s => !distributionSubjectFilter || cleanSubject(s.subject) === distributionSubjectFilter)
      .map(s => {
        const teacher = users.find(u => u.id === s.teacher_id);
        const assignedCount = supervisions.filter(x => x.teacher_id === s.teacher_id && !isReserveSupervision(x)).length;
        const previousCount = supervisions.filter(x => {
          if (x.teacher_id !== s.teacher_id || isReserveSupervision(x)) return false;
          const d = new Date(x.date);
          return x.date && !Number.isNaN(d.getTime()) && !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
        }).length;
        return {
          id: s.id,
          date: s.date?.slice(0, 10) || '',
          subject: cleanSubject(s.subject),
          period: s.period || 1,
          committeeNumber: s.committee_number,
          teacherName: teacher?.full_name || 'مراقب غير معروف',
          assignedCount,
          previousCount,
        };
      })
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        const byPeriod = a.period - b.period;
        if (byPeriod !== 0) return byPeriod;
        return Number(a.committeeNumber) - Number(b.committeeNumber);
      });
  }, [supervisions, users, distributionDateFilter, distributionSubjectFilter]);
  const controlHeadName = users.find(u => u.role === 'CONTROL_MANAGER')?.full_name || 'ط±ط¦ظٹط³ ط§ظ„ظƒظ†طھط±ظˆظ„';
  const schoolManagerName = users.find(u => u.role === 'ADMIN')?.full_name || 'ظ…ط¯ظٹط± ط§ظ„ظ…ط¯ط±ط³ط©';
  const printPages = useMemo(() => {
    const pageSize = 28;
    const pages = [];
    for (let i = 0; i < committedRows.length; i += pageSize) pages.push(committedRows.slice(i, i + pageSize));
    return pages.length ? pages : [[]];
  }, [committedRows]);

  const sortedPreview = useMemo(() => {
    const q = previewTeacherFilter.trim().toLowerCase();
    return preview
      .filter(item => !previewDateFilter || item.date === previewDateFilter)
      .filter(item => !previewSubjectFilter || item.subject === previewSubjectFilter)
      .filter(item => !previewPeriodFilter || String(item.period) === previewPeriodFilter)
      .filter(item => !previewCommitteeFilter || String(item.committeeNumber).includes(previewCommitteeFilter.trim()))
      .filter(item => !q || item.teacherName.toLowerCase().includes(q))
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        const bySubject = a.subject.localeCompare(b.subject, 'ar');
        if (bySubject !== 0) return bySubject;
        const byPeriod = a.period - b.period;
        if (byPeriod !== 0) return byPeriod;
        if (a.assignmentType !== b.assignmentType) return a.assignmentType === 'PRIMARY' ? -1 : 1;
        return Number(a.committeeNumber) - Number(b.committeeNumber);
      });
  }, [preview, previewDateFilter, previewSubjectFilter, previewPeriodFilter, previewCommitteeFilter, previewTeacherFilter]);

  const previewSubjects = useMemo(
    () => Array.from(new Set(preview.map(item => item.subject))).sort((a, b) => a.localeCompare(b, 'ar')),
    [preview],
  );
  const previewDates = useMemo(
    () => Array.from(new Set(preview.map(item => item.date))).sort(),
    [preview],
  );
  const previewPeriods = useMemo(
    () => Array.from(new Set(preview.map(item => String(item.period)))).sort((a, b) => Number(a) - Number(b)),
    [preview],
  );

  const fairnessRows = useMemo(() => {
    const additions = preview.filter(item => item.assignmentType !== 'RESERVE').reduce<Record<string, number>>((acc, item) => {
      acc[item.teacherId] = (acc[item.teacherId] || 0) + 1;
      return acc;
    }, {});
    const reserveAdditions = preview.filter(item => item.assignmentType === 'RESERVE').reduce<Record<string, number>>((acc, item) => {
      acc[item.teacherId] = (acc[item.teacherId] || 0) + 1;
      return acc;
    }, {});
    return proctors
      .map(p => {
        const before = assignedCounts[p.id] || 0;
        const added = additions[p.id] || 0;
        const reserveBefore = reserveCounts[p.id] || 0;
        const reserveAdded = reserveAdditions[p.id] || 0;
        const after = before + added;
        return { id: p.id, name: p.full_name, before, added, after, reserveBefore, reserveAdded, reserveAfter: reserveBefore + reserveAdded };
      })
      .sort((a, b) => {
        if (b.added !== a.added) return b.added - a.added;
        if (b.reserveAdded !== a.reserveAdded) return b.reserveAdded - a.reserveAdded;
        if (b.after !== a.after) return b.after - a.after;
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [preview, proctors, assignedCounts, reserveCounts]);

  const fairnessSummary = useMemo(() => {
    if (!fairnessRows.length) return { min: 0, max: 0, diff: 0, status: 'ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ' };
    const activeRows = fairnessRows.filter(row => row.added > 0 || row.before > 0);
    const source = activeRows.length ? activeRows : fairnessRows;
    const values = source.map(row => row.after);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min;
    return {
      min,
      max,
      diff,
      status: diff <= 1 ? 'ظ…طھظˆط§ط²ظ†' : diff === 2 ? 'ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ط¨ط³ظٹط·ط©' : 'ط؛ظٹط± ظ…طھظˆط§ط²ظ†',
    };
  }, [fairnessRows]);
  const fairnessAfterById = useMemo(
    () => Object.fromEntries(fairnessRows.map(row => [row.id, row.after])),
    [fairnessRows],
  );
  const toggleExcluded = (date: string, userId: string) => {
    setExcludedByDate(prev => {
      const current = prev[date] || [];
      const nextIds = current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId];
      const next = { ...prev, [date]: nextIds };
      localStorage.setItem('smart_proctor_exclusions_by_date', JSON.stringify(next));
      return next;
    });
  };

  const addSlot = () => {
    setSlots(prev => [...prev, { id: crypto.randomUUID(), date: activeDate || today(), subject: 'ط§ط®طھط¨ط§ط±', period: 1 }]);
  };

  const updateSlot = (id: string, patch: Partial<SmartExamSlot>) => {
    if (patch.date) setSelectedExclusionDate(patch.date);
    setSlots(prev => prev.map(slot => slot.id === id ? { ...slot, ...patch } : slot));
  };

  const removeSlot = (id: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== id));
    setPreview(prev => prev.filter(item => item.slotId !== id));
  };

  const generateDistribution = () => {
    if (!committees.length || !slots.length) {
      setPreview([]);
      return;
    }

    const runningCounts = { ...assignedCounts };
    const runningReserveCounts = { ...reserveCounts };
    const draft: SmartDistributionItem[] = [];

    const orderedSlots = [...slots].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const bySubject = a.subject.localeCompare(b.subject, 'ar');
      if (bySubject !== 0) return bySubject;
      return Number(a.period) - Number(b.period);
    });

    orderedSlots.forEach(slot => {
      const usedThisPeriod = new Set(
        supervisions
          .filter(s => s.date?.slice(0, 10) === slot.date && Number(s.period || 1) === Number(slot.period || 1))
          .map(s => s.teacher_id),
      );
      const eligibleProctors = getEligibleProctors(slot.date);
      if (!eligibleProctors.length) return;
      const randomizedCommittees = [...committees].sort(() => Math.random() - 0.5);
      randomizedCommittees.forEach(committeeNumber => {
        const pool = eligibleProctors
          .map(p => ({
            user: p,
            count: runningCounts[p.id] || 0,
            usedToday: usedThisPeriod.has(p.id),
            sameCommittee: supervisions.some(s => s.teacher_id === p.id && s.committee_number === committeeNumber),
            random: Math.random(),
          }))
          .sort((a, b) => {
            if (a.count !== b.count) return a.count - b.count;
            if (a.usedToday !== b.usedToday) return a.usedToday ? 1 : -1;
            if (a.sameCommittee !== b.sameCommittee) return a.sameCommittee ? 1 : -1;
            return a.random - b.random;
          });

        const selected = pool[0];
        if (!selected) return;

        const forcedRepeat = selected.usedToday || selected.sameCommittee;
        draft.push({
          id: crypto.randomUUID(),
          slotId: slot.id,
          date: slot.date,
          subject: slot.subject || 'ط§ط®طھط¨ط§ط±',
          period: Number(slot.period) || 1,
          committeeNumber,
          teacherId: selected.user.id,
          teacherName: selected.user.full_name,
          assignedCount: assignedCounts[selected.user.id] || 0,
          reserveCount: reserveCounts[selected.user.id] || 0,
          previousCount: previousCounts[selected.user.id] || 0,
          forcedRepeat,
          assignmentType: 'PRIMARY',
        });
        usedThisPeriod.add(selected.user.id);
        runningCounts[selected.user.id] = (runningCounts[selected.user.id] || 0) + 1;
      });

      const reserveUsed = new Set(usedThisPeriod);
      const reserveCount = Math.max(0, Math.min(reserveCountPerSlot, eligibleProctors.length));
      for (let index = 0; index < reserveCount; index += 1) {
        const selectedReserve = eligibleProctors
          .map(p => ({
            user: p,
            reserveCount: runningReserveCounts[p.id] || 0,
            primaryCount: runningCounts[p.id] || 0,
            usedInSlot: reserveUsed.has(p.id),
            random: Math.random(),
          }))
          .sort((a, b) => {
            if (a.usedInSlot !== b.usedInSlot) return a.usedInSlot ? 1 : -1;
            if (a.reserveCount !== b.reserveCount) return a.reserveCount - b.reserveCount;
            if (a.primaryCount !== b.primaryCount) return a.primaryCount - b.primaryCount;
            return a.random - b.random;
          })[0];

        if (!selectedReserve) break;
        draft.push({
          id: crypto.randomUUID(),
          slotId: slot.id,
          date: slot.date,
          subject: slot.subject || 'اختبار',
          period: Number(slot.period) || 1,
          committeeNumber: 'احتياط',
          teacherId: selectedReserve.user.id,
          teacherName: selectedReserve.user.full_name,
          assignedCount: assignedCounts[selectedReserve.user.id] || 0,
          reserveCount: reserveCounts[selectedReserve.user.id] || 0,
          previousCount: previousCounts[selectedReserve.user.id] || 0,
          forcedRepeat: selectedReserve.usedInSlot,
          assignmentType: 'RESERVE',
          reserveOrder: index + 1,
        });
        reserveUsed.add(selectedReserve.user.id);
        runningReserveCounts[selectedReserve.user.id] = (runningReserveCounts[selectedReserve.user.id] || 0) + 1;
      }
    });

    setPreview(draft);
  };

  const swapItems = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setPreview(prev => {
      const source = prev.find(item => item.id === sourceId);
      const target = prev.find(item => item.id === targetId);
      if (!source || !target) return prev;
      return prev.map(item => {
        if (item.id === sourceId) {
          return { ...item, teacherId: target.teacherId, teacherName: target.teacherName, assignedCount: target.assignedCount, reserveCount: target.reserveCount, previousCount: target.previousCount, forcedRepeat: target.forcedRepeat };
        }
        if (item.id === targetId) {
          return { ...item, teacherId: source.teacherId, teacherName: source.teacherName, assignedCount: source.assignedCount, reserveCount: source.reserveCount, previousCount: source.previousCount, forcedRepeat: source.forcedRepeat };
        }
        return item;
      });
    });
  };

  const replaceOne = (item: SmartDistributionItem) => {
    const usedInSlot = new Set(preview.filter(p => p.slotId === item.slotId && p.id !== item.id).map(p => p.teacherId));
    const candidate = getEligibleProctors(item.date)
      .filter(p => p.id !== item.teacherId)
      .map(p => ({
        user: p,
        count: assignedCounts[p.id] || 0,
        reserve: reserveCounts[p.id] || 0,
        previous: previousCounts[p.id] || 0,
        used: usedInSlot.has(p.id),
        sameCommittee: supervisions.some(s => s.teacher_id === p.id && s.committee_number === item.committeeNumber),
        random: Math.random(),
      }))
      .sort((a, b) => {
        if (a.used !== b.used) return a.used ? 1 : -1;
        if (a.sameCommittee !== b.sameCommittee) return a.sameCommittee ? 1 : -1;
        if (a.count !== b.count) return a.count - b.count;
        return a.random - b.random;
      })[0];

    if (!candidate) return;
    setPreview(prev => prev.map(p => p.id === item.id ? {
      ...p,
      teacherId: candidate.user.id,
      teacherName: candidate.user.full_name,
      assignedCount: candidate.count,
      reserveCount: candidate.reserve,
      previousCount: candidate.previous,
      forcedRepeat: candidate.used || candidate.sameCommittee,
    } : p));
  };

  const printOfficialDistribution = () => {
    if (!committedRows.length) return;
    setIsPrintingDistribution(true);
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 700);
    });
  };

  useEffect(() => {
    const cleanup = () => setIsPrintingDistribution(false);
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('printing-proctor-distribution', isPrintingDistribution);
    return () => document.body.classList.remove('printing-proctor-distribution');
  }, [isPrintingDistribution]);

  const deleteSupervisionRows = async (ids: string[]) => {
    if (!ids.length) return;
    if (onDeleteSupervisions) {
      await onDeleteSupervisions(ids);
      return;
    }
    const { error } = await supabase.from('supervision').delete().in('id', ids);
    if (error) {
      alert(error.message);
      return;
    }
    alert('طھظ… ط§ظ„ط­ط°ظپطŒ ط­ط¯ظ‘ط« ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ظ† ظ…ط±ظƒط² ط§ظ„ظ‚ظٹط§ط¯ط© ط¹ظ†ط¯ ط§ظ„ط­ط§ط¬ط©.');
  };

  const commitPreview = async () => {
    if (!preview.length) return;
    setIsCommitting(true);
    try {
      await onCommit(preview, replaceExisting);
    } finally {
      setIsCommitting(false);
    }
  };

  const forcedRepeatCount = preview.filter(item => item.forcedRepeat).length;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Wand2 size={28} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">ط§ظ„طھظˆط²ظٹط¹ ط§ظ„ط°ظƒظٹ ظ„ظ„ظ…ط±ط§ظ‚ط¨ظٹظ†</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">طھظˆط²ظٹط¹ ط¹ط§ط¯ظ„ ط­ط³ط¨ ط¹ط¯ط¯ ط§ظ„ط¥ط³ظ†ط§ط¯ط§طھ ط§ظ„ط­ط§ظ„ظٹط©طŒ ظ…ط¹ ط¥ط¸ظ‡ط§ط± ط§ظ„ظ…ط¨ط§ط´ط±ط§طھ ط§ظ„ظپط¹ظ„ظٹط© ظپظ‚ط· ط¹ظ†ط¯ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ„ط¬ظ†ط©.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={addSlot} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs flex items-center gap-2 hover:bg-slate-200">
              <CalendarPlus size={18} /> ط¥ط¶ط§ظپط© ظٹظˆظ…
            </button>
            <button onClick={generateDistribution} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center gap-2 shadow-lg hover:bg-blue-700">
              <Sparkles size={18} /> طھظˆظ„ظٹط¯
            </button>
            <button onClick={commitPreview} disabled={!preview.length || isCommitting} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-700 disabled:opacity-40">
              {isCommitting ? <RefreshCcw size={18} className="animate-spin" /> : <Check size={18} />} ط±ط¨ط· ط¨ط§ظ„ظ„ط¬ط§ظ†
            </button>
            <button onClick={printOfficialDistribution} disabled={!committedRows.length} className="px-6 py-3 rounded-2xl bg-slate-950 text-white font-black text-xs flex items-center gap-2 shadow-lg disabled:opacity-40">
              <Printer size={18} /> ط·ط¨ط§ط¹ط© ط§ظ„طھظ‚ط±ظٹط±
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div>
                <p className="font-black text-slate-900">احتياط المراقبين</p>
                <p className="text-xs font-bold text-slate-500 mt-1">يضاف لكل تاريخ وفترة بعد التوزيع الأساسي، ولا يظهر في تقرير الطباعة الرسمي.</p>
              </div>
              <input
                type="number"
                min={0}
                max={10}
                value={reserveCountPerSlot}
                onChange={e => setReserveCountPerSlot(Math.max(0, Number(e.target.value) || 0))}
                className="p-3 rounded-xl bg-white border border-amber-100 font-black text-sm"
                title="عدد الاحتياط لكل فترة"
              />
            </div>
            {slots.map(slot => (
              <div key={slot.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_48px] gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <input type="date" value={slot.date} onChange={e => updateSlot(slot.id, { date: e.target.value })} className="p-3 rounded-xl bg-white border border-slate-100 font-black text-sm" />
                <input value={slot.subject} onChange={e => updateSlot(slot.id, { subject: e.target.value })} placeholder="ط§ظ„ظ…ط§ط¯ط©" className="p-3 rounded-xl bg-white border border-slate-100 font-black text-sm" />
                <input type="number" min={1} value={slot.period} onChange={e => updateSlot(slot.id, { period: Number(e.target.value) || 1 })} className="p-3 rounded-xl bg-white border border-slate-100 font-black text-sm" />
                <button onClick={() => removeSlot(slot.id)} className="h-12 rounded-xl bg-white text-red-500 border border-red-100 flex items-center justify-center"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 text-white">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="font-black flex items-center gap-2"><UserMinus size={18} /> ط§ظ„ظ…ط³طھط¨ط¹ط¯ظˆظ† ط­ط³ط¨ طھط§ط±ظٹط® ط§ظ„ط§ط®طھط¨ط§ط±</h4>
              <span className="text-[10px] font-black text-slate-400">{excludedIdsForSelectedDate.length} / {proctors.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-2 mb-3">
              <select
                value={selectedExclusionDate}
                onChange={e => setSelectedExclusionDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-xs font-black outline-none"
              >
                {slotDates.map(date => <option key={date} value={date} className="text-slate-900">{date}</option>)}
              </select>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={exclusionSearch}
                  onChange={e => setExclusionSearch(e.target.value)}
                  placeholder="ط¨ط­ط« ط³ط±ظٹط¹ ط¨ط§ظ„ط§ط³ظ… ط£ظˆ ط§ظ„ظ‡ظˆظٹط©"
                  className="w-full pr-9 pl-3 py-3 rounded-xl bg-white/10 border border-white/10 text-xs font-black outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-2">
              {filteredProctors.map(p => {
                const excluded = excludedIdsForSelectedDate.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleExcluded(selectedExclusionDate, p.id)} className={`w-full p-3 rounded-xl text-right text-xs font-black border transition-all ${excluded ? 'bg-red-500/15 border-red-400/30 text-red-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
                    <span className="block">{p.full_name}</span>
                    <span className="block text-[9px] mt-1 opacity-60">{p.national_id}</span>
                  </button>
                );
              })}
              {!filteredProctors.length && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs font-black text-slate-400">
                  ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط©
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="mt-6 flex items-center gap-3 text-sm font-black text-slate-600 cursor-pointer">
          <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="w-5 h-5 accent-blue-600" />
          ط¥ط¹ط§ط¯ط© طھظˆط²ظٹط¹ ط§ظ„ظ„ط¬ط§ظ† ط§ظ„ظ…ط±طھط¨ط·ط© ظ„ظ†ظپط³ ط§ظ„طھط§ط±ظٹط® ظˆط§ظ„ظپطھط±ط© ط¹ظ†ط¯ ط§ظ„ط§ط¹طھظ…ط§ط¯
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">ط§ظ„ظ„ط¬ط§ظ†</p><p className="text-3xl font-black">{committees.length}</p></div>
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">ط§ظ„ظ…ط±ط§ظ‚ط¨ظˆظ† ط§ظ„ظ…طھط§ط­ظˆظ†</p><p className="text-3xl font-black">{eligibleProctors.length}</p></div>
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">ط¨ظ†ظˆط¯ ط§ظ„ظ…ط¹ط§ظٹظ†ط©</p><p className="text-3xl font-black">{preview.length}</p></div>
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">طھظƒط±ط§ط± ط§ط¶ط·ط±ط§ط±ظٹ</p><p className="text-3xl font-black text-amber-600">{forcedRepeatCount}</p></div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden no-print">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-950">ظ…ظٹط²ط§ظ† ط§ظ„ط¹ط¯ط§ظ„ط© ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">ظٹظˆط¶ط­ ظƒظ… ظ„ط¯ظ‰ ظƒظ„ ظ…ط±ط§ظ‚ط¨ ظ‚ط¨ظ„ ط§ظ„طھظˆط²ظٹط¹طŒ ظˆظ…ط§ ط³ظٹط¶ط§ظپ ظ„ظ‡طŒ ظˆط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط¨ط¹ط¯ ط§ظ„طھظˆط²ظٹط¹.</p>
          </div>
          <div className={`px-5 py-3 rounded-2xl text-xs font-black ${fairnessSummary.diff <= 1 ? 'bg-emerald-50 text-emerald-700' : fairnessSummary.diff === 2 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            ط§ظ„ط­ط§ظ„ط©: {fairnessSummary.status} | ط§ظ„ط£ظ‚ظ„ {fairnessSummary.min} | ط§ظ„ط£ط¹ظ„ظ‰ {fairnessSummary.max} | ط§ظ„ظپط±ظ‚ {fairnessSummary.diff}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-right border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-[10px] font-black text-slate-500">
                <th className="p-4 border-b">ط§ظ„ظ…ط±ط§ظ‚ط¨</th>
                <th className="p-4 border-b">ظ‚ط¨ظ„ ط§ظ„طھظˆط²ظٹط¹</th>
                <th className="p-4 border-b">ط³ظٹط¶ط§ظپ ظ„ظ‡</th>
                <th className="p-4 border-b">ط¨ط¹ط¯ ط§ظ„طھظˆط²ظٹط¹</th>
                <th className="p-4 border-b">ظ…ظ„ط§ط­ط¸ط©</th>
              </tr>
            </thead>
            <tbody>
              {fairnessRows.map(row => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="p-4 font-black text-slate-900">{row.name}</td>
                  <td className="p-4 font-black tabular-nums">{row.before}</td>
                  <td className={`p-4 font-black tabular-nums ${row.added ? 'text-blue-600' : 'text-slate-300'}`}>{row.added}</td>
                  <td className="p-4 font-black tabular-nums">{row.after}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${row.after - fairnessSummary.min <= 1 ? 'bg-emerald-50 text-emerald-700' : row.after - fairnessSummary.min === 2 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {row.after - fairnessSummary.min <= 1 ? 'ظ…طھظˆط§ط²ظ†' : row.after - fairnessSummary.min === 2 ? 'ط±ط§ط¬ط¹' : 'ظ…ط±طھظپط¹'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print:block">
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black">طھظ‚ط±ظٹط± ط§ظ„طھظˆط²ظٹط¹ ط§ظ„ط±ط³ظ…ظٹ ظ„ظ„ظ…ط±ط§ظ‚ط¨ظٹظ†</h1>
          <p className="font-bold">ط§ط¹طھظ…ط§ط¯ طھظˆط²ظٹط¹ ط§ظ„ظ„ط¬ط§ظ† ظˆط§ظ„ظپطھط±ط§طھ</p>
        </div>
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden print:shadow-none print:rounded-none print:border-black">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 no-print">
            <h3 className="text-xl font-black flex items-center gap-2"><Users size={22} /> ظ…ط¹ط§ظٹظ†ط© ط§ظ„طھظˆط²ظٹط¹</h3>
            <p className="text-xs font-bold text-slate-400">ط§ط³ط­ط¨ ط¨ط·ط§ظ‚ط© ظ…ط±ط§ظ‚ط¨ ط¹ظ„ظ‰ ط¨ط·ط§ظ‚ط© ط£ط®ط±ظ‰ ظ„طھط¨ط¯ظٹظ„ظ‡ظ…ط§.</p>
          </div>
          <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-3 no-print">
            <select value={previewDateFilter} onChange={e => setPreviewDateFilter(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs">
              <option value="">ظƒظ„ ط§ظ„طھظˆط§ط±ظٹط®</option>
              {previewDates.map(date => <option key={date} value={date}>{date}</option>)}
            </select>
            <select value={previewSubjectFilter} onChange={e => setPreviewSubjectFilter(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs">
              <option value="">ظƒظ„ ط§ظ„ظ…ظˆط§ط¯</option>
              {previewSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <select value={previewPeriodFilter} onChange={e => setPreviewPeriodFilter(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs">
              <option value="">ظƒظ„ ط§ظ„ظپطھط±ط§طھ</option>
              {previewPeriods.map(period => <option key={period} value={period}>{period}</option>)}
            </select>
            <input value={previewCommitteeFilter} onChange={e => setPreviewCommitteeFilter(e.target.value)} placeholder="ظپظ„طھط± ط§ظ„ظ„ط¬ظ†ط©" className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs outline-none" />
            <input value={previewTeacherFilter} onChange={e => setPreviewTeacherFilter(e.target.value)} placeholder="ظپظ„طھط± ط§ظ„ظ…ط±ط§ظ‚ط¨" className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs outline-none" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-500 print:text-black">
                  <th className="p-4 border-b">ط§ظ„طھط§ط±ظٹط®</th>
                  <th className="p-4 border-b">ط§ظ„ظ…ط§ط¯ط©</th>
                  <th className="p-4 border-b">ط§ظ„ظپطھط±ط©</th>
                  <th className="p-4 border-b">ط§ظ„ظ„ط¬ظ†ط©</th>
                  <th className="p-4 border-b">ط§ط³ظ… ط§ظ„ظ…ط±ط§ظ‚ط¨</th>
                  <th className="p-4 border-b">ظ…ط³ظ†ط¯ ظ„ظ‡ ظˆظ‚طھ ط§ظ„طھظˆط²ظٹط¹</th>
                  <th className="p-4 border-b">ط¨ط¹ط¯ ط§ظ„طھظˆط²ظٹط¹</th>
                  <th className="p-4 border-b">ظ…ط¨ط§ط´ط±ط§طھ ط³ط§ط¨ظ‚ط©</th>
                  <th className="p-4 border-b">ظ…ظ„ط§ط­ط¸ط©</th>
                  <th className="p-4 border-b print:hidden">ط¥ط¬ط±ط§ط،</th>
                  <th className="p-4 border-b hidden print:table-cell">طھظˆظ‚ظٹط¹ ط§ظ„ظ…ط±ط§ظ‚ط¨</th>
                </tr>
              </thead>
              <tbody>
                {sortedPreview.length ? sortedPreview.map(item => (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedId(item.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (draggedId) swapItems(draggedId, item.id);
                      setDraggedId(null);
                    }}
                    className="border-b border-slate-100 hover:bg-blue-50/40 print:hover:bg-white"
                  >
                    <td className="p-4 font-bold">{item.date}</td>
                    <td className="p-4 font-bold">{item.subject}</td>
                    <td className="p-4 font-bold tabular-nums">{item.period}</td>
                    <td className="p-4 font-black tabular-nums">{item.committeeNumber}</td>
                    <td className="p-4 font-black">{item.teacherName}</td>
                    <td className="p-4 font-black tabular-nums">{item.assignedCount}</td>
                    <td className="p-4 font-black tabular-nums text-blue-600">{fairnessAfterById[item.teacherId] ?? item.assignedCount + 1}</td>
                    <td className="p-4 font-black tabular-nums">{item.previousCount}</td>
                    <td className="p-4">
                      {item.forcedRepeat ? <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black"><Repeat size={12} className="inline ml-1" /> طھظƒط±ط§ط± ط§ط¶ط·ط±ط§ط±ظٹ</span> : <span className="text-emerald-600 text-[10px] font-black">طھظˆط²ظٹط¹ ط¹ط§ط¯ظ„</span>}
                    </td>
                    <td className="p-4 print:hidden">
                      <button onClick={() => replaceOne(item)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black flex items-center gap-2">
                        <Shuffle size={14} /> ط§ط³طھط¨ط¯ط§ظ„
                      </button>
                    </td>
                    <td className="p-4 hidden print:table-cell h-12"></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400 font-black">ظ„ظ… ظٹطھظ… طھظˆظ„ظٹط¯ طھظˆط²ظٹط¹ ط¨ط¹ط¯.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {preview.length > 0 && (
            <div className="hidden print:grid grid-cols-2 gap-10 mt-10 p-8">
              <div className="border-t border-black pt-3 font-black">طھظˆظ‚ظٹط¹ ظ…ط³ط¤ظˆظ„ ط§ظ„ظƒظ†طھط±ظˆظ„</div>
              <div className="border-t border-black pt-3 font-black">ط§ط¹طھظ…ط§ط¯ ظ‚ط§ط¦ط¯ ط§ظ„ظ…ط¯ط±ط³ط©</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden print:shadow-none print:rounded-none print:border-black">
        <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2"><Users size={22} /> ط§ظ„طھظˆط²ظٹط¹ط§طھ ط§ظ„ظ…ط¹طھظ…ط¯ط©</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">طھط¨ظ‚ظ‰ ظ…ط­ظپظˆط¸ط© ط¨ط¹ط¯ طھط­ط¯ظٹط« ط§ظ„طµظپط­ط©طŒ ظˆظٹظ…ظƒظ† ظپظ„طھط±طھظ‡ط§ ط£ظˆ ط­ط°ظپظ‡ط§ ط£ظˆ ط·ط¨ط§ط¹طھظ‡ط§ ط±ط³ظ…ظٹظ‹ط§.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input type="date" value={distributionDateFilter} onChange={e => setDistributionDateFilter(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-sm" />
            <select value={distributionSubjectFilter} onChange={e => setDistributionSubjectFilter(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-sm min-w-[180px]">
              <option value="">ظƒظ„ ط§ظ„ظ…ظˆط§ط¯</option>
              {subjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <button onClick={printOfficialDistribution} disabled={!committedRows.length} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-black text-xs flex items-center gap-2 disabled:opacity-40"><Printer size={18} /> ط·ط¨ط§ط¹ط© ط§ظ„طھظ‚ط±ظٹط±</button>
            <button
              onClick={() => {
                if (!committedRows.length) return;
                if (confirm('ظ‡ظ„ طھط±ظٹط¯ ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„طھظˆط²ظٹط¹ط§طھ ط§ظ„ط¸ط§ظ‡ط±ط© ظپظٹ ط§ظ„ظپظ„طھط± ط§ظ„ط­ط§ظ„ظٹطں')) deleteSupervisionRows(committedRows.map(r => r.id));
              }}
              disabled={!committedRows.length}
              className="px-5 py-3 rounded-2xl bg-red-50 text-red-600 font-black text-xs flex items-center gap-2 disabled:opacity-40"
            >
              <Trash2 size={18} /> ط­ط°ظپ ط§ظ„ط¸ط§ظ‡ط±
            </button>
          </div>
        </div>

        <div className="hidden print:block text-center mb-6 p-6">
          <div className="grid grid-cols-3 items-start text-xs font-black mb-4">
            <div className="text-right leading-6">ط§ظ„ظ…ظ…ظ„ظƒط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط³ط¹ظˆط¯ظٹط©<br />ظˆط²ط§ط±ط© ط§ظ„طھط¹ظ„ظٹظ…<br />ظ†ط¸ط§ظ… ظƒظ†طھط±ظˆظ„ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ</div>
            <div className="text-center text-slate-500">ط´ط¹ط§ط± ط§ظ„ظ…ط¯ط±ط³ط©</div>
            <div className="text-left leading-6">ط§ظ„طھط§ط±ظٹط®: {distributionDateFilter || today()}<br />ط§ظ„ظ…ط§ط¯ط©: {distributionSubjectFilter || 'ط§ظ„ظƒظ„'}</div>
          </div>
          <h1 className="text-2xl font-black border-y-2 border-black py-2">طھظ‚ط±ظٹط± طھظˆط²ظٹط¹ ط§ظ„ظ…ط±ط§ظ‚ط¨ظٹظ† ط§ظ„ط±ط³ظ…ظٹ</h1>
          <p className="font-bold mt-2">ط§ط¹طھظ…ط§ط¯ طھظˆط²ظٹط¹ ط§ظ„ظ„ط¬ط§ظ† ظˆط§ظ„ظپطھط±ط§طھ ظˆطھظˆظ‚ظٹط¹ ط§ظ„ظ…ط±ط§ظ‚ط¨ظٹظ†</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 print:text-black">
                <th className="p-4 border-b">ط§ظ„طھط§ط±ظٹط®</th>
                <th className="p-4 border-b">ط§ظ„ظ…ط§ط¯ط©</th>
                <th className="p-4 border-b">ط§ظ„ظپطھط±ط©</th>
                <th className="p-4 border-b">ط§ظ„ظ„ط¬ظ†ط©</th>
                <th className="p-4 border-b">ط§ط³ظ… ط§ظ„ظ…ط±ط§ظ‚ط¨</th>
                <th className="p-4 border-b">ظ…ط³ظ†ط¯ ظ„ظ‡</th>
                <th className="p-4 border-b">ظ…ط¨ط§ط´ط±ط§طھ</th>
                <th className="p-4 border-b print:hidden">ط¥ط¬ط±ط§ط،</th>
                <th className="p-4 border-b hidden print:table-cell">طھظˆظ‚ظٹط¹ ط§ظ„ظ…ط±ط§ظ‚ط¨</th>
              </tr>
            </thead>
            <tbody>
              {committedRows.length ? committedRows.map(row => (
                <tr key={row.id} className="border-b border-slate-100 print:border-black">
                  <td className="p-4 font-bold">{row.date}</td>
                  <td className="p-4 font-bold">{row.subject}</td>
                  <td className="p-4 font-bold tabular-nums">{row.period}</td>
                  <td className="p-4 font-black tabular-nums">{row.committeeNumber}</td>
                  <td className="p-4 font-black">{row.teacherName}</td>
                  <td className="p-4 font-black tabular-nums">{row.assignedCount}</td>
                  <td className="p-4 font-black tabular-nums">{row.previousCount}</td>
                  <td className="p-4 print:hidden">
                    <button
                      onClick={() => {
                        if (confirm(`ط­ط°ظپ طھظˆط²ظٹط¹ ظ„ط¬ظ†ط© ${row.committeeNumber}طں`)) deleteSupervisionRows([row.id]);
                      }}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black flex items-center gap-2"
                    >
                      <Trash2 size={14} /> ط­ط°ظپ
                    </button>
                  </td>
                  <td className="p-4 hidden print:table-cell h-12"></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-black">ظ„ط§ طھظˆط¬ط¯ طھظˆط²ظٹط¹ط§طھ ظ…ط¹طھظ…ط¯ط© ط­ط³ط¨ ط§ظ„ظپظ„طھط± ط§ظ„ط­ط§ظ„ظٹ.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {committedRows.length > 0 && (
          <div className="hidden print:grid grid-cols-2 gap-10 mt-10 p-8">
            <div className="border-t border-black pt-3 font-black text-right">ط±ط¦ظٹط³ ط§ظ„ظƒظ†طھط±ظˆظ„</div>
            <div className="border-t border-black pt-3 font-black text-left">ظ…ط¯ظٹط± ط§ظ„ظ…ط¯ط±ط³ط©</div>
          </div>
        )}
      </div>

      {isPrintingDistribution && createPortal(
        <div id="proctor-distribution-print">
          <style>{`
            @media screen { #proctor-distribution-print { display: none !important; } }
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body.printing-proctor-distribution > *:not(#proctor-distribution-print) { display: none !important; }
              #root, #app-root, header, nav, main, aside, .no-print { display: none !important; }
              #proctor-distribution-print { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; direction: rtl; color: #000; font-family: 'Tajawal', Arial, sans-serif; background: white !important; z-index: 999999 !important; }
              #proctor-distribution-print * { box-shadow: none !important; }
              .distribution-print-page { min-height: 281mm; page-break-after: always; display: flex; flex-direction: column; padding: 0; box-sizing: border-box; }
              .distribution-official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; border-bottom: 4px double #000; padding: 0 0 4mm; margin-bottom: 5mm; min-height: 26mm; }
              .official-side { font-size: 10pt; line-height: 1.65; font-weight: 900; color: #000; }
              .official-right { text-align: right; }
              .official-left { text-align: left; direction: rtl; }
              .official-logo { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 1mm; font-size: 8pt; font-weight: 800; color: #475569; }
              .official-logo img { width: 31mm; height: 18mm; object-fit: contain; }
              .distribution-print-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
              .distribution-print-table th, .distribution-print-table td { border: 1px solid #000; padding: 6px 5px; text-align: center; vertical-align: middle; }
              .distribution-print-table th { background: #f1f5f9; font-weight: 900; }
              .distribution-print-table td.name-cell { text-align: right; font-weight: 800; }
              .distribution-meta-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4mm 0 5mm; font-size: 9pt; }
              .distribution-meta-table th, .distribution-meta-table td { border: 1px solid #000; padding: 5px 4px; text-align: center; vertical-align: middle; }
              .distribution-meta-table th { background: #f1f5f9; font-weight: 900; width: 10%; }
              .distribution-meta-table td { font-weight: 800; width: 15%; }
              .distribution-print-footer { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; padding-top: 14mm; break-inside: avoid; page-break-inside: avoid; font-size: 10pt; font-weight: 900; }
              .signature-box { text-align: center; border-top: 1px solid #000; padding-top: 4mm; min-height: 28mm; }
            }
          `}</style>
          {printPages.map((pageRows, pageIndex) => (
            <div key={pageIndex} className="distribution-print-page">
              <OfficialDistributionHeader date={distributionDateFilter || today()} />
              <div style={{ textAlign: 'center', margin: '5mm 0 4mm' }}>
                <h1 style={{ display: 'inline-block', margin: 0, padding: '0 26mm 2mm', borderBottom: '2px solid #000', fontSize: '15pt', fontWeight: 900 }}>
                  طھظˆط²ظٹط¹ ط§ظ„ظ…ط±ط§ظ‚ط¨ظٹظ† ط¹ظ„ظ‰ ط§ظ„ظ„ط¬ط§ظ†
                </h1>
              </div>
              <table className="distribution-meta-table">
                <tbody>
                  <tr>
                    <th>ط§ظ„ظٹظˆظ…</th>
                    <td>{new Date(`${distributionDateFilter || today()}T12:00:00`).toLocaleDateString('ar-SA', { weekday: 'long' })}</td>
                    <th>ط§ظ„طھط§ط±ظٹط®</th>
                    <td>{distributionDateFilter || today()}</td>
                    <th>ط§ظ„ظ…ط§ط¯ط©</th>
                    <td>{distributionSubjectFilter || 'ط§ظ„ظƒظ„'}</td>
                    <th>ط§ظ„ظپطھط±ط©</th>
                    <td>{pageRows[0]?.period || slots[0]?.period || 1}</td>
                  </tr>
                </tbody>
              </table>
              <table className="distribution-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>ط±ظ‚ظ… ط§ظ„ظ„ط¬ظ†ط©</th>
                    <th style={{ width: '58%' }}>ط§ط³ظ… ط§ظ„ظ…ط¹ظ„ظ…</th>
                    <th style={{ width: '30%' }}>ط§ظ„طھظˆظ‚ظٹط¹</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 900 }}>{row.committeeNumber}</td>
                      <td className="name-cell">{row.teacherName}</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 18 - pageRows.length) }).map((_, idx) => (
                    <tr key={`empty-${pageIndex}-${idx}`}>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="distribution-print-footer">
                <div className="signature-box">
                  <div>ظˆظƒظٹظ„ ط§ظ„ط´ط¤ظˆظ† ط§ظ„طھط¹ظ„ظٹظ…ظٹط©</div>
                  <div style={{ marginTop: '8mm', fontWeight: 800 }}>{controlHeadName}</div>
                </div>
                <div className="signature-box">
                  <div>ظ…ط¯ظٹط± ط§ظ„ظ…ط¯ط±ط³ط©</div>
                  <div style={{ marginTop: '8mm', fontWeight: 800 }}>{schoolManagerName}</div>
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SmartProctorDistribution;


