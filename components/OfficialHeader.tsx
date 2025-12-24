
import React from 'react';
import { APP_CONFIG } from '../constants';

const OfficialHeader: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center mb-6 border-b-2 border-slate-900 pb-4">
      <div className="w-full grid grid-cols-3 gap-4 px-4 items-center">
        {/* الجزء الأيمن: البيانات الرسمية */}
        <div className="text-[11px] font-black text-right leading-tight">
          <p className="mb-1">{APP_CONFIG.MINISTRY_NAME}</p>
          <p className="mb-1">{APP_CONFIG.ADMINISTRATION_NAME}</p>
          <p className="mb-1">{APP_CONFIG.SCHOOL_NAME}</p>
          <p className="text-[9px] text-slate-600 mt-1">الرقم الإداري: {APP_CONFIG.MINISTRY_ID}</p>
        </div>
        
        {/* الجزء الأوسط: مفرغ بناء على طلب المستخدم (تم حذف الشعار) */}
        <div className="flex flex-col items-center">
          {/* تم إزالة الشعار الكبير من هنا */}
        </div>

        {/* الجزء الأيسر: التاريخ والمرفقات */}
        <div className="text-[11px] font-bold text-left leading-tight">
          <p className="mb-1">التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          <p className="mb-1">المرفقات: .................</p>
          <p>رقم التقرير: {Math.floor(Math.random() * 100000)}</p>
        </div>
      </div>
    </div>
  );
};

export default OfficialHeader;
