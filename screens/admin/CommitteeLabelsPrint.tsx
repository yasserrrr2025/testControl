
import React, { useMemo } from 'react';
import { Student } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Printer, QrCode, LayoutGrid, Info, Tag } from 'lucide-react';

interface Props {
  students: Student[];
}

const CommitteeLabelsPrint: React.FC<Props> = ({ students }) => {
  const uniqueCommittees = useMemo(() => {
    return Array.from(new Set(students.map(s => s.committee_number)))
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b));
  }, [students]);

  // دالة لتقسيم اللجان إلى صفحات (كل صفحة 21 استكر)
  const pages = useMemo(() => {
    const p = [];
    for (let i = 0; i < uniqueCommittees.length; i += 21) {
      p.push(uniqueCommittees.slice(i, i + 21));
    }
    return p;
  }, [uniqueCommittees]);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24">
      {/* UI Controls */}
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[10px] border-blue-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
             <div className="flex items-center gap-6">
                <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><QrCode size={32} /></div>
                <h3 className="text-3xl font-black tracking-tighter">طباعة ملصقات اللجان الذكية</h3>
             </div>
             <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
               تم تصميم هذه القوالب لتناسب ورق الاستكرات الجاهز مقاس <span className="text-white font-black underline">GS-1021</span>. 
               تحتوي كل ورقة على 21 ملصقاً (3 أعمدة × 7 صفوف) بمقاس 70×42.4 ملم لكل ملصق.
             </p>
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 w-fit">
                <Info size={18} className="text-blue-400" />
                <span className="text-xs font-black">إجمالي اللجان المسجلة: {uniqueCommittees.length} لجنة</span>
             </div>
          </div>
          <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center gap-5 active:scale-95 shrink-0"
          >
            <Printer size={32} /> بدء الطباعة المباشرة
          </button>
        </div>
      </div>

      {/* Interactive Preview */}
      <div className="no-print space-y-6">
         <div className="flex items-center gap-4 border-b pb-4">
            <LayoutGrid className="text-slate-400" />
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">معاينة صفحات الملصقات قبل الطباعة</h4>
         </div>
         
         {pages.length === 0 ? (
           <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center gap-6">
              <Tag size={64} className="text-slate-200" />
              <p className="text-2xl font-black text-slate-300 italic">لا توجد بيانات طلاب لإنشاء ملصقات اللجان</p>
           </div>
         ) : (
           <div className="space-y-20">
             {pages.map((pageCommittees, pageIdx) => (
               <div key={pageIdx} className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col items-center gap-8">
                  <div className="flex justify-between w-full items-center border-b pb-4 border-dashed">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Label Sheet Preview #{pageIdx + 1}</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">GS-1021 Standard (21 Labels)</span>
                  </div>
                  
                  {/* Grid Mockup */}
                  <div className="label-sheet-preview grid grid-cols-3 gap-1 border-2 border-slate-100 bg-slate-50 p-2 shadow-inner">
                     {pageCommittees.map((comNum) => (
                        <div key={comNum} className="w-[140px] h-[85px] bg-white border border-slate-200 rounded-md flex flex-col items-center justify-center p-2 shadow-sm">
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${comNum}`} 
                              alt="QR" 
                              className="w-10 h-10 mb-1"
                           />
                           <span className="text-[8px] font-black leading-none mb-0.5">لجنة رقم</span>
                           <span className="text-lg font-black text-blue-600 leading-none">{comNum}</span>
                        </div>
                     ))}
                  </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* REAL PRINT VIEW - EXACT MEASUREMENTS GS-1021 (70x42.4mm) */}
      <div className="print-only-labels">
        {pages.map((pageCommittees, pageIdx) => (
          <div key={pageIdx} className="gs-1021-sheet">
             {pageCommittees.map((comNum) => (
               <div key={comNum} className="gs-1021-label">
                  <div className="label-content flex items-center justify-between h-full px-4">
                     <div className="flex-1 flex flex-col items-center justify-center gap-1 border-l border-slate-200 h-[80%]">
                        <img 
                           src={APP_CONFIG.LOGO_URL} 
                           alt="Logo" 
                           className="w-8 h-8 object-contain opacity-20 absolute top-2 right-2"
                        />
                        <span className="text-[7pt] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">رقم اللجنة</span>
                        <span className="text-[24pt] font-black text-slate-900 leading-none tabular-nums">{comNum}</span>
                        <span className="text-[5pt] font-bold text-slate-400 mt-1 uppercase tracking-tighter">نظام كنترول الاختبارات المطور</span>
                     </div>
                     <div className="w-[45%] flex items-center justify-center p-2">
                        <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${comNum}`} 
                           alt="QR" 
                           className="w-16 h-16"
                        />
                     </div>
                  </div>
               </div>
             ))}
          </div>
        ))}
      </div>

      <style>{`
        @media screen {
          .print-only-labels { display: none !important; }
          .label-sheet-preview {
             width: 440px;
          }
        }

        @media print {
          @page {
             size: A4 portrait;
             margin: 0; /* مهم لورق الاستكرات الجاهز */
          }
          body { 
            background: white !important; 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact;
          }
          #root, #app-root, header, nav, footer, .no-print { 
            display: none !important; 
          }
          .print-only-labels { 
            display: block !important; 
          }
          .gs-1021-sheet {
             width: 210mm;
             height: 297mm;
             display: grid;
             grid-template-columns: repeat(3, 70mm);
             grid-template-rows: repeat(7, 42.4mm);
             page-break-after: always;
             box-sizing: border-box;
             /* بعض ورق GS-1021 لديه هوامش علوية/جانبية بسيطة حسب الشركة المصنعة */
             padding-top: 0mm; 
             padding-left: 0mm;
          }
          .gs-1021-label {
             width: 70mm;
             height: 42.4mm;
             box-sizing: border-box;
             border: 0.1pt solid rgba(0,0,0,0.02); /* خط وهمي جداً للمساعدة */
             display: flex;
             align-items: center;
             justify-content: center;
             overflow: hidden;
             position: relative;
          }
          .label-content {
             width: 100%;
             height: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CommitteeLabelsPrint;
