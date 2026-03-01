import React from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';

interface CustomFormViewProps {
  html: string;
  title: string;
  onBack: () => void;
  onSave?: () => void;
}

export const CustomFormView: React.FC<CustomFormViewProps> = ({ html, title, onBack, onSave }) => {
  return (
    <div className="min-h-screen bg-slate-100 font-kanit">
      {/* Header - Hidden when printing */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <button 
              onClick={onSave}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Save size={20} />
              บันทึกเป็นฟอร์มมาตรฐาน
            </button>
          )}
          <button 
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Printer size={20} />
            พิมพ์เอกสาร
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className="p-8 print:p-0 flex justify-center">
        <div className="bg-white shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-8 print:p-0">
          {/* Render the AI-generated HTML */}
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: html }} 
          />
        </div>
      </div>
    </div>
  );
};
