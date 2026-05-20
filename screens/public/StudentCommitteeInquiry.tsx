import React, { useMemo, useState } from 'react';
import { Search, IdCard, MapPinned, GraduationCap, Hash, Users, Sparkles, AlertCircle, CheckCircle2, School } from 'lucide-react';
import { Student } from '../../types';
import { APP_CONFIG } from '../../constants';

interface Props {
  students: Student[];
}

const normalizeId = (value: string) => value.replace(/\s+/g, '').trim();

const StudentCommitteeInquiry: React.FC<Props> = ({ students }) => {
  const [nationalId, setNationalId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const student = useMemo(() => {
    const query = normalizeId(nationalId);
    if (!query) return null;
    return students.find(s => normalizeId(s.national_id) === query) || null;
  }, [students, nationalId]);

  const sameCommitteeCount = useMemo(() => {
    if (!student?.committee_number) return 0;
    return students.filter(s => s.committee_number === student.committee_number).length;
  }, [students, student]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setHasSearched(true);
  };

  return (
    <div className="min-h-[100dvh] bg-[#fff7ed] font-['Tajawal'] text-right overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(251,146,60,0.32),transparent_34%),linear-gradient(135deg,#111827_0%,#7c2d12_55%,#f97316_100%)]"></div>
        <div className="absolute left-0 top-32 h-72 w-72 rounded-full bg-white/15 blur-3xl"></div>
        <div className="absolute right-[-8rem] bottom-10 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl"></div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur">
              <img src={APP_CONFIG.LOGO_URL} alt="شعار المدرسة" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-black text-orange-100">مدرسة عماد الدين زنكي المتوسطة</p>
              <p className="text-[10px] font-bold text-white/55">بوابة الطلاب الذكية</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-orange-50 backdrop-blur sm:flex">
            <Sparkles size={16} />
            تحديث مباشر من الكنترول
          </div>
        </header>

        <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
          <div className="text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black backdrop-blur">
              <School size={16} className="text-orange-200" />
              خدمة آمنة وسريعة للطلاب
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">استعلام عن اللجنة</h1>
            <p className="mt-3 text-lg font-black text-orange-50">مدرسة عماد الدين زنكي المتوسطة</p>
            <p className="mt-4 max-w-xl text-sm font-bold leading-8 text-white/70">
              أدخل رقم الهوية لتظهر بيانات اللجنة ورقم الجلوس وموقع الطالب بشكل واضح ومناسب للجوال والشاشات الكبيرة.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-black text-slate-500">رقم الهوية</label>
              <div className="relative">
                <IdCard className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-500" size={24} />
                <input
                  value={nationalId}
                  onChange={(event) => setNationalId(event.target.value)}
                  inputMode="numeric"
                  placeholder="اكتب رقم الهوية هنا"
                  className="w-full rounded-3xl border-2 border-orange-100 bg-orange-50/60 py-5 pl-5 pr-14 text-lg font-black text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white"
                />
              </div>
              <button className="flex w-full items-center justify-center gap-3 rounded-3xl bg-slate-950 py-5 text-lg font-black text-white shadow-xl transition hover:bg-orange-600 active:scale-[0.99]">
                <Search size={24} />
                عرض بيانات اللجنة
              </button>
            </form>

            <div className="mt-6 min-h-[340px]">
              {student ? (
                <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-xl">
                  <div className="bg-gradient-to-l from-orange-600 to-amber-500 p-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-orange-100">بيانات الطالب</p>
                        <h2 className="mt-2 text-2xl font-black leading-tight">{student.name}</h2>
                      </div>
                      <div className="rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur">
                        <p className="text-[10px] font-black text-orange-100">اللجنة</p>
                        <p className="text-4xl font-black tabular-nums">{student.committee_number || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {[
                      { icon: Hash, label: 'رقم الجلوس', value: student.seating_number || student.national_id || '-' },
                      { icon: GraduationCap, label: 'الصف / الفصل', value: `${student.grade || '-'} ${student.section ? `- ${student.section}` : ''}` },
                      { icon: MapPinned, label: 'الموقع', value: student.location || `لجنة رقم ${student.committee_number || '-'}` },
                      { icon: Users, label: 'عدد طلاب اللجنة', value: sameCommitteeCount ? `${sameCommitteeCount} طالب` : '-' },
                    ].map(item => (
                      <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                          <item.icon size={22} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400">{item.label}</p>
                        <p className="mt-1 text-lg font-black leading-tight text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mx-4 mb-4 flex items-center gap-3 rounded-3xl bg-emerald-50 p-4 text-emerald-700">
                    <CheckCircle2 size={22} />
                    <p className="text-sm font-black">تم العثور على بياناتك. يرجى التوجه للجنة الموضحة أعلاه.</p>
                  </div>
                </div>
              ) : hasSearched ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-orange-200 bg-orange-50/70 p-8 text-center">
                  <AlertCircle size={48} className="text-orange-500" />
                  <h2 className="mt-4 text-2xl font-black text-slate-900">لم يتم العثور على الطالب</h2>
                  <p className="mt-2 max-w-sm text-sm font-bold leading-7 text-slate-500">تحقق من رقم الهوية أو راجع إدارة المدرسة لتحديث البيانات.</p>
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                  <Search size={48} className="text-slate-300" />
                  <h2 className="mt-4 text-2xl font-black text-slate-900">ابدأ بالبحث</h2>
                  <p className="mt-2 max-w-sm text-sm font-bold leading-7 text-slate-500">النتيجة ستظهر هنا بتصميم واضح مناسب لجميع الشاشات.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentCommitteeInquiry;
