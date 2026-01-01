
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Student } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Printer, QrCode, LayoutGrid, Info, Tag, Loader2 } from 'lucide-react';

interface Props {
  students: Student[];
}

const CommitteeLabelsPrint: React.FC<Props> = ({ students }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const uniqueCommittees = useMemo(() => {
    return Array.from(new Set(students.map(s => s.committee_number)))
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const pages = useMemo(() => {
    const p = [];
    for (let i = 0; i < uniqueCommittees.length; i += 21) {
      p.push(uniqueCommittees.slice(i, i + 21));
    }
    return p;
  }, [uniqueCommittees]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  return (
    <div className="space-y-10 animate-fade-in text-right pb-24">
      
      {/* البوابة الخاصة بالطباعة - محسنة للوضوح العالي */}
      {isPrinting && createPortal(
        <div id="labels-print-portal">
          <style>{`
            @media screen {
              #labels-print-portal { display: none !important; }
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body { 
                background: white !important; 
                margin: 0; 
                padding: 0; 
                -webkit-print-color-adjust: exact;
                color: black !important;
              }
              #root, #app-root, header, nav, .no-print { 
                display: none !important; 
              }
              #labels-print-portal { 
                display: block !important; 
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
              }
              .gs-1021-sheet {
                width: 210mm;
                height: 297mm;
                display: grid;
                grid-template-columns: repeat(3, 70mm);
                grid-template-rows: repeat(7, 42.4mm);
                page-break-after: always;
                box-sizing: border-box;
                padding: 0;
                margin: 0;
              }
              .gs-1021-label {
                width: 70mm;
                height: 42.4mm;
                box-sizing: border-box;
                border: 0.2pt solid #000; /* إطار أسود واضح للقص */
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                background: white;
              }
              .label-content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 5mm;
              }
              .text-black-bold {
                color: #000 !important;
                font-weight: 900 !important;
              }
            }
          `}</style>
          
          <div className="print-only-labels">
            {pages.map((pageCommittees, pageIdx) => (
              <div key={pageIdx} className="gs-1021-sheet">
                {pageCommittees.map((comNum) => (
                  <div key={comNum} className="gs-1021-label">
                    <div className="label-content">
                      {/* النص والشعار */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-1 border-l border-black h-[85%] relative">
                        <img 
                          src={APP_CONFIG.LOGO_URL} 
                          alt="Logo" 
                          className="w-10 h-10 object-contain mb-1" 
                        />
                        <span className="text-[8pt] font-black text-black-bold uppercase tracking-widest leading-none mb-1">لجنة رقم</span>
                        <span className="text-[32pt] font-black text-black-bold leading-none tabular-nums" style={{ color: '#000' }}>{comNum}</span>
                        <span className="text-[6pt] font-black text-black-bold mt-2 uppercase tracking-tighter text-center">كنترول الاختبارات الذكي</span>
                      </div>
                      
                      {/* كود QR عالي التباين */}
                      <div className="w-[40%] flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${comNum}&color=000000`} 
                          alt="QR" 
                          className="w-20 h-20"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* واجهة التحكم في المتصفح */}
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl text-white no-print relative overflow-hidden border-b-[10px] border-blue-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
             <div className="flex items-center gap-6">
                <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><QrCode size={32} /></div>
                <h3 className="text-3xl font-black tracking-tighter">طباعة ملصقات اللجان (وضوح عالٍ)</h3>
             </div>
             <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
               تم تحسين القوالب لتكون باللون الأسود الصريح لضمان وضوح الأرقام والشعار عند الطباعة على ورق <span className="text-white font-black underline">GS-1021</span>.
             </p>
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 w-fit">
                <Info size={18} className="text-blue-400" />
                <span className="text-xs font-black">عدد اللجان: {uniqueCommittees.length} | الورق المطلوب: {pages.length} ورقة</span>
             </div>
          </div>
          <button 
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center gap-5 active:scale-95 shrink-0 disabled:opacity-50"
          >
            {isPrinting ? <Loader2 size={32} className="animate-spin" /> : <Printer size={32} />} 
            {isPrinting ? 'جاري التحضير...' : 'طباعة الآن'}
          </button>
        </div>
      </div>

      {/* المعاينة في المتصفح */}
      <div className="no-print space-y-6">
         <div className="flex items-center gap-4 border-b pb-4">
            <LayoutGrid className="text-slate-400" />
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">معاينة تخطيط الورق (A4)</h4>
         </div>
         
         {pages.length === 0 ? (
           <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center gap-6">
              <Tag size={64} className="text-slate-200" />
              <p className="text-2xl font-black text-slate-300 italic">لا توجد بيانات طلاب لإنشاء الملصقات</p>
           </div>
         ) : (
           <div className="space-y-20">
             {pages.map((pageCommittees, pageIdx) => (
               <div key={pageIdx} className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col items-center gap-8">
                  <div className="flex justify-between w-full items-center border-b pb-4 border-dashed">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">صفحة معاينة رقم #{pageIdx + 1}</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">معيار GS-1021 (21 ملصق)</span>
                  </div>
                  
                  <div className="label-sheet-preview grid grid-cols-3 gap-1 border-2 border-slate-200 bg-slate-50 p-2 shadow-inner">
                     {pageCommittees.map((comNum) => (
                        <div key={comNum} className="w-[140px] h-[85px] bg-white border border-slate-300 rounded-md flex flex-col items-center justify-center p-2 shadow-sm">
                           <img 
                              src={APP_CONFIG.LOGO_URL} 
                              alt="Logo" 
                              className="w-6 h-6 object-contain mb-1"
                           />
                           <span className="text-[8pt] font-black leading-none mb-0.5 text-black">لجنة رقم</span>
                           <span className="text-2xl font-black text-black leading-none">{comNum}</span>
                        </div>
                     ))}
                  </div>
               </div>
             ))}
           </div>
         )}
      </div>

      <style>{`
        .label-sheet-preview {
            width: 440px;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default CommitteeLabelsPrint;
