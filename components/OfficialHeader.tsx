
import React from 'react';
import { APP_CONFIG } from '../constants';

const OfficialHeader: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center mb-8 border-b-4 border-double border-slate-900 pb-6 no-print-border">
      <div className="w-full grid grid-cols-3 gap-4 px-2 items-center">
        {/* الجزء الأيمن: البيانات الرسمية */}
        <div className="text-[12px] font-black text-right leading-relaxed">
          <p className="mb-1">المملكة العربية السعودية</p>
          <p className="mb-1">{APP_CONFIG.MINISTRY_NAME}</p>
          <p className="mb-1">{APP_CONFIG.ADMINISTRATION_NAME}</p>
          <p className="mb-1">{APP_CONFIG.SCHOOL_NAME}</p>
        </div>
        
        {/* الجزء الأوسط: الشعار */}
        <div className="flex flex-col items-center justify-center">
          <img src={APP_CONFIG.LOGO_URL} alt="Logo" className="w-24 h-24 object-contain mb-2" />
          <div className="text-center">
             <p className="text-[10px] font-bold text-slate-500 italic">نظام كنترول الاختبارات المطور</p>
          </div>
        </div>

        {/* الجزء الأيسر: التاريخ والمرفقات */}
        <div className="text-[12px] font-bold text-left leading-relaxed">
          <p className="mb-1">التاريخ: <span className="font-mono tabular-nums">{new Date().toLocaleDateString('ar-SA')}</span></p>
          <p className="mb-1">المرفقات: .................</p>
          <p>رقم الإدراج: <span className="font-mono tabular-nums">{Math.floor(Math.random() * 100000)}</span></p>
        </div>
      </div>
    </div>
  );
};

export default OfficialHeader;
