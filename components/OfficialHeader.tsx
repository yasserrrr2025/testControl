
import React from 'react';
import { APP_CONFIG } from '../constants';

const OfficialHeader: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center mb-2 border-b-4 border-double border-slate-900 pb-4 no-print-border">
      <div className="w-full grid grid-cols-3 gap-2 px-2 items-center">
        {/* الجزء الأيمن: البيانات الرسمية */}
        <div className="text-[11px] font-black text-right leading-tight">
          <p className="mb-0.5">المملكة العربية السعودية</p>
          <p className="mb-0.5">{APP_CONFIG.MINISTRY_NAME}</p>
          <p className="mb-0.5">{APP_CONFIG.ADMINISTRATION_NAME}</p>
          <p className="mb-0.5">{APP_CONFIG.SCHOOL_NAME}</p>
        </div>
        
        {/* الجزء الأوسط: الشعار */}
        <div className="flex flex-col items-center justify-center">
          <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-20 h-20 object-contain mb-1" />
          <div className="text-center">
             <p className="text-[9px] font-bold text-slate-500 italic">نظام كنترول الاختبارات المطور</p>
          </div>
        </div>

        {/* الجزء الأيسر: التاريخ والمرفقات */}
        <div className="text-[11px] font-bold text-left leading-tight">
          <p className="mb-0.5">التاريخ: <span className="font-mono tabular-nums">{new Date().toLocaleDateString('ar-SA')}</span></p>
          <p className="mb-0.5">المرفقات: .................</p>
          <p>رقم الإدراج: <span className="font-mono tabular-nums">{Math.floor(Math.random() * 100000)}</span></p>
        </div>
      </div>
    </div>
  );
};

export default OfficialHeader;
