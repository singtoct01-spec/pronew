import React, { useState } from 'react';
import { FormTemplate } from '../types';
import { FileText, Plus, Search, Trash2, Edit, Eye, Printer, Sparkles } from 'lucide-react';

interface FormTemplatesViewProps {
  forms: FormTemplate[];
  onViewForm: (form: FormTemplate) => void;
  onDeleteForm: (id: string) => void;
}

export const FormTemplatesView: React.FC<FormTemplatesViewProps> = ({ forms, onViewForm, onDeleteForm }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredForms = forms.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-kanit">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาแบบฟอร์ม..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button 
             className="flex-1 md:flex-none bg-brand-50 text-brand-700 px-4 py-2 rounded-xl font-medium hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
             onClick={() => alert('หากต้องการสร้างฟอร์มใหม่ กรุณาเปิดผู้ช่วย AI แล้วส่งรูปภาพหรือคำสั่งให้ AI สร้างให้ครับ')}
           >
             <Sparkles size={18} />
             <span>ให้ AI สร้างฟอร์มใหม่</span>
           </button>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredForms.map(form => (
          <div key={form.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all group flex flex-col">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={form.title}>
              {form.title}
            </h3>
            
            <p className="text-sm text-slate-500 mb-4 flex-1">
              อัปเดตล่าสุด: {new Date(form.updatedAt).toLocaleDateString('th-TH')}
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button 
                onClick={() => onViewForm(form)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                ดู / พิมพ์
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('คุณต้องการลบแบบฟอร์มนี้ใช่หรือไม่?')) {
                    onDeleteForm(form.id);
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="ลบฟอร์ม"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {filteredForms.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">ไม่พบแบบฟอร์ม</h3>
            <p className="text-slate-500">
              {searchTerm ? 'ไม่พบแบบฟอร์มที่ตรงกับการค้นหา' : 'ยังไม่มีแบบฟอร์มในระบบ ลองให้ AI สร้างให้ดูสิ!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
